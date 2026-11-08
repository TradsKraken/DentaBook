const express=require('express');
const {requireRole}=require('./auth');
const {clinicAccess,fail,uuid}=require('./clinic-access');
function createNotificationRouter(pool,staff=false){
 const router=express.Router();router.use(requireRole(staff?'clinic_staff':'patient'));
 for(const [method,path] of [['get','/'],['post','/read-all'],['post','/:id/read']])router[method](path,async(req,res,next)=>{
 let db;try{
 db=await pool.connect();await db.query('BEGIN');const clinic=staff?await clinicAccess(db,req,method==='post'):null;
 const values=staff?[req.user.id,clinic.id,clinic.staffRole==='dentist'?clinic.dentistId:null]:[req.user.id];
 const scope=`n.audience='${staff?'clinic':'patient'}' AND cl.status='approved' AND ${staff?"c.clinic_id=$2 AND n.actor_id IS DISTINCT FROM $1 AND ($3::uuid IS NULL OR c.dentist_id=$3 OR (c.dentist_id IS NULL AND c.status='open'))":"c.patient_id=$1"}`;
 const from=`FROM concern_notifications n JOIN patient_concerns c ON c.id=n.concern_id JOIN clinics cl ON cl.id=c.clinic_id`;
 if(method==='post'){
 let filter='';if(req.params.id){if(!uuid.test(req.params.id))throw fail('Notification not found.',404);values.push(req.params.id);filter=` AND n.id=$${values.length}`;const found=await db.query(`SELECT n.id ${from} WHERE ${scope}${filter}`,values);if(!found.rows.length)throw fail('Notification not found.',404);}
 await db.query(`INSERT INTO notification_reads(notification_id,user_id) SELECT n.id,$1 ${from} WHERE ${scope}${filter} ON CONFLICT DO NOTHING`,values);
 }
 const unread=Number((await db.query(`SELECT COUNT(*) AS n ${from} LEFT JOIN notification_reads r ON r.notification_id=n.id AND r.user_id=$1 WHERE ${scope} AND r.notification_id IS NULL`,values.slice(0,staff?3:1))).rows[0].n);
 let items=[],hasMore=false;
 if(method==='get' && req.query.summary!=='1'){
 const offset=Number(req.query.offset||0);if(!Number.isInteger(offset)||offset<0||offset>1000000)throw fail('Invalid notification page.');const args=values.slice(0,staff?3:1);args.push(offset);
 items=(await db.query(`SELECT n.id,n.title,n.created_at AS "createdAt",c.id AS "concernId",cl.name AS "clinicName",r.read_at AS "readAt" ${from} LEFT JOIN notification_reads r ON r.notification_id=n.id AND r.user_id=$1 WHERE ${scope} ORDER BY n.created_at DESC,n.id DESC LIMIT 21 OFFSET $${args.length}`,args)).rows;hasMore=items.length>20;items=items.slice(0,20);
 }
 await db.query('COMMIT');res.json({unread,items,hasMore});
 }catch(e){if(db)await db.query('ROLLBACK');if(e.status)res.status(e.status).json({error:e.message});else next(e);}finally{db?.release();}
 });return router;
}
module.exports={createNotificationRouter};
