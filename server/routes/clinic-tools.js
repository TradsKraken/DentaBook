const express = require("express");
const { email, text } = require("../validation");
const { clinicColumns } = require("./accounts");
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const categories = ["Preventive", "Restorative", "Cosmetic", "Surgical", "Orthodontic", "General"];
const optionalText = (value, max) => typeof value === "string" && value.trim().length <= max;
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const serviceColumns = `id, name, category, description, estimated_price AS price, duration_minutes AS duration, is_active AS "isActive"`;
const dentistColumns = `id, full_name AS name, title, credentials_summary AS credentials, is_active AS "isActive"`;

function createClinicToolsRouter(pool) {
  const router = express.Router();
  // Each mutation locks the clinic until commit: approval, ownership, and writes
  // are checked together, and concurrent schedule edits cannot overlap.
  function endpoint(method, path, action) {
    router[method](path, async (req, res, next) => {
      let client;
      const writing = method !== "get";
      try {
        client = writing ? await pool.connect() : pool;
        if (writing) await client.query("BEGIN");
        if (req.user.ownerAccess ? !uuid.test(req.query.clinicId || "") : req.query.clinicId !== undefined)
          throw fail(req.user.ownerAccess ? "Select a clinic to manage." : "Clinic staff can only access their own clinic.", req.user.ownerAccess ? 400 : 403);
        const result = await client.query(`SELECT ${clinicColumns} FROM clinics c WHERE ${req.user.ownerAccess ? "c.id" : "c.owner_user_id"} = $1 ORDER BY c.created_at, c.id LIMIT 1${writing ? " FOR UPDATE OF c" : ""}`, [req.user.ownerAccess ? req.query.clinicId : req.user.id]);
        const clinic = result.rows[0];
        if (!clinic || clinic.status !== "approved") throw fail("Clinic approval is required to use clinic tools.", 403);
        if (req.params.id && !uuid.test(req.params.id)) throw fail("Record not found.", 404);
        const data = await action(client, clinic, req);
        if (writing) await client.query("COMMIT");
        res.status(method === "post" ? 201 : 200).json(data);
      } catch (error) {
        if (writing && client) await client.query("ROLLBACK");
        if (error.status) return res.status(error.status).json({ error: error.message });
        next(error);
      } finally { if (writing) client?.release(); }
    });
  }
  endpoint("get", "/", async (db, clinic) => {
    const services = await db.query(`SELECT ${serviceColumns} FROM services WHERE clinic_id=$1 ORDER BY name,id`, [clinic.id]);
    const dentists = await db.query(`SELECT ${dentistColumns} FROM dentists WHERE clinic_id=$1 ORDER BY full_name,id`, [clinic.id]);
    const schedules = await db.query(`SELECT ds.id, ds.dentist_id AS "dentistId", ds.day_of_week AS day, to_char(ds.start_time,'HH24:MI') AS start, to_char(ds.end_time,'HH24:MI') AS end FROM dentist_schedules ds JOIN dentists d ON d.id=ds.dentist_id WHERE d.clinic_id=$1 AND ds.is_available=TRUE ORDER BY ds.day_of_week,ds.start_time,ds.id`, [clinic.id]);
    return { clinic, services: services.rows, dentists: dentists.rows, schedules: schedules.rows };
  });
  endpoint("put", "/profile", async (db, clinic, { body: b = {} }) => {
    if (!text(b.name, 200) || !text(b.address, 1000) || !email(b.email) || typeof b.phone !== "string" || !/^[+0-9() .-]{7,30}$/.test(b.phone.trim()) || b.phone.replace(/\D/g, "").length < 7 || !optionalText(b.description, 5000))
      throw fail("Enter a clinic name, address, valid contact details, and a description of up to 5,000 characters.");
    await db.query(`UPDATE clinics SET name=$1,address=$2,phone=$3,email=$4,description=$5,updated_at=CURRENT_TIMESTAMP WHERE id=$6`, [b.name.trim(), b.address.trim(), b.phone.trim(), b.email.trim().toLowerCase(), b.description.trim(), clinic.id]);
    return { saved: true };
  });
  function serviceValues(b) {
    if (!text(b.name, 200) || !categories.includes(b.category) || !optionalText(b.description, 3000) || typeof b.price !== "string" || !/^\d{1,8}(\.\d{1,2})?$/.test(b.price) || !Number.isInteger(b.duration) || b.duration < 5 || b.duration > 480 || typeof b.isActive !== "boolean")
      throw fail("Enter a service name, category, price (0–99,999,999.99), and duration of 5–480 minutes.");
    return [b.name.trim(), b.category, b.description.trim(), b.price, b.duration, b.isActive];
  }
  endpoint("post", "/services", async (db, clinic, { body = {} }) => {
    const result = await db.query(`INSERT INTO services (name,category,description,estimated_price,duration_minutes,is_active,clinic_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${serviceColumns}`, [...serviceValues(body), clinic.id]);
    return { service: result.rows[0] };
  });
  endpoint("put", "/services/:id", async (db, clinic, req) => {
    const result = await db.query(`UPDATE services SET name=$1,category=$2,description=$3,estimated_price=$4,duration_minutes=$5,is_active=$6 WHERE id=$7 AND clinic_id=$8 RETURNING ${serviceColumns}`, [...serviceValues(req.body || {}), req.params.id, clinic.id]);
    if (!result.rows.length) throw fail("Service not found in your clinic.", 404);
    return { service: result.rows[0] };
  });
  function dentistValues(b) {
    if (!text(b.name, 150) || !text(b.title, 100) || !optionalText(b.credentials, 3000) || typeof b.isActive !== "boolean") throw fail("Enter a dentist’s name, title, and credentials of up to 3,000 characters.");
    return [b.name.trim(), b.title.trim(), b.credentials.trim(), b.isActive];
  }
  endpoint("post", "/dentists", async (db, clinic, { body = {} }) => {
    const result = await db.query(`INSERT INTO dentists (full_name,title,credentials_summary,is_active,clinic_id) VALUES ($1,$2,$3,$4,$5) RETURNING ${dentistColumns}`, [...dentistValues(body), clinic.id]);
    return { dentist: result.rows[0] };
  });
  endpoint("put", "/dentists/:id", async (db, clinic, req) => {
    const result = await db.query(`UPDATE dentists SET full_name=$1,title=$2,credentials_summary=$3,is_active=$4 WHERE id=$5 AND clinic_id=$6 RETURNING ${dentistColumns}`, [...dentistValues(req.body || {}), req.params.id, clinic.id]);
    if (!result.rows.length) throw fail("Dentist not found in your clinic.", 404);
    return { dentist: result.rows[0] };
  });
  endpoint("post", "/schedules", async (db, clinic, { body: b = {} }) => {
    const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (!uuid.test(b.dentistId || "") || !Number.isInteger(b.day) || b.day < 0 || b.day > 6 || !time.test(b.start) || !time.test(b.end) || b.start >= b.end) throw fail("Choose a dentist, day, and an end time after the start time.");
    const dentist = await db.query("SELECT id FROM dentists WHERE id=$1 AND clinic_id=$2 AND is_active=TRUE", [b.dentistId, clinic.id]);
    if (!dentist.rows.length) throw fail("Choose an active dentist in your clinic.");
    const overlap = await db.query("SELECT id FROM dentist_schedules WHERE dentist_id=$1 AND day_of_week=$2 AND is_available=TRUE AND start_time < $4::time AND end_time > $3::time", [b.dentistId, b.day, b.start, b.end]);
    if (overlap.rows.length) throw fail("This time overlaps an existing schedule for this dentist.", 409);
    const result = await db.query("INSERT INTO dentist_schedules (dentist_id,day_of_week,start_time,end_time) VALUES ($1,$2,$3,$4) RETURNING id", [b.dentistId, b.day, b.start, b.end]);
    return { schedule: result.rows[0] };
  });
  endpoint("delete", "/schedules/:id", async (db, clinic, req) => {
    const result = await db.query("DELETE FROM dentist_schedules ds USING dentists d WHERE ds.id=$1 AND d.id=ds.dentist_id AND d.clinic_id=$2 RETURNING ds.id", [req.params.id, clinic.id]);
    if (!result.rows.length) throw fail("Schedule not found in your clinic.", 404);
    return { removed: true };
  });
  return router;
}
module.exports = { createClinicToolsRouter };
