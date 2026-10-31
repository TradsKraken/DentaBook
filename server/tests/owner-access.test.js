const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const bcrypt = require("bcrypt");
const { PGlite } = require("@electric-sql/pglite");
const { pgcrypto } = require("@electric-sql/pglite/contrib/pgcrypto");
const { createApp } = require("../app");
const { migrate } = require("../database/migrate");
const { createOwnerAccount } = require("../owner-account");

test("explicit owner access keeps portal roles, clinic boundaries, and development credentials scoped", async t => {
  const saved = Object.fromEntries(["NODE_ENV", "APP_PORTAL", "CLIENT_URL"].map(key => [key, process.env[key]]));
  const db = new PGlite({ extensions: { pgcrypto } });
  const pool = {
    async query(sql, values) { return values ? db.query(sql, values) : (await db.exec(sql)).at(-1); },
    async connect() { return { query: pool.query, release() {} }; },
  };
  await db.exec(await fs.readFile(path.join(__dirname, "../database/init.sql"), "utf8"));
  await migrate(pool);
  await migrate(pool);
  process.env.NODE_ENV = "development";
  const development = await createOwnerAccount(pool, { username: "admin", name: "Administrator", secret: "admin123", development: true });
  const productionSecret = "Production owner integration password!";
  const owner = await createOwnerAccount(pool, { username: "siteowner", name: "Site owner", secret: productionSecret });
  const staff = (await db.query("INSERT INTO users (full_name,email,password_hash,role) VALUES ('Staff','staff@example.test',$1,'clinic_staff') RETURNING id", [await bcrypt.hash(productionSecret, 12)])).rows[0];
  const first = (await db.query("INSERT INTO clinics (owner_user_id,name,address,phone,email,status) VALUES ($1,'First test clinic','Test address','09123456789','first@example.test','approved') RETURNING id", [staff.id])).rows[0];
  const second = (await db.query("INSERT INTO clinics (name,address,phone,email,status) VALUES ('Second test clinic','Second address','09123456789','second@example.test','pending_review') RETURNING id")).rows[0];

  async function withPortal(portal, production, run) {
    process.env.APP_PORTAL = portal;
    process.env.NODE_ENV = production ? "production" : "development";
    process.env.CLIENT_URL = `${production ? "https" : "http"}://${portal}.example.test`;
    const server = createApp(pool).listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    const request = async (route, { body, cookie } = {}) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api${route}`, {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json", "X-DentaBook-Request": "1", Origin: process.env.CLIENT_URL, Connection: "close", ...(cookie ? { Cookie: cookie } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, data: response.status === 204 ? null : await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
    };
    try { await run(request); } finally { await new Promise(resolve => server.close(resolve)); }
  }
  const signIn = (request, portal, username = "admin", password = "admin123", cookie) => request(`/auth/${portal}/login`, { body: { email: username, password }, cookie });
  try {
    await t.test("development owner can sign into each portal with an effective role and one-hour session", async () => {
      for (const [portal, role] of [["patient", "patient"], ["clinic", "clinic_staff"], ["admin", "system_admin"]]) {
        await withPortal(portal, false, async request => {
          const login = await signIn(request, portal);
          assert.equal(login.status, 200);
          const me = await request("/auth/me", { cookie: login.cookie });
          assert.equal(me.status, 200);
          assert.equal(me.data.user.id, development.id);
          assert.equal(me.data.user.role, role);
          assert.equal(me.data.user.ownerAccess, true);
          assert.equal(me.data.user.username, "admin");
          const session = (await db.query("SELECT EXTRACT(EPOCH FROM (expires_at-created_at)) AS seconds FROM sessions WHERE user_id=$1 AND role=$2 ORDER BY created_at DESC LIMIT 1", [development.id, role])).rows[0];
          assert.ok(Math.abs(Number(session.seconds) - 3600) < 2);
          if (portal === "patient") assert.deepEqual((await request("/workspaces/patient/appointments", { cookie: login.cookie })).data.appointments, []);
          if (portal === "admin") assert.equal((await request("/workspaces/admin/clinics", { cookie: login.cookie })).status, 200);
        });
      }
    });
    await t.test("owner clinic selector lists existing records and requires an explicit valid selection", async () => {
      await withPortal("public", false, async request => {
        const { cookie } = await signIn(request, "clinic");
        const options = await request("/workspaces/clinic/options", { cookie });
        assert.deepEqual(options.data.clinics.map(clinic => clinic.id).sort(), [first.id, second.id].sort());
        assert.equal((await request("/workspaces/clinic", { cookie })).status, 400);
        assert.equal((await request("/workspaces/clinic?clinicId=bad", { cookie })).status, 400);
        assert.equal((await request("/workspaces/clinic?clinicId=00000000-0000-4000-8000-000000000000", { cookie })).status, 404);
        for (const clinic of [first, second]) {
          const workspace = await request(`/workspaces/clinic?clinicId=${clinic.id}`, { cookie });
          assert.equal(workspace.status, 200);
          assert.equal(workspace.data.clinic.id, clinic.id);
        }
        assert.equal((await db.query("SELECT status FROM clinics WHERE id=$1", [second.id])).rows[0].status, "pending_review");
      });
    });
    await t.test("ordinary staff cannot enumerate or select other clinics", async () => {
      await withPortal("public", false, async request => {
        const { cookie } = await signIn(request, "clinic", "staff@example.test", productionSecret);
        assert.equal((await request("/workspaces/clinic/options", { cookie })).status, 403);
        assert.equal((await request(`/workspaces/clinic?clinicId=${second.id}`, { cookie })).status, 403);
        assert.equal((await request("/workspaces/clinic", { cookie })).data.clinic.id, first.id);
      });
    });
    await t.test("owner patient and clinic sessions do not become administrator sessions", async () => {
      await withPortal("all", false, async request => {
        const patient = await signIn(request, "patient");
        assert.equal((await request("/workspaces/admin/clinics", { cookie: patient.cookie })).status, 403);
        assert.equal((await request("/workspaces/clinic/options", { cookie: patient.cookie })).status, 403);
        const clinic = await signIn(request, "clinic", "admin", "admin123", patient.cookie);
        assert.equal((await request("/auth/me", { cookie: patient.cookie })).status, 401);
        assert.equal((await request("/workspaces/admin/clinics", { cookie: clinic.cookie })).status, 403);
        assert.equal((await request("/workspaces/patient/appointments", { cookie: clinic.cookie })).status, 403);
      });
    });
    await t.test("development credentials and preexisting development sessions fail in production", async () => {
      let cookie;
      await withPortal("public", false, async request => { cookie = (await signIn(request, "patient")).cookie; });
      for (const portal of ["patient", "clinic", "admin"]) await withPortal(portal === "admin" ? "admin" : "public", true, async request => {
        assert.equal((await signIn(request, portal)).status, 401);
        assert.equal((await request("/auth/me", { cookie: `__Host-${cookie}` })).status, 401);
      });
    });
    await t.test("strong-password owner works in production while foreign routes and transplanted roles remain blocked", async () => {
      let adminCookie;
      await withPortal("admin", true, async request => { adminCookie = (await signIn(request, "admin", "siteowner", productionSecret)).cookie; });
      await withPortal("public", true, async request => {
        assert.equal((await request("/auth/me", { cookie: adminCookie.replace("admin_session", "public_session") })).status, 403);
        assert.equal((await request("/workspaces/admin/clinics")).status, 404);
        for (const portal of ["patient", "clinic"]) {
          const login = await signIn(request, portal, "siteowner", productionSecret);
          assert.equal(login.status, 200);
          assert.equal((await request("/auth/me", { cookie: login.cookie })).status, 200);
        }
      });
    });
    await t.test("public registration cannot create usernames, grant owner access, or change roles", async () => {
      await withPortal("public", false, async request => {
        const result = await request("/auth/register-patient", { body: { name: "Ordinary patient", email: "patient@example.test", phone: "09123456789", password: productionSecret, role: "system_admin", owner_access: true, ownerAccess: true, development_only: false, username: "pretendowner" } });
        assert.equal(result.status, 201);
        const user = (await db.query("SELECT role, owner_access, username FROM users WHERE email='patient@example.test'")).rows[0];
        assert.deepEqual(user, { role: "patient", owner_access: false, username: null });
      });
    });
    await t.test("owner grant revocation invalidates sessions and prevents further cross-role sign-in", async () => {
      await withPortal("public", true, async request => {
        const { cookie } = await signIn(request, "clinic", "siteowner", productionSecret);
        await db.query("UPDATE users SET owner_access=FALSE WHERE id=$1", [owner.id]);
        assert.equal((await db.query("SELECT * FROM sessions WHERE user_id=$1", [owner.id])).rows.length, 0);
        assert.equal((await request("/auth/me", { cookie })).status, 401);
        assert.equal((await signIn(request, "clinic", "siteowner", productionSecret)).status, 401);
        await db.query("UPDATE users SET owner_access=TRUE WHERE id=$1", [owner.id]);
      });
    });
    await t.test("a grant revoked during password verification cannot mint a portal session", async () => {
      await withPortal("public", true, async request => {
        const original = pool.query;
        let changed = false;
        pool.query = async (sql, values) => {
          if (!changed && sql.includes("INSERT INTO sessions")) {
            changed = true;
            await db.query("UPDATE users SET owner_access=FALSE WHERE id=$1", [owner.id]);
          }
          return original(sql, values);
        };
        try { assert.equal((await signIn(request, "clinic", "siteowner", productionSecret)).status, 401); }
        finally { pool.query = original; await db.query("UPDATE users SET owner_access=TRUE WHERE id=$1", [owner.id]); }
      });
    });
    await t.test("development-only account provisioning refuses production before insertion", async () => {
      process.env.NODE_ENV = "production";
      await assert.rejects(createOwnerAccount(pool, { username: "blocked", name: "Blocked", secret: "admin123", development: true }), /NODE_ENV=development/);
      await assert.rejects(createOwnerAccount(pool, { username: "weak", name: "Weak", secret: "admin123" }), /12\+/);
      assert.equal((await db.query("SELECT id FROM users WHERE username IN ('blocked','weak')")).rows.length, 0);
    });
    await t.test("provisioning never overwrites an existing username or resets its password", async () => {
      process.env.NODE_ENV = "development";
      const before = (await db.query("SELECT password_hash FROM users WHERE id=$1", [development.id])).rows[0].password_hash;
      await assert.rejects(createOwnerAccount(pool, { username: "ADMIN", name: "Replacement", secret: "different password", development: true }), error => error.code === "23505");
      assert.equal((await db.query("SELECT password_hash FROM users WHERE id=$1", [development.id])).rows[0].password_hash, before);
    });
  } finally {
    for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await db.close();
  }
});
