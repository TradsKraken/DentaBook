import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
const clinic = { id: "11111111-1111-4111-8111-111111111111", name: "Clinic setup test", description: "", address: "Test address", phone: "09123456789", email: "clinic@example.test", status: "approved" };
async function fixture(page) {
  const state = { clinic: { ...clinic }, services: [], dentists: [], schedules: [], failSave: false, failRead: false, writes: [] };
  await page.route("**/api/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const respond = (json, status = 200) => route.fulfill({ json, status });
    if (path === "/api/auth/me") return respond({ user: { id: "22222222-2222-4222-8222-222222222222", name: "Test clinic staff", role: "clinic_staff" }, clinic: state.clinic });
    if (path === "/api/clinics") return respond({ clinics: [{ ...state.clinic, services: state.services.filter(item => item.isActive), dentists: state.dentists.filter(item => item.isActive) }] });
    if (path === "/api/workspaces/clinic") return respond({ clinic: state.clinic, counts: { services: state.services.filter(item => item.isActive).length, dentists: state.dentists.filter(item => item.isActive).length, pendingAppointments: 0 } });
    if (path.startsWith("/api/workspaces/clinic/manage")) {
      if (request.method() === "GET") return state.failRead ? respond({ error: "Clinic tools could not be loaded." }, 503) : respond(state);
      if (state.failSave) return respond({ error: "Unable to save. Please try again." }, 503);
      const body = request.postDataJSON();
      state.writes.push({ method: request.method(), path, body, header: request.headers()["x-dentabook-request"] });
      if (path.endsWith("/profile")) { state.clinic = { ...state.clinic, ...body }; return respond({ saved: true }); }
      const [, resource, id] = path.match(/\/manage\/(services|dentists|schedules)(?:\/([^/]+))?$/) || [];
      if (request.method() === "DELETE") { state[resource] = state[resource].filter(item => item.id !== id); return respond({ removed: true }); }
      const item = { ...body, id: id || `${resource}-${state[resource].length + 1}` };
      if (id) state[resource] = state[resource].map(previous => previous.id === id ? item : previous);
      else state[resource].push(item);
      return respond({ saved: true }, id ? 200 : 201);
    }
    return respond({ error: "Not found" }, 404);
  });
  return state;
}
async function open(page) {
  await page.goto("/clinic");
  await expect(page.getByRole("heading", { name: "Edit clinic profile", exact: true })).toBeVisible();
}
async function addService(page, name = "Test cleaning") {
  await page.getByRole("button", { name: "Services & prices", exact: true }).tap();
  await page.getByLabel("Service name", { exact: true }).fill(name);
  await page.getByLabel("Estimated price (PHP)", { exact: true }).fill("1250.50");
  await page.getByLabel("Duration (minutes)", { exact: true }).fill("45");
  await page.getByRole("button", { name: "Add service", exact: true }).tap();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}
async function addDentist(page) {
  await page.getByRole("button", { name: "Dentists", exact: true }).tap();
  await page.getByLabel("Dentist name", { exact: true }).fill("Test Dentist");
  await page.getByLabel("Professional title", { exact: true }).fill("Test title");
  await page.getByLabel("Credentials and qualifications", { exact: true }).fill("Test qualifications");
  await page.getByRole("button", { name: "Add dentist", exact: true }).tap();
  await expect(page.getByRole("heading", { name: "Test Dentist", exact: true })).toBeVisible();
}

test("staff save a profile, publish and hide services, manage dentists, and add/remove working hours on a phone", async ({ page }) => {
  const state = await fixture(page); await open(page);
  await page.getByLabel("Clinic name", { exact: true }).fill("Updated test clinic");
  await page.getByLabel("About your clinic", { exact: true }).fill("Saved clinic description");
  await page.getByRole("button", { name: "Save clinic profile", exact: true }).tap();
  await expect(page.getByRole("heading", { name: "Updated test clinic", exact: true })).toBeVisible();
  await addService(page);
  await page.getByRole("button", { name: "Edit Test cleaning", exact: true }).tap();
  await page.getByLabel("Publish this service on the clinic profile").uncheck();
  await page.getByRole("button", { name: "Save service", exact: true }).tap();
  await expect(page.getByText("Hidden", { exact: true })).toBeVisible();
  expect(state.services[0].isActive).toBe(false);
  await addDentist(page);
  await page.getByRole("button", { name: "Working hours", exact: true }).tap();
  await page.getByLabel("Dentist", { exact: true }).selectOption("dentists-1");
  await page.getByLabel("Day of week", { exact: true }).selectOption("1");
  await page.getByLabel("Start time", { exact: true }).fill("09:00");
  await page.getByLabel("End time", { exact: true }).fill("12:00");
  await page.getByRole("button", { name: "Add working hours", exact: true }).tap();
  await expect(page.getByText("Monday · 09:00–12:00", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Working hours", exact: true }).tap();
  await expect(page.getByText("Monday · 09:00–12:00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove Monday 09:00 schedule for Test Dentist", exact: true }).tap();
  await expect(page.getByText("No working hours saved yet.", { exact: true })).toBeVisible();
  expect(state.schedules).toHaveLength(0);
  expect(state.writes.every(write => write.header === "1")).toBe(true);
  expect(state.writes.find(write => write.path.endsWith("/services")).body.duration).toBe(45);
  await page.getByRole("button", { name: "Dentists", exact: true }).tap();
  await page.getByRole("button", { name: "Edit Test Dentist", exact: true }).tap();
  await page.getByLabel("Publish this dentist on the clinic profile").uncheck();
  await page.getByRole("button", { name: "Save dentist", exact: true }).tap();
  await expect(page.getByText("Hidden", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Working hours", exact: true }).tap();
  await expect(page.getByRole("heading", { name: "Add a published dentist first" })).toBeVisible();
});

test("clinic tools keep input after failed saves and recover from load errors", async ({ page }) => {
  const state = await fixture(page); await open(page);
  state.failSave = true;
  await page.getByLabel("Clinic name", { exact: true }).fill("Retry this clinic name");
  await page.getByRole("button", { name: "Save clinic profile", exact: true }).tap();
  await expect(page.getByRole("alert")).toContainText("Unable to save");
  await expect(page.getByLabel("Clinic name", { exact: true })).toHaveValue("Retry this clinic name");
  state.failSave = false;
  await page.getByRole("button", { name: "Save clinic profile", exact: true }).tap();
  await expect(page.getByRole("heading", { name: "Retry this clinic name", exact: true })).toBeVisible();
  state.failRead = true;
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("Clinic tools could not be loaded");
  state.failRead = false;
  await page.getByRole("button", { name: "Reload clinic tools", exact: true }).tap();
  await expect(page.getByRole("heading", { name: "Edit clinic profile", exact: true })).toBeVisible();
});

test("all setup tools fit 320, 390, 768, and 1440px screens with readable controls and touch targets", async ({ page }) => {
  const state = await fixture(page);
  state.clinic.name = "A long saved clinic name for testing narrow phone layouts";
  await open(page); await addService(page, "A long saved treatment name for testing narrow phone layouts"); await addDentist(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tab of ["Clinic profile", "Services & prices", "Dentists", "Working hours"]) {
      await page.getByRole("button", { name: tab, exact: true }).tap();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${tab} at ${width}`).toBe(true);
      for (const control of await page.locator("main input:not([type=checkbox]), main select, main textarea").all()) {
        expect(await control.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
      }
      for (const action of await page.locator("main button:visible, .clinic-check").all()) {
        const box = await action.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
      }
      if (width === 390 || width === 1440) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `test-results/clinic-${tab.replaceAll(/[^a-z]/gi, "-")}-${width}.png`, fullPage: true });
      }
    }
  }
});
