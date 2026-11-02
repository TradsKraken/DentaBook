const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { Pool } = require("pg");
const { PGlite } = require("@electric-sql/pglite");
const { pgcrypto } = require("@electric-sql/pglite/contrib/pgcrypto");
const { migrate } = require("../database/migrate");
const { createApp } = require("../app");
const { hashToken } = require("../auth");
const { bookingWindow } = require("../booking");

test("patient requests and clinic decisions persist with protected, atomic reservations", async t => {
  const native = process.env.DENTABOOK_ISOLATED_BOOKING_TEST === "1";
  const db = native ? new Pool({ host: "dentabook-booking-test-db", database: "dentabook_booking_test", user: "booking_test", password: "isolated_test_only" }) : new PGlite({ extensions: { pgcrypto } });
  const pool = native ? db : { async query(sql, values) { return values ? db.query(sql, values) : (await db.exec(sql)).at(-1); }, async connect() { return { query: pool.query, release() {} }; } };
  const schema = await fs.readFile(path.join(__dirname, "../database/init.sql"), "utf8");
  if (native) await db.query(schema); else await db.exec(schema);
  await migrate(pool); await migrate(pool);
  const previousPortal = process.env.APP_PORTAL; process.env.APP_PORTAL = "public";
  const server = createApp(pool, { logger: { error: (...args) => console.error(...args) } }).listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const base = "/workspaces/patient";
  const management = "/workspaces/clinic/manage";
  async function account(role, ownerAccess = false, sessionRole = role) {
    const id = (await db.query("INSERT INTO users (full_name,email,phone,password_hash,role,owner_access) VALUES ('Booking Test User',$1,'09123456789','unused',$2,$3) RETURNING id", [`${crypto.randomUUID()}@example.test`,role,ownerAccess])).rows[0].id;
    const token = crypto.randomBytes(32).toString("hex");
    await db.query("INSERT INTO sessions (token_hash,user_id,role,expires_at) VALUES ($1,$2,$3,CURRENT_TIMESTAMP + INTERVAL '1 day')", [hashToken(token),id,sessionRole]);
    return { id, cookie: `dentabook_public_session=${token}` };
  }
  const patient = await account("patient"), secondPatient = await account("patient"), staff = await account("clinic_staff"), otherStaff = await account("clinic_staff"), owner = await account("system_admin",true,"clinic_staff");
  async function request(route, { method = "GET", body, cookie = patient.cookie, headers = {} } = {}) {
    const response = await fetch(origin + "/api" + route, { method, headers: { "Content-Type": "application/json", "X-DentaBook-Request": "1", Cookie: cookie, ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  }
  async function clinic(userId, name) { return (await db.query("INSERT INTO clinics (owner_user_id,name,address,phone,email,status) VALUES ($1,$2,'Test address','09123456789','clinic@example.test','approved') RETURNING id", [userId,name])).rows[0].id; }
  const clinicId = await clinic(staff.id,"Booking test clinic"), otherClinic = await clinic(otherStaff.id,"Other booking test clinic");
  const serviceId = (await db.query("INSERT INTO services (clinic_id,name,category,estimated_price,duration_minutes) VALUES ($1,'Original treatment','General',1200.50,45) RETURNING id", [clinicId])).rows[0].id;
  const foreignService = (await db.query("INSERT INTO services (clinic_id,name,category,estimated_price) VALUES ($1,'Foreign treatment','General',100) RETURNING id", [otherClinic])).rows[0].id;
  const dentistId = (await db.query("INSERT INTO dentists (clinic_id,full_name) VALUES ($1,'Booking Test Dentist') RETURNING id", [clinicId])).rows[0].id;
  const foreignDentist = (await db.query("INSERT INTO dentists (clinic_id,full_name) VALUES ($1,'Foreign Test Dentist') RETURNING id", [otherClinic])).rows[0].id;
  const date = new Date(Date.parse(bookingWindow().minDate + "T00:00:00Z") + 86400000).toISOString().slice(0,10);
  const day = new Date(date + "T00:00:00Z").getUTCDay();
  await db.query("INSERT INTO dentist_schedules (dentist_id,day_of_week,start_time,end_time) VALUES ($1,$2,'09:00','12:00'),($1,$2,'13:00','17:00')", [dentistId,day]);
  const dentistBody = { name: "Booking Test Dentist", title: "Test title", credentials: "", isActive: true, serviceIds: [serviceId] };
  const body = { clinicId,serviceId,dentistId,date,time: "09:00",email: "patient@example.test",phone: "09123456789",notes: "Private test visit notes",requestKey: crypto.randomUUID(),expectedPrice: "1200.50",expectedDuration: 45,patient_user_id: secondPatient.id,estimated_total_cost: 0,status: "confirmed" };
  const query = changes => new URLSearchParams({ clinicId,serviceId,dentistId,date,...changes });
  let appointmentId, declinedId;
  const totalRequests = async () => Number((await db.query("SELECT COUNT(*) AS count FROM appointments")).rows[0].count);
  try {
    await t.test("all booking routes require the patient role and verified mutations", async () => {
      for (const route of [`${base}/booking-options?clinicId=${clinicId}`,`${base}/availability?${query()}`]) {
        assert.equal((await request(route,{cookie:""})).status,401);
        assert.equal((await request(route,{cookie:staff.cookie})).status,403);
      }
      assert.equal((await request(base + "/appointments",{method:"POST",body,cookie:staff.cookie})).status,403);
      assert.equal((await request(base + "/appointments",{method:"POST",body,headers:{Origin:"https://untrusted.example"}})).status,403);
      assert.equal((await request(base + "/appointments",{method:"POST",body,headers:{"X-DentaBook-Request":""}})).status,403);
    });
    await t.test("assignments stay within the clinic, persist, and enable real duration-based slots", async () => {
      assert.equal((await request(`${base}/availability?${query()}`)).status,409);
      assert.equal((await request(`${management}/dentists/${dentistId}`,{method:"PUT",body:dentistBody,cookie:staff.cookie})).status,200);
      assert.equal((await request(`${management}/dentists/${dentistId}`,{method:"PUT",body:{...dentistBody,serviceIds:[foreignService]},cookie:staff.cookie})).status,400);
      const saved = await request(management,{cookie:staff.cookie});
      assert.deepEqual(saved.data.assignments,[{dentistId,serviceId}]);
      const options = await request(`${base}/booking-options?clinicId=${clinicId}`);
      assert.equal(options.status,200); assert.deepEqual(options.data.dentists[0].serviceIds,[serviceId]);
      assert.equal(options.data.patient.phone,"09123456789");
      const available = await request(`${base}/availability?${query()}`);
      assert.equal(available.status,200); assert.equal(available.data.service.duration,45);
      assert.deepEqual(available.data.slots[0],{time:"09:00",end:"09:45"});
      assert.ok(available.data.slots.some(slot=>slot.time==="11:15"));
      assert.ok(!available.data.slots.some(slot=>slot.time==="11:30" || slot.time==="12:00"));
      assert.equal((await request(`${base}/availability?${query({dentistId:foreignDentist})}`)).status,409);
    });
    await t.test("invalid dates, times, and unavailable profiles never create requests", async () => {
      for (const invalid of ["2026-02-30","invalid","2000-01-01",new Date(Date.now()+100*86400000).toISOString().slice(0,10)])
        assert.equal((await request(`${base}/availability?${query({date:invalid})}`)).status,400);
      assert.equal((await request(base+"/appointments",{method:"POST",body:{...body,time:"25:00"}})).status,400);
      assert.equal((await request(base+"/appointments",{method:"POST",body:{...body,time:"12:15"}})).status,409);
      await db.query("UPDATE dentists SET is_active=FALSE WHERE id=$1",[dentistId]);
      assert.equal((await request(`${base}/availability?${query()}`)).status,409);
      await db.query("UPDATE dentists SET is_active=TRUE WHERE id=$1",[dentistId]);
      assert.equal(await totalRequests(),0);
    });
    await t.test("saved requests use server identity, prices, duration, and historical service names", async () => {
      const created = await request(base+"/appointments",{method:"POST",body});
      assert.equal(created.status,201); appointmentId=created.data.appointment.id;
      assert.equal(created.data.appointment.status,"pending_review"); assert.equal(Number(created.data.appointment.total),1200.5);
      assert.deepEqual(created.data.appointment.services,["Original treatment"]);
      const record = (await db.query("SELECT patient_user_id,start_time::text,end_time::text,estimated_total_cost,status FROM appointments WHERE id=$1",[appointmentId])).rows[0];
      assert.equal(record.patient_user_id,patient.id); assert.equal(record.end_time,"09:45:00"); assert.equal(record.status,"pending_review");
      assert.equal(await totalRequests(),1);
      const slots = (await request(`${base}/availability?${query()}`)).data.slots;
      assert.ok(!slots.some(slot=>["09:00","09:15","09:30"].includes(slot.time)));
      assert.ok(slots.some(slot=>slot.time==="09:45"));
      assert.equal((await request(base+"/appointments",{cookie:secondPatient.cookie})).data.appointments.length,0);
      const list = await request(base+`/appointments?patient_user_id=${secondPatient.id}`);
      assert.equal(list.data.appointments[0].id,appointmentId);
      assert.doesNotMatch(JSON.stringify(list.data),/Private test visit|patient_email|patient_phone/);
    });
    await t.test("retries are idempotent, conflicts reject overlaps, and stale quotes cannot silently change", async () => {
      assert.equal((await request(base+"/appointments",{method:"POST",body})).status,200);
      assert.equal(await totalRequests(),1);
      assert.equal((await request(base+"/appointments",{method:"POST",body:{...body,notes:"Changed after retry"}})).status,409);
      assert.equal((await request(base+"/appointments",{method:"POST",body:{...body,requestKey:crypto.randomUUID(),time:"09:15"},cookie:secondPatient.cookie})).status,409);
      assert.equal((await request(base+"/appointments",{method:"POST",body:{...body,requestKey:crypto.randomUUID(),time:"09:45",expectedPrice:"0"}})).status,409);
      assert.equal(await totalRequests(),1);
    });
    await t.test("only the owning clinic reviews requests and decisions are audited and visible to the patient", async () => {
      const inbox = await request(management+"/appointments",{cookie:staff.cookie});
      assert.equal(inbox.status,200); assert.equal(inbox.data.pendingAppointments,1); assert.equal(inbox.data.appointments[0].notes,body.notes);
      assert.equal((await request(management+"/appointments",{cookie:otherStaff.cookie})).data.appointments.length,0);
      const route = `${management}/appointments/${appointmentId}/review`;
      assert.equal((await request(route,{method:"PUT",body:{decision:"accepted",notes:""}})).status,403);
      assert.equal((await request(route,{method:"PUT",body:{decision:"accepted",notes:""},cookie:otherStaff.cookie})).status,404);
      assert.equal((await request(route,{method:"PUT",body:{decision:"declined",notes:" "},cookie:staff.cookie})).status,400);
      assert.equal((await request(route,{method:"PUT",body:{decision:"accepted",notes:"Please contact us for next steps."},cookie:staff.cookie})).status,200);
      assert.equal((await request(route,{method:"PUT",body:{decision:"declined",notes:"Stale decision"},cookie:staff.cookie})).status,409);
      const saved = (await db.query("SELECT reviewed_by,reviewed_at,status FROM appointments WHERE id=$1",[appointmentId])).rows[0];
      assert.equal(saved.reviewed_by,staff.id); assert.ok(saved.reviewed_at); assert.equal(saved.status,"accepted");
      const own = (await request(base+"/appointments")).data.appointments[0];
      assert.equal(own.status,"accepted"); assert.equal(own.reviewNotes,"Please contact us for next steps.");
    });
    await t.test("declining releases a reservation and historical quotes survive catalog edits", async () => {
      const secondBody={...body,time:"10:00",requestKey:crypto.randomUUID()};
      const created=await request(base+"/appointments",{method:"POST",body:secondBody});
      assert.equal(created.status,201); declinedId=created.data.appointment.id;
      assert.equal((await request(`${management}/appointments/${declinedId}/review`,{method:"PUT",body:{decision:"declined",notes:"Please choose another day."},cookie:staff.cookie})).status,200);
      assert.ok((await request(`${base}/availability?${query()}`)).data.slots.some(slot=>slot.time==="10:00"));
      assert.equal((await request(base+"/appointments",{method:"POST",body:secondBody})).data.appointment.status,"declined");
      await db.query("UPDATE services SET name='Renamed treatment',estimated_price=1800 WHERE id=$1",[serviceId]);
      const records=(await request(base+"/appointments")).data.appointments;
      assert.ok(records.every(item=>item.services[0]==="Original treatment" && Number(item.total)===1200.5));
      assert.equal((await request(base+"/appointments",{method:"POST",body:{...body,time:"11:00",requestKey:crypto.randomUUID()}})).status,409);
      await db.query("UPDATE services SET name='Original treatment',estimated_price=1200.50 WHERE id=$1",[serviceId]);
    });
    await t.test("acceptance rechecks working hours and approval even for existing sessions", async () => {
      const created=await request(base+"/appointments",{method:"POST",body:{...body,time:"13:00",requestKey:crypto.randomUUID()}});
      assert.equal(created.status,201);
      await db.query("UPDATE dentist_schedules SET is_available=FALSE WHERE dentist_id=$1 AND start_time='13:00'",[dentistId]);
      const route=`${management}/appointments/${created.data.appointment.id}/review`;
      assert.equal((await request(route,{method:"PUT",body:{decision:"accepted",notes:""},cookie:staff.cookie})).status,409);
      await db.query("UPDATE dentist_schedules SET is_available=TRUE WHERE dentist_id=$1",[dentistId]);
      await db.query("UPDATE clinics SET status='suspended' WHERE id=$1",[clinicId]);
      assert.equal((await request(`${base}/booking-options?clinicId=${clinicId}`)).status,404);
      assert.equal((await request(base+"/appointments",{method:"POST",body:{...body,time:"14:00",requestKey:crypto.randomUUID()}})).status,409);
      assert.equal((await request(route,{method:"PUT",body:{decision:"accepted",notes:""},cookie:staff.cookie})).status,403);
      await db.query("UPDATE clinics SET status='approved' WHERE id=$1",[clinicId]);
      assert.equal((await request(management+`/appointments?status=all&clinicId=${clinicId}`,{cookie:owner.cookie})).status,200);
      assert.equal((await request(management+`/appointments?status=all&clinicId=${otherClinic}`,{cookie:staff.cookie})).status,403);
    });
    await t.test("simultaneous overlapping requests allow exactly one reservation",{skip:!native},async()=>{
      const first={...body,time:"15:00",requestKey:crypto.randomUUID()},second={...body,time:"15:15",requestKey:crypto.randomUUID()};
      const results=await Promise.all([request(base+"/appointments",{method:"POST",body:first}),request(base+"/appointments",{method:"POST",body:second,cookie:secondPatient.cookie})]);
      assert.deepEqual(results.map(item=>item.status).sort(),[201,409]);
    });
    await t.test("simultaneous retries return one durable appointment",{skip:!native},async()=>{
      const retry={...body,time:"16:00",requestKey:crypto.randomUUID()};
      const results=await Promise.all([request(base+"/appointments",{method:"POST",body:retry}),request(base+"/appointments",{method:"POST",body:retry})]);
      assert.deepEqual(results.map(item=>item.status).sort(),[200,201]);
      assert.equal(results[0].data.appointment.id,results[1].data.appointment.id);
    });
    await t.test("administrator API cannot reach patient or clinic booking routes",async()=>{
      process.env.APP_PORTAL="admin";
      assert.equal((await request(base+"/appointments",{method:"POST",body})).status,404);
      assert.equal((await request(management+"/appointments",{cookie:staff.cookie})).status,404);
    });
  } finally {
    if(previousPortal===undefined) delete process.env.APP_PORTAL; else process.env.APP_PORTAL=previousPortal;
    await new Promise(resolve=>server.close(resolve));
    if(native) await db.end(); else await db.close();
  }
});
