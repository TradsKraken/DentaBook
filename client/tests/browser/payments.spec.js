import {test,expect} from '@playwright/test';
const id='11111111-1111-4111-8111-111111111111';
const destination=`/patient/appointments/${id}/payment`;
const appointment={id,code:'DB-PAYMENT-TEST',status:'accepted',date:'2026-12-01',time:'09:00',clinicName:'Payment UI test clinic',clinicPhone:'09123456789',patientEmail:'patient@example.test',total:'1200.00'};
test.use({viewport:{width:390,height:844},hasTouch:true});
test('private payment links survive sign-in and unavailable methods cannot imply payment success',async({page})=>{
 let signedIn=false,fail=true,writes=0;
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(route.request().method()!=='GET')writes++;
  if(path==='/api/auth/me')return route.fulfill({json:signedIn?{user:{id,name:'Test Patient',email:'patient@example.test',role:'patient'}}:{error:'Sign in required.'},status:signedIn?200:401});
  if(path==='/api/clinics')return route.fulfill({json:{clinics:[]}});
  if(path===`/api/workspaces/patient/appointments/${id}/payment`)return route.fulfill({status:fail?503:200,json:fail?{error:'Payment details are temporarily unavailable.'}:{appointment,quote:null,payment:null,canChooseGcash:false,canChooseWalkIn:false,canSubmitReference:false,unavailableReason:'The clinic has not enabled payment options yet. Contact the clinic for next steps.'}});
  return route.fulfill({status:404,json:{error:'Not found'}});
 });
 await page.goto(destination);
 await expect.poll(()=>new URL(page.url()).pathname).toBe('/patient/sign-in');
 expect(new URL(page.url()).searchParams.get('next')).toBe(destination);
 signedIn=true;await page.reload();
 await expect.poll(()=>new URL(page.url()).pathname).toBe(destination);
 await expect(page.getByRole('alert')).toContainText('Payment details are temporarily unavailable.');
 fail=false;await page.getByRole('button',{name:'Try again',exact:true}).click();
 await expect(page.getByText('The clinic has not enabled payment options yet. Contact the clinic for next steps.',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:/Choose GCash|Choose Pay at clinic|Submit reference/})).toHaveCount(0);
 await expect(page.getByRole('article',{name:'Deposit receipt',exact:true})).toHaveCount(0);
 await expect(page.getByText('Appointment: accepted',{exact:true})).toBeVisible();
 expect(writes).toBe(0);
});
test('an unverified reference remains pending when the page has a forged success query',async({page})=>{
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/auth/me')return route.fulfill({json:{user:{id,name:'Test Patient',role:'patient'}}});
  if(path==='/api/clinics')return route.fulfill({json:{clinics:[]}});
  if(path.endsWith('/payment'))return route.fulfill({json:{appointment,quote:{amount:'240.00',percentage:'20',terms:'Test refund terms',hash:'a'.repeat(64)},payment:{id,channel:'gcash',status:'pending',claimedReference:'1234567890123',recipientName:'Test recipient',recipientNumber:'09123456789',amount:'240.00'},canChooseGcash:false,canChooseWalkIn:false,canSubmitReference:false,unavailableReason:'Your GCash reference is awaiting the clinic’s verification. Do not pay again.'}});
  return route.fulfill({status:404,json:{error:'Not found'}});
 });
 await page.goto(destination+'?success=true&paid=true');
 await expect(page.getByText('Appointment: accepted',{exact:true})).toBeVisible();
 await expect(page.getByText('Your GCash reference is awaiting the clinic’s verification. Do not pay again.',{exact:true})).toBeVisible();
 await expect(page.getByRole('article',{name:'Deposit receipt',exact:true})).toHaveCount(0);
});
