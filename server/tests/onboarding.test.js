const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const bcrypt = require("bcrypt");
const { PGlite } = require("@electric-sql/pglite");
const { pgcrypto } = require("@electric-sql/pglite/contrib/pgcrypto");
const { migrate } = require("../database/migrate");
const { createApp } = require("../app");

test("clinic onboarding and permissions against an isolated PostgreSQL engine", async (t) => {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(
    await fs.readFile(path.join(__dirname, "../database/init.sql"), "utf8"),
  );
  const pool = {
    async query(sql, values) {
      return values ? db.query(sql, values) : (await db.exec(sql)).at(-1);
    },
    async connect() {
      return { query: pool.query, release() {} };
    },
  };
  await migrate(pool);
  await migrate(pool); // Applying an existing installation must preserve its data.
  const server = createApp(pool, { logger: { error() {} } }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(
    route,
    { method = "GET", body, cookie, headers = {} } = {},
  ) {
    const res = await fetch(`${base}/api${route}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-DentaBook-Request": "1",
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: res.status,
      data: res.status === 204 ? null : await res.json(),
      cookie: res.headers.get("set-cookie"),
      headers: res.headers,
    };
  }
  const registration = {
    ownerName: "Test Clinic Owner",
    email: "owner@example.com",
    password: "A long testing password!",
    clinicName: "Test Registered Clinic",
    address: "Test clinic address",
    phone: "09123456789",
    contactEmail: "clinic@example.com",
    registrationReference: "TEST-REGISTRATION-001",
    consent: true,
    role: "system_admin",
    status: "approved",
  };
  let clinicId, staffCookie, adminCookie;
  try {
    await t.test(
      "registration validation, mutation origin checks, and anonymous access",
      async () => {
        assert.equal(
          (await request("/auth/register-clinic", { method: "POST", body: {} }))
            .status,
          400,
        );
        assert.equal(
          (
            await request("/auth/register-clinic", {
              method: "POST",
              body: registration,
              headers: { Origin: "https://untrusted.example" },
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await request("/auth/register-clinic", {
              method: "POST",
              body: registration,
              headers: { "X-DentaBook-Request": "" },
            })
          ).status,
          403,
        );
        assert.equal((await request("/workspaces/clinic")).status, 401);
        assert.equal((await request("/workspaces/admin/clinics")).status, 401);
      },
    );
    await t.test(
      "registration persists a hashed staff account and unpublished clinic atomically",
      async () => {
        const result = await request("/auth/register-clinic", {
          method: "POST",
          body: registration,
        });
        assert.equal(result.status, 201);
        clinicId = result.data.clinicId;
        const user = (
          await db.query(
            "SELECT role, password_hash FROM users WHERE email = $1",
            [registration.email],
          )
        ).rows[0];
        assert.equal(user.role, "clinic_staff");
        assert.notEqual(user.password_hash, registration.password);
        assert.equal(
          await bcrypt.compare(registration.password, user.password_hash),
          true,
        );
        assert.deepEqual((await request("/clinics")).data.clinics, []);
        assert.equal((await request(`/clinics/${clinicId}`)).status, 404);
        assert.equal(
          (
            await request("/auth/register-clinic", {
              method: "POST",
              body: { ...registration, email: "OWNER@EXAMPLE.COM" },
            })
          ).status,
          409,
        );
        assert.equal(
          (await db.query("SELECT COUNT(*)::int AS count FROM clinics")).rows[0]
            .count,
          1,
        );
      },
    );
    await t.test(
      "login issues an opaque HttpOnly cookie and pending accounts cannot access staff or admin tools",
      async () => {
        assert.equal(
          (
            await request("/auth/login", {
              method: "POST",
              body: { email: registration.email, password: "wrong" },
            })
          ).status,
          401,
        );
        const login = await request("/auth/login", {
          method: "POST",
          body: { email: registration.email, password: registration.password },
        });
        assert.equal(login.status, 200);
        assert.match(login.cookie, /HttpOnly/);
        assert.match(login.cookie, /SameSite=Strict/);
        assert.match(login.cookie, /Path=\/;/);
        staffCookie = login.cookie.split(";")[0];
        const stored = (await db.query("SELECT token_hash FROM sessions"))
          .rows[0];
        assert.notEqual(stored.token_hash, staffCookie.split("=")[1]);
        assert.equal(
          (await request("/auth/me", { cookie: staffCookie })).data.clinic
            .status,
          "pending_review",
        );
        assert.equal(
          (await request("/workspaces/clinic", { cookie: staffCookie })).status,
          403,
        );
        assert.equal(
          (await request("/workspaces/admin/clinics", { cookie: staffCookie }))
            .status,
          403,
        );
        assert.equal(
          (
            await request(`/workspaces/admin/clinics/${clinicId}/review`, {
              cookie: staffCookie,
              method: "POST",
              body: { decision: "approved" },
            })
          ).status,
          403,
        );
      },
    );
    await t.test(
      "an administrator can review real registrations and approval unlocks only the owner’s workspace",
      async () => {
        await db.query(
          `INSERT INTO users (full_name,email,password_hash,role) VALUES ($1,$2,$3,'system_admin')`,
          [
            "Test Administrator",
            "admin@example.com",
            await bcrypt.hash("Administrator testing password!", 12),
          ],
        );
        adminCookie = (
          await request("/auth/admin/login", {
            method: "POST",
            body: {
              email: "admin@example.com",
              password: "Administrator testing password!",
            },
          })
        ).cookie.split(";")[0];
        const wrongAdminPortal = await request("/auth/login", {
          method: "POST",
          body: {
            email: "admin@example.com",
            password: "Administrator testing password!",
          },
        });
        assert.equal(wrongAdminPortal.status, 401);
        assert.equal(wrongAdminPortal.cookie, null);
        const wrongStaffPortal = await request("/auth/admin/login", {
          method: "POST",
          body: {
            email: registration.email,
            password: registration.password,
            role: "system_admin",
          },
        });
        assert.equal(wrongStaffPortal.status, 401);
        assert.equal(wrongStaffPortal.cookie, null);
        const list = await request("/workspaces/admin/clinics", {
          cookie: adminCookie,
        });
        assert.equal(list.status, 200);
        assert.equal(
          list.data.clinics[0].registrationReference,
          registration.registrationReference,
        );
        assert.equal(list.data.clinics[0].ownerEmail, registration.email);
        const review = await request(
          `/workspaces/admin/clinics/${clinicId}/review`,
          {
            cookie: adminCookie,
            method: "POST",
            body: { decision: "approved", notes: "Reviewed registration." },
          },
        );
        assert.equal(review.status, 200);
        const audit = (
          await db.query(
            "SELECT reviewed_by, reviewed_at FROM clinics WHERE id = $1",
            [clinicId],
          )
        ).rows[0];
        assert.ok(audit.reviewed_by);
        assert.ok(audit.reviewed_at);
        assert.equal(
          (await request("/auth/me", { cookie: staffCookie })).data.clinic
            .status,
          "approved",
        );
        const workspace = await request("/workspaces/clinic", {
          cookie: staffCookie,
        });
        assert.equal(workspace.status, 200);
        assert.equal(workspace.data.clinic.id, clinicId);
        assert.deepEqual(workspace.data.counts, {
          dentists: 0,
          services: 0,
          pendingAppointments: 0,
        });
        assert.equal((await request("/clinics")).data.clinics.length, 1);
        assert.equal(
          (await request("/workspaces/clinic", { cookie: adminCookie })).status,
          403,
        );
        assert.equal(
          (
            await request(`/workspaces/admin/clinics/${clinicId}/review`, {
              cookie: adminCookie,
              method: "POST",
              body: { decision: "rejected", notes: "A stale second decision" },
            })
          ).status,
          409,
        );
      },
    );
    await t.test(
      "rejection requires a reason and never publishes the clinic",
      async () => {
        const second = await request("/auth/register-clinic", {
          method: "POST",
          body: {
            ...registration,
            email: "second@example.com",
            clinicName: "Second Test Clinic",
          },
        });
        assert.equal(second.status, 201);
        const route = `/workspaces/admin/clinics/${second.data.clinicId}/review`;
        assert.equal(
          (
            await request(route, {
              cookie: adminCookie,
              method: "POST",
              body: { decision: "rejected" },
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(route, {
              cookie: adminCookie,
              method: "POST",
              body: {
                decision: "rejected",
                notes: "Registration reference needs correction.",
              },
            })
          ).status,
          200,
        );
        assert.equal(
          (await request(`/clinics/${second.data.clinicId}`)).status,
          404,
        );
        const rejectedCookie = (
          await request("/auth/login", {
            method: "POST",
            body: {
              email: "second@example.com",
              password: registration.password,
            },
          })
        ).cookie.split(";")[0];
        assert.equal(
          (await request("/workspaces/clinic", { cookie: rejectedCookie }))
            .status,
          403,
        );
        assert.equal(
          (await request("/auth/me", { cookie: rejectedCookie })).data.clinic
            .reviewNotes,
          "Registration reference needs correction.",
        );
      },
    );
    await t.test(
      "patient registration and sign-in cannot create or enter privileged accounts",
      async () => {
        const body = {
          name: "Patient One",
          email: "patient-one@example.com",
          phone: "09123456789",
          password: "Patient testing password!",
          role: "system_admin",
        };
        assert.equal(
          (
            await request("/auth/register-patient", {
              method: "POST",
              body: { ...body, password: "short" },
            })
          ).status,
          400,
        );
        assert.equal(
          (await request("/auth/register-patient", { method: "POST", body }))
            .status,
          201,
        );
        const user = (
          await db.query(
            "SELECT role,password_hash FROM users WHERE email=$1",
            [body.email],
          )
        ).rows[0];
        assert.equal(user.role, "patient");
        assert.equal(
          await bcrypt.compare(body.password, user.password_hash),
          true,
        );
        assert.equal(
          (
            await request("/auth/register-patient", {
              method: "POST",
              body: { ...body, email: "PATIENT-ONE@EXAMPLE.COM" },
            })
          ).status,
          409,
        );
        assert.equal(
          (await request("/auth/login", { method: "POST", body })).status,
          401,
        );
        assert.equal(
          (await request("/auth/admin/login", { method: "POST", body })).status,
          401,
        );
        assert.equal(
          (
            await request("/auth/patient/login", {
              method: "POST",
              body: {
                email: "admin@example.com",
                password: "Administrator testing password!",
              },
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await request("/auth/patient/login", {
              method: "POST",
              body: {
                email: registration.email,
                password: registration.password,
              },
            })
          ).status,
          401,
        );
        const login = await request("/auth/patient/login", {
          method: "POST",
          body,
        });
        assert.equal(login.status, 200);
        const cookie = login.cookie.split(";")[0];
        assert.equal(
          (await request("/auth/me", { cookie })).data.user.role,
          "patient",
        );
        assert.equal(
          (await request("/workspaces/clinic", { cookie })).status,
          403,
        );
        assert.equal(
          (await request("/workspaces/admin/clinics", { cookie })).status,
          403,
        );
        assert.equal(
          (await request("/workspaces/patient/appointments", { cookie }))
            .status,
          200,
        );
        assert.equal(
          (await request("/auth/logout", { cookie, method: "POST" })).status,
          204,
        );
      },
    );
    await t.test(
      "patient appointment reads require login and cannot expose another patient’s records",
      async () => {
        assert.equal(
          (await request("/workspaces/patient/appointments")).status,
          401,
        );
        assert.equal(
          (
            await request("/workspaces/patient/appointments", {
              cookie: adminCookie,
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await request("/workspaces/patient/appointments", {
              cookie: staffCookie,
            })
          ).status,
          403,
        );
        const second = {
          name: "Patient Two",
          email: "patient-two@example.com",
          phone: "09123456789",
          password: "Patient testing password!",
        };
        assert.equal(
          (
            await request("/auth/register-patient", {
              method: "POST",
              body: second,
            })
          ).status,
          201,
        );
        const firstId = (
          await db.query("SELECT id FROM users WHERE email=$1", [
            "patient-one@example.com",
          ])
        ).rows[0].id;
        const secondId = (
          await db.query("SELECT id FROM users WHERE email=$1", [second.email])
        ).rows[0].id;
        for (const [userId, email, code] of [
          [firstId, "patient-one@example.com", "PATIENT-ONE"],
          [secondId, second.email, "PATIENT-TWO"],
        ]) {
          await db.query(
            `INSERT INTO appointments (appointment_code,clinic_id,patient_user_id,patient_name,patient_email,patient_phone,appointment_date,start_time,end_time,medical_notes)
          VALUES ($1,$2,$3,'Private Patient',$4,'09123456789',CURRENT_DATE,'09:00','09:30','Private clinical information')`,
            [code, clinicId, userId, email],
          );
        }
        const login = await request("/auth/patient/login", {
          method: "POST",
          body: { email: "patient-one@example.com", password: second.password },
        });
        const cookie = login.cookie.split(";")[0];
        const result = await request(
          `/workspaces/patient/appointments?patient_user_id=${secondId}`,
          { cookie },
        );
        assert.equal(result.status, 200);
        assert.equal(result.data.appointments.length, 1);
        assert.equal(
          result.data.appointments[0].appointmentCode,
          "PATIENT-ONE",
        );
        assert.equal(result.data.appointments[0].time, "09:00");
        assert.doesNotMatch(
          JSON.stringify(result.data),
          /PATIENT-TWO|Private clinical|patient_email|patient_phone|password/,
        );
        await request("/auth/logout", { method: "POST", cookie });
        assert.equal(
          (await request("/workspaces/patient/appointments", { cookie }))
            .status,
          401,
        );
      },
    );
    await t.test(
      "failed clinic insertion rolls back account creation and registration attempts are limited",
      async () => {
        await db.exec(
          `ALTER TABLE clinics ADD CONSTRAINT test_failure CHECK (name <> 'Rollback Clinic')`,
        );
        assert.equal(
          (
            await request("/auth/register-clinic", {
              method: "POST",
              body: {
                ...registration,
                email: "rollback@example.com",
                clinicName: "Rollback Clinic",
              },
            })
          ).status,
          503,
        );
        assert.equal(
          (
            await db.query("SELECT id FROM users WHERE email = $1", [
              "rollback@example.com",
            ])
          ).rows.length,
          0,
        );
        assert.equal(
          (
            await request("/auth/register-clinic", {
              method: "POST",
              body: registration,
            })
          ).status,
          429,
        );
      },
    );
    await t.test(
      "suspension and role changes take effect for existing sessions",
      async () => {
        await db.query(`UPDATE clinics SET status='suspended' WHERE id=$1`, [
          clinicId,
        ]);
        assert.equal(
          (await request("/workspaces/clinic", { cookie: staffCookie })).status,
          403,
        );
        assert.equal((await request(`/clinics/${clinicId}`)).status, 404);
        await db.query(`UPDATE users SET role='patient' WHERE email=$1`, [
          registration.email,
        ]);
        assert.equal(
          (await request("/workspaces/clinic", { cookie: staffCookie })).status,
          401,
        );
      },
    );
    await t.test(
      "logout revokes the session and expired cookies cannot authorize requests",
      async () => {
        assert.equal(
          (
            await request("/auth/logout", {
              cookie: staffCookie,
              method: "POST",
            })
          ).status,
          204,
        );
        assert.equal(
          (await request("/auth/me", { cookie: staffCookie })).status,
          401,
        );
        await db.exec(
          `UPDATE sessions SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 second'`,
        );
        assert.equal(
          (await request("/auth/me", { cookie: adminCookie })).status,
          401,
        );
      },
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await db.close();
  }
});
