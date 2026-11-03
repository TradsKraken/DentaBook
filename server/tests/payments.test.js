const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const {pgcrypto}=require('@electric-sql/pglite/contrib/pgcrypto');
const {Pool}=require('pg');
const {migrate}=require('../database/migrate');
const {createApp}=require('../app');
const {hashToken}=require('../auth');
const {depositQuote}=require('../payment-money');
const {paymentReceipt}=require('../routes/payments');

test('clinic-owned GCash and pay-at-clinic payments are audited and never trust patient payment claims',async t=>{
 const native=process.env.DENTABOOK_ISOLATED_PAYMENT_TEST === '1';
 const db=native ? new Pool({host:'dentabook-payments-test-db',database:'dentabook_payments_test',user:'payment_test',password:'isolated_test_only'}) : new PGlite({extensions:{pgcrypto}});
 const pool=native ? db : {async query(sql,values){return values ? db.query(sql,values) : (await db.exec(sql)).at(-1);},async connect(){return {query:pool.query,release(){}};}};
 const schema=await fs.readFile(path.join(__dirname,'../database/init.sql'),'utf8');
 if(native) await db.query(schema);else await db.exec(schema);
 await migrate(pool);await migrate(pool);
 const previous=process.env.APP_PORTAL;process.env.APP_PORTAL='public';
 const server=createApp(pool).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 async function account(role){const id=(await db.query(`INSERT INTO users (full_name,email,password_hash,role) VALUES ('Payment test',$1,'unused',$2) RETURNING id`,[`${crypto.randomUUID()}@example.test`,role])).rows[0].id;const token=crypto.randomBytes(32).toString('hex');await db.query(`INSERT INTO sessions (token_hash,user_id,role,expires_at) VALUES ($1,$2,$3,CURRENT_TIMESTAMP+INTERVAL '1 day')`,[hashToken(token),id,role]);return {id,cookie:`dentabook_public_session=${token}`};}
 const patient=await account('patient'),otherPatient=await account('patient'),staff=await account('clinic_staff'),otherStaff=await account('clinic_staff');
 async function clinic(owner){return (await db.query(`INSERT INTO clinics (owner_user_id,name,address,phone,email,status) VALUES ($1,'Payment test clinic','Test address','09123456789','clinic@example.test','approved') RETURNING id`,[owner])).rows[0].id;}
 const clinicId=await clinic(staff.id);await clinic(otherStaff.id);
 async function appointment(status='accepted',total='1200.50'){return (await db.query(`INSERT INTO appointments (appointment_code,clinic_id,patient_user_id,patient_name,patient_email,patient_phone,appointment_date,start_time,end_time,estimated_total_cost,status) VALUES ($1,$2,$3,'Payment test','patient@example.test','09123456789',CURRENT_DATE+2,'09:00','09:45',$4,$5) RETURNING id`,[`DB-${crypto.randomBytes(5).toString('hex')}`,clinicId,patient.id,total,status])).rows[0].id;}
 const id=await appointment(),walkId=await appointment(),pendingId=await appointment('pending_review');
 const base='/workspaces/patient/appointments',manage='/workspaces/clinic/manage';
 async function request(route,{method='GET',body,cookie=patient.cookie,headers={}}={}){const response=await fetch(origin+'/api'+route,{method,headers:{'Content-Type':'application/json','X-DentaBook-Request':'1',Cookie:cookie,...headers},...(body ? {body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};}
 const post=(route,body,opts={})=>request(route,{method:'POST',body,...opts});
 const summary=async appointmentId=>(await request(`${base}/${appointmentId}/payment`)).data;
 const policy={percentage:'20',refundTerms:'Contact this test clinic before cancellation for a refund review.',gcashEnabled:true,walkInEnabled:true,gcashAccountName:'Test clinic account',gcashNumber:'09123456789'};
 const savePolicy=body=>request(manage+'/deposit-policy',{method:'PUT',body,cookie:staff.cookie});
 const choose=async(appointmentId,channel='gcash',overrides={})=>post(`${base}/${appointmentId}/payment-choice`,{channel,requestKey:crypto.randomUUID(),quoteHash:(await summary(appointmentId)).quote?.hash,acceptTerms:true,...overrides});
 const review=(paymentId,body,cookie=staff.cookie)=>post(`${manage}/payments/${paymentId}/review`,body,{cookie});
 let paymentId,quote,receiptCode;
 try {
  await t.test('unconfigured channels are unavailable; protected payment routes enforce roles, origins and ownership',async()=>{
   const s=await summary(id);assert.equal(s.quote,null);assert.equal(s.canChooseGcash,false);assert.equal(s.canChooseWalkIn,false);
   assert.equal((await choose(id,'walk_in')).status,409);
   assert.equal((await request(`${base}/${id}/payment`,{cookie:''})).status,401);
   assert.equal((await request(`${base}/${id}/payment`,{cookie:staff.cookie})).status,403);
   assert.equal((await request(`${base}/${id}/payment`,{cookie:otherPatient.cookie})).status,404);
   assert.equal((await savePolicy({...policy,percentage:'101'})).status,400);
   assert.equal((await savePolicy({...policy,refundTerms:''})).status,400);
   assert.equal((await savePolicy({...policy,gcashNumber:'123'})).status,400);
   assert.equal((await request(manage+'/deposit-policy',{method:'PUT',body:policy,cookie:patient.cookie})).status,403);
   assert.equal((await savePolicy(policy)).status,200);
   assert.equal((await post(`${base}/${id}/payment-choice`,{channel:'walk_in',requestKey:crypto.randomUUID()},{headers:{Origin:'https://untrusted.example'}})).status,403);
   assert.equal((await post(`${base}/${id}/payment-choice`,{channel:'walk_in',requestKey:crypto.randomUUID()},{headers:{'X-DentaBook-Request':''}})).status,403);
   assert.equal((await choose(pendingId)).status,409);
  });
  await t.test('server computes cents, requires reviewed terms, freezes amounts and recipient, and deduplicates retries',async()=>{
   quote=(await summary(id)).quote;assert.equal(quote.amount,'240.10');
   assert.equal(depositQuote({id,total:'0.05'},{depositPolicyConfigured:true,depositPercentage:'10',depositRefundTerms:'Terms'}).amount,'0.01');
   assert.equal((await choose(id,'gcash',{acceptTerms:false})).status,409);
   assert.equal((await choose(id,'gcash',{quoteHash:'0'.repeat(64)})).status,409);
   const requestKey=crypto.randomUUID();
   const chosen=await choose(id,'gcash',{requestKey,amount:'0.01',status:'paid',patient_user_id:otherPatient.id});assert.equal(chosen.status,200);
   paymentId=chosen.data.payment.id;assert.equal(chosen.data.payment.amount,'240.10');assert.equal(chosen.data.payment.status,'pending');assert.equal(chosen.data.appointment.status,'accepted');
   assert.equal((await choose(id,'gcash',{requestKey})).data.payment.id,paymentId);
   assert.equal((await choose(id,'gcash',{requestKey:crypto.randomUUID()})).data.payment.id,paymentId);
   assert.equal((await choose(walkId,'walk_in',{requestKey})).status,409);
   await savePolicy({...policy,percentage:'30',gcashAccountName:'Changed clinic account',gcashNumber:'09999999999',refundTerms:'Changed terms'});
   const s=await summary(id);assert.deepEqual(s.quote,quote);assert.equal(s.payment.recipientName,'Test clinic account');assert.equal(s.payment.recipientNumber,'09123456789');
   assert.equal((await choose(id,'walk_in')).status,409);
  });
  await t.test('a GCash reference is only a claim; exact account verification is required and receipts remain private',async()=>{
   assert.equal((await post(`${base}/${id}/payment-reference`,{reference:'1234567890123'},{cookie:otherPatient.cookie})).status,404);
   assert.equal((await post(`${base}/${id}/payment-reference`,{reference:'1234567890123',status:'paid',amount:'0.01'})).status,200);
   assert.equal((await summary(id)).appointment.status,'accepted');assert.equal((await summary(id)).payment.status,'pending');
   assert.equal((await request(`/workspaces/patient/payments/${paymentId}/receipt`)).status,404);
   assert.equal((await post(`${base}/${id}/payment-reference`,{reference:'9999999999999'})).status,409);
   const body={decision:'verify',receivedAmount:'240.10',matchedReference:'1234567890123',checkedAccount:true,notes:'Matched incoming transfer in GCash.'};
   assert.equal((await review(paymentId,body,otherStaff.cookie)).status,404);
   assert.equal((await review(paymentId,body,patient.cookie)).status,403);
   assert.equal((await review(paymentId,{...body,receivedAmount:'0.01'})).status,400);
   assert.equal((await review(paymentId,{...body,matchedReference:'999999'})).status,400);
   assert.equal((await review(paymentId,{...body,checkedAccount:false})).status,400);
   assert.equal((await review(paymentId,body)).status,200);
   const s=await summary(id);assert.equal(s.appointment.status,'confirmed');assert.equal(s.payment.status,'paid');assert.equal(s.payment.verification,'verified');receiptCode=s.payment.receiptCode;
   assert.equal((await review(paymentId,body)).status,200);assert.equal((await summary(id)).payment.receiptCode,receiptCode);
   const receipt=await request(`/workspaces/patient/payments/${paymentId}/receipt`);assert.equal(receipt.status,200);assert.equal(receipt.data.receipt.details.depositTerms,quote.terms);assert.equal(receipt.data.receipt.amount,'240.10');
   assert.equal((await request(`/workspaces/patient/payments/${paymentId}/receipt`,{cookie:otherPatient.cookie})).status,404);
   assert.equal((await request(`${manage}/payments/${paymentId}/receipt`,{cookie:otherStaff.cookie})).status,404);
   assert.equal((await request(`${manage}/payments/${paymentId}/receipt`,{cookie:staff.cookie})).status,200);
   await assert.rejects(()=>paymentReceipt(pool,paymentId),error=>error.status===404);
   const audit=(await db.query('SELECT reviewed_by,reviewed_at,transaction_reference FROM payments WHERE id=$1',[paymentId])).rows[0];assert.equal(audit.reviewed_by,staff.id);assert.ok(audit.reviewed_at);assert.equal(audit.transaction_reference,body.matchedReference);
  });
  await t.test('Pay at clinic requires staff confirmation and never invents a received payment or receipt',async()=>{
   const chosen=await choose(walkId,'walk_in');assert.equal(chosen.status,200);const p=chosen.data.payment;assert.equal(p.amount,'1200.50');assert.equal(p.status,'pending');assert.equal(chosen.data.appointment.status,'accepted');
   assert.equal((await review(p.id,{decision:'verify',checkedAccount:true,receivedAmount:p.amount})).status,400);
   assert.equal((await review(p.id,{decision:'confirm_walk_in'})).status,200);
   const s=await summary(walkId);assert.equal(s.appointment.status,'confirmed');assert.equal(s.appointment.confirmationSource,'walk_in');assert.equal(s.payment.status,'pending');assert.equal(s.payment.verifiedAt,null);assert.equal(s.payment.receiptCode,null);
   assert.equal((await request(`/workspaces/patient/payments/${p.id}/receipt`)).status,404);
   assert.equal((await review(p.id,{decision:'confirm_walk_in'})).status,200);
   assert.equal((await review(p.id,{decision:'reject',notes:'Changed mind'})).status,409);
  });
  await t.test('rejections need reasons, claims cannot reuse verified references, and expired visits are never auto-confirmed',async()=>{
   const next=await appointment();let chosen=await choose(next);let p=chosen.data.payment;
   assert.equal((await review(p.id,{decision:'reject'})).status,400);
   assert.equal((await review(p.id,{decision:'reject',notes:'Transfer not found in account history.'})).status,200);
   assert.equal((await summary(next)).canChooseGcash,true);
   chosen=await choose(next);p=chosen.data.payment;assert.notEqual(p.id,paymentId);
   await post(`${base}/${next}/payment-reference`,{reference:'1234567890123'});
   assert.equal((await review(p.id,{decision:'verify',receivedAmount:p.amount,matchedReference:'1234567890123',checkedAccount:true})).status,409);
   // Use a separate attempt with its own reference after the clinic rejects the duplicate.
   await review(p.id,{decision:'reject',notes:'Duplicate reference.'});chosen=await choose(next);p=chosen.data.payment;
   await post(`${base}/${next}/payment-reference`,{reference:'9876543210000'});
   await db.query(`UPDATE appointments SET appointment_date=CURRENT_DATE-1 WHERE id=$1`,[next]);
   const expired=await appointment();await choose(expired);await db.query(`UPDATE appointments SET appointment_date=CURRENT_DATE-1 WHERE id=$1`,[expired]);
   const unavailable=await summary(expired);assert.equal(unavailable.canSubmitReference,false);assert.match(unavailable.unavailableReason,/Do not send/);
   const checked=await review(p.id,{decision:'verify',receivedAmount:p.amount,matchedReference:'9876543210000',checkedAccount:true});assert.equal(checked.status,200);assert.equal(checked.data.needsReview,true);
   const s=await summary(next);assert.equal(s.appointment.status,'accepted');assert.equal(s.payment.status,'paid');assert.equal(s.payment.verification,'needs_review');assert.ok(s.payment.receiptCode);
  });
  await t.test('walk-in-only configuration has no invented deposit and portal isolation applies to all payment endpoints',async()=>{
   assert.equal((await savePolicy({...policy,percentage:'',refundTerms:'',gcashEnabled:false})).status,200);
   const a=await appointment();const s=await summary(a);assert.equal(s.quote,null);assert.equal(s.canChooseGcash,false);assert.equal(s.canChooseWalkIn,true);
   assert.equal((await request(`${manage}/payments`,{cookie:staff.cookie})).data.payments.some(p=>p.id===paymentId),true);
   assert.equal((await request(`${manage}/payments`,{cookie:otherStaff.cookie})).data.payments.length,0);
   process.env.APP_PORTAL='admin';assert.equal((await request(`${base}/${id}/payment`)).status,404);assert.equal((await request(manage+'/payments',{cookie:staff.cookie})).status,404);process.env.APP_PORTAL='public';
   await db.query(`UPDATE clinics SET status='suspended' WHERE id=$1`,[clinicId]);assert.equal((await choose(a,'walk_in')).status,409);assert.equal((await request(manage+'/payments',{cookie:staff.cookie})).status,403);
  });
  await t.test('concurrent choices serialize to one payment record', {skip:!native},async()=>{
   await db.query(`UPDATE clinics SET status='approved' WHERE id=$1`,[clinicId]);const a=await appointment();
   const responses=await Promise.all(Array.from({length:8},()=>choose(a,'walk_in')));assert.ok(responses.every(r=>r.status===200));assert.equal(new Set(responses.map(r=>r.data.payment.id)).size,1);
   assert.equal(Number((await db.query('SELECT COUNT(*) AS count FROM payments WHERE appointment_id=$1',[a])).rows[0].count),1);
  });
 }finally{await new Promise(resolve=>server.close(resolve));if(native) await db.end();else await db.close();if(previous===undefined)delete process.env.APP_PORTAL;else process.env.APP_PORTAL=previous;}
});
