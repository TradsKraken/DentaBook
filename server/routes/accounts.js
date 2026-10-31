const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("node:crypto");
const { registration, patientRegistration, email } = require("../validation");
const {
  cookieName,
  cookieOptions,
  hashToken,
  sessionToken,
  requireSession,
  rateLimit,
} = require("../auth");
const dummyHash = bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

const clinicColumns = `c.id, c.name, c.description, c.address, c.phone, c.email,
  c.status, c.registration_reference AS "registrationReference", c.review_notes AS "reviewNotes",
  c.reviewed_at AS "reviewedAt", c.created_at AS "createdAt"`;
async function ownedClinic(pool, userId) {
  const result = await pool.query(
    `SELECT ${clinicColumns} FROM clinics c WHERE c.owner_user_id = $1 ORDER BY c.created_at, c.id LIMIT 1`,
    [userId],
  );
  return result.rows[0] || null;
}
function createAccountRouter(pool) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.post(
    "/register-clinic",
    rateLimit({ limit: 5, windowMs: 60 * 60 * 1000 }),
    async (req, res, next) => {
      const body = req.body || {};
      const errors = registration(body);
      if (Object.keys(errors).length)
        return res.status(400).json({
          error: "Please check the registration form.",
          fields: errors,
        });
      let client;
      try {
        const passwordHash = await bcrypt.hash(body.password, 12);
        client = await pool.connect();
        await client.query("BEGIN");
        const user = await client.query(
          `INSERT INTO users (full_name, email, password_hash, role)
        VALUES ($1, $2, $3, 'clinic_staff') RETURNING id`,
          [
            body.ownerName.trim(),
            body.email.trim().toLowerCase(),
            passwordHash,
          ],
        );
        const clinic = await client.query(
          `INSERT INTO clinics (owner_user_id, name, address, phone, email, registration_reference, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending_review') RETURNING id`,
          [
            user.rows[0].id,
            body.clinicName.trim(),
            body.address.trim(),
            body.phone.trim(),
            body.contactEmail.trim().toLowerCase(),
            body.registrationReference.trim(),
          ],
        );
        await client.query("COMMIT");
        res
          .status(201)
          .json({ clinicId: clinic.rows[0].id, status: "pending_review" });
      } catch (error) {
        if (client) await client.query("ROLLBACK");
        if (error.code === "23505")
          return res.status(409).json({
            error:
              "An account already uses this email address. Please sign in instead.",
          });
        next(error);
      } finally {
        if (client) client.release();
      }
    },
  );
  const loginLimit = rateLimit({ limit: 30, windowMs: 15 * 60 * 1000 });
  router.post(
    "/register-patient",
    rateLimit({ limit: 5, windowMs: 60 * 60 * 1000 }),
    async (req, res, next) => {
      const body = req.body || {};
      const fields = patientRegistration(body);
      if (Object.keys(fields).length)
        return res
          .status(400)
          .json({ error: "Please check your account details.", fields });
      try {
        const hash = await bcrypt.hash(body.password, 12);
        await pool.query(
          `INSERT INTO users (full_name,email,phone,password_hash,role) VALUES ($1,$2,$3,$4,'patient')`,
          [
            body.name.trim(),
            body.email.trim().toLowerCase(),
            body.phone.trim(),
            hash,
          ],
        );
        res.status(201).json({ registered: true });
      } catch (error) {
        if (error.code === "23505")
          return res
            .status(409)
            .json({
              error:
                "An account already uses this email address. Please sign in instead.",
            });
        next(error);
      }
    },
  );
  const loginFor = (role) => async (req, res, next) => {
    const body = req.body || {};
    const identifier = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (
      !(email(identifier) || /^[a-z][a-z0-9_.-]{2,39}$/.test(identifier)) ||
      typeof body.password !== "string" ||
      Buffer.byteLength(body.password, "utf8") > 72 ||
      !body.password
    ) {
      return res
        .status(400)
        .json({ error: "Enter your email address or username and password." });
    }
    try {
      const result = await pool.query(
        `SELECT id, password_hash, role, owner_access, development_only FROM users
        WHERE LOWER(email) = $1 OR LOWER(username) = $1`,
        [identifier],
      );
      const user = result.rows[0];
      const matches = await bcrypt.compare(
        body.password,
        user ? user.password_hash : await dummyHash,
      );
      if (!user || !matches ||
          (user.role !== role && !(user.role === "system_admin" && user.owner_access)) ||
          (user.development_only && process.env.NODE_ENV !== "development"))
        return res.status(401).json({
          error: "The sign-in details are incorrect for this portal.",
        });
      const token = crypto.randomBytes(32).toString("hex");
      // Replacing this browser's session prevents session fixation and stale duplicate sessions.
      const previous = sessionToken(req);
      if (previous)
        await pool.query("DELETE FROM sessions WHERE token_hash = $1", [
          hashToken(previous),
        ]);
      await pool.query(
        "DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP",
      );
      const duration = user.owner_access || role === "system_admin" ? 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
      const created = await pool.query(
        `INSERT INTO sessions (token_hash, user_id, role, expires_at)
        SELECT $1, u.id, $3::varchar, CURRENT_TIMESTAMP + $4 * INTERVAL '1 millisecond'
        FROM users u WHERE u.id = $2 AND u.password_hash = $5
          AND u.role = $6 AND u.owner_access = $7
          AND (u.role = $3 OR (u.role = 'system_admin' AND u.owner_access))
          AND (NOT u.development_only OR $8 = 'development')
        FOR SHARE RETURNING token_hash`,
        [hashToken(token), user.id, role, duration, user.password_hash,
          user.role, user.owner_access, process.env.NODE_ENV || ""],
      );
      // Serialize issuance with credential changes so an old password cannot
      // create a new session after a concurrent reset or privilege change.
      if (!created.rows.length)
        return res.status(401).json({
          error: "The sign-in details are incorrect for this portal.",
        });
      res.cookie(cookieName(), token, {
        ...cookieOptions(),
        maxAge: duration,
      });
      res.json({ signedIn: true });
    } catch (error) {
      next(error);
    }
  };
  router.post("/login", loginLimit, loginFor("clinic_staff"));
  router.post("/clinic/login", loginLimit, loginFor("clinic_staff"));
  router.post("/admin/login", loginLimit, loginFor("system_admin"));
  router.post("/patient/login", loginLimit, loginFor("patient"));
  router.get("/me", requireSession(pool), async (req, res, next) => {
    try {
      res.json({
        user: req.user,
        clinic:
          req.user.role === "clinic_staff" && !req.user.ownerAccess
            ? await ownedClinic(pool, req.user.id)
            : null,
      });
    } catch (error) {
      next(error);
    }
  });
  router.post("/logout", async (req, res, next) => {
    try {
      const token = sessionToken(req);
      if (token)
        await pool.query("DELETE FROM sessions WHERE token_hash = $1", [
          hashToken(token),
        ]);
      res.clearCookie(cookieName(), cookieOptions());
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });
  return router;
}
module.exports = { createAccountRouter, ownedClinic, clinicColumns };
