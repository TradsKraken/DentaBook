import { test, expect } from "@playwright/test";
import { clinicSection } from "./helpers/clinic";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
const clinic = { id: "11111111-1111-4111-8111-111111111111", name: "Clinic setup test", description: "", address: "Test address", phone: "09123456789", email: "clinic@example.test", status: "approved" };
async function fixture(page) {
  const state = { clinic: { ...clinic }, services: [], dentists: [], schedules: [], assignments: [], appointments: [], failSave: false, failRead: false, writes: [] };
  await page.route("**/api/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    const respond = (json, status = 200) => route.fulfill({ json, status });
    const pending = () => state.appointments.filter(item => item.status === "pending_review").length;
    if (path === "/api/auth/me") return respond({ user: { id: "22222222-2222-4222-8222-222222222222", name: "Test clinic staff", role: "clinic_staff" }, clinic: state.clinic });
    if (path === "/api/clinics") return respond({ clinics: [{ ...state.clinic, services: state.services.filter(item => item.isActive), dentists: state.dentists.filter(item => item.isActive) }] });
    if (path === "/api/workspaces/clinic") return respond({ clinic: state.clinic, counts: { services: state.services.filter(item => item.isActive).length, dentists: state.dentists.filter(item => item.isActive).length, pendingAppointments: pending() } });
    if (path === "/api/workspaces/clinic/manage/appointments") return respond({ appointments: state.appointments.filter(item => url.searchParams.get("status") === "all" || item.status === url.searchParams.get("status")), pendingAppointments: pending() });
    if (path === "/api/workspaces/clinic/manage") return state.failRead ? respond({ error: "Clinic tools could not be loaded." }, 503) : respond({ ...state, pendingAppointments: pending() });
    if (/\/appointments\/[^/]+\/changes$/.test(path) && request.method() === "GET") {
      const appointment=state.appointments.find(item=>path.includes(item.id));
      return respond({appointment,policy:{cancelEnabled:false,rescheduleEnabled:false,terms:null},policyHash:"fixture-policy",changes:[],canCancel:false,canReschedule:false,canStaffCancel:true,unavailableReason:"Patient appointment changes are not enabled."});
    }
    if (path.startsWith("/api/workspaces/clinic/manage")) {
      if (state.failSave) return respond({ error: "Unable to save. Please try again." }, 503);
      const body = request.postDataJSON();
      state.writes.push({ method: request.method(), path, body, header: request.headers()["x-dentabook-request"] });
      if (path.endsWith("/profile")) { state.clinic = { ...state.clinic, ...body }; return respond({ saved: true }); }
      if (path.endsWith("/review")) {
        const record = state.appointments.find(item => path.includes(item.id));
        record.status = body.decision; record.reviewNotes = body.notes;
        return respond({ appointment: record, pendingAppointments: pending() });
      }
      const [, resource, id] = path.match(/\/manage\/(services|dentists|schedules)(?:\/([^/]+))?$/) || [];
      if (request.method() === "DELETE") { state[resource] = state[resource].filter(item => item.id !== id); return respond({ removed: true }); }
      if (!resource) return respond({error:"Unexpected fixture route"},404);
      const item = { ...body, id: id || `${resource}-${state[resource].length + 1}` };
      if (id) state[resource] = state[resource].map(previous => previous.id === id ? item : previous); else state[resource].push(item);
      if (resource === "dentists") state.assignments = [...state.assignments.filter(assignment => assignment.dentistId !== item.id), ...(body.serviceIds || []).map(serviceId => ({ dentistId: item.id, serviceId }))];
      return respond({ saved: true }, id ? 200 : 201);
    }
    return respond({ error: "Not found" }, 404);
  });
  return state;
}
async function open(page) {
  await page.goto("/clinic");
  await expect(page.locator(".clinic-page-header h1")).toHaveText("Overview");
  await expect(page.getByRole("heading", { name: "Booking setup", exact: true })).toBeVisible();
}
async function addService(page, name = "Test cleaning") {
  await clinicSection(page, "Services & prices");
  await page.getByRole("button", { name: "Add a service", exact: true }).click();
  await page.getByLabel("Service name", { exact: true }).fill(name);
  await page.getByLabel("Estimated price (PHP)", { exact: true }).fill("1250.50");
  await page.getByLabel("Duration (minutes)", { exact: true }).fill("45");
  await page.getByRole("button", { name: "Add service", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}
async function addDentist(page) {
  await clinicSection(page, "Dentists");
  await page.getByRole("button", { name: "Add a dentist", exact: true }).click();
  await page.getByLabel("Dentist name", { exact: true }).fill("Test Dentist");
  await page.getByLabel("Professional title", { exact: true }).fill("Test title");
  await page.getByLabel("Credentials and qualifications", { exact: true }).fill("Test qualifications");
  await page.getByRole("button", { name: "Add dentist", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Test Dentist", exact: true })).toBeVisible();
}
test("staff maintain their profile, services, dentists, and hours through the clinic navigation and editor panels", async ({ page }) => {
  const state = await fixture(page); await open(page);
  await clinicSection(page, "Clinic profile");
  await page.getByLabel("Clinic name", { exact: true }).fill("Updated test clinic");
  await page.getByLabel("About your clinic", { exact: true }).fill("Saved clinic description");
  await page.getByRole("button", { name: "Save clinic profile", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Updated test clinic", exact: true })).toBeVisible();
  await addService(page);
  await page.getByRole("button", { name: "Edit Test cleaning", exact: true }).click();
  await page.getByLabel("Publish this service on the clinic profile", { exact: false }).uncheck();
  await page.getByRole("button", { name: "Save service", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".clinic-table .clinic-status").filter({ hasText: /^Hidden$/ })).toBeVisible();
  expect(state.services[0].isActive).toBe(false);
  await addDentist(page);
  await clinicSection(page, "Working hours");
  await page.getByRole("button", { name: "Add working hours", exact: true }).click();
  await page.getByLabel("Dentist", { exact: true }).selectOption("dentists-1");
  await page.getByLabel("Day of week", { exact: true }).selectOption("1");
  await page.getByLabel("Start time", { exact: true }).fill("09:00");
  await page.getByLabel("End time", { exact: true }).fill("12:00");
  await page.getByRole("button", { name: "Save working hours", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Monday · 09:00–12:00", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator(".clinic-page-header h1")).toHaveText("Working hours");
  await page.getByRole("button", { name: "Remove Monday 09:00 schedule for Test Dentist", exact: true }).click();
  await expect(page.getByText("No working hours saved yet.", { exact: true })).toBeVisible();
  expect(state.schedules).toHaveLength(0); expect(state.writes.every(write => write.header === "1")).toBe(true);
  await clinicSection(page, "Dentists");
  await page.getByRole("button", { name: "Edit Test Dentist", exact: true }).click();
  await page.getByLabel("Publish this dentist on the clinic profile", { exact: false }).uncheck();
  await page.getByRole("button", { name: "Save dentist", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".clinic-table .clinic-status").filter({ hasText: /^Hidden$/ })).toBeVisible();
  await clinicSection(page, "Working hours");
  await expect(page.getByRole("heading", { name: "Add a published dentist first" })).toBeVisible();
});
test("clinic forms retain failed saves and panels support cancellation with Escape", async ({ page }) => {
  const state = await fixture(page); await open(page); await clinicSection(page, "Clinic profile");
  state.failSave = true;
  await page.getByLabel("Clinic name", { exact: true }).fill("Retry this clinic name");
  await page.getByRole("button", { name: "Save clinic profile", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Unable to save");
  await expect(page.getByLabel("Clinic name", { exact: true })).toHaveValue("Retry this clinic name");
  state.failSave = false; await page.getByRole("button", { name: "Save clinic profile", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Retry this clinic name", exact: true })).toBeVisible();
  await clinicSection(page, "Services & prices"); await page.getByRole("button", { name: "Add a service", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible(); await page.getByLabel("Service name", { exact: true }).fill("Unsaved service");
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0); expect(state.services).toHaveLength(0);
  state.failRead = true; await page.reload(); await expect(page.getByRole("alert")).toContainText("Clinic tools could not be loaded");
  state.failRead = false; await page.getByRole("button", { name: "Reload clinic tools", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add a service", exact: true })).toBeVisible();
});
test("catalog search, publication filters, booking readiness, and browser history work", async ({ page }) => {
  const state = await fixture(page); await open(page); await addService(page); await addDentist(page);
  await clinicSection(page, "Overview");
  await expect(page.getByText("Assign treatments to dentists", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Assign treatments", exact: true }).click();
  await page.getByRole("button", { name: "Edit Test Dentist", exact: true }).click();
  await page.getByLabel("Test cleaning", { exact: true }).check();
  await page.getByRole("button", { name: "Save dentist", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0); expect(state.assignments).toHaveLength(1);
  await clinicSection(page, "Services & prices");
  await page.getByLabel("Search services", { exact: true }).fill("No such treatment");
  await expect(page.getByRole("heading", { name: "No matching services", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Test cleaning", exact: true })).toBeVisible();
  await page.getByLabel("Publication status", { exact: true }).selectOption("hidden");
  await expect(page.getByRole("heading", { name: "No matching services", exact: true })).toBeVisible();
  await clinicSection(page, "Working hours"); await page.goBack();
  await expect(page.locator(".clinic-page-header h1")).toHaveText("Services & prices");
});
test("request details and decisions use a focused panel without losing status filters", async ({ page }) => {
  const state = await fixture(page);
  state.appointments = [{ id: "55555555-5555-4555-8555-555555555555", code: "TEST-REQUEST-001", patientName: "Test Patient", email: "patient@example.test", phone: "09123456789", date: "2026-12-01", time: "09:00", end: "09:30", status: "pending_review", total: "1500.00", services: ["Test treatment"], dentistName: "Test Dentist", notes: "A patient note" }];
  await open(page); await clinicSection(page, "Appointment inbox");
  await page.getByLabel("Search requests").fill("Test Patient");
  await page.getByRole("button", { name: "View TEST-REQUEST-001", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible(); await expect(page.getByText("A patient note", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Decline TEST-REQUEST-001", exact: true }).click();
  await page.getByLabel("Reason for declining").fill("Please choose a different day.");
  await page.getByRole("button", { name: "Confirm decline", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "TEST-REQUEST-001 declined" })).toBeVisible();
  await page.getByLabel("Appointment status").selectOption("declined");
  await expect(page.getByRole("button", { name: "View TEST-REQUEST-001", exact: true })).toBeVisible();
  expect(state.appointments[0].status).toBe("declined");
});
test("clinic workspace, data lists, schedules, and editor panels fit required screen sizes", async ({ page }, testInfo) => {
  const state = await fixture(page);
  state.services = [
    { id: "service-1", name: "Test consultation", category: "General", description: "A saved treatment description", price: "500.00", duration: 30, isActive: true },
    { id: "service-2", name: "Test cleaning", category: "Preventive", description: "A second saved treatment", price: "1500.00", duration: 45, isActive: true },
  ];
  state.dentists = [{ id: "dentist-1", name: "Test Dentist One", title: "Test professional title", credentials: "Test qualifications", isActive: true }];
  state.assignments = [{ dentistId: "dentist-1", serviceId: "service-1" }];
  state.schedules = [{ id: "schedule-1", dentistId: "dentist-1", day: 1, start: "09:00", end: "17:00" }];
  state.appointments = [{ id: "request-1", code: "TEST-REQUEST-001", patientName: "Test Patient", email: "patient@example.test", phone: "09123456789", date: "2026-12-01", time: "09:00", end: "09:30", status: "pending_review", total: "500.00", services: ["Test consultation"], dentistName: "Test Dentist One" }];
  await open(page);
  async function check(label) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label).toBe(true);
    for (const control of await page.locator("main input:visible:not([type=checkbox]), main select:visible, main textarea:visible").all()) expect(await control.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    for (const action of await page.locator("main button:visible, main .button:visible, main .clinic-check:visible").all()) { const box = await action.boundingBox(); expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); }
  }
  for (const width of [390, 320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const label of ["Overview", "Appointment inbox", "Services & prices", "Dentists", "Working hours", "Clinic profile"]) {
      await clinicSection(page, label); await check(`${label} at ${width}`);
      if (width === 390 || width === 1440) await page.screenshot({ path: testInfo.outputPath(`workspace-${label.replaceAll(/[^a-z]/gi,"-")}-${width}.png`), fullPage: true });
    }
    await clinicSection(page, "Services & prices"); await page.getByRole("button", { name: "Add a service", exact: true }).click();
    await check(`Service editor at ${width}`); expect(await page.getByRole("dialog").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    if (width === 390 || width === 1440) await page.screenshot({ path: testInfo.outputPath(`service-editor-${width}.png`), fullPage: false });
    await page.getByRole("button", { name: "Close panel", exact: true }).click();
  }
});
