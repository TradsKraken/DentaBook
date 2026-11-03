import { test, expect } from "@playwright/test";
import { clinicSection } from "./helpers/clinic";
test.use({ actionTimeout: 15000 });
const clinicId="11111111-1111-4111-8111-111111111111", serviceId="22222222-2222-4222-8222-222222222222", dentistId="33333333-3333-4333-8333-333333333333";
const tomorrow = () => new Date(Date.now()+8*3600000+86400000).toISOString().slice(0,10);
async function login(page,portal,email) {
  await page.goto(`/${portal}/sign-in`);
  await page.getByLabel("Email address or username",{exact:true}).fill(email);
  await page.getByLabel("Password",{exact:true}).fill("Booking browser test password!");
  await page.getByRole("button",{name:"Sign in",exact:true}).tap();
  await expect.poll(() => new URL(page.url()).pathname).toBe(portal === "patient" ? "/patient/account" : "/clinic");
}
async function mobileControls(page,label) {
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label).toBe(true);
  for(const element of await page.locator("main input:not([type=checkbox]), main select, main textarea").all())
    expect(await element.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  for(const button of await page.locator("main button:visible, main .button:visible, main .clinic-check").all()) {
    const box=await button.boundingBox(); expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  }
}
test("real clinic setup, patient booking, acceptance, decline, and patient status work across phone and desktop",async({browser},testInfo)=>{
  test.skip(process.env.PLAYWRIGHT_BOOKING_INTEGRATION!=="1","Requires the isolated booking API and PostgreSQL test harness");
  const staffContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  const patientContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  staffContext.setDefaultTimeout(15000); patientContext.setDefaultTimeout(15000);
  const staff=await staffContext.newPage(),patient=await patientContext.newPage();
  const errors=[]; staff.on("pageerror",error=>errors.push(error.message));patient.on("pageerror",error=>errors.push(error.message));
  try {
    await login(staff,"clinic","staff@example.test");
    await clinicSection(staff,"Dentists");
    await staff.getByRole("button",{name:"Edit Test Dentist",exact:true}).tap();
    await staff.getByLabel("Test treatment",{exact:true}).check();
    await staff.getByRole("button",{name:"Save dentist",exact:true}).tap();
    await expect(staff.getByRole("status").filter({hasText:"Dentist saved"})).toBeVisible();
    await clinicSection(staff,"Working hours");
    await staff.getByRole("button",{name:"Add working hours",exact:true}).click();
    await staff.getByLabel("Dentist",{exact:true}).selectOption(dentistId);
    await staff.getByLabel("Day of week",{exact:true}).selectOption(String(new Date(tomorrow()+"T00:00:00Z").getUTCDay()));
    await staff.getByLabel("Start time",{exact:true}).fill("09:00");
    await staff.getByLabel("End time",{exact:true}).fill("17:00");
    await staff.getByRole("button",{name:"Save working hours",exact:true}).click();
    await expect(staff.getByRole("status").filter({hasText:"Working hours saved"})).toBeVisible();
    await login(patient,"patient","patient@example.test");
    async function chooseVisit() {
      await patient.goto(`/patient/book?clinic=${clinicId}`);
      await patient.getByLabel("Treatment",{exact:true}).selectOption(serviceId);
      await patient.getByLabel("Dentist",{exact:true}).selectOption(dentistId);
      await patient.getByLabel("Visit date",{exact:true}).fill(tomorrow());
      await expect(patient.getByRole("button",{name:"09:00–09:30",exact:true})).toBeVisible();
    }
    await chooseVisit();
    await expect(patient.getByLabel("Contact email",{exact:true})).toHaveValue("patient@example.test");
    await expect(patient.getByLabel("Contact email",{exact:true})).toHaveAttribute("readonly","");
    for(const width of [390,320,768,1440]) {
      await patient.setViewportSize({width,height:900}); await mobileControls(patient,`Booking at ${width}`);
      await patient.evaluate(()=>scrollTo(0,0));
      await patient.screenshot({path:testInfo.outputPath(`real-booking-${width}.png`),fullPage:true});
    }
    await patient.setViewportSize({width:390,height:844});
    await patient.getByRole("button",{name:"09:00–09:30",exact:true}).tap();
    await patient.getByLabel("Visit notes (optional)",{exact:true}).fill("First isolated visit");
    await patient.getByRole("button",{name:"Send appointment request",exact:true}).tap();
    await expect(patient.getByRole("heading",{name:"Your appointment request is saved."})).toBeVisible();
    const firstCode=await patient.locator("main .eyebrow").textContent();
    await patient.getByRole("link",{name:"View my appointments",exact:true}).tap();
    await expect(patient.getByText("Status: pending review",{exact:true})).toBeVisible();
    await clinicSection(staff,"Appointment inbox");
    await expect(staff.getByRole("heading",{name:"Test Patient",exact:true})).toBeVisible();
    await staff.getByRole("button",{name:`View ${firstCode}`,exact:true}).click();
    await expect(staff.getByRole("link",{name:"patient@example.test",exact:true})).toBeVisible();
    await staff.getByRole("button",{name:`Accept ${firstCode}`,exact:true}).tap();
    await staff.getByLabel("Note to patient (optional)",{exact:true}).fill("Please contact the clinic for the next steps.");
    await staff.getByRole("button",{name:"Confirm acceptance",exact:true}).tap();
    await expect(staff.getByRole("status").filter({hasText:`Request ${firstCode} accepted.`})).toBeVisible();
    await patient.getByRole("button",{name:"Refresh appointments",exact:true}).tap();
    await expect(patient.getByText("Status: accepted",{exact:true})).toBeVisible();
    await expect(patient.getByText("Please contact the clinic for the next steps.",{exact:false})).toBeVisible();
    // A second request uses another real slot; the first reservation is excluded.
    await patient.goto(`/patient/book?clinic=${clinicId}`);
    await patient.getByLabel("Treatment",{exact:true}).selectOption(serviceId);
    await patient.getByLabel("Dentist",{exact:true}).selectOption(dentistId);
    await patient.getByLabel("Visit date",{exact:true}).fill(tomorrow());
    await expect(patient.getByRole("button",{name:"09:30–10:00",exact:true})).toBeVisible();
    await expect(patient.getByRole("button",{name:"09:00–09:30",exact:true})).toHaveCount(0);
    await patient.getByRole("button",{name:"09:30–10:00",exact:true}).tap();
    await patient.getByRole("button",{name:"Send appointment request",exact:true}).tap();
    await expect(patient.getByRole("heading",{name:"Your appointment request is saved."})).toBeVisible();
    const secondCode=await patient.locator("main .eyebrow").textContent();
    await staff.getByRole("button",{name:"Refresh requests",exact:true}).tap();
    await staff.getByRole("button",{name:`View ${secondCode}`,exact:true}).click();
    await staff.getByRole("button",{name:`Decline ${secondCode}`,exact:true}).tap();
    await staff.getByLabel("Reason for declining",{exact:true}).fill("Please choose a different day.");
    await staff.getByRole("button",{name:"Confirm decline",exact:true}).tap();
    await expect(staff.getByRole("status").filter({hasText:`Request ${secondCode} declined.`})).toBeVisible();
    await staff.getByLabel("Appointment status",{exact:true}).selectOption("all");
    await expect(staff.locator(".clinic-table .clinic-status").filter({hasText:/^Accepted$/})).toBeVisible();
    await expect(staff.locator(".clinic-table .clinic-status").filter({hasText:/^Declined$/})).toBeVisible();
    await patient.goto("/patient/appointments");
    await expect(patient.getByText("Status: declined",{exact:true})).toBeVisible();
    await expect(patient.getByText("Please choose a different day.",{exact:false})).toBeVisible();
    await patient.reload(); await expect(patient.getByText("Status: accepted",{exact:true})).toBeVisible();
    for(const width of [390,320,768,1440]) {
      await staff.setViewportSize({width,height:900});await patient.setViewportSize({width,height:900});
      await mobileControls(staff,`Inbox at ${width}`);await mobileControls(patient,`Patient appointments at ${width}`);
      await staff.evaluate(()=>scrollTo(0,0));await patient.evaluate(()=>scrollTo(0,0));
      await staff.screenshot({path:testInfo.outputPath(`real-clinic-inbox-${width}.png`),fullPage:true});
      await patient.screenshot({path:testInfo.outputPath(`real-patient-appointments-${width}.png`),fullPage:true});
    }
    expect(errors).toEqual([]);
  } finally {await Promise.allSettled([staffContext.close(),patientContext.close()]);}
});
