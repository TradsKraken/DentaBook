const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const bcrypt = require("bcrypt");
const { PGlite } = require("@electric-sql/pglite");
const { pgcrypto } = require("@electric-sql/pglite/contrib/pgcrypto");
const { createApp } = require("../app");
const { migrate } = require("../database/migrate");

test("separated production APIs reject foreign routes, origins, and sessions", async (t) => {
  const saved = Object.fromEntries(["APP_PORTAL", "CLIENT_URL", "NODE_ENV"].map(key => [key, process.env[key]]));
  const db = new PGlite({ extensions: { pgcrypto } });
  const pool = {
    async query(sql, values) { return values ? db.query(sql, values) : (await db.exec(sql)).at(-1); },
    async connect() { return { query: pool.query, release() {} }; },
  };
  const portals = [
    { portal: "patient", role: "patient", workspace: "/workspaces/patient/appointments", register: "/auth/register-patient" },
    { portal: "clinic", role: "clinic_staff", workspace: "/workspaces/clinic", register: "/auth/register-clinic" },
    { portal: "admin", role: "system_admin", workspace: "/workspaces/admin/clinics" },
  ];
  const password = "Portal isolation testing password!";
  async function withPortal(portal, run) {
    process.env.APP_PORTAL = portal;
    process.env.CLIENT_URL = `https://${portal}.example.test`;
    process.env.NODE_ENV = "production";
    const server = createApp(pool).listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    async function request(route, { body, cookie, origin, headers = {} } = {}) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api${route}`, {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json", "X-DentaBook-Request": "1", Origin: origin || process.env.CLIENT_URL, Connection: "close", ...(cookie ? { Cookie: cookie } : {}), ...headers },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      await response.arrayBuffer();
      return response;
    }
    try { await run(request); } finally { await new Promise(resolve => server.close(resolve)); }
  }
  try {
    await db.exec(await fs.readFile(path.join(__dirname, "../database/init.sql"), "utf8"));
    await migrate(pool);
    const hash = await bcrypt.hash(password, 12);
    for (const account of portals) {
      account.email = `${account.portal}@example.test`;
      account.id = (await db.query("INSERT INTO users (full_name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id", [account.portal, account.email, hash, account.role])).rows[0].id;
    }
    await db.query("INSERT INTO clinics (owner_user_id,name,address,phone,email,status) VALUES ($1,'Isolation test clinic','Test address','123456789','clinic@example.test','approved')", [portals[1].id]);
    await t.test("each portal issues its own secure host-only cookie", async () => {
      for (const account of portals) await withPortal(account.portal, async request => {
        const response = await request(`/auth/${account.portal}/login`, { body: { email: account.email, password } });
        assert.equal(response.status, 200);
        const cookie = response.headers.get("set-cookie");
        assert.ok(cookie.startsWith(`__Host-dentabook_${account.portal}_session=`));
        assert.match(cookie, /; Secure/);
        assert.match(cookie, /; HttpOnly/);
        assert.match(cookie, /; SameSite=Strict/);
        assert.doesNotMatch(cookie, /Domain=/i);
        account.cookie = cookie.split(";")[0];
        account.token = account.cookie.split("=")[1];
      });
    });
    for (const portal of portals) await t.test(`${portal.portal} API isolates endpoints and rejects transplanted sessions`, async () => {
      await withPortal(portal.portal, async request => {
        assert.equal((await request("/health")).status, 200);
        assert.equal((await request(portal.workspace)).status, 401);
        assert.equal((await request(portal.workspace, { cookie: portal.cookie })).status, 200);
        assert.equal((await request("/auth/me", { cookie: portal.cookie })).status, 200);
        for (const other of portals.filter(account => account !== portal)) {
          assert.equal((await request(`/auth/${other.portal}/login`, { body: {}, headers: { "X-DentaBook-Portal": other.portal } })).status, 404);
          assert.equal((await request(other.workspace, { cookie: other.cookie })).status, 404);
          if (other.register) assert.equal((await request(other.register, { body: {} })).status, 404);
          assert.equal((await request("/auth/me", { cookie: other.cookie })).status, 401);
          const transplanted = `__Host-dentabook_${portal.portal}_session=${other.token}`;
          assert.equal((await request("/auth/me", { cookie: transplanted })).status, 403);
          assert.equal((await request(`/auth/${portal.portal}/login`, { body: { email: other.email, password } })).status, 401);
          assert.equal((await request(`/auth/${portal.portal}/login`, { body: {}, origin: `https://${other.portal}.example.test` })).status, 403);
        }
        if (portal.register) assert.equal((await request(portal.register, { body: {} })).status, 400);
        else {
          assert.equal((await request("/auth/register-patient", { body: {} })).status, 404);
          assert.equal((await request("/auth/register-clinic", { body: {} })).status, 404);
        }
      });
    });
    await t.test("shared patient/clinic API keeps administrator access separate and enforces each account role", async () => {
      await withPortal("public", async request => {
        assert.equal((await request("/auth/admin/login", { body: {} })).status, 404);
        assert.equal((await request("/workspaces/admin/clinics")).status, 404);
        for (const account of portals.slice(0, 2)) {
          assert.equal((await request(account.register, { body: {} })).status, 400);
          const login = await request(`/auth/${account.portal}/login`, { body: { email: account.email, password } });
          assert.equal(login.status, 200);
          const cookie = login.headers.get("set-cookie").split(";")[0];
          assert.ok(cookie.startsWith("__Host-dentabook_public_session="));
          assert.equal((await request(account.workspace, { cookie })).status, 200);
          const other = portals.slice(0, 2).find(value => value !== account);
          assert.equal((await request(other.workspace, { cookie })).status, 403);
        }
        const admin = portals[2];
        assert.equal((await request("/auth/me", { cookie: `__Host-dentabook_public_session=${admin.token}` })).status, 403);
        assert.equal((await request("/auth/patient/login", { body: {}, origin: "https://admin.example.test" })).status, 403);
        assert.equal((await request("/auth/patient/login", { body: { email: admin.email, password } })).status, 401);
        assert.equal((await request("/auth/clinic/login", { body: { email: admin.email, password } })).status, 401);
      });
    });
    await t.test("invalid portal configuration fails closed", () => {
      for (const invalid of ["invalid", "constructor", "__proto__", "patient "]) {
        process.env.APP_PORTAL = invalid;
        assert.throws(() => createApp(pool), /APP_PORTAL/);
      }
    });
  } finally {
    await db.close();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
