const express = require("express");
const changes = require("../appointment-changes");
const { email, text } = require("../validation");
const { paymentReceipt } = require("./payments");
const { scaledInteger, decimal } = require("../payment-money");
const { validId, offering } = require("../booking");
const { clinicColumns } = require("./accounts");
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const categories = ["Preventive", "Restorative", "Cosmetic", "Surgical", "Orthodontic", "General"];
const optionalText = (value, max) => typeof value === "string" && value.trim().length <= max;
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const serviceColumns = `id, name, category, description, estimated_price AS price, duration_minutes AS duration, is_active AS "isActive"`;
const dentistColumns = `id, full_name AS name, title, credentials_summary AS credentials, is_active AS "isActive"`;

function createClinicToolsRouter(pool,{payments}={}) {
  const router = express.Router();
  // Each mutation locks the clinic until commit: approval, ownership, and writes
  // are checked together, and concurrent schedule edits cannot overlap.
  function endpoint(method, path, action, responseStatus = method === "post" ? 201 : 200) {
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
        res.status(responseStatus).json(data);
      } catch (error) {
        if (writing && client) await client.query("ROLLBACK");
        if (error.code === "23505" && error.constraint === "payments_verified_gcash_reference_unique") return res.status(409).json({error:"This GCash reference has already been verified for another payment."});
        if (error.status) return res.status(error.status).json({ error: error.message });
        next(error);
      } finally { if (writing) client?.release(); }
    });
  }
  endpoint("get", "/", async (db, clinic) => {
    const services = await db.query(`SELECT ${serviceColumns} FROM services WHERE clinic_id=$1 ORDER BY name,id`, [clinic.id]);
    const dentists = await db.query(`SELECT ${dentistColumns} FROM dentists WHERE clinic_id=$1 ORDER BY full_name,id`, [clinic.id]);
    const schedules = await db.query(`SELECT ds.id, ds.dentist_id AS "dentistId", ds.day_of_week AS day, to_char(ds.start_time,'HH24:MI') AS start, to_char(ds.end_time,'HH24:MI') AS end FROM dentist_schedules ds JOIN dentists d ON d.id=ds.dentist_id WHERE d.clinic_id=$1 AND ds.is_available=TRUE ORDER BY ds.day_of_week,ds.start_time,ds.id`, [clinic.id]);
    const assignments = await db.query(`SELECT ds.dentist_id AS "dentistId",ds.service_id AS "serviceId" FROM dentist_services ds
      JOIN dentists d ON d.id=ds.dentist_id JOIN services s ON s.id=ds.service_id
      WHERE d.clinic_id=$1 AND s.clinic_id=$1 ORDER BY ds.dentist_id,ds.service_id`, [clinic.id]);
    const pending = await db.query("SELECT COUNT(*)::int AS count FROM appointments WHERE clinic_id=$1 AND status='pending_review'", [clinic.id]);
    return { clinic, services: services.rows, dentists: dentists.rows, schedules: schedules.rows, assignments: assignments.rows, pendingAppointments: pending.rows[0].count };
  });
  endpoint("put", "/profile", async (db, clinic, { body: b = {} }) => {
    if (!text(b.name, 200) || !text(b.address, 1000) || !email(b.email) || typeof b.phone !== "string" || !/^[+0-9() .-]{7,30}$/.test(b.phone.trim()) || b.phone.replace(/\D/g, "").length < 7 || !optionalText(b.description, 5000))
      throw fail("Enter a clinic name, address, valid contact details, and a description of up to 5,000 characters.");
    await db.query(`UPDATE clinics SET name=$1,address=$2,phone=$3,email=$4,description=$5,updated_at=CURRENT_TIMESTAMP WHERE id=$6`, [b.name.trim(), b.address.trim(), b.phone.trim(), b.email.trim().toLowerCase(), b.description.trim(), clinic.id]);
    return { saved: true };
  });
  endpoint("put", "/deposit-policy", async (db, clinic, { body = {} }) => {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw fail("Send valid payment settings.");
    if (typeof body.gcashEnabled !== "boolean" || typeof body.walkInEnabled !== "boolean") throw fail("Choose the payment methods your clinic accepts.");
    const configured=body.percentage !== "" && body.percentage != null;
    const rate=configured ? scaledInteger(body.percentage,{maxWholeDigits:3,allowZero:false}) : null;
    const terms=typeof body.refundTerms === "string" ? body.refundTerms.trim() : "";
    if ((configured && (rate > 10000n || !terms || terms.length>5000)) || (!configured && body.gcashEnabled)) throw fail("GCash requires a deposit percentage above 0 and up to 100, and refund terms of up to 5,000 characters.");
    const name=typeof body.gcashAccountName === "string" ? body.gcashAccountName.trim() : "";
    const number=typeof body.gcashNumber === "string" ? body.gcashNumber.trim() : "";
    if (body.gcashEnabled && (!name || name.length>150 || !/^09[0-9]{9}$/.test(number))) throw fail("Enter the clinic’s GCash account name and 11-digit mobile number starting with 09.");
    await db.query(`UPDATE clinics SET deposit_percentage=$1,deposit_refund_terms=$2,deposit_policy_configured=$3,
      gcash_enabled=$4,gcash_account_name=$5,gcash_number=$6,walk_in_enabled=$7,
      deposit_policy_updated_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$8`,[rate ? decimal(rate) : null,configured ? terms : null,configured,body.gcashEnabled,body.gcashEnabled ? name : null,body.gcashEnabled ? number : null,body.walkInEnabled,clinic.id]);
    return { saved: true };
  });
  endpoint("put", "/appointment-policy", async (db,clinic,{body:b={}})=>{
    const validHours=value=>Number.isInteger(value) && value>=0 && value<=2160;
    if (typeof b.cancelEnabled!=='boolean' || typeof b.rescheduleEnabled!=='boolean'
      || (b.cancelEnabled && !validHours(b.cancelNoticeHours)) || (b.rescheduleEnabled && !validHours(b.rescheduleNoticeHours))
      || typeof b.terms!=='string' || b.terms.trim().length>5000 || ((b.cancelEnabled || b.rescheduleEnabled) && !b.terms.trim()))
      throw fail('Choose enabled actions, whole-hour deadlines from 0 to 2,160 hours, and terms of up to 5,000 characters.');
    await db.query(`UPDATE clinics SET patient_cancellation_enabled=$1,cancellation_notice_hours=$2,patient_rescheduling_enabled=$3,
      reschedule_notice_hours=$4,appointment_change_terms=$5,change_policy_version=change_policy_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=$6`,
      [b.cancelEnabled,b.cancelEnabled ? b.cancelNoticeHours : null,b.rescheduleEnabled,b.rescheduleEnabled ? b.rescheduleNoticeHours : null,b.terms.trim() || null,clinic.id]);
    return {saved:true};
  });
  endpoint("get","/appointments/:id/changes",(db,clinic,req)=>changes.details(db,req.params.id,{clinicId:clinic.id}));
  endpoint("post","/appointments/:id/cancel",async(db,clinic,req)=>changes.mutate(db,
    await changes.load(db,req.params.id,{clinicId:clinic.id},true),{id:req.user.id,role:'clinic_staff'},'cancel',req.body || {}),200);
  endpoint("post","/appointments/:id/changes/:changeId/review",async(db,clinic,req)=>changes.review(db,
    await changes.load(db,req.params.id,{clinicId:clinic.id},true),req.user.id,req.params.changeId,req.body || {}),200);
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
  async function saveAssignments(db, clinicId, dentistId, ids) {
    if (ids === undefined) return; // Older API clients preserve existing assignments.
    if (!Array.isArray(ids) || ids.length > 100 || !ids.every(validId) || new Set(ids).size !== ids.length)
      throw fail("Choose up to 100 different services from your clinic.");
    for (const id of ids) {
      const service = await db.query("SELECT id FROM services WHERE id=$1 AND clinic_id=$2", [id, clinicId]);
      if (!service.rows.length) throw fail("Assigned services must belong to your clinic.");
    }
    await db.query("DELETE FROM dentist_services WHERE dentist_id=$1", [dentistId]);
    for (const id of ids) await db.query("INSERT INTO dentist_services (dentist_id,service_id) VALUES ($1,$2)", [dentistId,id]);
  }
  endpoint("post", "/dentists", async (db, clinic, { body = {} }) => {
    const result = await db.query(`INSERT INTO dentists (full_name,title,credentials_summary,is_active,clinic_id) VALUES ($1,$2,$3,$4,$5) RETURNING ${dentistColumns}`, [...dentistValues(body), clinic.id]);
    await saveAssignments(db, clinic.id, result.rows[0].id, body.serviceIds);
    return { dentist: result.rows[0] };
  });
  endpoint("put", "/dentists/:id", async (db, clinic, req) => {
    const result = await db.query(`UPDATE dentists SET full_name=$1,title=$2,credentials_summary=$3,is_active=$4 WHERE id=$5 AND clinic_id=$6 RETURNING ${dentistColumns}`, [...dentistValues(req.body || {}), req.params.id, clinic.id]);
    if (!result.rows.length) throw fail("Dentist not found in your clinic.", 404);
    await saveAssignments(db, clinic.id, req.params.id, req.body?.serviceIds);
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
  endpoint("get", "/payments",async(db,clinic,req)=>{
    const status=req.query.status || "all";
    if (!["all","pending","paid","failed","refunded","needs_review"].includes(status)) throw fail("Choose a valid payment status.");
    const result=await db.query(`SELECT p.id,p.amount,p.currency,p.channel,p.payment_status AS status,p.verification_status AS verification,
      p.receipt_code AS "receiptCode",p.paid_at AS "paidAt",p.created_at AS "createdAt",p.claimed_reference AS "claimedReference",
      p.review_notes AS "reviewNotes",p.reviewed_at AS "reviewedAt",u.full_name AS "reviewedBy",
      a.appointment_code AS "appointmentCode",a.id AS "appointmentId",a.patient_name AS "patientName",a.status AS "appointmentStatus"
      FROM payments p JOIN appointments a ON a.id=p.appointment_id LEFT JOIN users u ON u.id=p.reviewed_by WHERE a.clinic_id=$1 AND p.channel IS NOT NULL
        AND ($2='all' OR p.payment_status=$2 OR ($2='needs_review' AND p.verification_status='needs_review'))
      ORDER BY p.created_at DESC,p.id DESC LIMIT 100`,[clinic.id,status]);
    return {payments:result.rows};
  });
  endpoint("post", "/payments/:id/review",async(db,clinic,req)=>payments.review(db,clinic,req.params.id,req.user.id,req.body),200);
  endpoint("get", "/payments/:id/receipt",async(db,clinic,req)=>paymentReceipt(db,req.params.id,{clinicId:clinic.id}));
  endpoint("get", "/appointments", async (db, clinic, req) => {
    const status = req.query.status || "pending_review";
    if (!["all","pending_review","accepted","declined","confirmed","completed","cancelled","rescheduled","reschedule_requests"].includes(status))
      throw fail("Choose a valid appointment status.");
    const result = await db.query(`SELECT a.id,a.appointment_code AS code,a.patient_name AS "patientName",a.patient_email AS email,
      a.patient_phone AS phone,a.appointment_date::text AS date,to_char(a.start_time,'HH24:MI') AS time,
      to_char(a.end_time,'HH24:MI') AS end,a.status,a.estimated_total_cost AS total,a.medical_notes AS notes,
      a.review_notes AS "reviewNotes",d.full_name AS "dentistName",a.refund_review_required AS "refundReviewRequired",
      EXISTS(SELECT 1 FROM appointment_changes ac WHERE ac.appointment_id=a.id AND ac.status='pending') AS "pendingChange",
      COALESCE((SELECT json_agg(COALESCE(aps.service_name,s.name) ORDER BY s.name)
        FROM appointment_services aps JOIN services s ON s.id=aps.service_id WHERE aps.appointment_id=a.id),'[]'::json) AS services
      FROM appointments a LEFT JOIN dentists d ON d.id=a.dentist_id
      WHERE a.clinic_id=$1 AND ($2='all' OR a.status=$2 OR ($2='reschedule_requests' AND EXISTS(SELECT 1 FROM appointment_changes ac WHERE ac.appointment_id=a.id AND ac.status='pending'))) ORDER BY a.created_at DESC,a.id DESC LIMIT 100`, [clinic.id,status]);
    const pending = await db.query("SELECT COUNT(*)::int AS count FROM appointments WHERE clinic_id=$1 AND status='pending_review'", [clinic.id]);
    return { appointments: result.rows, pendingAppointments: pending.rows[0].count };
  });
  endpoint("put", "/appointments/:id/review", async (db, clinic, req) => {
    const { decision, notes } = req.body || {};
    if (!["accepted", "declined"].includes(decision) || typeof notes !== "string" || notes.trim().length > 2000 || (decision === "declined" && !notes.trim()))
      throw fail("Choose accept or decline. Declining requires a reason; review notes can contain up to 2,000 characters.");
    const appointment = (await db.query(`SELECT id,dentist_id AS "dentistId",appointment_date::text AS date,
      to_char(start_time,'HH24:MI') AS time,to_char(end_time,'HH24:MI') AS end,status
      FROM appointments WHERE id=$1 AND clinic_id=$2 FOR UPDATE`, [req.params.id,clinic.id])).rows[0];
    if (!appointment) throw fail("Appointment not found in your clinic.", 404);
    if (appointment.status !== "pending_review") throw fail("This request has already been reviewed. Refresh the inbox.", 409);
    if (decision === "accepted") {
      if (Date.parse(`${appointment.date}T${appointment.time}:00+08:00`) <= Date.now()) throw fail("This visit time has passed. Decline the request and ask the patient to choose another time.", 409);
      const services = (await db.query("SELECT service_id AS id FROM appointment_services WHERE appointment_id=$1", [appointment.id])).rows;
      if (!services.length) throw fail("This request has no service details and cannot be accepted.", 409);
      for (const service of services) await offering(db, clinic.id, service.id, appointment.dentistId);
      const day = new Date(`${appointment.date}T00:00:00Z`).getUTCDay();
      const hours = await db.query(`SELECT id FROM dentist_schedules WHERE dentist_id=$1 AND day_of_week=$2
        AND is_available=TRUE AND start_time <= $3::time AND end_time >= $4::time`, [appointment.dentistId,day,appointment.time,appointment.end]);
      if (!hours.rows.length) throw fail("The dentist’s working hours no longer cover this request. Update the hours or decline with a reason.", 409);
      const conflict = await db.query(`SELECT id FROM appointments WHERE clinic_id=$1 AND dentist_id=$2 AND appointment_date=$3
        AND id<>$4 AND status IN ('pending_review','accepted','confirmed') AND start_time < $6::time AND end_time > $5::time`,
        [clinic.id,appointment.dentistId,appointment.date,appointment.id,appointment.time,appointment.end]);
      if (conflict.rows.length) throw fail("This visit overlaps another reservation. Resolve the conflict before accepting.", 409);
    }
    await db.query(`UPDATE appointments SET status=$1,review_notes=$2,reviewed_by=$3,reviewed_at=CURRENT_TIMESTAMP,
      updated_at=CURRENT_TIMESTAMP WHERE id=$4 AND clinic_id=$5`, [decision,notes.trim() || null,req.user.id,appointment.id,clinic.id]);
    const pending = await db.query("SELECT COUNT(*)::int AS count FROM appointments WHERE clinic_id=$1 AND status='pending_review'", [clinic.id]);
    return { appointment: { id: appointment.id, status: decision, reviewNotes: notes.trim() || null }, pendingAppointments: pending.rows[0].count };
  });
  return router;
}
module.exports = { createClinicToolsRouter };
