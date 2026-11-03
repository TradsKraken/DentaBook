const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs/promises');
const path=require('node:path');
const {Pool}=require('pg');
const {PGlite}=require('@electric-sql/pglite');
const {pgcrypto}=require('@electric-sql/pglite/contrib/pgcrypto');
const {migrate}=require('../database/migrate');
const {createApp}=require('../app');
const {hashToken}=require('../auth');
const {bookingWindow}=require('../booking');

test('appointment changes enforce clinic policy, preserve funds, and reserve replacement slots atomically',async t=>{
  const native=process.env.DENTABOOK_ISOLATED_CHANGES_TEST==='1';
  const db=native ? new Pool({host:'dentabook-booking-test-db',database:'dentabook_changes_test',user:'booking_test',password:'isolated_test_only'}) : new PGlite({extensions:{pgcrypto}});
  const pool=native ? db : {async query(sql,values){return values ? db.query(sql,values) : (await db.exec(sql)).at(-1);},async connect(){return {query:pool.query,release(){}};}};
  const schema=await fs.readFile(path.join(__dirname,'../database/init.sql'),'utf8');
  if(native) await db.query(schema);else await db.exec(schema);
  await migrate(pool);await migrate(pool);
  const oldPortal=process.env.APP_PORTAL;process.env.APP_PORTAL='public';
  const server=createApp(pool).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  async function account(role){const id=(await db.query("INSERT INTO users (full_name,email,password_hash,role) VALUES ('Change test',$1,'unused',$2) RETURNING id",[`${crypto.randomUUID()}@example.test`,role])).rows[0].id;const token=crypto.randomBytes(32).toString('hex');await db.query("INSERT INTO sessions (token_hash,user_id,role,expires_at) VALUES ($1,$2,$3,CURRENT_TIMESTAMP+INTERVAL '180 days')",[hashToken(token),id,role]);return {id,cookie:`dentabook_public_session=${token}`};}
  const patient=await account('patient'),otherPatient=await account('patient'),staff=await account('clinic_staff'),otherStaff=await account('clinic_staff');
  async function clinic(owner){return (await db.query("INSERT INTO clinics (owner_user_id,name,address,phone,email,status) VALUES ($1,'Change test clinic','Test address','09123456789','clinic@example.test','approved') RETURNING id",[owner])).rows[0].id;}
  const clinicId=await clinic(staff.id);await clinic(otherStaff.id);
  const serviceId=(await db.query("INSERT INTO services (clinic_id,name,category,estimated_price,duration_minutes) VALUES ($1,'Saved treatment','General',1200,45) RETURNING id",[clinicId])).rows[0].id;
  const dentistId=(await db.query("INSERT INTO dentists (clinic_id,full_name) VALUES ($1,'Change test dentist') RETURNING id",[clinicId])).rows[0].id;
  await db.query('INSERT INTO dentist_services (dentist_id,service_id) VALUES ($1,$2)',[dentistId,serviceId]);
  for(let day=0;day<7;day++) await db.query("INSERT INTO dentist_schedules (dentist_id,day_of_week,start_time,end_time) VALUES ($1,$2,'09:00','17:00')",[dentistId,day]);
  const base='/workspaces/patient/appointments',manage='/workspaces/clinic/manage';
  async function request(route,{method='GET',body,cookie=patient.cookie,headers={}}={}){const response=await fetch(origin+'/api'+route,{method,headers:{'Content-Type':'application/json','X-DentaBook-Request':'1',Cookie:cookie,...headers},...(body ? {body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};}
  const post=(route,body,options={})=>request(route,{method:'POST',body,...options});
  const policy={cancelEnabled:true,cancelNoticeHours:0,rescheduleEnabled:true,rescheduleNoticeHours:0,terms:'Test clinic terms: contact the clinic for deposit review.'};
  const savePolicy=body=>request(manage+'/appointment-policy',{method:'PUT',body,cookie:staff.cookie});
  const details=id=>request(`${base}/${id}/changes`);
  let offset=2;
  async function appointment(status='confirmed',overrides={}){
    const date=new Date(Date.parse(bookingWindow().minDate+'T00:00:00Z')+offset++*86400000).toISOString().slice(0,10);
    const id=(await db.query(`INSERT INTO appointments (appointment_code,clinic_id,dentist_id,patient_user_id,patient_name,patient_email,patient_phone,appointment_date,start_time,end_time,estimated_total_cost,status)
      VALUES ($1,$2,$3,$4,'Change patient','contact@example.test','09123456789',$5,$6,$7,1200,$8) RETURNING id`,[`DB-${crypto.randomBytes(6).toString('hex')}`,clinicId,dentistId,overrides.patientId || patient.id,overrides.date || date,overrides.time || '09:00',overrides.end || '09:45',status])).rows[0].id;
    await db.query("INSERT INTO appointment_services (appointment_id,service_id,service_price,service_name) VALUES ($1,$2,1200,'Saved treatment')",[id,serviceId]);return id;
  }
  async function bodyFor(id,changes={}){return {requestKey:crypto.randomUUID(),reason:'Patient requests a change',policyHash:(await details(id)).data.policyHash,...changes};}
  async function cancel(id,body,options={}){return post(`${base}/${id}/cancel`,body || await bodyFor(id),options);}
  async function reschedule(id,changes={}){const info=(await details(id)).data;const body=await bodyFor(id,{date:info.appointment.date,time:'10:00',...changes});return {result:await post(`${base}/${id}/reschedule`,body),body};}
  const row=async id=>(await db.query("SELECT status,appointment_date::text AS date,to_char(start_time,'HH24:MI') AS time,to_char(end_time,'HH24:MI') AS end,estimated_total_cost,refund_review_required FROM appointments WHERE id=$1",[id])).rows[0];
  try {
    await t.test('patient actions stay unavailable until explicitly configured, with role and ownership boundaries',async()=>{
      const id=await appointment();const info=await details(id);assert.equal(info.status,200);assert.equal(info.data.canCancel,false);assert.equal(info.data.canReschedule,false);
      assert.equal((await cancel(id)).status,409);
      assert.equal((await request(`${base}/${id}/changes`,{cookie:''})).status,401);
      assert.equal((await request(`${base}/${id}/changes`,{cookie:staff.cookie})).status,403);
      assert.equal((await request(`${base}/${id}/changes`,{cookie:otherPatient.cookie})).status,404);
      assert.equal((await cancel(id,await bodyFor(id),{cookie:otherPatient.cookie})).status,404);
      assert.equal((await savePolicy({...policy,terms:''})).status,400);
      assert.equal((await savePolicy({...policy,cancelNoticeHours:-1})).status,400);
      assert.equal((await savePolicy({...policy,rescheduleNoticeHours:1.5})).status,400);
      assert.equal((await savePolicy({...policy,rescheduleNoticeHours:2161})).status,400);
      assert.equal((await request(manage+'/appointment-policy',{method:'PUT',body:policy})).status,403);
      assert.equal((await savePolicy(policy)).status,200);
      assert.equal((await details(id)).data.canCancel,true);
      assert.equal((await cancel(id,{...await bodyFor(id),policyHash:'stale'})).status,409);
      assert.equal((await cancel(id,await bodyFor(id),{headers:{Origin:'https://untrusted.example'}})).status,403);
      assert.equal((await cancel(id,await bodyFor(id),{headers:{'X-DentaBook-Request':''}})).status,403);
    });
    await t.test('cancellation is audited and idempotent, releases the slot, and preserves paid deposits and receipts',async()=>{
      const id=await appointment();
      const payment=(await db.query(`INSERT INTO payments (appointment_id,amount,payment_method,payment_status,channel,verification_status,verified_at,paid_at,receipt_code,receipt_snapshot)
        VALUES ($1,240,'gcash','paid','gcash','verified',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'DBR-CHANGE-TEST','{"original":"receipt"}'::jsonb) RETURNING id`,[id])).rows[0].id;
      const body=await bodyFor(id);assert.equal((await cancel(id,body)).status,200);assert.equal((await cancel(id,body)).status,200);
      const saved=await row(id);assert.equal(saved.status,'cancelled');assert.equal(saved.refund_review_required,true);
      const paymentRow=(await db.query('SELECT payment_status,receipt_code,receipt_snapshot,verification_status FROM payments WHERE id=$1',[payment])).rows[0];
      assert.equal(paymentRow.payment_status,'paid');assert.equal(paymentRow.receipt_code,'DBR-CHANGE-TEST');assert.deepEqual(paymentRow.receipt_snapshot,{original:'receipt'});assert.equal(paymentRow.verification_status,'needs_review');
      const info=(await details(id)).data;assert.equal(info.changes.length,1);assert.equal(info.changes[0].kind,'cancel');assert.equal(info.changes[0].status,'approved');assert.equal(info.changes[0].reason,body.reason);assert.equal(info.canCancel,false);
      const query=new URLSearchParams({clinicId,serviceId,dentistId,date:saved.date});assert.ok((await request('/workspaces/patient/availability?'+query)).data.slots.some(s=>s.time==='09:00'));
      assert.equal((await cancel(id,{...body,reason:'Different retry'})).status,409);
      const financial=(await request(`${base}/${id}/payment`)).data;assert.equal(financial.canChooseGcash,false);assert.match(financial.unavailableReason,/cancelled/);
      assert.equal((await request(`/workspaces/patient/payments/${payment}/receipt`,{cookie:otherPatient.cookie})).status,404);
      assert.equal((await request(`/workspaces/patient/payments/${payment}/receipt`)).status,200);
    });
    await t.test('clinic cancellation stays scoped and payment claims verified after cancellation cannot reconfirm the visit',async()=>{
      const id=await appointment('accepted');
      const payment=(await db.query("INSERT INTO payments (appointment_id,amount,payment_method,channel,claimed_reference) VALUES ($1,240,'gcash','gcash','CHANGE123456') RETURNING id",[id])).rows[0].id;
      const body={requestKey:crypto.randomUUID(),reason:'Dentist unavailable'};
      assert.equal((await post(`${manage}/appointments/${id}/cancel`,body,{cookie:otherStaff.cookie})).status,404);
      assert.equal((await post(`${manage}/appointments/${id}/cancel`,body,{cookie:staff.cookie})).status,200);
      const verified=await post(`${manage}/payments/${payment}/review`,{decision:'verify',receivedAmount:'240.00',matchedReference:'CHANGE123456',checkedAccount:true,notes:'Actual incoming transfer matched.'},{cookie:staff.cookie});
      assert.equal(verified.status,200);assert.equal(verified.data.needsReview,true);assert.equal((await row(id)).status,'cancelled');
      assert.equal((await db.query('SELECT payment_status FROM payments WHERE id=$1',[payment])).rows[0].payment_status,'paid');
    });
    await t.test('reschedule requests keep the original reservation; failed approval and declines leave it unchanged',async()=>{
      const id=await appointment('accepted'),original=await row(id);
      const {result,body}=await reschedule(id);assert.equal(result.status,200);assert.equal((await post(`${base}/${id}/reschedule`,body)).status,200);
      let info=(await details(id)).data;const change=info.changes[0];assert.equal(change.status,'pending');assert.equal((await row(id)).time,'09:00');assert.equal(info.canReschedule,false);
      assert.equal((await post(`${base}/${id}/reschedule`,await bodyFor(id,{date:original.date,time:'11:00'}))).status,409);
      const inbox=(await request(manage+'/appointments?status=reschedule_requests',{cookie:staff.cookie})).data.appointments;assert.ok(inbox.some(a=>a.id===id && a.pendingChange));
      await appointment('pending_review',{date:original.date,time:'10:00',end:'10:45'});
      const reviewRoute=`${manage}/appointments/${id}/changes/${change.id}/review`;
      assert.equal((await post(reviewRoute,{decision:'approved',notes:'New time agreed'},{cookie:otherStaff.cookie})).status,404);
      assert.equal((await post(reviewRoute,{decision:'approved',notes:'New time agreed'},{cookie:staff.cookie})).status,409);
      assert.deepEqual(await row(id),original);
      assert.equal((await post(reviewRoute,{decision:'declined',notes:'Replacement is now occupied.'},{cookie:staff.cookie})).status,200);
      assert.deepEqual(await row(id),original);assert.equal((await details(id)).data.changes[0].status,'declined');
    });
    await t.test('approval preserves status, saved duration, estimate, payment linkage, and policy history after catalog changes',async()=>{
      const id=await appointment(),original=await row(id);
      const payment=(await db.query("INSERT INTO payments (appointment_id,amount,payment_method,payment_status,channel) VALUES ($1,240,'gcash','paid','gcash') RETURNING id",[id])).rows[0].id;
      const {result,body}=await reschedule(id);assert.equal(result.status,200);const pending=(await details(id)).data.changes[0];
      await db.query('UPDATE services SET estimated_price=1800,duration_minutes=60 WHERE id=$1',[serviceId]);
      await savePolicy({...policy,cancelEnabled:false,rescheduleEnabled:false,terms:'New policy only.'});
      const route=`${manage}/appointments/${id}/changes/${pending.id}/review`;
      assert.equal((await post(route,{decision:'approved',notes:'New time approved.'},{cookie:staff.cookie})).status,200);
      assert.equal((await post(route,{decision:'approved',notes:'Retry'},{cookie:staff.cookie})).status,200);
      const saved=await row(id);assert.equal(saved.time,'10:00');assert.equal(saved.end,'10:45');assert.equal(saved.status,'confirmed');assert.equal(saved.estimated_total_cost,original.estimated_total_cost);
      assert.equal((await db.query('SELECT appointment_id FROM payments WHERE id=$1',[payment])).rows[0].appointment_id,id);
      const info=(await details(id)).data;assert.equal(info.changes[0].originalTime,'09:00');assert.equal(info.changes[0].requestedTime,'10:00');assert.equal(info.policy.terms,policy.terms);assert.equal(info.policy.cancelEnabled,true);
      await db.query('UPDATE services SET estimated_price=1200,duration_minutes=45 WHERE id=$1',[serviceId]);await savePolicy(policy);
    });
    await t.test('patients can withdraw requests; cancellation supersedes pending requests',async()=>{
      const id=await appointment();await reschedule(id);let pending=(await details(id)).data.changes[0];
      const route=`${base}/${id}/changes/${pending.id}/withdraw`;
      assert.equal((await post(route,{}, {cookie:otherPatient.cookie})).status,404);assert.equal((await post(route,{})).status,200);assert.equal((await post(route,{})).status,200);
      assert.equal((await details(id)).data.changes[0].status,'withdrawn');assert.equal((await row(id)).time,'09:00');
      await reschedule(id);pending=(await details(id)).data.changes.find(c=>c.status==='pending');assert.equal((await cancel(id)).status,200);
      assert.equal((await details(id)).data.changes.find(c=>c.id===pending.id).status,'superseded');
      assert.equal((await post(`${manage}/appointments/${id}/changes/${pending.id}/review`,{decision:'approved',notes:'Too late'},{cookie:staff.cookie})).status,409);
    });
    await t.test('new bookings preserve reviewed policy and reject stale policy quotes',async()=>{
      const placeholder=await appointment('declined'),date=(await row(placeholder)).date;
      const options=(await request('/workspaces/patient/booking-options?clinicId='+clinicId)).data;
      const body={clinicId,serviceId,dentistId,date,time:'13:00',email:'appointment@example.test',phone:'09123456789',notes:'',requestKey:crypto.randomUUID(),expectedPrice:'1200.00',expectedDuration:45,changePolicyHash:options.changePolicyHash};
      const created=await post(base,body);assert.equal(created.status,201);
      const saved=created.data.appointment.id;
      await savePolicy({...policy,cancelEnabled:false,rescheduleEnabled:false,terms:'Updated clinic policy.'});
      assert.equal((await details(saved)).data.policy.terms,policy.terms);assert.equal((await details(saved)).data.canCancel,true);
      assert.equal((await post(base,{...body,time:'14:00',requestKey:crypto.randomUUID()})).status,409);
      await savePolicy(policy);
    });
    await t.test('notice deadlines are enforced in Philippine time and past visits cannot be changed',async()=>{
      const id=await appointment();await savePolicy({...policy,cancelNoticeHours:24,rescheduleNoticeHours:24});
      const a=await row(id),start=Date.parse(`${a.date}T${a.time}:00+08:00`),realNow=Date.now;
      try {
        Date.now=()=>start-24*3600000;assert.equal((await details(id)).data.canCancel,true);
        Date.now=()=>start-24*3600000+1;assert.equal((await details(id)).data.canCancel,false);assert.equal((await cancel(id)).status,409);
        Date.now=()=>start;assert.equal((await post(`${manage}/appointments/${id}/cancel`,{reason:'Too late',requestKey:crypto.randomUUID()},{cookie:staff.cookie})).status,409);
      }finally{Date.now=realNow;}
      assert.equal((await row(id)).status,'confirmed');await savePolicy(policy);
    });
    await t.test('clinic suspension stops existing patient and staff change access',async()=>{
      const id=await appointment();await db.query("UPDATE clinics SET status='suspended' WHERE id=$1",[clinicId]);
      assert.equal((await cancel(id)).status,409);assert.equal((await request(`${base}/${id}/reschedule-availability?date=${(await row(id)).date}`)).status,409);
      assert.equal((await post(`${manage}/appointments/${id}/cancel`,{reason:'Test',requestKey:crypto.randomUUID()},{cookie:staff.cookie})).status,403);
      await db.query("UPDATE clinics SET status='approved' WHERE id=$1",[clinicId]);
    });
    await t.test('competing replacement approvals and simultaneous retries serialize correctly',{skip:!native},async()=>{
      const first=await appointment(),second=await appointment(),target=(await row(first)).date;
      const firstRequest=await reschedule(first,{date:target,time:'13:00'}),secondRequest=await reschedule(second,{date:target,time:'13:15'});
      assert.equal(firstRequest.result.status,200);assert.equal(secondRequest.result.status,200);
      const firstChange=(await details(first)).data.changes[0],secondChange=(await details(second)).data.changes[0];
      const results=await Promise.all([[first,firstChange.id],[second,secondChange.id]].map(([id,change])=>post(`${manage}/appointments/${id}/changes/${change}/review`,{decision:'approved',notes:'Replacement approved.'},{cookie:staff.cookie})));
      assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
      const loser=results[0].status===409 ? first : second;assert.equal((await row(loser)).time,'09:00');
      const retryId=await appointment(),body=await bodyFor(retryId);
      const retries=await Promise.all([cancel(retryId,body),cancel(retryId,body)]);assert.deepEqual(retries.map(r=>r.status),[200,200]);assert.equal((await details(retryId)).data.changes.length,1);
    });
    await t.test('cancellation racing payment verification never loses received money or reconfirms a cancelled visit',{skip:!native},async()=>{
      const id=await appointment('accepted'),p=(await db.query("INSERT INTO payments (appointment_id,amount,payment_method,channel,claimed_reference) VALUES ($1,240,'gcash','gcash','RACECHANGE123') RETURNING id",[id])).rows[0].id;
      const body=await bodyFor(id);
      const results=await Promise.all([cancel(id,body),post(`${manage}/payments/${p}/review`,{decision:'verify',receivedAmount:'240',matchedReference:'RACECHANGE123',checkedAccount:true,notes:'Actual transfer matched.'},{cookie:staff.cookie})]);
      assert.deepEqual(results.map(r=>r.status),[200,200]);assert.equal((await row(id)).status,'cancelled');
      const payment=(await db.query('SELECT payment_status,verification_status,receipt_code FROM payments WHERE id=$1',[p])).rows[0];assert.equal(payment.payment_status,'paid');assert.equal(payment.verification_status,'needs_review');assert.ok(payment.receipt_code);
    });
    await t.test('administrator listener cannot expose patient or clinic change endpoints',async()=>{
      process.env.APP_PORTAL='admin';
      const id=crypto.randomUUID();
      assert.equal((await details(id)).status,404);
      assert.equal((await post(`${base}/${id}/cancel`,{})).status,404);
      assert.equal((await request(manage+'/appointment-policy',{method:'PUT',body:policy,cookie:staff.cookie})).status,404);
    });
  } finally {
    if(oldPortal===undefined)delete process.env.APP_PORTAL;else process.env.APP_PORTAL=oldPortal;
    await new Promise(resolve=>server.close(resolve));if(native)await db.end();else await db.close();
  }
});
