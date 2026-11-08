const express=require('express');
const {requireRole}=require('./auth');
const {clinicAccess,fail,uuid}=require('./clinic-access');
const validKey=k=>uuid.test(k || '');
function createConcernRouter(pool,staff=false) {
 const router=express.Router();router.use(requireRole(staff?'clinic_staff':'patient'));
 async function restricted(db,clinic,patient){return (await db.query('SELECT 1 FROM clinic_concern_restrictions WHERE clinic_id=$1 AND patient_id=$2 AND restricted_until>CURRENT_TIMESTAMP',[clinic,patient])).rows.length>0;}
 async function event(db,c,req,body){await db.query("INSERT INTO concern_messages (concern_id,author_id,request_key,kind,body) VALUES ($1,$2,$3,'event',$4)",[c.id,req.user.id,req.body.requestKey,body]);}
 function endpoint(method,path,action){router[method](path,async(req,res,next)=>{let db;try{
   db=await pool.connect();await db.query('BEGIN');
   // Author locks serialize request limits and duplicate keys across threads.
   await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
   const clinic=staff?await clinicAccess(db,req,method!=='get'):null;
   const result=await action(db,req,clinic);await db.query('COMMIT');res.json(result);
 }catch(e){if(db)await db.query('ROLLBACK');if(e.status)res.status(e.status).json({error:e.message});else if(e.code==='23505')res.status(409).json({error:'An open concern or request with this key already exists. Refresh your conversations.'});else next(e);}finally{db?.release();}});}
 const columns=`c.*,cl.name AS "clinicName",u.full_name AS "patientName",d.full_name AS "dentistName"`;
 async function load(db,req,clinic,write=false){
   if(!uuid.test(req.params.id || ''))throw fail('Concern not found.',404);
   const c=(await db.query(`SELECT c.* FROM patient_concerns c JOIN clinics cl ON cl.id=c.clinic_id WHERE c.id=$1 AND ${staff?'c.clinic_id':'c.patient_id'}=$2 AND cl.status='approved'${write?' FOR UPDATE OF c':''}`,[req.params.id,staff?clinic.id:req.user.id])).rows[0];
   if(!c)throw fail('Concern not found or clinic unavailable.',404);
   if(staff && clinic.staffRole==='dentist' && c.dentist_id!==clinic.dentistId && (c.dentist_id || (req.method!=='GET' && req.path!==`/${c.id}/claim`)))throw fail('Only your assigned concerns are available.',403);
   return c;
 }
 endpoint('get','/',async(db,req,clinic)=>{
   const offset=Number(req.query.offset || 0);if(!Number.isInteger(offset)||offset<0||offset>1000000)throw fail('Invalid page.');
   const rows=(await db.query(`SELECT ${columns} FROM patient_concerns c JOIN clinics cl ON cl.id=c.clinic_id JOIN users u ON u.id=c.patient_id LEFT JOIN dentists d ON d.id=c.dentist_id WHERE ${staff?'c.clinic_id':'c.patient_id'}=$1 ${staff && clinic.staffRole==='dentist'?"AND (c.dentist_id=$3 OR (c.dentist_id IS NULL AND c.status='open'))":''} ORDER BY c.created_at DESC,c.id DESC LIMIT 21 OFFSET $2`,staff && clinic.staffRole==='dentist'?[clinic.id,offset,clinic.dentistId]:[staff?clinic.id:req.user.id,offset])).rows;
   return {concerns:rows.slice(0,20),hasMore:rows.length>20,...(staff?{role:clinic.staffRole,dentists:['owner','manager'].includes(clinic.staffRole)?(await db.query('SELECT id,full_name AS name FROM dentists WHERE clinic_id=$1 AND is_active=TRUE ORDER BY full_name,id',[clinic.id])).rows:[]}: {})};
 });
 if(!staff)endpoint('post','/',async(db,req)=>{
   const b=req.body || {};if(!validKey(b.requestKey)||!uuid.test(b.clinicId || '')||typeof b.concern!=='string'||b.concern.trim().length<10||b.concern.trim().length>4000)throw fail('Choose a clinic and describe your concern in 10–4,000 characters.');
   const prior=(await db.query('SELECT * FROM patient_concerns WHERE patient_id=$1 AND request_key=$2',[req.user.id,b.requestKey])).rows[0];
   if(prior){if(prior.clinic_id!==b.clinicId||prior.concern!==b.concern.trim())throw fail('Request key already used for different details.',409);return {id:prior.id};}
   if(!(await db.query("SELECT id FROM clinics WHERE id=$1 AND status='approved' FOR SHARE",[b.clinicId])).rows.length)throw fail('Clinic unavailable.',404);
   if(await restricted(db,b.clinicId,req.user.id))throw fail('This clinic has temporarily restricted new concerns and replies. Booking remains available.',403);
   const open=(await db.query("SELECT id FROM patient_concerns WHERE patient_id=$1 AND clinic_id=$2 AND status='open'",[req.user.id,b.clinicId])).rows[0];
   if(open)return {id:open.id,existing:true};
   if(Number((await db.query("SELECT COUNT(*) AS n FROM patient_concerns WHERE patient_id=$1 AND created_at>CURRENT_TIMESTAMP-INTERVAL '24 hours'",[req.user.id])).rows[0].n)>=3)throw fail('You can start up to three concerns in 24 hours. Continue an existing conversation or try again later.',429);
   return (await db.query('INSERT INTO patient_concerns (clinic_id,patient_id,request_key,concern) VALUES ($1,$2,$3,$4) RETURNING id',[b.clinicId,req.user.id,b.requestKey,b.concern.trim()])).rows[0];
 });
 endpoint('get','/:id',async(db,req,clinic)=>{const c=await load(db,req,clinic);return {concern:(await db.query(`SELECT ${columns} FROM patient_concerns c JOIN clinics cl ON cl.id=c.clinic_id JOIN users u ON u.id=c.patient_id LEFT JOIN dentists d ON d.id=c.dentist_id WHERE c.id=$1`,[c.id])).rows[0],restricted:await restricted(db,c.clinic_id,c.patient_id),messages:(await db.query('SELECT m.*,u.full_name AS author,u.role AS "authorRole" FROM concern_messages m JOIN users u ON u.id=m.author_id WHERE concern_id=$1 ORDER BY created_at,id',[c.id])).rows};});
 endpoint('post','/:id/messages',async(db,req,clinic)=>{const c=await load(db,req,clinic,true),b=req.body || {};
   if(!validKey(b.requestKey)||typeof b.body!=='string'||!b.body.trim()||b.body.trim().length>4000)throw fail('Enter a message of up to 4,000 characters.');
   const prior=(await db.query('SELECT * FROM concern_messages WHERE author_id=$1 AND request_key=$2',[req.user.id,b.requestKey])).rows[0];
   if(prior){if(prior.concern_id!==c.id||prior.body!==b.body.trim()||prior.kind!=='message')throw fail('Request key already used.',409);return {saved:true};}
   if(c.status!=='open')throw fail('This conversation is closed.',409);
   if(!staff && await restricted(db,c.clinic_id,c.patient_id))throw fail('This clinic has temporarily restricted replies.',403);
   if(Number((await db.query("SELECT COUNT(*) AS n FROM concern_messages WHERE author_id=$1 AND kind='message' AND created_at>CURRENT_TIMESTAMP-INTERVAL '1 minute'",[req.user.id])).rows[0].n)>=5)throw fail('Please wait a minute before sending more messages.',429);
   await db.query('INSERT INTO concern_messages (concern_id,author_id,request_key,body) VALUES ($1,$2,$3,$4)',[c.id,req.user.id,b.requestKey,b.body.trim()]);return {saved:true};
 });
 if(staff){
 endpoint('post','/:id/claim',async(db,req,clinic)=>{const c=await load(db,req,clinic,true);if(clinic.staffRole!=='dentist')throw fail('Only an active linked dentist can accommodate a patient.',403);if(c.status!=='open')throw fail('Concern is closed.',409);if(c.dentist_id){if(c.dentist_id===clinic.dentistId)return {saved:true};throw fail('Another dentist already accommodated this patient.',409);}if(!validKey(req.body?.requestKey))throw fail('A request key is required.');await db.query('UPDATE patient_concerns SET dentist_id=$1 WHERE id=$2',[clinic.dentistId,c.id]);await event(db,c,req,'Dentist accommodated this concern.');return {saved:true};});
 endpoint('post','/:id/manage',async(db,req,clinic)=>{const c=await load(db,req,clinic,true),b=req.body || {};if(!validKey(b.requestKey)||typeof b.reason!=='string'||!b.reason.trim()||b.reason.trim().length>1000)throw fail('Enter a reason of up to 1,000 characters.');
   const previous=(await db.query('SELECT * FROM concern_messages WHERE author_id=$1 AND request_key=$2',[req.user.id,b.requestKey])).rows[0];
   const label={close:'Closed',spam:'Marked as spam',reopen:'Reopened',restrict:'Replies restricted for 24 hours',unrestrict:'Reply restriction removed',reassign:'Dentist reassigned'}[b.action];
   if(!label)throw fail('Choose a valid action.');const description=label+(b.action==='reassign'?` (${(await db.query('SELECT full_name FROM dentists WHERE id=$1 AND clinic_id=$2',[uuid.test(b.dentistId || '')?b.dentistId:null,clinic.id])).rows[0]?.full_name || 'Unavailable dentist'})`:'')+': '+b.reason.trim();
   if(previous){if(previous.concern_id!==c.id||previous.kind!=='event'||previous.body!==description)throw fail('Request key already used.',409);return {saved:true};}
   if(['restrict','unrestrict','reassign'].includes(b.action)&&!['owner','manager'].includes(clinic.staffRole))throw fail('Owner or manager access is required.',403);
   if(['close','spam','reopen'].includes(b.action))await db.query('UPDATE patient_concerns SET status=$1 WHERE id=$2',[{close:'closed',spam:'spam',reopen:'open'}[b.action],c.id]);
   if(b.action==='reassign'){if(!uuid.test(b.dentistId || '')||!(await db.query('SELECT id FROM dentists WHERE id=$1 AND clinic_id=$2 AND is_active=TRUE',[b.dentistId,clinic.id])).rows.length)throw fail('Choose an active dentist in this clinic.');await db.query('UPDATE patient_concerns SET dentist_id=$1 WHERE id=$2',[b.dentistId,c.id]);}
   if(b.action==='restrict')await db.query("INSERT INTO clinic_concern_restrictions (clinic_id,patient_id,restricted_until) VALUES ($1,$2,CURRENT_TIMESTAMP+INTERVAL '24 hours') ON CONFLICT(clinic_id,patient_id) DO UPDATE SET restricted_until=EXCLUDED.restricted_until",[c.clinic_id,c.patient_id]);
   if(b.action==='unrestrict')await db.query('DELETE FROM clinic_concern_restrictions WHERE clinic_id=$1 AND patient_id=$2',[c.clinic_id,c.patient_id]);
   await event(db,c,req,description);return {saved:true};
 });}
 return router;
}
module.exports={createConcernRouter};
