const { depositQuote, payable } = require("./payment-money");
const appointmentColumns = `a.id,a.clinic_id AS "clinicId",a.patient_user_id AS "patientId",a.patient_name AS "patientName",
 a.patient_email AS "patientEmail",a.patient_phone AS "patientPhone",a.appointment_code AS code,a.status,
 a.appointment_date::text AS date,to_char(a.start_time,'HH24:MI') AS time,to_char(a.end_time,'HH24:MI') AS end,
 a.estimated_total_cost AS total,a.down_payment_amount AS "depositAmount",a.deposit_percentage_snapshot AS "depositPercentage",
 a.deposit_terms_snapshot AS "depositTerms",a.deposit_quote_hash AS "depositQuoteHash",a.confirmed_at AS "confirmedAt",a.confirmation_source AS "confirmationSource",
 c.name AS "clinicName",c.address AS "clinicAddress",c.phone AS "clinicPhone",c.email AS "clinicEmail",
 c.deposit_policy_configured AS "depositPolicyConfigured",c.deposit_percentage AS "clinicDepositPercentage",c.deposit_refund_terms AS "depositRefundTerms",
 c.gcash_enabled AS "gcashEnabled",c.gcash_account_name AS "gcashAccountName",c.gcash_number AS "gcashNumber",c.walk_in_enabled AS "walkInEnabled",
 c.status AS "clinicStatus",d.full_name AS "dentistName"`;
const paymentColumns = `p.id,p.appointment_id AS "appointmentId",p.amount,p.currency,p.payment_status AS status,p.channel,
 p.recipient_name AS "recipientName",p.recipient_number AS "recipientNumber",p.claimed_reference AS "claimedReference",
 p.claim_submitted_at AS "claimSubmittedAt",p.verification_status AS verification,p.verified_at AS "verifiedAt",p.paid_at AS "paidAt",
 p.receipt_code AS "receiptCode",p.review_notes AS "reviewNotes",p.created_at AS "createdAt"`;
async function latestPayment(db,id) {
 return (await db.query(`SELECT ${paymentColumns} FROM payments p WHERE p.appointment_id=$1 AND p.channel IS NOT NULL
 ORDER BY CASE WHEN p.payment_status='paid' THEN 0 WHEN p.payment_status='pending' THEN 1 ELSE 2 END,p.created_at DESC,p.id DESC LIMIT 1`,[id])).rows[0] || null;
}
function paymentSummary(appointment,payment) {
 const quote=depositQuote(appointment,{depositPolicyConfigured:appointment.depositPolicyConfigured,depositPercentage:appointment.clinicDepositPercentage,depositRefundTerms:appointment.depositRefundTerms});
 let unavailableReason=null;
 if (payment?.status === 'pending') {
  if (payment.channel === 'walk_in') unavailableReason=appointment.status === 'confirmed' && appointment.confirmationSource === 'walk_in'
   ? 'Your visit is confirmed as Pay at clinic. No payment has been recorded.'
   : payable(appointment) && appointment.clinicStatus === 'approved' ? 'Pay at clinic selected. The clinic will confirm your visit; no payment has been recorded.'
   : 'This visit is unavailable for confirmation. Contact the clinic about your Pay at clinic choice.';
  else unavailableReason=payment.claimedReference ? 'Your GCash reference is awaiting the clinic’s verification. Do not pay again.'
   : !payable(appointment) || appointment.clinicStatus !== 'approved' ? 'Do not send a new transfer for this unavailable appointment. Contact the clinic.' : null;
 }
 else if (payment?.status === 'paid') unavailableReason='Your GCash payment has been verified by the clinic.';
 else if (!payable(appointment)) unavailableReason=appointment.status === 'pending_review' ? 'Payment options become available after the clinic accepts your request.' : 'This appointment is not available for a new payment choice.';
 else if (appointment.clinicStatus !== 'approved') unavailableReason='Payment options are unavailable for this clinic.';
 else if (!appointment.gcashEnabled && !appointment.walkInEnabled) unavailableReason='The clinic has not enabled payment options yet. Contact the clinic for next steps.';
 const canChoose=payable(appointment) && appointment.clinicStatus === 'approved' && (!payment || payment.status === 'failed');
 const {id,code,status,date,time,end,clinicName,clinicAddress,clinicPhone,patientName,patientEmail,dentistName,total,confirmedAt,confirmationSource}=appointment;
 return {appointment:{id,code,status,date,time,end,clinicName,clinicAddress,clinicPhone,patientName,patientEmail,dentistName,total,confirmedAt,confirmationSource},quote,payment,unavailableReason,
  canChooseGcash:canChoose && appointment.gcashEnabled && !!quote && Number(quote.amount)>0,
  canChooseWalkIn:canChoose && appointment.walkInEnabled,
  canSubmitReference:payment?.channel === 'gcash' && payment.status === 'pending' && !payment.claimedReference && appointment.status === 'accepted' && appointment.clinicStatus === 'approved' && payable(appointment)};
}
module.exports={appointmentColumns,paymentColumns,latestPayment,paymentSummary};
