const express = require("express");
const {policyColumns,policyFrom,policyHash} = require("../appointment-changes");
const crypto = require("node:crypto");
const { email } = require("../validation");
const { validId, timePattern, fail, bookingWindow, availability } = require("../booking");

const receiptColumns = `a.id,a.appointment_code AS "appointmentCode",a.status,a.appointment_date::text AS date,
  to_char(a.start_time,'HH24:MI') AS time,a.estimated_total_cost AS total,c.name AS "clinicName",
  d.full_name AS "dentistName",COALESCE((SELECT json_agg(COALESCE(aps.service_name,s.name) ORDER BY s.name)
    FROM appointment_services aps JOIN services s ON s.id=aps.service_id WHERE aps.appointment_id=a.id),'[]'::json) AS services`;
async function receipt(db, id, patientId) {
  return (await db.query(`SELECT ${receiptColumns} FROM appointments a JOIN clinics c ON c.id=a.clinic_id
    LEFT JOIN dentists d ON d.id=a.dentist_id WHERE a.id=$1 AND a.patient_user_id=$2`, [id, patientId])).rows[0];
}
function createPatientBookingRouter(pool) {
  const router = express.Router();
  router.get("/booking-options", async (req, res, next) => {
    try {
      if (!validId(req.query.clinicId)) throw fail("Choose a clinic.");
      const clinic = (await pool.query(`SELECT c.id,c.name,c.address,c.phone,${policyColumns} FROM clinics c WHERE c.id=$1 AND c.status='approved'`, [req.query.clinicId])).rows[0];
      if (!clinic) throw fail("This clinic is no longer available for booking.", 404);
      const services = await pool.query(`SELECT id,name,estimated_price AS price,duration_minutes AS duration FROM services
        WHERE clinic_id=$1 AND is_active=TRUE ORDER BY name,id`, [clinic.id]);
      const dentists = await pool.query(`SELECT d.id,d.full_name AS name,
        COALESCE((SELECT json_agg(s.id ORDER BY s.id) FROM dentist_services ds JOIN services s ON s.id=ds.service_id
          WHERE ds.dentist_id=d.id AND s.clinic_id=$1 AND s.is_active=TRUE),'[]'::json) AS "serviceIds"
        FROM dentists d WHERE d.clinic_id=$1 AND d.is_active=TRUE ORDER BY d.full_name,d.id`, [clinic.id]);
      const patient = (await pool.query("SELECT full_name AS name,email,phone FROM users WHERE id=$1", [req.user.id])).rows[0];
      const { minDate, maxDate } = bookingWindow();
      res.json({ changePolicy:policyFrom(clinic), changePolicyHash:policyHash(policyFrom(clinic)), clinic, services: services.rows, dentists: dentists.rows, patient, minDate, maxDate, timezone: "Asia/Manila" });
    } catch (error) { if (error.status) return res.status(error.status).json({ error: error.message }); next(error); }
  });
  router.get("/availability", async (req, res, next) => {
    try {
      const selection = Object.fromEntries(["clinicId", "serviceId", "dentistId", "date"].map(key => [key, req.query[key]]));
      if (!validId(selection.clinicId)) throw fail("Choose a clinic.");
      const clinic = await pool.query("SELECT id FROM clinics WHERE id=$1 AND status='approved'", [selection.clinicId]);
      if (!clinic.rows.length) throw fail("This clinic is no longer available for booking.", 404);
      res.json(await availability(pool, selection));
    } catch (error) { if (error.status) return res.status(error.status).json({ error: error.message }); next(error); }
  });
  router.post("/appointments", async (req, res, next) => {
    const b = req.body || {};
    let client;
    try {
      if (![b.clinicId, b.serviceId, b.dentistId, b.requestKey].every(validId) || !timePattern.test(b.time) || typeof b.phone !== "string" || !/^[+0-9() .-]{7,30}$/.test(b.phone.trim()) || b.phone.replace(/\D/g, "").length < 7 || typeof b.notes !== "string" || b.notes.trim().length > 2000 || typeof b.expectedPrice !== "string" || !/^\d{1,8}(\.\d{1,2})?$/.test(b.expectedPrice) || !Number.isInteger(b.expectedDuration))
        throw fail("Choose an available time and enter valid contact details. Visit notes can contain up to 2,000 characters.");
      if (b.email !== undefined && !email(b.email)) throw fail("Enter a valid contact email for this appointment.");
      const requestHash = contactEmail => crypto.createHash("sha256").update(JSON.stringify([
        b.clinicId, b.serviceId, b.dentistId, b.date, b.time, contactEmail.trim().toLowerCase(),
        b.phone.trim(), b.notes.trim(), b.expectedPrice, b.expectedDuration,
      ])).digest("hex");
      client = await pool.connect();
      await client.query("BEGIN");
      // Serialize retries for this patient, including requests targeting different clinics.
      const patient = (await client.query("SELECT id,full_name AS name,email FROM users WHERE id=$1 FOR NO KEY UPDATE", [req.user.id])).rows[0];
      const existing = (await client.query("SELECT id,booking_request_hash AS hash,patient_email AS email FROM appointments WHERE patient_user_id=$1 AND booking_request_key=$2", [req.user.id, b.requestKey])).rows[0];
      if (existing) {
        // Older clients omit the email. Explicit contact changes must use a new key.
        if (existing.hash !== requestHash(b.email === undefined ? existing.email : b.email)) throw fail("This request was already submitted with different details. Check your appointments before sending another request.", 409);
        const appointment = await receipt(client, existing.id, req.user.id);
        await client.query("COMMIT");
        return res.json({ appointment });
      }
      const contactEmail = b.email === undefined ? patient?.email : b.email;
      if (!email(contactEmail)) throw fail("Enter a valid contact email for this appointment.");
      const normalizedEmail = contactEmail.trim().toLowerCase();
      const hash = requestHash(normalizedEmail);
      // Clinic setup writes and other bookings use this same row lock, so final
      // availability, prices, assignments, and the reservation are checked atomically.
      const clinic = (await client.query(`SELECT c.id,${policyColumns} FROM clinics c WHERE c.id=$1 AND c.status='approved' FOR UPDATE`, [b.clinicId])).rows[0];
      if (!clinic) throw fail("This clinic is no longer available for booking.", 409);
      const policy=policyFrom(clinic);
      if (b.changePolicyHash !== undefined && b.changePolicyHash !== policyHash(policy)) throw fail("The clinic’s appointment policy changed. Reload booking options and review the terms.",409);
      const available = await availability(client, b);
      const slot = available.slots.find(item => item.time === b.time);
      if (!slot) throw fail("That time is no longer available. Refresh the available times and choose another slot.", 409);
      if (Number(available.service.price) !== Number(b.expectedPrice) || available.service.duration !== b.expectedDuration)
        throw fail("The service price or duration has changed. Refresh available times and review the new estimate.", 409);
      const code = `DB-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
      const result = await client.query(`INSERT INTO appointments
        (appointment_code,clinic_id,dentist_id,patient_user_id,patient_name,patient_email,patient_phone,appointment_date,start_time,end_time,estimated_total_cost,status,medical_notes,booking_request_key,booking_request_hash,change_policy_snapshot)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending_review',$12,$13,$14,$15::jsonb) RETURNING id`,
        [code,b.clinicId,b.dentistId,req.user.id,patient.name,normalizedEmail,b.phone.trim(),b.date,slot.time,slot.end,available.service.price,b.notes.trim() || null,b.requestKey,hash,policy.cancelEnabled || policy.rescheduleEnabled ? JSON.stringify(policy) : null]);
      const id = result.rows[0].id;
      await client.query("INSERT INTO appointment_services (appointment_id,service_id,service_price,service_name) VALUES ($1,$2,$3,$4)", [id,b.serviceId,available.service.price,available.service.name]);
      const appointment = await receipt(client, id, req.user.id);
      await client.query("COMMIT");
      res.status(201).json({ appointment });
    } catch (error) {
      if (client) await client.query("ROLLBACK");
      if (error.status) return res.status(error.status).json({ error: error.message });
      next(error);
    } finally { client?.release(); }
  });
  return router;
}
module.exports = { createPatientBookingRouter };
