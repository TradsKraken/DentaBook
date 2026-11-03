const crypto=require("node:crypto");
const {fail,validId}=require("./booking");
const {depositQuote,scaledInteger,payable}=require("./payment-money");
const {appointmentColumns,paymentColumns,latestPayment,paymentSummary}=require("./payment-data");
const appointmentQuery=`SELECT ${appointmentColumns} FROM appointments a JOIN clinics c ON c.id=a.clinic_id LEFT JOIN dentists d ON d.id=a.dentist_id`;
const referencePattern=/^[A-Z0-9-]{6,100}$/;
function createPaymentService(pool) {
 async function owned(patientId,id) {
  if (!validId(id)) throw fail('Appointment not found.',404);
  const appointment=(await pool.query(`${appointmentQuery} WHERE a.id=$1 AND a.patient_user_id=$2`,[id,patientId])).rows[0];
  if (!appointment) throw fail('Appointment not found.',404); return appointment;
 }
 async function locked(id,clinicId,action) {
  const db=await pool.connect();
  try {
   await db.query('BEGIN');await db.query('SELECT id FROM clinics WHERE id=$1 FOR UPDATE',[clinicId]);
   const appointment=(await db.query(`${appointmentQuery} WHERE a.id=$1 AND a.clinic_id=$2 FOR UPDATE OF a`,[id,clinicId])).rows[0];
   if (!appointment) throw fail('Appointment not found.',404);
   const result=await action(db,appointment);await db.query('COMMIT');return result;
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
 }
 async function details(patientId,id){const a=await owned(patientId,id);return paymentSummary(a,await latestPayment(pool,id));}
 async function choose(patientId,id,body={}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw fail("Send a valid payment choice.");
  if (!validId(body.requestKey) || !['gcash','walk_in'].includes(body.channel)) throw fail('Choose GCash or Pay at clinic.');
  const initial=await owned(patientId,id);
  await locked(id,initial.clinicId,async(db,a)=>{
   const existing=await latestPayment(db,id);
   const reused=(await db.query('SELECT appointment_id,channel,payment_status FROM payments WHERE request_key=$1',[body.requestKey])).rows[0];
   if (reused && (reused.appointment_id !== id || reused.channel !== body.channel || reused.payment_status === 'failed')) throw fail('This payment request key has already been used.',409);
   if (existing && ['pending','paid'].includes(existing.status)) {
    if (existing.channel !== body.channel) throw fail('Contact the clinic to review your existing payment choice before switching methods.',409);
    return;
   }
   const summary=paymentSummary(a,existing);
   if (body.channel === 'gcash' ? !summary.canChooseGcash : !summary.canChooseWalkIn) throw fail(summary.unavailableReason || 'That payment option is unavailable.',409);
   let amount=a.total,quote=null;
   if (body.channel === 'gcash') {
    quote=summary.quote;
    if (body.acceptTerms !== true || body.quoteHash !== quote.hash) throw fail('Refresh and agree to the current deposit amount and refund terms.',409);
    amount=quote.amount;
   }
   await db.query(`INSERT INTO payments (appointment_id,amount,payment_method,channel,request_key,quote_hash,recipient_name,recipient_number)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,[id,amount,body.channel === 'gcash' ? 'gcash' : 'cash',body.channel,body.requestKey,quote?.hash || null,quote ? a.gcashAccountName : null,quote ? a.gcashNumber : null]);
   if (quote) await db.query(`UPDATE appointments SET down_payment_amount=$1,deposit_percentage_snapshot=$2,deposit_terms_snapshot=$3,deposit_quote_hash=$4,updated_at=CURRENT_TIMESTAMP WHERE id=$5`,[amount,quote.percentage,quote.terms,quote.hash,id]);
  });return details(patientId,id);
 }
 async function submitReference(patientId,id,body={}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw fail("Send a valid GCash reference.");
  const reference=typeof body.reference === 'string' ? body.reference.trim().toUpperCase() : '';
  if (!referencePattern.test(reference)) throw fail('Enter the GCash transaction reference (6–100 letters, digits or hyphens).');
  const initial=await owned(patientId,id);
  await locked(id,initial.clinicId,async(db,a)=>{
   const p=await latestPayment(db,id);
   if (p?.claimedReference === reference && p.status !== 'failed') return;
   if (!paymentSummary(a,p).canSubmitReference) throw fail('This payment is not available for a new reference. Contact the clinic.',409);
   await db.query(`UPDATE payments SET claimed_reference=$1,claim_submitted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$2`,[reference,p.id]);
  });return details(patientId,id);
 }
 // Called inside the clinic tools transaction, after its owning clinic is locked.
 async function review(db,clinic,id,staffId,body={}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw fail("Send a valid payment review.");
  const p=(await db.query(`SELECT ${paymentColumns} FROM payments p JOIN appointments a ON a.id=p.appointment_id WHERE p.id=$1 AND a.clinic_id=$2 FOR UPDATE OF p`,[id,clinic.id])).rows[0];
  if (!p) throw fail('Payment not found in your clinic.',404);
  const a=(await db.query(`${appointmentQuery} WHERE a.id=$1 FOR UPDATE OF a`,[p.appointmentId])).rows[0];
  const notes=typeof body.notes === 'string' ? body.notes.trim() : '';
  if (notes.length>2000) throw fail('Keep review notes within 2,000 characters.');
  if (body.decision === 'confirm_walk_in') {
   if (p.channel !== 'walk_in' || p.status !== 'pending') throw fail('This is not an unpaid Pay at clinic request.',409);
   if (a.status === 'confirmed' && a.confirmationSource === 'walk_in') return {saved:true};
   if (!payable(a)) throw fail('Only accepted future visits can be confirmed.',409);
   await db.query(`UPDATE appointments SET status='confirmed',confirmed_at=CURRENT_TIMESTAMP,confirmation_source='walk_in',updated_at=CURRENT_TIMESTAMP WHERE id=$1`,[a.id]);
   await db.query(`UPDATE payments SET reviewed_by=$1,reviewed_at=CURRENT_TIMESTAMP,review_notes=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3`,[staffId,notes,p.id]);
   return {saved:true};
  }
  if (body.decision === 'reject') {
   if (p.status !== 'pending' || a.status === 'confirmed') throw fail('This payment choice cannot be rejected.',409);
   if (!notes) throw fail('Explain why this payment choice could not be verified.');
   await db.query(`UPDATE payments SET payment_status='failed',reviewed_by=$1,reviewed_at=CURRENT_TIMESTAMP,review_notes=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3`,[staffId,notes,p.id]);return {saved:true};
  }
  if (body.decision !== 'verify' || p.channel !== 'gcash' || !p.claimedReference) throw fail('A submitted GCash reference is required.');
  if (p.status === 'paid' && p.verifiedAt) return {saved:true};
  if (p.status !== 'pending') throw fail('This payment attempt has ended.',409);
  if (body.checkedAccount !== true || body.matchedReference !== p.claimedReference || scaledInteger(body.receivedAmount) !== scaledInteger(p.amount)) throw fail('Check the clinic’s GCash account and match the exact reference and deposit amount before verifying.');
  const duplicate=await db.query(`SELECT id FROM payments WHERE channel='gcash' AND transaction_reference=$1 AND verified_at IS NOT NULL AND id<>$2`,[p.claimedReference,p.id]);
  if (duplicate.rows.length) throw fail('This GCash reference has already been verified for another payment.',409);
  const confirm=payable(a),code=`DBR-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  const snapshot={clinicName:a.clinicName,clinicAddress:a.clinicAddress,clinicPhone:a.clinicPhone,clinicEmail:a.clinicEmail,
   patientName:a.patientName,patientEmail:a.patientEmail,appointmentCode:a.code,date:a.date,time:a.time,dentistName:a.dentistName,
   estimatedTotal:a.total,depositPercentage:a.depositPercentage,depositTerms:a.depositTerms,amount:p.amount,currency:'PHP',recipientName:p.recipientName,recipientNumber:p.recipientNumber};
  await db.query(`UPDATE payments SET payment_status='paid',transaction_reference=$1,paid_at=CURRENT_TIMESTAMP,verified_at=CURRENT_TIMESTAMP,
   verification_status=$2,reviewed_by=$3,reviewed_at=CURRENT_TIMESTAMP,review_notes=$4,receipt_code=$5,receipt_snapshot=$6::jsonb,updated_at=CURRENT_TIMESTAMP WHERE id=$7`,
   [p.claimedReference,confirm ? 'verified' : 'needs_review',staffId,notes,code,JSON.stringify(snapshot),p.id]);
  if (confirm) await db.query(`UPDATE appointments SET status='confirmed',confirmed_at=CURRENT_TIMESTAMP,confirmation_source='clinic_verified_gcash',updated_at=CURRENT_TIMESTAMP WHERE id=$1`,[a.id]);
  return {saved:true,needsReview:!confirm};
 }
 return {details,choose,submitReference,review};
}
module.exports={createPaymentService};
