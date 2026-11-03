import { test, expect } from "@playwright/test";
import { clinicSection } from "./helpers/clinic";
test.use({viewport:{width:390,height:844},hasTouch:true});
const id="11111111-1111-4111-8111-111111111111";
const date=new Date(Date.now()+8*3600000+2*86400000).toISOString().slice(0,10);
const policy={cancelEnabled:true,cancelNoticeHours:0,rescheduleEnabled:true,rescheduleNoticeHours:0,terms:"Fixture terms for clinic review",version:1};
async function fixture(page,staff=false) {
  const clinic={id,name:"Fixture clinic",address:"Test address",phone:"09123456789",email:"clinic@example.test",status:"approved",...policy};
  const appointment={id,appointmentCode:"DB-CHANGE-UI",code:"DB-CHANGE-UI",clinicName:clinic.name,date,time:"09:00",end:"09:30",status:"confirmed",total:"1500",services:["Test treatment"],refundReviewRequired:false};
  const state={enabled:true,failDetails:false,failSave:false,conflict:false,pending:false,writes:[],policyWrites:[]};
  const changeId="22222222-2222-4222-8222-222222222222";
  await page.route("**/api/**",async route=>{
    const req=route.request(),path=new URL(req.url()).pathname;
    const respond=(json,status=200)=>route.fulfill({json,status});
    if(path==="/api/auth/me")return respond({user:{id,name:"Test User",email:"patient@example.test",role:staff?"clinic_staff":"patient"},clinic:staff?clinic:null});
    if(path==="/api/clinics")return respond({clinics:[]});
    if(path==="/api/workspaces/clinic")return respond({clinic,counts:{dentists:0,services:0,pendingAppointments:0}});
    if(path==="/api/workspaces/clinic/manage")return respond({clinic,services:[],dentists:[],schedules:[],assignments:[],pendingAppointments:0});
    if(path==="/api/workspaces/clinic/manage/appointment-policy") {
      state.policyWrites.push(req.postDataJSON());if(state.failSave)return respond({error:"Settings could not be saved."},503);
      Object.assign(clinic,req.postDataJSON());return respond({saved:true});
    }
    if(path==="/api/workspaces/patient/appointments")return respond({appointments:[appointment]});
    if(path.endsWith("/reschedule-availability"))return respond({slots:state.conflict ? [] : [{time:"10:00",end:"10:30"}]});
    if(path.endsWith("/changes"))return state.failDetails ? respond({error:"Changes unavailable."},503) : respond({appointment,policy:state.enabled?policy:{...policy,cancelEnabled:false,rescheduleEnabled:false,terms:null},policyHash:"fixture-policy",changes:state.pending?[{id:changeId,kind:"reschedule",status:"pending",reason:"A later time",originalDate:date,originalTime:"09:00",originalEnd:"09:30",requestedDate:date,requestedTime:"10:00",requestedEnd:"10:30",requestedAt:new Date().toISOString(),requesterRole:"patient"}]:[],canCancel:state.enabled&&appointment.status==="confirmed",canReschedule:state.enabled&&!state.pending&&appointment.status==="confirmed",unavailableReason:state.enabled?"Follow clinic policy.":"The clinic has not enabled patient appointment changes. Contact the clinic."});
    if(path.endsWith("/cancel")||path.endsWith("/reschedule")) {
      state.writes.push(req.postDataJSON());if(state.failSave)return respond({error:"Change could not be saved. Please retry."},503);
      if(state.conflict)return respond({error:"That replacement time is no longer available. Your original appointment is unchanged."},409);
      if(path.endsWith("/cancel"))appointment.status="cancelled";else state.pending=true;
      return respond({saved:true});
    }
    if(path.endsWith("/withdraw")){state.pending=false;return respond({saved:true});}
    return respond({error:"Unexpected test API route"},404);
  });return state;
}
test("patient changes have retryable unavailable states and cancellation retains reason and request key after a failed save",async({page})=>{
  const state=await fixture(page);state.failDetails=true;
  await page.goto("/patient/appointments");await page.getByRole("button",{name:"Manage appointment",exact:true}).tap();
  await expect(page.getByRole("alert")).toContainText("Changes unavailable");state.failDetails=false;state.enabled=false;
  await page.getByRole("button",{name:"Retry appointment changes",exact:true}).tap();
  await expect(page.getByText("The clinic has not enabled patient appointment changes. Contact the clinic.",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Cancel appointment",exact:true})).toHaveCount(0);
  state.enabled=true;await page.getByRole("button",{name:"Refresh changes",exact:true}).tap();
  await page.getByRole("button",{name:"Cancel appointment",exact:true}).tap();
  await expect(page.getByRole("button",{name:"Confirm cancellation",exact:true})).toBeDisabled();
  await page.getByLabel("Reason for change",{exact:true}).fill("Unable to attend.");state.failSave=true;
  await page.getByRole("button",{name:"Confirm cancellation",exact:true}).tap();
  await expect(page.getByRole("alert")).toContainText("Change could not be saved");
  await expect(page.getByLabel("Reason for change",{exact:true})).toHaveValue("Unable to attend.");state.failSave=false;
  await page.getByRole("button",{name:"Confirm cancellation",exact:true}).tap();
  await expect(page.getByText("Status: cancelled",{exact:true})).toBeVisible();expect(state.writes).toHaveLength(2);expect(state.writes[0].requestKey).toBe(state.writes[1].requestKey);
});
test("reschedule conflicts preserve the original visit and entered reason, and patients can withdraw a saved request",async({page})=>{
  const state=await fixture(page);await page.goto("/patient/appointments");
  await page.getByRole("button",{name:"Manage appointment",exact:true}).tap();await page.getByRole("button",{name:"Request reschedule",exact:true}).tap();
  await page.getByLabel("Replacement date",{exact:true}).fill(date);await page.getByRole("button",{name:"10:00–10:30",exact:true}).tap();
  await page.getByLabel("Reason for change",{exact:true}).fill("A later time");state.conflict=true;
  await page.getByRole("button",{name:"Send reschedule request",exact:true}).tap();
  await expect(page.getByRole("alert")).toContainText("Your original appointment is unchanged");
  await expect(page.getByText("Status: confirmed",{exact:true})).toBeVisible();await expect(page.getByLabel("Reason for change",{exact:true})).toHaveValue("A later time");
  await expect(page.getByRole("button",{name:"Send reschedule request",exact:true})).toBeDisabled();state.conflict=false;
  await page.getByRole("button",{name:"Refresh replacement times",exact:true}).tap();await page.getByRole("button",{name:"10:00–10:30",exact:true}).tap();
  await page.getByRole("button",{name:"Send reschedule request",exact:true}).tap();await expect(page.getByText("Reschedule · pending",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Withdraw reschedule request",exact:true}).tap();await expect(page.getByText("Reschedule · pending",{exact:true})).toHaveCount(0);
  await expect(page.getByText("Status: confirmed",{exact:true})).toBeVisible();expect(state.writes[0].requestKey).not.toBe(state.writes[1].requestKey);
});
test("clinic policy form fits required widths and preserves input after a save failure",async({page})=>{
  const state=await fixture(page,true);await page.goto("/clinic");await clinicSection(page,"Appointment policies");
  await page.getByLabel("Cancellation notice (hours)",{exact:true}).fill("24");await page.getByLabel("Reschedule notice (hours)",{exact:true}).fill("12");
  await page.getByLabel("Appointment change terms",{exact:true}).fill("Saved clinic policy terms.");
  for(const width of [390,320,768,1440]){
    await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    for(const input of await page.locator("main input:not([type=checkbox]),main textarea").all())expect(await input.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    for(const button of await page.locator("main button:visible,main .clinic-check:visible").all()){const box=await button.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);}
  }
  state.failSave=true;await page.getByRole("button",{name:"Save appointment policy",exact:true}).click();await expect(page.getByRole("alert")).toContainText("Settings could not be saved");
  await expect(page.getByLabel("Cancellation notice (hours)",{exact:true})).toHaveValue("24");state.failSave=false;
  await page.getByRole("button",{name:"Save appointment policy",exact:true}).click();await expect(page.getByRole("status").filter({hasText:"Appointment policy saved"})).toBeVisible();
  expect(state.policyWrites.at(-1)).toMatchObject({cancelNoticeHours:24,rescheduleNoticeHours:12,terms:"Saved clinic policy terms."});
});
