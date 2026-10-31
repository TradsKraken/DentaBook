import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const clinics = [
  { id: "11111111-1111-4111-8111-111111111111", name: "First test clinic", status: "approved", address: "First test address", phone: "09123456789", email: "first@example.test" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Second test clinic with a long registered name for narrow phones", status: "pending_review", address: "Second test address", phone: "09123456789", email: "second@example.test" },
];

async function fixture(page, { records = clinics, failOptions = false, failWorkspace = false } = {}) {
  let user = null;
  const reads = [];
  await page.route("**/api/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const respond = (json, status = 200) => route.fulfill({ json, status });
    if (path === "/api/clinics") return respond({ clinics: [] });
    if (/^\/api\/auth\/(patient|clinic|admin)\/login$/.test(path)) {
      expect(request.postDataJSON()).toEqual({ email: "admin", password: "admin123" });
      const role = { patient: "patient", clinic: "clinic_staff", admin: "system_admin" }[path.split("/")[3]];
      user = { id: "33333333-3333-4333-8333-333333333333", name: "Administrator", username: "admin", email: null, role, ownerAccess: true };
      return respond({ signedIn: true });
    }
    if (path === "/api/auth/me") return user ? respond({ user, clinic: null }) : respond({ error: "Please sign in." }, 401);
    if (path === "/api/auth/logout") { user = null; return route.fulfill({ status: 204 }); }
    if (path === "/api/workspaces/clinic/options") {
      if (failOptions) return respond({ error: "Clinic list is temporarily unavailable." }, 503);
      return respond({ clinics: records });
    }
    if (path === "/api/workspaces/clinic") {
      reads.push(url.searchParams.get("clinicId"));
      if (failWorkspace) return respond({ error: "Clinic workspace is temporarily unavailable." }, 503);
      return respond({ clinic: records.find(clinic => clinic.id === url.searchParams.get("clinicId")), counts: { dentists: 0, services: 0, pendingAppointments: 0 } });
    }
    if (path === "/api/workspaces/admin/clinics") return respond({ clinics: [] });
    if (path === "/api/workspaces/patient/appointments") return respond({ appointments: [] });
    return respond({ error: "Not found." }, 404);
  });
  return { reads, recoverOptions() { failOptions = false; }, recoverWorkspace() { failWorkspace = false; } };
}
async function login(page, portal) {
  await page.goto(`/${portal}/sign-in`);
  await page.getByLabel("Email address or username", { exact: true }).fill("admin");
  await page.getByLabel("Password", { exact: true }).fill("admin123");
  await page.getByRole("button", { name: "Sign in", exact: true }).tap();
}

test("owner signs into each portal and selects existing clinics on phone and desktop", async ({ page }) => {
  const { reads } = await fixture(page);
  await login(page, "clinic");
  await expect(page.getByRole("heading", { name: "Clinic workspaces", exact: true })).toBeVisible();
  expect(reads).toEqual([]);
  for (const clinic of clinics) {
    await page.getByLabel("Clinic", { exact: true }).selectOption(clinic.id);
    await expect(page.getByRole("heading", { name: clinic.name, exact: true })).toBeVisible();
    await expect(page.getByText(clinic.address, { exact: true })).toBeVisible();
  }
  await expect(page.getByText("Owner access. Clinic status: pending review.")).toBeVisible();
  await expect(page.getByRole("link", { name: "View public clinic profile" })).toHaveCount(0);
  for (const width of [390, 320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const select = page.getByLabel("Clinic", { exact: true });
    expect(await select.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
    expect((await select.boundingBox()).height).toBeGreaterThanOrEqual(44);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "patient");
  await expect(page).toHaveURL(/\/patient\/account$/);
  await page.goto("/patient/account");
  await expect(page.getByText("No email address set", { exact: true })).toBeVisible();
  await login(page, "admin");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).tap();
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
});

test("owner sees an honest empty clinic selector", async ({ page }) => {
  await fixture(page, { records: [] });
  await login(page, "clinic");
  await expect(page.getByText("No clinics have been registered yet.")).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveCount(0);
});

test("owner can recover from clinic-list and selected-workspace errors", async ({ page }) => {
  const state = await fixture(page, { failOptions: true, failWorkspace: true });
  await login(page, "clinic");
  await expect(page.getByRole("alert")).toContainText("Clinic list is temporarily unavailable.");
  state.recoverOptions();
  await page.getByRole("button", { name: "Try again", exact: true }).tap();
  await page.getByLabel("Clinic", { exact: true }).selectOption(clinics[0].id);
  await expect(page.getByRole("alert")).toContainText("Clinic workspace is temporarily unavailable.");
  state.recoverWorkspace();
  await page.getByRole("button", { name: "Try again", exact: true }).tap();
  await expect(page.getByRole("heading", { name: clinics[0].name, exact: true })).toBeVisible();
});
