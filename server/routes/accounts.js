const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("node:crypto");
const { registration, patientRegistration, email } = require("../validation");
const { createVerificationCredentials } = require("../tokens");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../email");
const { verifyGoogleIdToken } = require("../google-auth");
const {
  cookieName,
  cookieOptions,
  hashToken,
  sessionToken,
  requireSession,
  rateLimit,
  createAndSetSession,
} = require("../auth");
const dummyHash = bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

const clinicColumns = `c.id, c.name, c.description, c.address, c.phone, c.email,
  c.status, c.registration_reference AS "registrationReference", c.review_notes AS "reviewNotes",
  c.reviewed_at AS "reviewedAt", c.created_at AS "createdAt",
  c.deposit_percentage AS "depositPercentage",c.deposit_policy_configured AS "depositPolicyConfigured",
  c.deposit_refund_terms AS "depositRefundTerms", c.gcash_enabled AS "gcashEnabled", c.gcash_account_name AS "gcashAccountName", c.gcash_number AS "gcashNumber", c.walk_in_enabled AS "walkInEnabled",
  c.patient_cancellation_enabled AS "cancelEnabled",c.cancellation_notice_hours AS "cancelNoticeHours",
  c.patient_rescheduling_enabled AS "rescheduleEnabled",c.reschedule_notice_hours AS "rescheduleNoticeHours",
  c.appointment_change_terms AS terms,c.change_policy_version AS version`;
async function ownedClinic(pool, userId) {
  const result = await pool.query(
    `SELECT ${clinicColumns}, CASE WHEN c.owner_user_id=$1 THEN 'owner' ELSE m.access_role END AS "staffRole"
     FROM clinics c LEFT JOIN clinic_memberships m ON m.clinic_id=c.id AND m.user_id=$1 AND m.revoked_at IS NULL
     WHERE c.owner_user_id=$1 OR m.user_id=$1 ORDER BY c.created_at, c.id LIMIT 1`,
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
  require('../staff').registerInvitationRoutes(router,pool);
  router.put('/patient/profile',requireSession(pool),async(req,res,next)=>{
    if (req.user.role!=='patient') return res.status(403).json({error:'Use a patient account to edit your profile.'});
    const {name,phone}=req.body || {};
    if (typeof name!=='string' || !name.trim() || name.trim().length>150 || typeof phone!=='string' || !/^[+0-9() .-]{7,30}$/.test(phone.trim()) || phone.replace(/\D/g,'').length<7)
      return res.status(400).json({error:'Enter your name and a valid phone number.'});
    try {
      await pool.query('UPDATE users SET full_name=$1,phone=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3',[name.trim(),phone.trim(),req.user.id]);
      res.json({saved:true});
    } catch(error) { next(error); }
  });
  router.put('/patient/password',requireSession(pool),rateLimit({limit:10,windowMs:15*60*1000}),async(req,res,next)=>{
    if (req.user.role!=='patient' || req.user.ownerAccess) return res.status(403).json({error:'Use your ordinary patient account to change its password.'});
    const b=req.body || {};
    if (typeof b.currentPassword!=='string' || Buffer.byteLength(b.currentPassword)>72 || typeof b.password!=='string' || b.password.length<12 || Buffer.byteLength(b.password)>72 || b.password===b.currentPassword)
      return res.status(400).json({error:'Enter your current password and a different new password of at least 12 characters, up to 72 UTF-8 bytes.'});
    try {
      const user=(await pool.query('SELECT password_hash FROM users WHERE id=$1',[req.user.id])).rows[0];
      if (!user || !await bcrypt.compare(b.currentPassword,user.password_hash)) return res.status(403).json({error:'The current password is incorrect.'});
      const result=await pool.query('UPDATE users SET password_hash=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND password_hash=$3 RETURNING id',[await bcrypt.hash(b.password,12),req.user.id,user.password_hash]);
      if (!result.rows.length) return res.status(409).json({error:'Your password changed. Sign in again.'});
      res.clearCookie(cookieName(),cookieOptions()); res.json({saved:true,signedOut:true});
    } catch(error) { next(error); }
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
        const userResult = await pool.query(
          `INSERT INTO users (full_name,email,phone,password_hash,role,is_email_verified)
           VALUES ($1,$2,$3,$4,'patient',FALSE)
           RETURNING id, full_name AS name, email, phone, role, owner_access AS "ownerAccess", is_email_verified AS "isEmailVerified"`,
          [
            body.name.trim(),
            body.email.trim().toLowerCase(),
            body.phone.trim(),
            hash,
          ],
        );
        const newUser = userResult.rows[0];

        const creds = createVerificationCredentials();
        await pool.query(
          `INSERT INTO verification_tokens (user_id, token_hash, code_hash, purpose, expires_at)
           VALUES ($1, $2, $3, 'verify_email', CURRENT_TIMESTAMP + INTERVAL '24 hours')`,
          [newUser.id, creds.tokenHash, creds.codeHash],
        );

        try {
          await sendVerificationEmail({
            email: newUser.email,
            name: newUser.name,
            token: creds.token,
            code: creds.code,
          });
        } catch (mailErr) {
          console.error("[Register] Failed to send verification email:", mailErr.message);
        }

        await createAndSetSession({ res, req, pool, user: newUser, role: "patient" });

        res.status(201).json({
          registered: true,
          signedIn: true,
          email: newUser.email,
          isEmailVerified: false,
        });
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

  router.post("/verify-email", rateLimit({ limit: 15, windowMs: 15 * 60 * 1000 }), async (req, res, next) => {
    const { token, code, email } = req.body || {};
    if (!token && !code) {
      return res.status(400).json({ error: "Please provide a verification link token or 6-digit code." });
    }
    try {
      let tokenRow = null;
      if (token) {
        const hashed = hashToken(token);
        const result = await pool.query(
          `SELECT t.id, t.user_id, t.attempts, t.expires_at, u.email
           FROM verification_tokens t JOIN users u ON u.id = t.user_id
           WHERE t.token_hash = $1 AND t.purpose = 'verify_email'`,
          [hashed]
        );
        tokenRow = result.rows[0];
      } else if (code) {
        const cleanCode = String(code).trim();
        if (!/^\d{6}$/.test(cleanCode)) {
          return res.status(400).json({ error: "The verification code must be exactly 6 digits." });
        }
        const hashedCode = hashToken(cleanCode);
        const authedToken = sessionToken(req);
        let targetUserId = null;
        if (authedToken) {
          const authUser = await pool.query(
            `SELECT u.id FROM sessions s JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
            [hashToken(authedToken)]
          );
          if (authUser.rows.length) targetUserId = authUser.rows[0].id;
        }

        let query;
        let params;
        if (targetUserId) {
          query = `SELECT t.id, t.user_id, t.attempts, t.expires_at, u.email
                   FROM verification_tokens t JOIN users u ON u.id = t.user_id
                   WHERE t.user_id = $1 AND t.code_hash = $2 AND t.purpose = 'verify_email'`;
          params = [targetUserId, hashedCode];
        } else if (email && typeof email === "string") {
          query = `SELECT t.id, t.user_id, t.attempts, t.expires_at, u.email
                   FROM verification_tokens t JOIN users u ON u.id = t.user_id
                   WHERE LOWER(u.email) = $1 AND t.code_hash = $2 AND t.purpose = 'verify_email'`;
          params = [email.trim().toLowerCase(), hashedCode];
        } else {
          return res.status(400).json({ error: "Enter the email associated with your account along with the 6-digit code." });
        }
        const result = await pool.query(query, params);
        tokenRow = result.rows[0];
      }

      if (!tokenRow) {
        return res.status(400).json({ error: "Invalid verification link or code. Please check your email or request a new code." });
      }

      if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
        await pool.query("DELETE FROM verification_tokens WHERE id = $1", [tokenRow.id]);
        return res.status(400).json({ error: "This verification code has expired. Please request a new one." });
      }

      if (tokenRow.attempts >= 5) {
        await pool.query("DELETE FROM verification_tokens WHERE id = $1", [tokenRow.id]);
        return res.status(400).json({ error: "Too many failed attempts. Please request a new verification email." });
      }

      await pool.query("UPDATE users SET is_email_verified = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1", [tokenRow.user_id]);
      await pool.query("DELETE FROM verification_tokens WHERE user_id = $1 AND purpose = 'verify_email'", [tokenRow.user_id]);

      res.json({ verified: true, email: tokenRow.email });
    } catch (error) {
      next(error);
    }
  });

  router.post("/resend-verification", requireSession(pool), rateLimit({ limit: 5, windowMs: 15 * 60 * 1000 }), async (req, res, next) => {
    if (req.user.role !== "patient") {
      return res.status(403).json({ error: "Only patient accounts require email verification." });
    }
    try {
      const userResult = await pool.query("SELECT id, full_name, email, is_email_verified FROM users WHERE id = $1", [req.user.id]);
      const user = userResult.rows[0];
      if (!user) return res.status(404).json({ error: "User not found." });
      if (user.is_email_verified) {
        return res.json({ alreadyVerified: true, message: "Your email is already verified." });
      }

      await pool.query("DELETE FROM verification_tokens WHERE user_id = $1 AND purpose = 'verify_email'", [user.id]);

      const creds = createVerificationCredentials();
      await pool.query(
        `INSERT INTO verification_tokens (user_id, token_hash, code_hash, purpose, expires_at)
         VALUES ($1, $2, $3, 'verify_email', CURRENT_TIMESTAMP + INTERVAL '24 hours')`,
        [user.id, creds.tokenHash, creds.codeHash]
      );

      await sendVerificationEmail({
        email: user.email,
        name: user.full_name,
        token: creds.token,
        code: creds.code,
      });

      res.json({ sent: true, email: user.email });
    } catch (error) {
      next(error);
    }
  });

  router.post("/change-email", requireSession(pool), rateLimit({ limit: 10, windowMs: 15 * 60 * 1000 }), async (req, res, next) => {
    if (req.user.role !== "patient") {
      return res.status(403).json({ error: "Only patient accounts can change their verification email." });
    }
    const rawEmail = typeof req.body?.newEmail === "string" ? req.body.newEmail.trim().toLowerCase() : "";
    if (!rawEmail || !email(rawEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    try {
      const existing = await pool.query(
        "SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2",
        [rawEmail, req.user.id]
      );
      if (existing.rows.length) {
        return res.status(409).json({ error: "An account already uses this email address. Please choose another email." });
      }

      await pool.query(
        "UPDATE users SET email = $1, is_email_verified = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [rawEmail, req.user.id]
      );
      await pool.query("DELETE FROM verification_tokens WHERE user_id = $1 AND purpose = 'verify_email'", [req.user.id]);

      const creds = createVerificationCredentials();
      await pool.query(
        `INSERT INTO verification_tokens (user_id, token_hash, code_hash, purpose, expires_at)
         VALUES ($1, $2, $3, 'verify_email', CURRENT_TIMESTAMP + INTERVAL '24 hours')`,
        [req.user.id, creds.tokenHash, creds.codeHash]
      );

      await sendVerificationEmail({
        email: rawEmail,
        name: req.user.name,
        token: creds.token,
        code: creds.code,
      });

      res.json({
        updated: true,
        email: rawEmail,
        message: `Your account email has been updated to ${rawEmail}. A verification code has been sent.`,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/forgot-password", rateLimit({ limit: 10, windowMs: 60 * 60 * 1000 }), async (req, res, next) => {
    const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!rawEmail || !email(rawEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    try {
      const userResult = await pool.query(
        "SELECT id, full_name, email FROM users WHERE LOWER(email) = $1 AND role IN ('patient', 'clinic_staff')",
        [rawEmail]
      );
      const user = userResult.rows[0];
      if (user) {
        await pool.query("DELETE FROM verification_tokens WHERE user_id = $1 AND purpose = 'reset_password'", [user.id]);

        const creds = createVerificationCredentials();
        await pool.query(
          `INSERT INTO verification_tokens (user_id, token_hash, code_hash, purpose, expires_at)
           VALUES ($1, $2, $3, 'reset_password', CURRENT_TIMESTAMP + INTERVAL '15 minutes')`,
          [user.id, creds.tokenHash, creds.codeHash]
        );

        await sendPasswordResetEmail({
          email: user.email,
          name: user.full_name,
          token: creds.token,
          code: creds.code,
        });
      }
      res.json({
        sent: true,
        message: "If an account matches that email address, password reset instructions have been sent.",
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/reset-password", rateLimit({ limit: 10, windowMs: 15 * 60 * 1000 }), async (req, res, next) => {
    const b = req.body || {};
    const newPassword = typeof b.password === "string" ? b.password : "";
    if (newPassword.length < 12 || Buffer.byteLength(newPassword, "utf8") > 72) {
      return res.status(400).json({ error: "Password must be at least 12 characters, up to 72 UTF-8 bytes." });
    }
    if (!b.token && !b.code) {
      return res.status(400).json({ error: "Provide a valid reset link or code." });
    }
    try {
      let tokenRow = null;
      if (b.token) {
        const hashed = hashToken(b.token);
        const result = await pool.query(
          `SELECT t.id, t.user_id, t.attempts, t.expires_at, u.email
           FROM verification_tokens t JOIN users u ON u.id = t.user_id
           WHERE t.token_hash = $1 AND t.purpose = 'reset_password'`,
          [hashed]
        );
        tokenRow = result.rows[0];
      } else if (b.code) {
        const rawCode = String(b.code).trim();
        const rawEmail = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
        if (!/^\d{6}$/.test(rawCode) || !rawEmail) {
          return res.status(400).json({ error: "Enter the email associated with your account and the 6-digit reset code." });
        }
        const hashed = hashToken(rawCode);
        const result = await pool.query(
          `SELECT t.id, t.user_id, t.attempts, t.expires_at, u.email
           FROM verification_tokens t JOIN users u ON u.id = t.user_id
           WHERE LOWER(u.email) = $1 AND t.code_hash = $2 AND t.purpose = 'reset_password'`,
          [rawEmail, hashed]
        );
        tokenRow = result.rows[0];
      }

      if (!tokenRow) {
        return res.status(400).json({ error: "Invalid password reset link or code. Please request a new reset email." });
      }

      if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
        await pool.query("DELETE FROM verification_tokens WHERE id = $1", [tokenRow.id]);
        return res.status(400).json({ error: "This password reset link has expired. Please request a new reset email." });
      }

      if (tokenRow.attempts >= 5) {
        await pool.query("DELETE FROM verification_tokens WHERE id = $1", [tokenRow.id]);
        return res.status(400).json({ error: "Too many failed attempts. Please request a new reset email." });
      }

      const hash = await bcrypt.hash(newPassword, 12);
      await pool.query(
        "UPDATE users SET password_hash = $1, is_email_verified = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [hash, tokenRow.user_id]
      );
      await pool.query("DELETE FROM verification_tokens WHERE user_id = $1 AND purpose = 'reset_password'", [tokenRow.user_id]);

      res.clearCookie(cookieName(), cookieOptions());
      res.json({ reset: true, message: "Your password has been successfully reset. Please sign in." });
    } catch (error) {
      next(error);
    }
  });

  router.post("/google", rateLimit({ limit: 30, windowMs: 15 * 60 * 1000 }), async (req, res, next) => {
    const { credential } = req.body || {};
    if (!credential || typeof credential !== "string") {
      return res.status(400).json({ error: "Missing Google authentication credential." });
    }
    try {
      const googleUser = await verifyGoogleIdToken(credential);
      const email = googleUser.email.toLowerCase();

      let userResult = await pool.query(
        `SELECT id, full_name, email, role, google_id, is_email_verified, owner_access AS "ownerAccess"
         FROM users WHERE google_id = $1 OR LOWER(email) = $2`,
        [googleUser.googleId, email]
      );

      let user = userResult.rows[0];

      if (user) {
        if (user.role !== "patient") {
          return res.status(403).json({ error: "Google sign-in is only available for patient accounts. Clinic staff and administrators must sign in through their designated portals." });
        }
        if (!user.google_id || !user.is_email_verified) {
          await pool.query(
            "UPDATE users SET google_id = COALESCE(google_id, $1), is_email_verified = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [googleUser.googleId, user.id]
          );
          user.is_email_verified = true;
        }
      } else {
        const randomPassword = crypto.randomBytes(32).toString("hex");
        const hash = await bcrypt.hash(randomPassword, 12);
        const insertResult = await pool.query(
          `INSERT INTO users (full_name, email, google_id, password_hash, role, is_email_verified)
           VALUES ($1, $2, $3, $4, 'patient', TRUE)
           RETURNING id, full_name, email, role, owner_access AS "ownerAccess", is_email_verified`,
          [googleUser.name, email, googleUser.googleId, hash]
        );
        user = insertResult.rows[0];
      }

      const signedIn = await createAndSetSession({ res, req, pool, user, role: "patient" });
      if (!signedIn) {
        return res.status(500).json({ error: "Could not create session for Google sign-in." });
      }

      res.json({ signedIn: true, email: user.email, name: user.full_name });
    } catch (error) {
      if (error.message.includes("Google") || error.message.includes("token") || error.message.includes("credential")) {
        return res.status(401).json({ error: error.message });
      }
      next(error);
    }
  });
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
