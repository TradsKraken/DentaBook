const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const bcrypt=require('bcrypt');
const {PGlite}=require('@electric-sql/pglite');
const {pgcrypto}=require('@electric-sql/pglite/contrib/pgcrypto');
const {Pool}=require('pg');
const {migrate}=require('../database/migrate');
const {createApp}=require('../app');
const {hashToken}=require('../auth');

test('private intake, follow-up, profiles, staff access, and atomic working hours',async t=>{
  const native=process.env.DENTABOOK_ISOLATED_INTAKE_TEST==='1';
  const db=native ? new Pool({host:'dentabook-booking-test-db',database:'dentabook_intake_test',user:'booking_test',password:'isolated_test_only'}) : new PGlite({extensions:{pgcrypto}});
  const pool=native ? db : {async query(sql,values){return values ? db.query(sql,values) : (await db.exec(sql)).at(-1);},async connect(){return {query:pool.query,release(){}};}};
  const schema=await fs.readFile(path.join(__dirname,'../database/init.sql'),'utf8');
  if(native) await db.query(schema);else await db.exec(schema);await migrate(pool);await migrate(pool);
  const previous=process.env.APP_PORTAL;process.env.APP_PORTAL='public';
  const server=createApp(pool).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const password='A secure staff test password!';const hash=await bcrypt.hash(password,12);
  async function account(role) {
    const email=`${crypto.randomUUID()}@example.test`;
    const id=(await db.query('INSERT INTO users (full_name,email,password_hash,role,phone) VALUES ($1,$2,$3,$4,$5) RETURNING id',['Test account',email,hash,role,'09123456789'])).rows[0].id;
    return {id,email,cookie:await session(id,role)};
  }
  async function session(id,role='clinic_staff') {const token=crypto.randomBytes(32).toString('hex');await db.query("INSERT INTO sessions (token_hash,user_id,role,expires_at) VALUES ($1,$2,$3,CURRENT_TIMESTAMP+INTERVAL '1 day')",[hashToken(token),id,role]);return `dentabook_public_session=${token}`;}
  const owner=await account('clinic_staff'),other=await account('clinic_staff'),patient=await account('patient'),stranger=await account('patient');
  async function clinic(user,name) {return (await db.query("INSERT INTO clinics (owner_user_id,name,address,phone,email,status) VALUES ($1,$2,'Test address','09123456789','clinic@example.test','approved') RETURNING id",[user.id,name])).rows[0].id;}
  const clinicId=await clinic(owner,'Intake test clinic'),otherClinic=await clinic(other,'Other test clinic');
  async function request(route,{method='GET',body,cookie=owner.cookie}={}) {const response=await fetch(origin+'/api'+route,{method,headers:{'Content-Type':'application/json','X-DentaBook-Request':'1',Cookie:cookie},...(body ? {body:JSON.stringify(body)} : {})});return {status:response.status,data:await response.json()};}
  const base='/workspaces/clinic/manage';
  const serviceId=(await db.query("INSERT INTO services (clinic_id,name,category,estimated_price,duration_minutes) VALUES ($1,'Test treatment','General',100,30) RETURNING id",[clinicId])).rows[0].id;
  const foreignService=(await db.query("INSERT INTO services (clinic_id,name,category,estimated_price,duration_minutes) VALUES ($1,'Foreign treatment','General',100,30) RETURNING id",[otherClinic])).rows[0].id;
  const dentists=[];for(const name of ['Test dentist A','Test dentist B']) dentists.push((await db.query("INSERT INTO dentists (clinic_id,full_name) VALUES ($1,$2) RETURNING id",[clinicId,name])).rows[0].id);
  const appointmentId=(await db.query(`INSERT INTO appointments (appointment_code,clinic_id,dentist_id,patient_user_id,patient_name,patient_email,patient_phone,appointment_date,start_time,end_time)
    VALUES ('INTAKE-TEST',$1,$2,$3,'Booked name','booked@example.test','09123456789',CURRENT_DATE+3,'09:00','09:30') RETURNING id`,[clinicId,dentists[0],patient.id])).rows[0].id;
  await db.query('INSERT INTO appointment_services (appointment_id,service_id,service_price) VALUES ($1,$2,100)',[appointmentId,serviceId]);
  let member,manager,invite;
  try {
    await t.test('batch hours validate and roll back as a unit, retry safely, and edit without moving bookings',async()=>{
      const body={dentistIds:dentists,days:[1,2,3,4,5],shifts:[{start:'09:00',end:'12:00'},{start:'13:00',end:'17:00'}]};
      let result=await request(base+'/schedules/bulk',{method:'POST',body});assert.equal(result.status,201);assert.equal(result.data.added,20);
      result=await request(base+'/schedules/bulk',{method:'POST',body});assert.deepEqual(result.data,{added:0,skipped:20});
      for(const invalid of [{...body,days:[]},{...body,dentistIds:[dentists[0],dentists[0]]},{...body,shifts:[{start:'09:00',end:'11:00'},{start:'10:00',end:'12:00'}]},{...body,dentistIds:[other.id]}]) assert.equal((await request(base+'/schedules/bulk',{method:'POST',body:invalid})).status,400);
      const before=(await db.query('SELECT COUNT(*)::int AS count FROM dentist_schedules')).rows[0].count;
      result=await request(base+'/schedules/bulk',{method:'POST',body:{dentistIds:dentists,days:[0,1],shifts:[{start:'10:00',end:'14:00'}]}});assert.equal(result.status,409);
      assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM dentist_schedules')).rows[0].count,before);
      const shift=(await request(base)).data.schedules[0];
      assert.equal((await request(base+`/schedules/${shift.id}`,{method:'PUT',body:{day:shift.day,start:'08:00',end:'12:00'}})).status,200);
      assert.equal((await request(base+`/schedules/${shift.id}`,{method:'PUT',body:{day:shift.day,start:'08:00',end:'14:00'}})).status,409);
      assert.equal((await request(base+`/schedules/${shift.id}`,{method:'PUT',body:{day:1,start:'08:00',end:'12:00'},cookie:other.cookie})).status,404);
      assert.equal((await db.query("SELECT to_char(start_time,'HH24:MI') AS time FROM appointments WHERE id=$1",[appointmentId])).rows[0].time,'09:00');
    });
    await t.test('owners invite staff and only the invited identity can accept once',async()=>{
      const email='appointment-staff@example.test';
      invite=(await request(base+'/staff/invitations',{method:'POST',body:{email,role:'appointments'}})).data;
      assert.ok(invite.token);assert.equal((await db.query('SELECT token_hash FROM clinic_staff_invitations WHERE id=$1',[invite.invitation.id])).rows[0].token_hash,hashToken(invite.token));
      assert.equal((await request('/auth/staff-invitation/details',{method:'POST',body:{token:invite.token},cookie:''})).status,200);
      assert.equal((await request('/auth/staff-invitation/accept',{method:'POST',body:{token:invite.token,email:stranger.email,name:'Wrong account',password},cookie:''})).status,409);
      const accept={token:invite.token,email,name:'Appointment colleague',password};
      assert.equal((await request('/auth/staff-invitation/accept',{method:'POST',body:accept,cookie:''})).status,200);
      assert.equal((await request('/auth/staff-invitation/accept',{method:'POST',body:accept,cookie:''})).status,409);
      const user=(await db.query('SELECT id FROM users WHERE email=$1',[email])).rows[0];member={...user,email,cookie:await session(user.id)};
      assert.equal((await request('/auth/me',{cookie:member.cookie})).data.clinic.id,clinicId);
      assert.equal((await request('/workspaces/clinic',{cookie:member.cookie})).data.clinic.staffRole,'appointments');
      assert.equal((await request(base+`?clinicId=${otherClinic}`,{cookie:member.cookie})).status,403);
      assert.equal((await request(base+'/staff/invitations',{method:'POST',body:{email:patient.email,role:'manager'}})).status,409);
      assert.equal((await request(base+'/staff/invitations',{method:'POST',body:{email:other.email,role:'manager'}})).status,409);
    });
    await t.test('competing schedule batches serialize without overlapping hours',{skip:!native},async()=>{
      const body={dentistIds:[dentists[0]],days:[6],shifts:[{start:'10:00',end:'12:00'}]};
      const results=await Promise.all([request(base+'/schedules/bulk',{method:'POST',body}),request(base+'/schedules/bulk',{method:'POST',body:{...body,shifts:[{start:'11:00',end:'13:00'}]}})]);
      assert.deepEqual(results.map(result=>result.status).sort(),[201,409]);
      assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM dentist_schedules WHERE dentist_id=$1 AND day_of_week=6',[dentists[0]])).rows[0].count,1);
    });
    await t.test('appointment staff cannot administer payments, setup, intake policy, or staff',async()=>{
      assert.equal((await request(base+'/appointments',{cookie:member.cookie})).status,200);
      assert.equal((await request(base+'/appointments/'+appointmentId+'/intake',{cookie:member.cookie})).status,200);
      for(const route of ['/payments','/staff','/intake-settings']) assert.equal((await request(base+route,{cookie:member.cookie})).status,403);
      for(const [route,method] of [['/profile','PUT'],['/services','POST'],['/dentists','POST'],['/intake-settings','PUT'],['/deposit-policy','PUT'],['/appointment-policy','PUT'],['/staff/invitations','POST']]) assert.equal((await request(base+route,{method,body:{},cookie:member.cookie})).status,403);
      const managerInvite=(await request(base+'/staff/invitations',{method:'POST',body:{email:'manager@example.test',role:'manager'}})).data;
      assert.equal((await request('/auth/staff-invitation/accept',{method:'POST',body:{token:managerInvite.token,email:'manager@example.test',name:'Manager colleague',password},cookie:''})).status,200);
      const id=(await db.query("SELECT id FROM users WHERE email='manager@example.test'")).rows[0].id;manager={id,cookie:await session(id)};
      assert.equal((await request(base+'/payments',{cookie:manager.cookie})).status,200);
      assert.equal((await request(base+'/staff',{cookie:manager.cookie})).status,403);
    });
    const questionId=crypto.randomUUID(),serviceQuestionId=crypto.randomUUID();
    const settings={version:0,enabled:true,purpose:'Prepare safely for the booked visit.',retention:'Contact the clinic about its retention and access process.',questions:[{id:questionId,label:'Allergies to tell the clinic about?',type:'text',required:true,serviceId:null},{id:serviceQuestionId,label:'Treatment-specific information?',type:'yes_no',required:false,serviceId}]};
    let submission;
    await t.test('clinic questions validate treatment ownership and preserve saved question snapshots',async()=>{
      assert.equal((await request(base+'/intake-settings',{method:'PUT',body:{...settings,questions:[{...settings.questions[0],serviceId:foreignService}]}})).status,400);
      assert.equal((await request(base+'/intake-settings',{method:'PUT',body:{...settings,retention:''}})).status,400);
      assert.equal((await request(base+'/intake-settings',{method:'PUT',body:settings,cookie:manager.cookie})).status,200);
      assert.equal((await request(base+'/intake-settings',{method:'PUT',body:settings})).status,409);
      const route=`/workspaces/patient/appointments/${appointmentId}/intake`;
      for(const cookie of [stranger.cookie,other.cookie,'']) assert.equal((await request(route,{cookie})).status,cookie==='' ? 401 : cookie===other.cookie ? 403 : 404);
      assert.equal((await request(route,{cookie:patient.cookie})).data.template.questions.length,2);
      submission={version:1,requestKey:crypto.randomUUID(),consent:true,answers:[{questionId,value:'Patient test answer'},{questionId:serviceQuestionId,value:'unsure'}]};
      for(const body of [{...submission,consent:false},{...submission,answers:[]},{...submission,answers:[{questionId,value:''}]},{...submission,answers:[{questionId:crypto.randomUUID(),value:'Invalid'}]}]) assert.equal((await request(route,{method:'PUT',body,cookie:patient.cookie})).status,400);
      assert.equal((await request(route,{method:'PUT',body:submission,cookie:patient.cookie})).status,200);
      assert.equal((await request(route,{method:'PUT',body:submission,cookie:patient.cookie})).status,200);
      assert.equal((await request(route,{method:'PUT',body:{...submission,answers:[{questionId,value:'Changed retry'}]},cookie:patient.cookie})).status,409);
      assert.equal((await request(base+'/intake-settings',{method:'PUT',body:{...settings,version:1,questions:[{...settings.questions[0],label:'Revised question'}]}})).status,200);
      const details=(await request(base+`/appointments/${appointmentId}/intake`,{cookie:member.cookie})).data;
      assert.equal(details.submissions.length,1);assert.equal(details.submissions[0].answers[0].label,settings.questions[0].label);assert.equal(details.template.questions[0].label,'Revised question');
      assert.equal((await request(route,{method:'PUT',body:{...submission,requestKey:crypto.randomUUID()},cookie:patient.cookie})).status,409);
      const publicProfile=(await request('/clinics/'+clinicId,{cookie:''})).data;
      assert.equal(JSON.stringify(publicProfile).includes('Patient test answer'),false);
      assert.equal(JSON.stringify((await request('/workspaces/patient/appointments',{cookie:patient.cookie})).data).includes('Patient test answer'),false);
    });
    await t.test('follow-up retains authors, prevents duplicate replies, and never changes appointment status',async()=>{
      const route=base+`/appointments/${appointmentId}/followups`,body={requestKey:crypto.randomUUID(),question:'Please provide the information needed for your visit.'};
      assert.equal((await request(route,{method:'POST',body,cookie:other.cookie})).status,404);
      assert.equal((await request(route,{method:'POST',body,cookie:member.cookie})).status,201);
      assert.equal((await request(route,{method:'POST',body,cookie:member.cookie})).status,201);
      const followups=(await request(base+`/appointments/${appointmentId}/intake`)).data.followups;assert.equal(followups.length,1);assert.equal(followups[0].requestedBy,'Appointment colleague');
      const reply=`/workspaces/patient/appointments/${appointmentId}/followups/${followups[0].id}/reply`;
      assert.equal((await request(reply,{method:'POST',body:{response:'Private response'},cookie:stranger.cookie})).status,404);
      assert.equal((await request(reply,{method:'POST',body:{response:'Private response'},cookie:patient.cookie})).status,200);
      assert.equal((await request(reply,{method:'POST',body:{response:'Private response'},cookie:patient.cookie})).status,200);
      assert.equal((await request(reply,{method:'POST',body:{response:'Overwrite attempt'},cookie:patient.cookie})).status,409);
      assert.equal((await db.query('SELECT status FROM appointments WHERE id=$1',[appointmentId])).rows[0].status,'pending_review');
      await db.query("UPDATE appointments SET status='cancelled' WHERE id=$1",[appointmentId]);
      assert.equal((await request(route,{method:'POST',body:{...body,requestKey:crypto.randomUUID()}})).status,409);
      const detail=(await request(`/workspaces/patient/appointments/${appointmentId}/intake`,{cookie:patient.cookie})).data;assert.equal(detail.canRespond,false);assert.equal(detail.followups[0].response,'Private response');
    });
    await t.test('role changes and revocation take effect on existing sessions; expiry and replacement invalidate links',async()=>{
      assert.equal((await request(base+`/staff/members/${manager.id}`,{method:'PUT',body:{role:'appointments'}})).status,200);
      assert.equal((await request(base+'/payments',{cookie:manager.cookie})).status,403);
      assert.equal((await request(base+`/staff/members/${member.id}`,{method:'DELETE',cookie:other.cookie})).status,404);
      assert.equal((await request(base+`/staff/members/${member.id}`,{method:'DELETE'})).status,200);
      assert.equal((await request(base,{cookie:member.cookie})).status,401);
      member.cookie=await session(member.id);
      assert.equal((await request(base,{cookie:member.cookie})).status,403);
      const b={email:'expiry@example.test',role:'manager'};
      const first=(await request(base+'/staff/invitations',{method:'POST',body:b})).data;
      const second=(await request(base+'/staff/invitations',{method:'POST',body:b})).data;
      assert.equal((await request('/auth/staff-invitation/details',{method:'POST',body:{token:first.token}})).status,404);
      await db.query("UPDATE clinic_staff_invitations SET expires_at=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE id=$1",[second.invitation.id]);
      assert.equal((await request('/auth/staff-invitation/accept',{method:'POST',body:{token:second.token,email:b.email,name:'Expired staff',password},cookie:''})).status,409);
      await db.query("UPDATE clinics SET status='suspended' WHERE id=$1",[clinicId]);
      assert.equal((await request(base,{cookie:manager.cookie})).status,403);
      await db.query("UPDATE clinics SET status='approved' WHERE id=$1",[clinicId]);
    });
    await t.test('profile changes preserve identity and appointment contacts; password changes revoke all sessions',async()=>{
      const body={name:'Updated patient',phone:'09987654321',email:'attack@example.test',role:'system_admin'};
      assert.equal((await request('/auth/patient/profile',{method:'PUT',body,cookie:owner.cookie})).status,403);
      assert.equal((await request('/auth/patient/profile',{method:'PUT',body:{...body,phone:'wrong'},cookie:patient.cookie})).status,400);
      assert.equal((await request('/auth/patient/profile',{method:'PUT',body,cookie:patient.cookie})).status,200);
      const me=(await request('/auth/me',{cookie:patient.cookie})).data.user;
      assert.equal(me.name,body.name);assert.equal(me.phone,body.phone);assert.equal(me.email,patient.email);assert.equal(me.role,'patient');
      assert.equal((await db.query('SELECT patient_name FROM appointments WHERE id=$1',[appointmentId])).rows[0].patient_name,'Booked name');
      assert.equal((await request('/auth/patient/password',{method:'PUT',body:{currentPassword:'Wrong password!',password:'A different secure password!'},cookie:patient.cookie})).status,403);
      const second=await session(patient.id,'patient');
      assert.equal((await request('/auth/patient/password',{method:'PUT',body:{currentPassword:password,password:'A different secure password!'},cookie:patient.cookie})).status,200);
      for(const cookie of [patient.cookie,second]) assert.equal((await request('/auth/me',{cookie})).status,401);
      process.env.APP_PORTAL='admin';
      for(const route of ['/auth/patient/profile','/auth/patient/password']) assert.equal((await request(route,{method:'PUT',body,cookie:owner.cookie})).status,404);
      assert.equal((await request('/auth/staff-invitation/details',{method:'POST',body:{token:invite.token}})).status,404);
    });
  } finally {if(previous===undefined) delete process.env.APP_PORTAL;else process.env.APP_PORTAL=previous;await new Promise(resolve=>server.close(resolve));if(native) await db.end();else await db.close();}
});
