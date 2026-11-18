const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const bcrypt = require("bcrypt");
const { PGlite } = require("@electric-sql/pglite");
const { pgcrypto } = require("@electric-sql/pglite/contrib/pgcrypto");
const { migrate } = require("../database/migrate");
const { createApp } = require("../app");
const { getSentEmails, clearSentEmails } = require("../email");

test("patient email verification, password reset, and Google authentication", async (t) => {
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

  // Set up an approved clinic with a dentist and service for booking checks
  const clinicOwner = (
    await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Clinic Owner', 'owner@clinic.test', 'hash123456789012', 'clinic_staff') RETURNING id",
    )
  ).rows[0].id;
  const clinic = (
    await pool.query(
      "INSERT INTO clinics (owner_user_id, name, address, phone, email, status) VALUES ($1, 'Verification Dental Clinic', 'Makati City', '+639171112222', 'clinic@verification.test', 'approved') RETURNING id",
      [clinicOwner],
    )
  ).rows[0].id;
  const service = (
    await pool.query(
      "INSERT INTO services (clinic_id, name, category, estimated_price, duration_minutes) VALUES ($1, 'Dental Cleaning', 'General', 1200, 30) RETURNING id",
      [clinic],
    )
  ).rows[0].id;
  const dentist = (
    await pool.query(
      "INSERT INTO dentists (clinic_id, full_name) VALUES ($1, 'Dr. Maria Santos') RETURNING id",
      [clinic],
    )
  ).rows[0].id;
  await pool.query(
    "INSERT INTO dentist_services (dentist_id, service_id) VALUES ($1, $2)",
    [dentist, service],
  );
  await pool.query(
    "INSERT INTO dentist_schedules (dentist_id, day_of_week, start_time, end_time) VALUES ($1, 1, '09:00', '17:00')",
    [dentist],
  );

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
      data: res.status === 204 ? null : await res.json().catch(() => null),
      cookie: res.headers.get("set-cookie"),
      headers: res.headers,
    };
  }

  try {
    clearSentEmails();

    await t.test(
      "patient registration creates unverified account, auto-authenticates (Option A), and sends email",
      async () => {
        clearSentEmails();
        const regRes = await request("/auth/register-patient", {
          method: "POST",
          body: {
            name: "Patient Juan",
            email: "juan@example.test",
            phone: "+639171234567",
            password: "SecurePassword123!",
          },
        });
        assert.equal(regRes.status, 201);
        assert.equal(regRes.data.registered, true);
        assert.equal(regRes.data.signedIn, true);
        assert.equal(regRes.data.isEmailVerified, false);
        assert.ok(regRes.cookie, "Should set session cookie on registration");

        // Verify sent emails recorded token and 6-digit code
        const sent = getSentEmails();
        assert.equal(sent.length, 1);
        assert.equal(sent[0].to, "juan@example.test");
        assert.ok(sent[0].token);
        assert.match(sent[0].code, /^\d{6}$/);

        // Verify session returns isEmailVerified = false
        const meRes = await request("/auth/me", { cookie: regRes.cookie });
        assert.equal(meRes.status, 200);
        assert.equal(meRes.data.user.email, "juan@example.test");
        assert.equal(meRes.data.user.isEmailVerified, false);

        // Attempting to book an appointment while unverified must return 403
        const bookRes = await request("/workspaces/patient/appointments", {
          method: "POST",
          cookie: regRes.cookie,
          body: {
            clinicId: clinic,
            dentistId: dentist,
            serviceIds: [service],
            serviceId: service,
            date: "2026-11-23",
            time: "10:00",
            email: "juan@example.test",
            phone: "+639171234567",
            requestKey: "req-unverified-1",
            expectedPrice: "1200",
            expectedDuration: 30,
          },
        });
        assert.equal(bookRes.status, 403);
        assert.match(
          bookRes.data.error,
          /verify your email address before booking/,
        );

        // Verify email using the token from the email
        const verifyRes = await request("/auth/verify-email", {
          method: "POST",
          body: { token: sent[0].token },
        });
        assert.equal(verifyRes.status, 200);
        assert.equal(verifyRes.data.verified, true);

        // Now session should show isEmailVerified = true
        const meAfterVerify = await request("/auth/me", { cookie: regRes.cookie });
        assert.equal(meAfterVerify.status, 200);
        assert.equal(meAfterVerify.data.user.isEmailVerified, true);
      },
    );

    await t.test(
      "patient registration and verification via 6-digit numeric OTP code",
      async () => {
        clearSentEmails();
        const regRes = await request("/auth/register-patient", {
          method: "POST",
          body: {
            name: "Patient Maria",
            email: "maria@example.test",
            phone: "+639179876543",
            password: "MariaStrongPassword123!",
          },
        });
        assert.equal(regRes.status, 201);
        const sent = getSentEmails();
        assert.equal(sent.length, 1);
        const otpCode = sent[0].code;

        // Submitting invalid code fails
        const badCodeRes = await request("/auth/verify-email", {
          method: "POST",
          cookie: regRes.cookie,
          body: { code: "000000" },
        });
        assert.equal(badCodeRes.status, 400);

        // Submitting valid code succeeds
        const goodCodeRes = await request("/auth/verify-email", {
          method: "POST",
          cookie: regRes.cookie,
          body: { code: otpCode },
        });
        assert.equal(goodCodeRes.status, 200);
        assert.equal(goodCodeRes.data.verified, true);

        // Check account status is verified
        const meRes = await request("/auth/me", { cookie: regRes.cookie });
        assert.equal(meRes.data.user.isEmailVerified, true);
      },
    );

    await t.test("resend verification email with cooldown / token rotation", async () => {
      clearSentEmails();
      const regRes = await request("/auth/register-patient", {
        method: "POST",
        body: {
          name: "Patient Pedro",
          email: "pedro@example.test",
          phone: "+639175556666",
          password: "PedroPassword123!",
        },
      });
      assert.equal(regRes.status, 201);
      assert.equal(getSentEmails().length, 1);
      const firstCode = getSentEmails()[0].code;

      // Resend verification
      const resendRes = await request("/auth/resend-verification", {
        method: "POST",
        cookie: regRes.cookie,
      });
      assert.equal(resendRes.status, 200);
      assert.equal(resendRes.data.sent, true);
      assert.equal(getSentEmails().length, 2);
      const secondCode = getSentEmails()[1].code;

      // Old code is invalidated when new code is generated
      const verifyOldRes = await request("/auth/verify-email", {
        method: "POST",
        cookie: regRes.cookie,
        body: { code: firstCode },
      });
      assert.equal(verifyOldRes.status, 400);

      // New code verifies successfully
      const verifyNewRes = await request("/auth/verify-email", {
        method: "POST",
        cookie: regRes.cookie,
        body: { code: secondCode },
      });
      assert.equal(verifyNewRes.status, 200);
      assert.equal(verifyNewRes.data.verified, true);
    });

    await t.test("forgot password and reset password flow", async () => {
      clearSentEmails();
      // Request password reset for existing patient
      const forgotRes = await request("/auth/forgot-password", {
        method: "POST",
        body: { email: "pedro@example.test" },
      });
      assert.equal(forgotRes.status, 200);
      assert.equal(forgotRes.data.sent, true);

      const sent = getSentEmails();
      assert.ok(sent.length >= 1);
      const resetEmail = sent[sent.length - 1];
      assert.equal(resetEmail.to, "pedro@example.test");
      assert.ok(resetEmail.token);
      assert.ok(resetEmail.code);

      // Reset password using the code
      const newPassword = "BrandNewPedroPassword2026!";
      const resetRes = await request("/auth/reset-password", {
        method: "POST",
        body: {
          email: "pedro@example.test",
          code: resetEmail.code,
          password: newPassword,
        },
      });
      assert.equal(resetRes.status, 200);
      assert.equal(resetRes.data.reset, true);

      // Sign in with the old password must now fail
      const oldLoginRes = await request("/auth/patient/login", {
        method: "POST",
        body: { email: "pedro@example.test", password: "PedroPassword123!" },
      });
      assert.equal(oldLoginRes.status, 401);

      // Sign in with the new password succeeds
      const newLoginRes = await request("/auth/patient/login", {
        method: "POST",
        body: { email: "pedro@example.test", password: newPassword },
      });
      assert.equal(newLoginRes.status, 200);
      assert.ok(newLoginRes.cookie);
    });

    await t.test("Google authentication for new and existing patients", async () => {
      // 1. New patient signs in with Google
      const mockGoogleTokenNew = `mock-google-token:${JSON.stringify({
        email: "google.patient@example.test",
        sub: "google-uid-12345",
        name: "Google Patient",
      })}`;

      const googleRes = await request("/auth/google", {
        method: "POST",
        body: { credential: mockGoogleTokenNew },
      });
      assert.equal(googleRes.status, 200);
      assert.equal(googleRes.data.signedIn, true);
      assert.ok(googleRes.cookie);

      // New Google patient must have isEmailVerified = true automatically
      const meRes = await request("/auth/me", { cookie: googleRes.cookie });
      assert.equal(meRes.status, 200);
      assert.equal(meRes.data.user.email, "google.patient@example.test");
      assert.equal(meRes.data.user.isEmailVerified, true);
      assert.equal(meRes.data.user.role, "patient");

      // 2. Existing patient signs in with Google (links google_id and verifies email)
      const mockGoogleTokenExisting = `mock-google-token:${JSON.stringify({
        email: "juan@example.test",
        sub: "google-uid-juan",
        name: "Patient Juan",
      })}`;

      const linkRes = await request("/auth/google", {
        method: "POST",
        body: { credential: mockGoogleTokenExisting },
      });
      assert.equal(linkRes.status, 200);
      assert.equal(linkRes.data.signedIn, true);
      assert.ok(linkRes.cookie);

      const meLink = await request("/auth/me", { cookie: linkRes.cookie });
      assert.equal(meLink.status, 200);
      assert.equal(meLink.data.user.email, "juan@example.test");
      assert.equal(meLink.data.user.isEmailVerified, true);

      // 3. Clinic staff account cannot use patient Google sign-in
      const mockGoogleStaff = `mock-google-token:${JSON.stringify({
        email: "owner@clinic.test",
        sub: "google-uid-staff",
        name: "Clinic Owner",
      })}`;

      const rejectRes = await request("/auth/google", {
        method: "POST",
        body: { credential: mockGoogleStaff },
      });
      assert.equal(rejectRes.status, 403);
      assert.match(rejectRes.data.error, /Google sign-in is only available for patient accounts/);
    });
  } finally {
    server.close();
  }
});
