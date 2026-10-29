const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const bcrypt = require("bcrypt");
const { PGlite } = require("@electric-sql/pglite");
const { pgcrypto } = require("@electric-sql/pglite/contrib/pgcrypto");
const { migrate } = require("../database/migrate");
const { createApp } = require("../app");

test("portal security boundaries and credential lifecycle", async (t) => {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(await fs.readFile(path.join(__dirname, "../database/init.sql"), "utf8"));
  const pool = {
    async query(sql, values) { return values ? db.query(sql, values) : (await db.exec(sql)).at(-1); },
    async connect() { return { query: pool.query, release() {} }; },
  };
  await migrate(pool);
  const password = "Security integration password!";
  const hash = await bcrypt.hash(password, 12);
  const portals = [
    { role: "patient", login: "/patient/login", workspace: "/patient/appointments" },
    { role: "clinic_staff", login: "/clinic/login", workspace: "/clinic" },
    { role: "system_admin", login: "/admin/login", workspace: "/admin/clinics" },
  ];
  for (const portal of portals) {
    portal.email = `${portal.role}@example.test`;
    portal.id = (await db.query(
      "INSERT INTO users (full_name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id",
      [portal.role, portal.email, hash, portal.role],
    )).rows[0].id;
  }
  await db.query(
    "INSERT INTO clinics (owner_user_id,name,address,phone,email,status) VALUES ($1,'Test Clinic','Test address','123456789','clinic@example.test','approved')",
    [portals[1].id],
  );
  const server = createApp(pool).listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  async function request(route, { body, cookie, headers = {} } = {}) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${route}`, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json", "X-DentaBook-Request": "1", Connection: "close",
        ...(cookie ? { Cookie: cookie } : {}), ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    await response.arrayBuffer();
    return response;
  }
  const login = portal => request(`/auth${portal.login}`, { body: { email: portal.email, password } });
  try {
    await t.test("only the matching account role can sign into each portal", async () => {
      for (const account of portals) {
        for (const portal of portals) {
          const response = await request(`/auth${portal.login}`, { body: { email: account.email, password } });
          assert.equal(response.status, account === portal ? 200 : 401);
          if (account === portal) account.cookie = response.headers.get("set-cookie").split(";")[0];
          else assert.equal(response.headers.get("set-cookie"), null);
        }
      }
    });
    await t.test("anonymous and other-portal cookies cannot read a workspace", async () => {
      for (const portal of portals) {
        assert.equal((await request(`/workspaces${portal.workspace}`)).status, 401);
        for (const account of portals) {
          const response = await request(`/workspaces${portal.workspace}`, { cookie: account.cookie });
          assert.equal(response.status, account === portal ? 200 : 403);
          assert.equal(response.headers.get("cache-control"), "no-store");
        }
      }
    });
    await t.test("cross-site metadata is rejected even with the custom request header", async () => {
      const response = await request("/auth/patient/login", {
        body: { email: portals[0].email, password }, headers: { "Sec-Fetch-Site": "cross-site" },
      });
      assert.equal(response.status, 403);
    });
    await t.test("sessions retain the sign-in role and administrators expire after an hour", async () => {
      const sessions = (await db.query("SELECT role, EXTRACT(EPOCH FROM (expires_at-created_at)) AS seconds FROM sessions")).rows;
      for (const session of sessions) {
        const duration = session.role === "system_admin" ? 3600 : 28800;
        assert.ok(Math.abs(Number(session.seconds) - duration) < 2);
      }
      await db.query("UPDATE sessions SET role='system_admin' WHERE user_id=$1", [portals[0].id]);
      assert.equal((await request("/auth/me", { cookie: portals[0].cookie })).status, 401);
      assert.equal((await request("/workspaces/admin/clinics", { cookie: portals[0].cookie })).status, 401);
    });
    await t.test("changing a role invalidates every existing session without granting new privileges", async () => {
      const patient = portals[0];
      const response = await login(patient);
      const cookie = response.headers.get("set-cookie").split(";")[0];
      await db.query("UPDATE users SET role='system_admin' WHERE id=$1", [patient.id]);
      assert.equal((await db.query("SELECT * FROM sessions WHERE user_id=$1", [patient.id])).rows.length, 0);
      assert.equal((await request("/workspaces/admin/clinics", { cookie })).status, 401);
    });
    await t.test("changing a password invalidates every existing session", async () => {
      const staff = portals[1];
      await login(staff);
      await db.query("UPDATE users SET password_hash=$1 WHERE id=$2", [await bcrypt.hash("Replacement secret password!", 12), staff.id]);
      assert.equal((await db.query("SELECT * FROM sessions WHERE user_id=$1", [staff.id])).rows.length, 0);
      assert.equal((await request("/auth/me", { cookie: staff.cookie })).status, 401);
      assert.equal((await login(staff)).status, 401);
    });
    await t.test("re-login rotates the browser session and logout revokes it", async () => {
      const admin = portals[2];
      const response = await request("/auth/admin/login", { body: { email: admin.email, password }, cookie: admin.cookie });
      const cookie = response.headers.get("set-cookie");
      assert.match(cookie, /HttpOnly/i);
      assert.match(cookie, /SameSite=Strict/i);
      assert.match(cookie, /Path=\/;/i);
      const token = cookie.split(";")[0];
      assert.notEqual(token, admin.cookie);
      assert.equal((await request("/auth/me", { cookie: admin.cookie })).status, 401);
      assert.equal((await request("/auth/logout", { body: {}, cookie: token })).status, 204);
      assert.equal((await request("/auth/me", { cookie: token })).status, 401);
    });
    await t.test("HTTPS cookies enforce the host prefix and cannot be replaced by a legacy cookie", async () => {
      const previous = process.env.CLIENT_URL;
      process.env.CLIENT_URL = "https://dentabook.forgroup.space";
      try {
        const response = await login(portals[2]);
        const cookie = response.headers.get("set-cookie");
        assert.match(cookie, /^__Host-dentabook_session=/);
        assert.match(cookie, /; Secure/i);
        assert.match(cookie, /Path=\/;/i);
        assert.doesNotMatch(cookie, /Domain=/i);
        const token = cookie.split(";")[0];
        assert.equal((await request("/auth/me", { cookie: token })).status, 200);
        assert.equal((await request("/auth/me", { cookie: token.replace("__Host-", "") })).status, 401);
        assert.equal((await request("/auth/logout", { body: {}, cookie: token })).status, 204);
      } finally {
        if (previous === undefined) delete process.env.CLIENT_URL;
        else process.env.CLIENT_URL = previous;
      }
    });
    await t.test("a credential change between password verification and session issuance cannot mint a session", async () => {
      const originalQuery = pool.query;
      let changed = false;
      pool.query = async (sql, values) => {
        if (!changed && sql.includes("INSERT INTO sessions")) {
          changed = true;
          await db.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash + "changed", portals[2].id]);
        }
        return originalQuery(sql, values);
      };
      try {
        const response = await login(portals[2]);
        assert.equal(changed, true);
        assert.equal(response.status, 401);
        assert.equal(response.headers.get("set-cookie"), null);
        assert.equal((await db.query("SELECT * FROM sessions WHERE user_id=$1", [portals[2].id])).rows.length, 0);
      } finally {
        pool.query = originalQuery;
      }
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    await db.close();
  }
});
