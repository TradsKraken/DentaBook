const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { PGlite } = require("@electric-sql/pglite");
const { pgcrypto } = require("@electric-sql/pglite/contrib/pgcrypto");
const { migrate } = require("../database/migrate");
const { createApp } = require("../app");
const { hashToken } = require("../auth");

test("clinic setup persists real data and enforces clinic and portal boundaries", async t => {
  const db = new PGlite({ extensions: { pgcrypto } });
  const pool = { async query(sql, values) { return values ? db.query(sql, values) : (await db.exec(sql)).at(-1); }, async connect() { return { query: pool.query, release() {} }; } };
  await db.exec(await fs.readFile(path.join(__dirname, "../database/init.sql"), "utf8"));
  await migrate(pool);
  const savedPortal = process.env.APP_PORTAL;
  process.env.APP_PORTAL = "public";
  const server = createApp(pool).listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const base = "/workspaces/clinic/manage";
  async function account(role, ownerAccess = false, sessionRole = role) {
    const id = (await db.query("INSERT INTO users (full_name,email,password_hash,role,owner_access) VALUES ('Test Account',$1,'unused',$2,$3) RETURNING id", [`${crypto.randomUUID()}@example.test`, role, ownerAccess])).rows[0].id;
    const token = crypto.randomBytes(32).toString("hex");
    await db.query("INSERT INTO sessions (token_hash,user_id,role,expires_at) VALUES ($1,$2,$3,CURRENT_TIMESTAMP + INTERVAL '1 day')", [hashToken(token), id, sessionRole]);
    return { id, cookie: `dentabook_public_session=${token}` };
  }
  async function request(route, { method = "GET", body, cookie = staff.cookie, headers = {} } = {}) {
    const response = await fetch(origin + "/api" + route, { method, headers: { "Content-Type": "application/json", "X-DentaBook-Request": "1", Cookie: cookie, ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  }
  const staff = await account("clinic_staff");
  const other = await account("clinic_staff");
  const patient = await account("patient");
  const admin = await account("system_admin");
  const owner = await account("system_admin", true, "clinic_staff");
  async function clinic(userId, name) {
    return (await db.query("INSERT INTO clinics (owner_user_id,name,address,phone,email,status) VALUES ($1,$2,'Test address','09123456789','clinic@example.test','approved') RETURNING id", [userId, name])).rows[0].id;
  }
  const clinicId = await clinic(staff.id, "Setup test clinic");
  const otherClinic = await clinic(other.id, "Other test clinic");
  const service = { name: "Test cleaning", category: "Preventive", description: "Test description", price: "1200.50", duration: 45, isActive: true };
  const dentist = { name: "Test Dentist", title: "Test title", credentials: "Test qualifications", isActive: true };
  let serviceId, dentistId, scheduleId;
  try {
    await t.test("authentication, role, clinic selectors, and mutation verification", async () => {
      assert.equal((await request(base, { cookie: "" })).status, 401);
      for (const cookie of [patient.cookie, admin.cookie]) {
        assert.equal((await request(base, { cookie })).status, 403);
        assert.equal((await request(base + "/services", { method: "POST", body: service, cookie })).status, 403);
      }
      assert.equal((await request(base + `?clinicId=${otherClinic}`)).status, 403);
      assert.equal((await request(base, { cookie: owner.cookie })).status, 400);
      assert.equal((await request(base + `?clinicId=${otherClinic}`, { cookie: owner.cookie })).data.clinic.id, otherClinic);
      assert.equal((await request(base + "/services", { method: "POST", body: service, headers: { "X-DentaBook-Request": "" } })).status, 403);
      assert.equal((await request(base + "/services", { method: "POST", body: service, headers: { Origin: "https://foreign.example.test" } })).status, 403);
    });
    await t.test("profile edits publish immediately without changing ownership, approval, or account email", async () => {
      const body = { name: "Renamed test clinic", description: "Updated test details", address: "Updated address", phone: "09123456789", email: "updated@example.test", status: "suspended", owner_user_id: other.id };
      assert.equal((await request(base + "/profile", { method: "PUT", body: { ...body, phone: "invalid" } })).status, 400);
      assert.equal((await request(base + "/profile", { method: "PUT", body })).status, 200);
      const publicClinic = (await request(`/clinics/${clinicId}`)).data.clinic;
      assert.equal(publicClinic.name, body.name);
      assert.equal(publicClinic.description, body.description);
      const record = (await db.query("SELECT owner_user_id,status FROM clinics WHERE id=$1", [clinicId])).rows[0];
      assert.deepEqual(record, { owner_user_id: staff.id, status: "approved" });
      assert.notEqual((await db.query("SELECT email FROM users WHERE id=$1", [staff.id])).rows[0].email, body.email);
    });
    await t.test("services and dentists persist, edit, and hide without deleting history", async () => {
      assert.equal((await request(base + "/services", { method: "POST", body: { ...service, price: "-1" } })).status, 400);
      assert.equal((await request(base + "/services", { method: "POST", body: { ...service, duration: 0 } })).status, 400);
      const created = await request(base + "/services", { method: "POST", body: { ...service, clinic_id: otherClinic } });
      assert.equal(created.status, 201); serviceId = created.data.service.id;
      const added = await request(base + "/dentists", { method: "POST", body: dentist });
      assert.equal(added.status, 201); dentistId = added.data.dentist.id;
      let publicClinic = (await request(`/clinics/${clinicId}`)).data.clinic;
      assert.equal(publicClinic.services[0].id, serviceId);
      assert.equal(publicClinic.dentists[0].id, dentistId);
      assert.equal(Number(publicClinic.services[0].price), 1200.5);
      for (const [route, body] of [[`/services/${serviceId}`, { ...service, isActive: false }], [`/dentists/${dentistId}`, { ...dentist, isActive: false }]]) {
        assert.equal((await request(base + route, { method: "PUT", body })).status, 200);
        assert.equal((await request(base + route, { method: "PUT", body, cookie: other.cookie })).status, 404);
      }
      publicClinic = (await request(`/clinics/${clinicId}`)).data.clinic;
      assert.equal(publicClinic.services.length, 0); assert.equal(publicClinic.dentists.length, 0);
      const privateData = (await request(base)).data;
      assert.equal(privateData.services.length, 1); assert.equal(privateData.dentists.length, 1);
      assert.equal(privateData.services[0].isActive, false);
      assert.equal((await request(base, { cookie: other.cookie })).data.services.length, 0);
      await request(base + `/dentists/${dentistId}`, { method: "PUT", body: dentist });
    });
    await t.test("weekly schedules reject invalid times, overlaps, and foreign dentists", async () => {
      const body = { dentistId, day: 1, start: "09:00", end: "12:00" };
      assert.equal((await request(base + "/schedules", { method: "POST", body: { ...body, end: "08:00" } })).status, 400);
      assert.equal((await request(base + "/schedules", { method: "POST", body: { ...body, day: 7 } })).status, 400);
      assert.equal((await request(base + "/schedules", { method: "POST", body, cookie: other.cookie })).status, 400);
      const created = await request(base + "/schedules", { method: "POST", body });
      assert.equal(created.status, 201); scheduleId = created.data.schedule.id;
      assert.equal((await request(base + "/schedules", { method: "POST", body: { ...body, start: "11:00", end: "13:00" } })).status, 409);
      assert.equal((await request(base + "/schedules", { method: "POST", body: { ...body, start: "12:00", end: "13:00" } })).status, 201);
      assert.equal((await request(base)).data.schedules[0].start, "09:00");
      assert.equal((await request(base + `/schedules/${scheduleId}`, { method: "DELETE", cookie: other.cookie })).status, 404);
      assert.equal((await request(base + `/schedules/${scheduleId}`, { method: "DELETE" })).status, 200);
      assert.equal((await request(base)).data.schedules.length, 1);
      await request(base + `/dentists/${dentistId}`, { method: "PUT", body: { ...dentist, isActive: false } });
      assert.equal((await request(base + "/schedules", { method: "POST", body: { ...body, day: 2 } })).status, 400);
    });
    await t.test("suspension blocks existing sessions and owner writes, then expired sessions lose access", async () => {
      for (const status of ["pending_review", "rejected", "suspended"]) {
        await db.query("UPDATE clinics SET status=$1 WHERE id=$2", [status, clinicId]);
        assert.equal((await request(base)).status, 403);
        assert.equal((await request(base + "/services", { method: "POST", body: service })).status, 403);
        assert.equal((await request(base + `/services?clinicId=${clinicId}`, { method: "POST", body: service, cookie: owner.cookie })).status, 403);
      }
      await db.query("UPDATE sessions SET expires_at=CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE user_id=$1", [staff.id]);
      assert.equal((await request(base)).status, 401);
      process.env.APP_PORTAL = "admin";
      assert.equal((await request(base)).status, 404);
      assert.equal((await request(base + "/services", { method: "POST", body: service })).status, 404);
    });
  } finally {
    if (savedPortal === undefined) delete process.env.APP_PORTAL; else process.env.APP_PORTAL = savedPortal;
    await new Promise(resolve => server.close(resolve)); await db.close();
  }
});
