const express=require('express');
const {validId,fail}=require('../booking');
async function paymentReceipt(db,id,{patientId,clinicId}={}) {
 if ((!validId(patientId) && !validId(clinicId)) || !validId(id)) throw fail('Receipt not found.',404);
 const result=await db.query(`SELECT p.receipt_code AS code,p.amount,p.currency,p.channel AS method,p.transaction_reference AS reference,
  p.paid_at AS "paidAt",p.verified_at AS "verifiedAt",p.payment_status AS status,p.verification_status AS verification,p.receipt_snapshot AS details,
  a.status AS "appointmentStatus" FROM payments p JOIN appointments a ON a.id=p.appointment_id WHERE p.id=$1
  AND ($2::uuid IS NULL OR a.patient_user_id=$2::uuid) AND ($3::uuid IS NULL OR a.clinic_id=$3::uuid)
  AND p.verified_at IS NOT NULL AND p.receipt_code IS NOT NULL`,[id,patientId || null,clinicId || null]);
 if (!result.rows.length) throw fail('A verified receipt is not available for this payment.',404);
 return {receipt:result.rows[0]};
}
function createPatientPaymentRouter(pool,payments) {
 const router=express.Router();
 function endpoint(method,path,action){router[method](path,async(req,res,next)=>{try{res.json(await action(req));}catch(error){if(error.status)return res.status(error.status).json({error:error.message});next(error);}});}
 endpoint('get','/appointments/:id/payment',req=>payments.details(req.user.id,req.params.id));
 endpoint('post','/appointments/:id/payment-choice',req=>payments.choose(req.user.id,req.params.id,req.body));
 endpoint('post','/appointments/:id/payment-reference',req=>payments.submitReference(req.user.id,req.params.id,req.body));
 endpoint('get','/payments/:id/receipt',req=>paymentReceipt(pool,req.params.id,{patientId:req.user.id}));
 return router;
}
module.exports={createPatientPaymentRouter,paymentReceipt};
