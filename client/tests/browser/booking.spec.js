import { test, expect } from "@playwright/test";
import { clinicSection } from "./helpers/clinic";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
const clinic={id:"11111111-1111-4111-8111-111111111111",name:"Booking fixture clinic",address:"Test address",phone:"09123456789",email:"clinic@example.test",status:"approved",services:[],dentists:[]};
const service={id:"22222222-2222-4222-8222-222222222222",name:"Test treatment",price:"1500.00",duration:30};
const dentist={id:"33333333-3333-4333-8333-333333333333",name:"Test Dentist",serviceIds:[service.id]};
const date=new Date(Date.now()+8*3600000+86400000).toISOString().slice(0,10);
async function fixture(page) {
  const state={failOptions:true,failSlots:true,conflict:true,assigned:true,accountEmail:"patient@example.test",writes:[]};
  await page.route("**/api/**",async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname;
    const respond=(json,status=200)=>route.fulfill({json,status});
    if(path==="/api/auth/me") return respond({user:{id:"44444444-4444-4444-8444-444444444444",name:"Test Patient",email:state.accountEmail,role:"patient"},clinic:null});
    if(path==="/api/clinics") return respond({clinics:[clinic]});
    if(path==="/api/workspaces/patient/booking-options") return state.failOptions?respond({error:"Booking options could not be loaded."},503):respond({clinic,services:[service],dentists:[{...dentist,serviceIds:state.assigned?[service.id]:[]}],patient:{email:state.accountEmail,phone:"09123456789"},minDate:date,maxDate:date});
    if(path==="/api/workspaces/patient/availability") return state.failSlots?respond({error:"Available times could not be loaded."},503):respond({service,slots:[{time:"09:00",end:"09:30"}],timezone:"Asia/Manila"});
    if(path==="/api/workspaces/patient/appointments"&&req.method()==="POST") {
      state.writes.push(req.postDataJSON());
      if(state.conflict) return respond({error:"That time is no longer available. Choose another slot."},409);
      return respond({appointment:{id:"55555555-5555-4555-8555-555555555555",appointmentCode:"DB-FIXTURE",status:"pending_review",date,time:"09:00",total:"1500.00",clinicName:clinic.name,dentistName:dentist.name,services:[service.name]}},201);
    }
    return respond({error:"Not found"},404);
  });
  return state;
}
test("booking preserves contact input across load errors and requires a new slot after a conflict",async({page})=>{
  const state=await fixture(page);await page.goto(`/patient/book?clinic=${clinic.id}`);
  await expect(page.getByRole("alert")).toContainText("Booking options could not be loaded");
  state.failOptions=false;await page.getByRole("button",{name:"Reload booking options",exact:true}).tap();
  await page.getByLabel("Treatment",{exact:true}).selectOption(service.id);
  await page.getByLabel("Dentist",{exact:true}).selectOption(dentist.id);
  await expect(page.getByRole("alert")).toContainText("Available times could not be loaded");
  state.failSlots=false;await page.getByRole("button",{name:"Refresh available times",exact:true}).tap();
  await page.getByRole("button",{name:"09:00–09:30",exact:true}).tap();
  await page.getByLabel("Visit notes (optional)",{exact:true}).fill("Keep these visit notes");
  await page.getByRole("button",{name:"Send appointment request",exact:true}).tap();
  await expect(page.getByRole("alert")).toContainText("That time is no longer available");
  await expect(page.getByLabel("Visit notes (optional)",{exact:true})).toHaveValue("Keep these visit notes");
  await expect(page.getByRole("button",{name:"Send appointment request",exact:true})).toBeDisabled();
  await expect(page.getByRole("heading",{name:"Your appointment request is saved."})).toHaveCount(0);
  state.conflict=false;await page.getByRole("button",{name:"09:00–09:30",exact:true}).tap();
  await page.getByRole("button",{name:"Send appointment request",exact:true}).tap();
  await expect(page.getByRole("heading",{name:"Your appointment request is saved."})).toBeVisible();
  expect(state.writes[0].email).toBeUndefined();
  expect(state.writes[0].expectedPrice).toBe("1500.00");expect(state.writes[0].expectedDuration).toBe(30);
  expect(state.writes[0].requestKey).not.toBe(state.writes[1].requestKey);
});
test("a clinic without assigned treatments shows an honest unavailable state",async({page})=>{
  const state=await fixture(page);state.failOptions=false;state.assigned=false;
  await page.goto(`/patient/book?clinic=${clinic.id}`);
  await expect(page.getByText("This clinic has no services assigned to a published dentist yet. Contact the clinic or choose another clinic.",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Send appointment request",exact:true})).toBeDisabled();
  await expect(page.getByLabel("Treatment",{exact:true})).toHaveCount(0);
});

test("owner inbox keeps the selected clinic in status-filtered requests and clears old clinic records",async({page})=>{
  const second={...clinic,id:"66666666-6666-4666-8666-666666666666",name:"Second fixture clinic"};
  const reads=[];
  await page.route("**/api/**",async route=>{
    const url=new URL(route.request().url()),path=url.pathname;
    const respond=(json,status=200)=>route.fulfill({json,status});
    if(path==="/api/auth/me") return respond({user:{id:"77777777-7777-4777-8777-777777777777",name:"Owner test",role:"clinic_staff",ownerAccess:true},clinic:null});
    if(path==="/api/clinics") return respond({clinics:[clinic,second]});
    if(path==="/api/workspaces/clinic/options") return respond({clinics:[clinic,second]});
    const selected=[clinic,second].find(item=>item.id===url.searchParams.get("clinicId"));
    if(path==="/api/workspaces/clinic") return respond({clinic:selected,counts:{dentists:0,services:0,pendingAppointments:0}});
    if(path==="/api/workspaces/clinic/manage") return respond({clinic:selected,services:[],dentists:[],schedules:[],assignments:[]});
    if(path==="/api/workspaces/clinic/manage/appointments") {
      reads.push({clinicId:url.searchParams.get("clinicId"),status:url.searchParams.get("status")});
      if(!selected) return respond({error:"Choose a clinic."},400);
      return respond({pendingAppointments:0,appointments:[{id:selected.id,code:selected.id===clinic.id?"FIRST-REQUEST":"SECOND-REQUEST",patientName:"Test Patient",email:"patient@example.test",phone:"09123456789",date,time:"09:00",end:"09:30",status:"accepted",total:"1500",services:[service.name],dentistName:dentist.name}]});
    }
    return respond({error:"Not found"},404);
  });
  await page.goto("/clinic");await page.getByLabel("Clinic",{exact:true}).selectOption(clinic.id);
  await clinicSection(page,"Appointment inbox");
  await expect(page.getByText("FIRST-REQUEST",{exact:true})).toBeVisible();
  await page.getByLabel("Appointment status",{exact:true}).selectOption("accepted");
  await expect.poll(()=>reads.at(-1)).toEqual({clinicId:clinic.id,status:"accepted"});
  await page.getByLabel("Clinic",{exact:true}).selectOption(second.id);
  await clinicSection(page,"Appointment inbox");
  await expect(page.getByText("SECOND-REQUEST",{exact:true})).toBeVisible();
  await expect(page.getByText("FIRST-REQUEST",{exact:true})).toHaveCount(0);
  expect(reads.at(-1)).toEqual({clinicId:second.id,status:"pending_review"});
});


test("booking fills the account email automatically at every required screen size",async({page})=>{
  const state=await fixture(page);state.failOptions=false;state.failSlots=false;
  for(const width of [390,320,768,1440]) {
    await page.setViewportSize({width,height:900});await page.goto(`/patient/book?clinic=${clinic.id}`);
    const input=page.getByLabel("Contact email",{exact:true});
    await expect(input).toHaveValue(state.accountEmail);await expect(input).toHaveAttribute("readonly","");
    await expect(page.getByText("Your booking uses the email address from your signed-in patient account.",{exact:true})).toBeVisible();
    expect(await input.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});
test("an owner account without an email cannot substitute a booking contact email",async({page})=>{
  const state=await fixture(page);state.failOptions=false;state.failSlots=false;state.accountEmail=null;
  await page.goto(`/patient/book?clinic=${clinic.id}`);
  await page.getByLabel("Treatment",{exact:true}).selectOption(service.id);
  await page.getByLabel("Dentist",{exact:true}).selectOption(dentist.id);
  await page.getByRole("button",{name:"09:00–09:30",exact:true}).tap();
  await expect(page.getByLabel("Contact email",{exact:true})).toHaveValue("");
  await expect(page.getByText("This account has no email address. Sign out and use a patient account registered with an email address to book.",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Send appointment request",exact:true})).toBeDisabled();
});
