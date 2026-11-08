const express=require('express');
const {fail,uuid}=require('./clinic-access');
function registerVisitEndpoints(endpoint) {
  endpoint('post','/appointments/:id/complete',async(db,clinic,req)=>{
    if (req.body?.confirm!==true) throw fail('Confirm that the visit took place.');
    const a=(await db.query(`SELECT id,status,completed_at,(appointment_date+end_time) AT TIME ZONE 'Asia/Manila' AS ends FROM appointments WHERE id=$1 AND clinic_id=$2 FOR UPDATE`,[req.params.id,clinic.id])).rows[0];
    if (!a) throw fail('Appointment not found.',404);
    if (a.status==='completed') return {completed:true};
    if (a.status!=='confirmed' || new Date(a.ends)>new Date()) throw fail('Only confirmed visits whose scheduled end has passed can be completed.',409);
    if ((await db.query("SELECT id FROM appointment_changes WHERE appointment_id=$1 AND status='pending'",[a.id])).rows.length) throw fail('Resolve the pending appointment change before completing this visit.',409);
    await db.query("UPDATE appointments SET status='completed',completed_at=CURRENT_TIMESTAMP,completed_by=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2",[req.user.id,a.id]);
    return {completed:true};
  },200);
  endpoint('get','/appointments/:id/feedback',async(db,clinic,req)=>{
    const a=(await db.query('SELECT completed_at AS "completedAt",u.full_name AS "completedBy" FROM appointments a LEFT JOIN users u ON u.id=a.completed_by WHERE a.id=$1 AND a.clinic_id=$2',[req.params.id,clinic.id])).rows[0];
    if (!a) throw fail('Appointment not found.',404);
    return {...a,feedback:(await db.query('SELECT rating,comment,created_at AS "createdAt" FROM reviews WHERE appointment_id=$1',[req.params.id])).rows[0] || null};
  });
}
function createFeedbackRouter(pool) {
  const router=express.Router();
  for (const method of ['get','post']) router[method]('/appointments/:id/feedback',async(req,res,next)=>{
    let db;
    try {
      if (!uuid.test(req.params.id)) throw fail('Appointment not found.',404);
      db=await pool.connect();await db.query('BEGIN');
      const a=(await db.query('SELECT status,completed_at FROM appointments WHERE id=$1 AND patient_user_id=$2 FOR UPDATE',[req.params.id,req.user.id])).rows[0];
      if (!a) throw fail('Appointment not found.',404);
      let feedback=(await db.query('SELECT rating,comment,created_at AS "createdAt" FROM reviews WHERE appointment_id=$1',[req.params.id])).rows[0] || null;
      if (method==='post') {
        const b=req.body || {};
        if (a.status!=='completed' || !a.completed_at) throw fail('Feedback is available after the clinic records the visit as completed.',409);
        if (!Number.isInteger(b.rating) || b.rating<1 || b.rating>5 || typeof b.comment!=='string' || b.comment.trim().length>2000) throw fail('Choose a rating from 1 to 5 and keep comments within 2,000 characters.');
        if (feedback && (feedback.rating!==b.rating || (feedback.comment || '')!==b.comment.trim())) throw fail('Feedback has already been submitted for this visit.',409);
        if (!feedback) feedback=(await db.query('INSERT INTO reviews (appointment_id,rating,comment) VALUES ($1,$2,$3) RETURNING rating,comment,created_at AS "createdAt"',[req.params.id,b.rating,b.comment.trim()])).rows[0];
      }
      await db.query('COMMIT');res.json({feedback,canSubmit:a.status==='completed' && !!a.completed_at && !feedback});
    } catch(error) {if(db)await db.query('ROLLBACK');if(error.status)res.status(error.status).json({error:error.message});else next(error);} finally {db?.release();}
  });
  return router;
}
module.exports={registerVisitEndpoints,createFeedbackRouter};
