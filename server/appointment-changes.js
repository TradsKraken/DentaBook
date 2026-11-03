const crypto = require('node:crypto');
const { validId, fail, timePattern, availability, minutes, bookingWindow } = require('./booking');
const { text } = require('./validation');
const activeStatuses = ['pending_review', 'accepted', 'confirmed'];
const policyColumns = `c.patient_cancellation_enabled AS "cancelEnabled",c.cancellation_notice_hours AS "cancelNoticeHours",
 c.patient_rescheduling_enabled AS "rescheduleEnabled",c.reschedule_notice_hours AS "rescheduleNoticeHours",
 c.appointment_change_terms AS terms,c.change_policy_version AS version`;
const changeColumns = `id,kind,status,reason,requester_role AS "requesterRole",requested_at AS "requestedAt",
 original_date::text AS "originalDate",to_char(original_start,'HH24:MI') AS "originalTime",to_char(original_end,'HH24:MI') AS "originalEnd",
 requested_date::text AS "requestedDate",to_char(requested_start,'HH24:MI') AS "requestedTime",to_char(requested_end,'HH24:MI') AS "requestedEnd",
 reviewed_at AS "reviewedAt",review_notes AS "reviewNotes",policy_snapshot AS policy,
 (SELECT full_name FROM users WHERE id=appointment_changes.requested_by) AS "requestedBy",
 (SELECT full_name FROM users WHERE id=appointment_changes.reviewed_by) AS "reviewedBy"`;
function policyFrom(row) {
  return { cancelEnabled: row.cancelEnabled, cancelNoticeHours: row.cancelNoticeHours,
    rescheduleEnabled: row.rescheduleEnabled, rescheduleNoticeHours: row.rescheduleNoticeHours,
    terms: row.terms, version: row.version };
}
function policyHash(policy) { return crypto.createHash('sha256').update(JSON.stringify(policy)).digest('hex'); }
function future(a) { return activeStatuses.includes(a.status) && Date.parse(`${a.date}T${a.time}:00+08:00`) > Date.now(); }
function eligible(a, policy, kind) {
  const enabled = kind === 'cancel' ? policy.cancelEnabled : policy.rescheduleEnabled;
  const notice = kind === 'cancel' ? policy.cancelNoticeHours : policy.rescheduleNoticeHours;
  return a.clinicStatus === 'approved' && future(a) && enabled && Number.isInteger(notice)
    && Date.parse(`${a.date}T${a.time}:00+08:00`) - Date.now() >= notice * 3600000;
}
async function load(db, id, { patientId, clinicId }, lock = false) {
  if (!validId(id)) throw fail('Appointment not found.', 404);
  const a = (await db.query(`SELECT a.id,a.clinic_id AS "clinicId",a.patient_user_id AS "patientId",a.appointment_code AS code,a.status,
    a.dentist_id AS "dentistId",a.appointment_date::text AS date,to_char(a.start_time,'HH24:MI') AS time,to_char(a.end_time,'HH24:MI') AS end,
    a.estimated_total_cost AS total,a.change_policy_snapshot AS "savedPolicy",a.refund_review_required AS "refundReviewRequired",
    c.status AS "clinicStatus",${policyColumns} FROM appointments a JOIN clinics c ON c.id=a.clinic_id
    WHERE a.id=$1 AND ($2::uuid IS NULL OR a.patient_user_id=$2) AND ($3::uuid IS NULL OR a.clinic_id=$3)${lock ? ' FOR UPDATE OF a' : ''}`,
  [id, patientId || null, clinicId || null])).rows[0];
  if (!a) throw fail('Appointment not found.', 404);
  return a;
}
async function history(db, id) {
  return (await db.query(`SELECT ${changeColumns} FROM appointment_changes WHERE appointment_id=$1 ORDER BY requested_at DESC,id DESC LIMIT 50`, [id])).rows;
}
async function details(db, id, scope) {
  const a = await load(db, id, scope), policy = a.savedPolicy || policyFrom(a), changes = await history(db, id);
  const pending = changes.find(c => c.status === 'pending');
  return { appointment: { id: a.id, code: a.code, status: a.status, date: a.date, time: a.time, end: a.end, total: a.total, refundReviewRequired: a.refundReviewRequired },
    policy, policyHash: policyHash(policy), changes, canCancel: eligible(a, policy, 'cancel'),
    canReschedule: eligible(a, policy, 'reschedule') && !pending, canStaffCancel: a.clinicStatus === 'approved' && future(a),
    unavailableReason: !future(a) ? 'This visit is no longer available for changes.' : a.clinicStatus !== 'approved' ? 'Contact the clinic about changes to this visit.'
      : !policy.cancelEnabled && !policy.rescheduleEnabled ? 'The clinic has not enabled patient appointment changes. Contact the clinic.'
      : 'Patient changes follow the clinic’s deadlines below. Contact the clinic if an action is unavailable.' };
}
async function slots(db, a, date) {
  const lines = (await db.query('SELECT service_id AS id FROM appointment_services WHERE appointment_id=$1', [a.id])).rows;
  const duration = minutes(a.end) - minutes(a.time);
  if (lines.length !== 1 || !a.dentistId || duration < 5 || duration > 480) throw fail('Contact the clinic to arrange a change for this appointment.', 409);
  const result = await availability(db, { clinicId: a.clinicId, serviceId: lines[0].id, dentistId: a.dentistId, date }, a.id, duration);
  return { slots: result.slots.filter(s => date !== a.date || s.time !== a.time), ...bookingWindow(), timezone: 'Asia/Manila' };
}
function validateRequest(body, kind) {
  if (!validId(body.requestKey) || !text(body.reason, 2000)) throw fail('Enter a reason of up to 2,000 characters and retry the action.');
  if (kind === 'reschedule' && !timePattern.test(body.time)) throw fail('Choose an available replacement time.');
}
async function mutate(db, a, actor, kind, body) {
  validateRequest(body, kind);
  const hash = crypto.createHash('sha256').update(JSON.stringify([a.id, kind, body.reason.trim(), body.date || null, body.time || null, body.policyHash || null])).digest('hex');
  const retry = (await db.query('SELECT appointment_id,request_hash FROM appointment_changes WHERE requested_by=$1 AND request_key=$2', [actor.id, body.requestKey])).rows[0];
  if (retry) {
    if (retry.appointment_id !== a.id || retry.request_hash !== hash) throw fail('This action was already submitted with different details. Refresh the appointment.', 409);
    return { saved: true };
  }
  const policy = a.savedPolicy || policyFrom(a);
  if (!future(a)) throw fail('Only upcoming pending, accepted, or confirmed appointments can be changed.', 409);
  if (actor.role === 'patient') {
    if (!eligible(a, policy, kind)) throw fail('This action is unavailable under the clinic’s policy or deadline. Contact the clinic.', 409);
    if (body.policyHash !== policyHash(policy)) throw fail('The clinic’s policy changed. Refresh and review the terms before continuing.', 409);
  }
  let slot = null;
  if (kind === 'reschedule') {
    const pending = await db.query("SELECT id FROM appointment_changes WHERE appointment_id=$1 AND status='pending'", [a.id]);
    if (pending.rows.length) throw fail('A reschedule request is already awaiting clinic review.', 409);
    slot = (await slots(db, a, body.date)).slots.find(s => s.time === body.time);
    if (!slot) throw fail('That replacement time is no longer available. Your original appointment is unchanged.', 409);
  }
  await db.query(`INSERT INTO appointment_changes (appointment_id,kind,status,requested_by,requester_role,request_key,request_hash,reason,policy_snapshot,
    original_date,original_start,original_end,requested_date,requested_start,requested_end,reviewed_by,reviewed_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15,$16,CASE WHEN $16::uuid IS NOT NULL THEN CURRENT_TIMESTAMP ELSE NULL END)`,
  [a.id,kind,kind === 'cancel' ? 'approved' : 'pending',actor.id,actor.role,body.requestKey,hash,body.reason.trim(),JSON.stringify(policy),a.date,a.time,a.end,
    slot ? body.date : null,slot?.time || null,slot?.end || null,kind === 'cancel' ? actor.id : null]);
  await db.query('UPDATE appointments SET change_policy_snapshot=COALESCE(change_policy_snapshot,$1::jsonb),updated_at=CURRENT_TIMESTAMP WHERE id=$2', [JSON.stringify(policy),a.id]);
  if (kind === 'cancel') {
    await db.query(`UPDATE appointment_changes SET status='superseded',reviewed_by=$1,reviewed_at=CURRENT_TIMESTAMP,review_notes='Appointment cancelled.' WHERE appointment_id=$2 AND status='pending'`, [actor.id,a.id]);
    await db.query(`UPDATE appointments SET status='cancelled',refund_review_required=EXISTS(SELECT 1 FROM payments WHERE appointment_id=$1
      AND (payment_status='paid' OR (channel='gcash' AND payment_status='pending'))),updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [a.id]);
    await db.query(`UPDATE payments SET verification_status='needs_review',updated_at=CURRENT_TIMESTAMP WHERE appointment_id=$1
      AND (payment_status='paid' OR (channel='gcash' AND payment_status='pending'))`, [a.id]);
  }
  return { saved: true };
}
async function review(db, a, actorId, changeId, body) {
  if (!validId(changeId) || !['approved','declined'].includes(body.decision) || !text(body.notes, 2000)) throw fail('Choose approve or decline and enter a note of up to 2,000 characters.');
  const c = (await db.query('SELECT * FROM appointment_changes WHERE id=$1 AND appointment_id=$2 FOR UPDATE', [changeId,a.id])).rows[0];
  if (!c) throw fail('Change request not found.', 404);
  if (c.status !== 'pending') {
    if (c.status === body.decision) return { saved: true };
    throw fail('This change request has already been reviewed. Refresh the appointment.', 409);
  }
  if (body.decision === 'approved') {
    if (!future(a)) throw fail('The original visit is no longer eligible for rescheduling.', 409);
    const date = (await db.query('SELECT requested_date::text AS date,to_char(requested_start,\'HH24:MI\') AS time FROM appointment_changes WHERE id=$1', [c.id])).rows[0];
    const slot = (await slots(db, a, date.date)).slots.find(s => s.time === date.time);
    if (!slot) throw fail('The replacement time is no longer available. Your original appointment is unchanged.', 409);
    await db.query('UPDATE appointments SET appointment_date=$1,start_time=$2,end_time=$3,updated_at=CURRENT_TIMESTAMP WHERE id=$4', [date.date,slot.time,slot.end,a.id]);
  }
  await db.query('UPDATE appointment_changes SET status=$1,reviewed_by=$2,reviewed_at=CURRENT_TIMESTAMP,review_notes=$3 WHERE id=$4', [body.decision,actorId,body.notes.trim(),c.id]);
  return { saved: true };
}
function createAppointmentChanges(pool) {
  async function withPatient(id, patientId, action) {
    const initial = await load(pool, id, { patientId });
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      const clinic = (await db.query('SELECT status FROM clinics WHERE id=$1 FOR UPDATE', [initial.clinicId])).rows[0];
      if (clinic?.status !== 'approved') throw fail('Contact the clinic about changes to this appointment.', 409);
      const a = await load(db, id, { patientId }, true);
      const result = await action(db,a);
      await db.query('COMMIT'); return result;
    } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
  }
  return {
    details: (id,patientId) => details(pool,id,{patientId}),
    availability: async(id,patientId,date) => { const a=await load(pool,id,{patientId}); if (!eligible(a,a.savedPolicy || policyFrom(a),'reschedule')) throw fail('Rescheduling is unavailable under the clinic’s policy or deadline.',409); return slots(pool,a,date); },
    change: (id,patientId,kind,body) => withPatient(id,patientId,(db,a)=>mutate(db,a,{id:patientId,role:'patient'},kind,body)),
    withdraw: (id,patientId,changeId) => withPatient(id,patientId,async(db,a)=>{
      if (!validId(changeId)) throw fail('Change request not found.',404);
      const result=await db.query("UPDATE appointment_changes SET status='withdrawn',reviewed_by=$1,reviewed_at=CURRENT_TIMESTAMP WHERE id=$2 AND appointment_id=$3 AND requested_by=$1 AND status='pending' RETURNING id",[patientId,changeId,a.id]);
      if (!result.rows.length) { const existing=await db.query("SELECT id FROM appointment_changes WHERE id=$1 AND appointment_id=$2 AND requested_by=$3 AND status='withdrawn'",[changeId,a.id,patientId]); if (!existing.rows.length) throw fail('This request is no longer awaiting review.',409); }
      return {saved:true};
    }),
  };
}
module.exports = { createAppointmentChanges, policyColumns, policyFrom, policyHash, details, load, mutate, review };
