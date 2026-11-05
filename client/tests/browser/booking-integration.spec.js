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
test("real booking, payment, cancellation, and clinic-approved rescheduling work across phone and desktop",async({browser},testInfo)=>{
  test.setTimeout(300000);
  test.skip(process.env.PLAYWRIGHT_BOOKING_INTEGRATION!=="1","Requires the isolated booking API and PostgreSQL test harness");
  const staffContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:"reduce"});
  const patientContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:"reduce"});
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
    await staff.getByRole('dialog').getByLabel('Test Dentist',{exact:true}).check();
    await staff.getByRole('dialog').getByLabel(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(tomorrow()+'T00:00:00Z').getUTCDay()],{exact:true}).check();
    await staff.getByLabel("Start time",{exact:true}).fill("09:00");
    await staff.getByLabel("End time",{exact:true}).fill("17:00");
    await staff.getByRole("button",{name:"Save working hours",exact:true}).click();
    await expect(staff.getByRole("status").filter({hasText:"1 working shift added"})).toBeVisible();
    await login(patient,"patient","patient@example.test");
    async function chooseVisit() {
      await patient.goto(`/patient/book?clinic=${clinicId}`);
      await patient.getByLabel("Treatment",{exact:true}).selectOption(serviceId);
      await patient.getByLabel("Dentist",{exact:true}).selectOption(dentistId);
      await patient.getByLabel("Visit date",{exact:true}).fill(tomorrow());
      await expect(patient.getByRole("button",{name:/09:00–09:30|09:30–10:00/}).first()).toBeVisible();
    }
    await chooseVisit();
    await expect(patient.getByLabel("Contact email",{exact:true})).toHaveValue("patient@example.test");
    await patient.getByLabel("Contact email",{exact:true}).fill("appointment-contact@example.test");
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
    await expect(staff.getByRole("link",{name:"appointment-contact@example.test",exact:true})).toBeVisible();
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
    // Real database-backed payment setup and patient claims; no mocked payment API.
    await clinicSection(staff,"Deposits & payments");
    await staff.getByLabel("Accept GCash deposits",{exact:true}).check();
    await staff.getByLabel("Allow Pay at clinic",{exact:true}).check();
    await staff.getByLabel("Clinic GCash account name",{exact:true}).fill("Isolated test clinic account");
    await staff.getByLabel("Clinic GCash mobile number",{exact:true}).fill("09123456789");
    await staff.getByLabel("Deposit percentage (%)",{exact:true}).fill("25");
    await staff.getByLabel("Cancellation and refund terms",{exact:true}).fill("Contact this isolated test clinic for refund review before cancelling.");
    await staff.getByRole("button",{name:"Save payment options",exact:true}).click();
    await expect(staff.getByRole("status").filter({hasText:"Payment options saved"})).toBeVisible();
    await patient.locator("article").filter({hasText:firstCode}).getByRole("link",{name:"Deposit & payment details",exact:true}).click();
    await patient.getByLabel("I agree to the deposit amount",{exact:false}).check();
    await patient.getByRole("button",{name:"Choose GCash · ₱375.00",exact:true}).click();
    await expect(patient.getByRole("heading",{name:"Clinic GCash details",exact:true})).toBeVisible();
    for(const width of [390,320,768,1440]) {
      await staff.setViewportSize({width,height:900});await patient.setViewportSize({width,height:900});
      await mobileControls(staff,`Payment settings at ${width}`);await mobileControls(patient,`GCash instructions at ${width}`);
      await staff.evaluate(()=>scrollTo(0,0));await patient.evaluate(()=>scrollTo(0,0));
      await staff.screenshot({path:testInfo.outputPath(`real-payment-settings-${width}.png`),fullPage:true});
      await patient.screenshot({path:testInfo.outputPath(`real-gcash-instructions-${width}.png`),fullPage:true});
    }
    await patient.getByLabel("GCash transaction reference",{exact:true}).fill("1234567890123");
    await patient.getByRole("button",{name:"Submit reference for verification",exact:true}).click();
    await expect(patient.getByText("Your GCash reference is awaiting the clinic’s verification. Do not pay again.",{exact:true})).toBeVisible();
    await expect(patient.getByText("Appointment: accepted",{exact:true})).toBeVisible();
    await staff.getByRole("button",{name:"Refresh payments",exact:true}).click();
    await staff.getByRole("button",{name:"Review payment choice",exact:true}).click();
    await staff.getByLabel("Amount received (PHP)",{exact:true}).fill("375");
    await staff.getByLabel("Matching GCash reference",{exact:true}).fill("1234567890123");
    await staff.getByLabel("I checked the clinic’s GCash account",{exact:false}).check();
    await staff.getByRole("button",{name:"Save payment review",exact:true}).click();
    await expect(staff.getByRole("status").filter({hasText:"GCash verified"})).toBeVisible();
    await patient.getByRole("button",{name:"Refresh payment status",exact:true}).click();
    await expect(patient.getByText("Appointment: confirmed",{exact:true})).toBeVisible();
    await expect(patient.getByRole("article",{name:"Deposit receipt",exact:true})).toBeVisible();
    for(const width of [390,320,768,1440]) {
      await patient.setViewportSize({width,height:900});await mobileControls(patient,`Verified receipt at ${width}`);
      await patient.evaluate(()=>scrollTo(0,0));
      await patient.screenshot({path:testInfo.outputPath(`real-gcash-receipt-${width}.png`),fullPage:true});
    }
    async function checkReceiptPrint(page,name) {
      await page.emulateMedia({media:"print"});
      const pdf=await page.pdf({path:testInfo.outputPath(name),format:"A4",printBackground:true,margin:{top:"14mm",bottom:"14mm",left:"14mm",right:"14mm"}});
      expect((pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length).toBe(1);
      await page.emulateMedia({media:"screen"});
    }
    await checkReceiptPrint(patient,"patient-deposit-receipt.pdf");
    await staff.getByRole("button",{name:"View receipt",exact:true}).click();
    await expect(staff.getByRole("article",{name:"Deposit receipt",exact:true})).toBeVisible();
    await checkReceiptPrint(staff,"clinic-deposit-receipt.pdf");
    await staff.getByRole("button",{name:"Close panel",exact:true}).click();
    // Reuse the slot that the earlier decline released, then defer payment.
    await chooseVisit();
    await patient.getByRole("button",{name:"09:30–10:00",exact:true}).click();
    await patient.getByRole("button",{name:"Send appointment request",exact:true}).click();
    await expect(patient.getByRole("heading",{name:"Your appointment request is saved."})).toBeVisible();
    const walkCode=await patient.locator("main .eyebrow").textContent();
    await clinicSection(staff,"Appointment inbox");
    await staff.getByRole("button",{name:`View ${walkCode}`,exact:true}).click();
    await staff.getByRole("button",{name:`Accept ${walkCode}`,exact:true}).click();
    await staff.getByRole("button",{name:"Confirm acceptance",exact:true}).click();
    await expect(staff.getByRole("status").filter({hasText:`Request ${walkCode} accepted.`})).toBeVisible();
    await patient.goto("/patient/appointments");
    await patient.locator("article").filter({hasText:walkCode}).getByRole("link",{name:"Deposit & payment details",exact:true}).click();
    await patient.getByRole("button",{name:"Choose Pay at clinic",exact:true}).click();
    await expect(patient.getByText("Pay at clinic · unpaid",{exact:true})).toBeVisible();
    await clinicSection(staff,"Deposits & payments");
    await staff.getByRole("button",{name:"Review payment choice",exact:true}).click();
    await staff.getByRole("button",{name:"Save payment review",exact:true}).click();
    await expect(staff.getByRole("status").filter({hasText:"Visit confirmed as Pay at clinic"})).toBeVisible();
    await patient.getByRole("button",{name:"Refresh payment status",exact:true}).click();
    await expect(patient.getByText("Appointment: confirmed",{exact:true})).toBeVisible();
    await expect(patient.getByText("Pay at clinic · unpaid",{exact:true})).toBeVisible();
    await expect(patient.getByRole("article",{name:"Deposit receipt",exact:true})).toHaveCount(0);
    // Clinics explicitly configure patient actions. Existing unconfigured bookings
    // adopt the policy on their first change; payment snapshots stay intact.
    await clinicSection(staff,"Appointment policies");
    await staff.getByLabel("Allow patient cancellation",{exact:true}).check();
    await staff.getByLabel("Cancellation notice (hours)",{exact:true}).fill("0");
    await staff.getByLabel("Allow patient reschedule requests",{exact:true}).check();
    await staff.getByLabel("Reschedule notice (hours)",{exact:true}).fill("0");
    await staff.getByLabel("Appointment change terms",{exact:true}).fill("Isolated test policy: changes before the visit; deposits require clinic review.");
    for(const width of [390,320,768,1440]) {
      await staff.setViewportSize({width,height:900});await mobileControls(staff,`Appointment policies at ${width}`);
      await staff.screenshot({path:testInfo.outputPath(`appointment-policies-${width}.png`),fullPage:true});
    }
    await staff.getByRole("button",{name:"Save appointment policy",exact:true}).click();
    await expect(staff.getByRole("status").filter({hasText:"Appointment policy saved"})).toBeVisible();
    await patient.goto("/patient/appointments");
    let paidCard=patient.locator(".appointment-list > article").filter({hasText:firstCode});
    await paidCard.getByRole("button",{name:"Manage appointment",exact:true}).click();
    await paidCard.getByRole("button",{name:"Request reschedule",exact:true}).click();
    await paidCard.getByLabel("Replacement date",{exact:true}).fill(tomorrow());
    await paidCard.getByRole("button",{name:"10:00–10:30",exact:true}).click();
    await paidCard.getByLabel("Reason for change",{exact:true}).fill("Please move my visit to a later time.");
    for(const width of [390,320,768,1440]) {
      await patient.setViewportSize({width,height:900});await mobileControls(patient,`Reschedule request at ${width}`);
      await patient.screenshot({path:testInfo.outputPath(`reschedule-request-${width}.png`),fullPage:true});
    }
    await paidCard.getByRole("button",{name:"Send reschedule request",exact:true}).click();
    await expect(paidCard.getByText("Reschedule · pending",{exact:true})).toBeVisible();
    await expect(paidCard.getByText(/Original:.*09:00/)).toBeVisible();
    await clinicSection(staff,"Appointment inbox");
    await staff.getByLabel("Appointment status",{exact:true}).selectOption("reschedule_requests");
    await staff.getByRole("button",{name:`View ${firstCode}`,exact:true}).click();
    await staff.getByRole("button",{name:"Review reschedule",exact:true}).click();
    await staff.getByLabel("Reschedule decision",{exact:true}).selectOption("approved");
    await staff.getByLabel("Decision note",{exact:true}).fill("Your later time is approved; deposit retained.");
    for(const width of [390,320,768,1440]) {
      await staff.setViewportSize({width,height:900});await mobileControls(staff,`Clinic reschedule review at ${width}`);
      await staff.screenshot({path:testInfo.outputPath(`reschedule-review-${width}.png`),fullPage:true});
    }
    await staff.getByRole("button",{name:"Save reschedule decision",exact:true}).click();
    await expect(staff.getByRole("dialog")).toHaveCount(0);
    await patient.getByRole("button",{name:"Refresh appointments",exact:true}).click();
    paidCard=patient.locator(".appointment-list > article").filter({hasText:firstCode});
    await expect(paidCard.getByText("Status: confirmed",{exact:true})).toBeVisible();
    await paidCard.getByRole("button",{name:"Manage appointment",exact:true}).click();
    await expect(paidCard.getByText("Reschedule · approved",{exact:true})).toBeVisible();
    await paidCard.getByRole("button",{name:"Cancel appointment",exact:true}).click();
    await paidCard.getByLabel("Reason for change",{exact:true}).fill("Unable to attend the new time.");
    for(const width of [390,320,768,1440]) {
      await patient.setViewportSize({width,height:900});await mobileControls(patient,`Cancellation at ${width}`);
      await patient.screenshot({path:testInfo.outputPath(`cancellation-${width}.png`),fullPage:true});
    }
    await paidCard.getByRole("button",{name:"Confirm cancellation",exact:true}).click();
    await expect(paidCard.getByText("Status: cancelled",{exact:true})).toBeVisible();
    await expect(paidCard.getByText("Cancellation · approved",{exact:true})).toBeVisible();
    await paidCard.getByRole("link",{name:"Deposit & payment details",exact:true}).click();
    await expect(patient.getByText("Appointment: cancelled",{exact:true})).toBeVisible();
    await expect(patient.getByRole("article",{name:"Deposit receipt",exact:true})).toBeVisible();
    await expect(patient.getByText("Payment received · clinic review required",{exact:true})).toBeVisible();
    // Staff can also cancel an unpaid future visit with a recorded reason.
    await staff.getByLabel("Appointment status",{exact:true}).selectOption("confirmed");
    await staff.getByRole("button",{name:`View ${walkCode}`,exact:true}).click();
    await staff.getByRole("button",{name:"Cancel appointment",exact:true}).click();
    await staff.getByLabel("Reason for change",{exact:true}).fill("Dentist unavailable; patient contacted.");
    await staff.getByRole("button",{name:"Confirm cancellation",exact:true}).click();
    await expect(staff.getByRole("dialog")).toHaveCount(0);
    await patient.goto("/patient/appointments");
    const walkCard=patient.locator(".appointment-list > article").filter({hasText:walkCode});
    await expect(walkCard.getByText("Status: cancelled",{exact:true})).toBeVisible();
    await walkCard.getByRole("link",{name:"Deposit & payment details",exact:true}).click();
    await expect(patient.getByText("Pay at clinic · unpaid",{exact:true})).toBeVisible();
    await expect(patient.getByRole("article",{name:"Deposit receipt",exact:true})).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {await Promise.allSettled([staffContext.close(),patientContext.close()]);}
});
