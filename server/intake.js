const express=require('express');
const {uuid,fail}=require('./clinic-access');
const {text}=require('./validation');
const active=appointment=>['pending_review','accepted','confirmed'].includes(appointment.status);
async function loadAppointment(db,id,scope,lock=false) {
  if (!uuid.test(id || '')) throw fail('Appointment not found.',404);
  const result=await db.query(`SELECT a.id,a.clinic_id AS "clinicId",a.status,c.status AS "clinicStatus"
    FROM appointments a JOIN clinics c ON c.id=a.clinic_id WHERE a.id=$1 AND ${scope.clinicId ? 'a.clinic_id' : 'a.patient_user_id'}=$2${lock ? ' FOR UPDATE OF a' : ''}`,[id,scope.clinicId || scope.patientId]);
  if (!result.rows.length) throw fail('Appointment not found.',404);
  return result.rows[0];
}
async function template(db,appointment) {
  const settings=(await db.query('SELECT enabled,purpose,retention,questions,version FROM clinic_intake_settings WHERE clinic_id=$1',[appointment.clinicId])).rows[0];
  if (!settings) return null;
  const serviceIds=(await db.query('SELECT service_id FROM appointment_services WHERE appointment_id=$1',[appointment.id])).rows.map(row=>row.service_id);
  return {...settings,questions:settings.questions.filter(q=>!q.serviceId || serviceIds.includes(q.serviceId))};
}
async function details(db,id,scope) {
  const appointment=await loadAppointment(db,id,scope);
  const settings=await template(db,appointment);
  const submissions=(await db.query(`SELECT s.id,s.answers,s.purpose,s.retention,s.template_version AS version,s.submitted_at AS "submittedAt",u.full_name AS author
    FROM appointment_intake_submissions s LEFT JOIN users u ON u.id=s.submitted_by WHERE s.appointment_id=$1 ORDER BY s.submitted_at DESC,s.id DESC`,[id])).rows;
  const followups=(await db.query(`SELECT f.id,f.question,f.requested_at AS "requestedAt",u.full_name AS "requestedBy",f.response,f.responded_at AS "respondedAt",p.full_name AS "respondedBy"
    FROM appointment_followups f LEFT JOIN users u ON u.id=f.requested_by LEFT JOIN users p ON p.id=f.responded_by WHERE f.appointment_id=$1 ORDER BY f.requested_at,f.id`,[id])).rows;
  return {template:settings,submissions,followups,canRespond:active(appointment) && appointment.clinicStatus==='approved'};
}
function registerIntakeEndpoints(endpoint) {
  endpoint('get','/intake-settings',async(db,clinic)=>({settings:(await db.query('SELECT enabled,purpose,retention,questions,version FROM clinic_intake_settings WHERE clinic_id=$1',[clinic.id])).rows[0] || {enabled:false,purpose:'',retention:'',questions:[],version:0}}));
  endpoint('put','/intake-settings',async(db,clinic,req)=>{
    const b=req.body || {};
    if (typeof b.enabled!=='boolean' || typeof b.purpose!=='string' || b.purpose.trim().length>2000 || typeof b.retention!=='string' || b.retention.trim().length>2000 || !Array.isArray(b.questions) || b.questions.length>30 || !Number.isInteger(b.version)) throw fail('Provide valid intake settings and up to 30 questions.');
    if (b.enabled && (!b.questions.length || !b.purpose.trim() || !b.retention.trim())) throw fail('Before enabling intake, add questions and explain their purpose and your record-retention policy.');
    const ids=new Set();
    const questions=[];
    for (const q of b.questions) {
      if (!q || !uuid.test(q.id || '') || ids.has(q.id) || !text(q.label,500) || !['text','yes_no'].includes(q.type) || typeof q.required!=='boolean' || (q.serviceId!==null && !uuid.test(q.serviceId || ''))) throw fail('Each question needs a unique ID, label, answer type, and optional clinic treatment.');
      ids.add(q.id);
      if (q.serviceId && !(await db.query('SELECT id FROM services WHERE id=$1 AND clinic_id=$2',[q.serviceId,clinic.id])).rows.length) throw fail('Question treatments must belong to your clinic.');
      questions.push({id:q.id,label:q.label.trim(),type:q.type,required:q.required,serviceId:q.serviceId});
    }
    const current=(await db.query('SELECT version FROM clinic_intake_settings WHERE clinic_id=$1',[clinic.id])).rows[0];
    if ((current?.version || 0)!==b.version) throw fail('Intake settings changed. Reload before saving.',409);
    await db.query(`INSERT INTO clinic_intake_settings (clinic_id,enabled,purpose,retention,questions,updated_by) VALUES ($1,$2,$3,$4,$5::jsonb,$6)
      ON CONFLICT (clinic_id) DO UPDATE SET enabled=EXCLUDED.enabled,purpose=EXCLUDED.purpose,retention=EXCLUDED.retention,questions=EXCLUDED.questions,version=clinic_intake_settings.version+1,updated_by=EXCLUDED.updated_by,updated_at=CURRENT_TIMESTAMP`,[clinic.id,b.enabled,b.purpose.trim(),b.retention.trim(),JSON.stringify(questions),req.user.id]);
    return {saved:true};
  });
  endpoint('get','/appointments/:id/intake',(db,clinic,req)=>details(db,req.params.id,{clinicId:clinic.id}));
  endpoint('post','/appointments/:id/followups',async(db,clinic,req)=>{
    const appointment=await loadAppointment(db,req.params.id,{clinicId:clinic.id},true);
    const b=req.body || {};
    if (!text(b.question,2000) || !uuid.test(b.requestKey || '')) throw fail('Enter a question of up to 2,000 characters.');
    const existing=(await db.query('SELECT question FROM appointment_followups WHERE appointment_id=$1 AND request_key=$2',[appointment.id,b.requestKey])).rows[0];
    if (existing) { if (existing.question!==b.question.trim()) throw fail('This request key has already been used.',409); return {saved:true}; }
    if (!active(appointment)) throw fail('Follow-up requests are available for active appointments.',409);
    await db.query('INSERT INTO appointment_followups (appointment_id,request_key,question,requested_by) VALUES ($1,$2,$3,$4)',[appointment.id,b.requestKey,b.question.trim(),req.user.id]);
    return {saved:true};
  });
}
function createPatientIntakeRouter(pool) {
  const router=express.Router();
  function endpoint(method,path,action) {
    router[method](path,async(req,res,next)=>{
      let db;
      try {
        db=method==='get' ? pool : await pool.connect();
        if (method!=='get') await db.query('BEGIN');
        const result=await action(db,req);
        if (method!=='get') await db.query('COMMIT');
        res.json(result);
      } catch(error) {
        if (db && method!=='get') await db.query('ROLLBACK');
        if (error.status) res.status(error.status).json({error:error.message}); else next(error);
      } finally { if (method!=='get') db?.release(); }
    });
  }
  endpoint('get','/appointments/:id/intake',(db,req)=>details(db,req.params.id,{patientId:req.user.id}));
  endpoint('put','/appointments/:id/intake',async(db,req)=>{
    // Clinic lock orders intake edits with settings updates and clinic mutations.
    const original=await loadAppointment(db,req.params.id,{patientId:req.user.id});
    await db.query('SELECT id FROM clinics WHERE id=$1 FOR UPDATE',[original.clinicId]);
    const appointment=await loadAppointment(db,req.params.id,{patientId:req.user.id},true);
    const b=req.body || {};
    if (!uuid.test(b.requestKey || '') || b.consent!==true || !Array.isArray(b.answers) || b.answers.length>30) throw fail('Answer the clinic questions and agree to share the information for this visit.');
    const existing=(await db.query('SELECT answers,template_version FROM appointment_intake_submissions WHERE appointment_id=$1 AND request_key=$2',[appointment.id,b.requestKey])).rows[0];
    if (existing) {
      const saved=existing.answers.map(a=>({questionId:a.questionId,value:a.value}));
      if (existing.template_version!==b.version || JSON.stringify(saved)!==JSON.stringify(b.answers)) throw fail('This submission key has already been used.',409);
      return {saved:true};
    }
    if (!active(appointment) || appointment.clinicStatus!=='approved') throw fail('Intake can be submitted for active appointments at approved clinics.',409);
    const settings=await template(db,appointment);
    if (!settings?.enabled || !settings.questions.length) throw fail('This clinic has not enabled intake for this visit.',409);
    if (settings.version!==b.version) throw fail('The clinic questions changed. Reload before answering.',409);
    const answers=[];
    const seen=new Set();
    for (const input of b.answers) {
      const q=settings.questions.find(q=>q.id===input?.questionId);
      if (!q || seen.has(q.id) || typeof input.value!=='string' || input.value.length>2000) throw fail('Check your answers; each can contain up to 2,000 characters.');
      seen.add(q.id);
      const value=input.value.trim();
      if (q.type==='yes_no' && value && !['yes','no','unsure'].includes(value)) throw fail('Choose yes, no, or unsure.');
      if (q.required && !value) throw fail(`Please answer: ${q.label}`);
      answers.push({questionId:q.id,label:q.label,type:q.type,required:q.required,serviceId:q.serviceId,value});
    }
    if (settings.questions.some(q=>q.required && !seen.has(q.id))) throw fail('Please answer all required questions.');
    await db.query(`INSERT INTO appointment_intake_submissions (appointment_id,submitted_by,request_key,template_version,purpose,retention,answers)
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,[appointment.id,req.user.id,b.requestKey,settings.version,settings.purpose,settings.retention,JSON.stringify(answers)]);
    return {saved:true};
  });
  endpoint('post','/appointments/:id/followups/:followupId/reply',async(db,req)=>{
    const appointment=await loadAppointment(db,req.params.id,{patientId:req.user.id},true);
    if (!uuid.test(req.params.followupId) || !text(req.body?.response,2000)) throw fail('Enter a response of up to 2,000 characters.');
    const followup=(await db.query('SELECT response FROM appointment_followups WHERE id=$1 AND appointment_id=$2 FOR UPDATE',[req.params.followupId,appointment.id])).rows[0];
    if (!followup) throw fail('Follow-up request not found.',404);
    const response=req.body.response.trim();
    if (followup.response!==null) { if (followup.response!==response) throw fail('This request already has a saved response.',409); return {saved:true}; }
    if (!active(appointment) || appointment.clinicStatus!=='approved') throw fail('This appointment is no longer open for follow-up.',409);
    await db.query('UPDATE appointment_followups SET response=$1,responded_by=$2,responded_at=CURRENT_TIMESTAMP WHERE id=$3',[response,req.user.id,req.params.followupId]);
    return {saved:true};
  });
  return router;
}
module.exports={registerIntakeEndpoints,createPatientIntakeRouter};
