const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const validId = value => typeof value === "string" && uuid.test(value);
const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const formatTime = value => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
const bookingWindow = () => {
  const now = Date.now();
  return { now, minDate: new Date(now + 8 * 3600000).toISOString().slice(0, 10), maxDate: new Date(now + 8 * 3600000 + 90 * 86400000).toISOString().slice(0, 10) };
};
function validateDate(value) {
  const window = bookingWindow();
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00+08:00`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value || value < window.minDate || value > window.maxDate)
    throw fail("Choose a valid date from today through the next 90 days (Philippine time).");
}
async function multiOffering(db, clinicId, serviceIds, dentistId) {
  if (!validId(clinicId) || !validId(dentistId) || !Array.isArray(serviceIds) || !serviceIds.length || !serviceIds.every(validId))
    throw fail("Choose a clinic, service, and dentist.");
  const result = await db.query(`SELECT s.id,s.name,s.estimated_price AS price,s.duration_minutes AS duration,d.full_name AS "dentistName"
    FROM services s JOIN dentist_services ds ON ds.service_id=s.id
    JOIN dentists d ON d.id=ds.dentist_id
    WHERE s.id = ANY($1::uuid[]) AND d.id=$2 AND s.clinic_id=$3 AND d.clinic_id=$3
      AND s.is_active=TRUE AND d.is_active=TRUE`, [serviceIds, dentistId, clinicId]);
  if (result.rows.length !== serviceIds.length) {
    throw fail("One or more selected treatments are no longer available with this dentist. Choose another option.", 409);
  }
  let totalDuration = 0;
  let totalPrice = 0;
  for (const s of result.rows) {
    if (!Number.isInteger(s.duration) || s.duration < 5 || s.duration > 480 || Number(s.price) < 0) {
      throw fail("This service and dentist are no longer available together. Choose another option.", 409);
    }
    totalDuration += s.duration;
    totalPrice += Number(s.price);
  }
  if (totalDuration < 5 || totalDuration > 480) {
    throw fail("The combined duration of the selected treatments must be between 5 and 480 minutes.", 409);
  }
  return {
    id: result.rows[0].id,
    serviceIds: result.rows.map(s => s.id),
    name: result.rows.map(s => s.name).join(", "),
    price: totalPrice.toFixed(2),
    duration: totalDuration,
    dentistName: result.rows[0].dentistName,
    services: result.rows.map(s => ({ id: s.id, name: s.name, price: Number(s.price).toFixed(2), duration: s.duration })),
  };
}
async function offering(db, clinicId, serviceId, dentistId) {
  if (Array.isArray(serviceId)) return multiOffering(db, clinicId, serviceId, dentistId);
  if (![clinicId, serviceId, dentistId].every(validId)) throw fail("Choose a clinic, service, and dentist.");
  const result = await db.query(`SELECT s.id,s.name,s.estimated_price AS price,s.duration_minutes AS duration,d.full_name AS "dentistName"
    FROM services s JOIN dentist_services ds ON ds.service_id=s.id
    JOIN dentists d ON d.id=ds.dentist_id
    WHERE s.id=$1 AND d.id=$2 AND s.clinic_id=$3 AND d.clinic_id=$3
      AND s.is_active=TRUE AND d.is_active=TRUE`, [serviceId, dentistId, clinicId]);
  const service = result.rows[0];
  if (!service || !Number.isInteger(service.duration) || service.duration < 5 || service.duration > 480 || Number(service.price) < 0)
    throw fail("This service and dentist are no longer available together. Choose another option.", 409);
  return {
    ...service,
    price: Number(service.price).toFixed(2),
    services: [{ id: service.id, name: service.name, price: Number(service.price).toFixed(2), duration: service.duration }],
  };
}
  async function availability(db, { clinicId, serviceId, serviceIds, dentistId, date }, excludeId = null, savedDuration = null) {
    validateDate(date);
    const raw = serviceIds || serviceId;
    const ids = Array.isArray(raw)
      ? raw
      : (typeof raw === "string" ? raw.split(",").map(s => s.trim()).filter(Boolean) : []);
    const offeringDetails = ids.length > 1
      ? await multiOffering(db, clinicId, ids, dentistId)
      : await offering(db, clinicId, ids[0] || serviceId, dentistId);
    const service = { ...offeringDetails, duration: savedDuration ?? offeringDetails.duration };
    const day = new Date(`${date}T00:00:00Z`).getUTCDay();
    const hours = await db.query(`SELECT to_char(start_time,'HH24:MI') AS start,to_char(end_time,'HH24:MI') AS end
    FROM dentist_schedules WHERE dentist_id=$1 AND day_of_week=$2 AND is_available=TRUE ORDER BY start_time`, [dentistId, day]);
    const reserved = await db.query(`SELECT to_char(start_time,'HH24:MI') AS start,to_char(end_time,'HH24:MI') AS end
    FROM appointments WHERE clinic_id=$1 AND dentist_id=$2 AND appointment_date=$3
      AND status IN ('pending_review','accepted','confirmed') AND ($4::uuid IS NULL OR id <> $4::uuid)`, [clinicId, dentistId, date, excludeId]);
    const now = Date.now();
    const slots = new Map();
    for (const shift of hours.rows) {
      for (let start = minutes(shift.start); start + service.duration <= minutes(shift.end); start += 15) {
        const time = formatTime(start), end = formatTime(start + service.duration);
        if (Date.parse(`${date}T${time}:00+08:00`) < now + 15 * 60000) continue;
        if (reserved.rows.some(item => start < minutes(item.end) && start + service.duration > minutes(item.start))) continue;
        slots.set(time, { time, end });
      }
    }
    return { service, services: offeringDetails.services || [service], slots: [...slots.values()].sort((a, b) => a.time.localeCompare(b.time)), timezone: "Asia/Manila" };
  }
  module.exports = { validId, timePattern, fail, minutes, bookingWindow, validateDate, offering, multiOffering, availability };
