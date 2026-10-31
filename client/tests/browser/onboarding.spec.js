import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
const clinic = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Onboarding Test Clinic",
  address: "Test address",
  phone: "09123456789",
  email: "clinic@example.com",
  status: "pending_review",
  registrationReference: "TEST-001",
  createdAt: "2026-01-01T00:00:00Z",
  ownerName: "Test Owner",
  ownerEmail: "owner@example.com",
  services: [],
  dentists: [],
};
const owner = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Test Owner",
  email: "owner@example.com",
  role: "clinic_staff",
};
async function fixture(page, initial = null) {
  let current = initial;
  let record = { ...clinic };
  const mutations = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const respond = (json, status = 200) => route.fulfill({ status, json });
    if (request.method() === "POST")
      mutations.push({
        path,
        header: request.headers()["x-dentabook-request"],
        body: request.postDataJSON(),
      });
    if (path === "/api/clinics")
      return respond({ clinics: record.status === "approved" ? [record] : [] });
    if (path === "/api/auth/me")
      return current
        ? respond({
            user: current,
            clinic: current.role === "clinic_staff" ? record : null,
          })
        : respond({ error: "Please sign in." }, 401);
    if (path === "/api/auth/register-clinic")
      return respond({ clinicId: record.id, status: "pending_review" }, 201);
    if (path === "/api/auth/clinic/login" || path === "/api/auth/admin/login") {
      current =
        path === "/api/auth/admin/login"
          ? { ...owner, role: "system_admin" }
          : owner;
      return respond({ signedIn: true });
    }
    if (path === "/api/auth/logout") {
      current = null;
      return route.fulfill({ status: 204 });
    }
    if (path === "/api/workspaces/clinic")
      return respond({
        clinic: record,
        counts: { dentists: 0, services: 0, pendingAppointments: 0 },
      });
    if (path === "/api/workspaces/admin/clinics") {
      const status = new URL(request.url()).searchParams.get("status");
      return respond({ clinics: record.status === status ? [record] : [] });
    }
    if (path.endsWith("/review")) {
      const body = request.postDataJSON();
      record = { ...record, status: body.decision, reviewNotes: body.notes };
      return respond({ clinic: { id: record.id, status: record.status } });
    }
    return respond({ error: "Not found" }, 404);
  });
  return {
    mutations,
    approve() {
      record = { ...record, status: "approved" };
    },
  };
}
test("clinic registration is usable on a phone and submits real API fields", async ({
  page,
}) => {
  const { mutations } = await fixture(page);
  await page.goto("/clinic/register");
  const values = {
    ownerName: "Test Owner",
    email: "owner@example.com",
    password: "A long testing password!",
    confirmPassword: "A long testing password!",
    clinicName: "Onboarding Test Clinic",
    address: "Test address",
    phone: "09123456789",
    contactEmail: "clinic@example.com",
    registrationReference: "TEST-001",
  };
  for (const [name, value] of Object.entries(values))
    await page.locator(`input[name="${name}"]`).fill(value);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit for review" }).tap();
  await expect(
    page.getByRole("heading", { name: "Your clinic is awaiting review." }),
  ).toBeVisible();
  expect(mutations[0].path).toBe("/api/auth/register-clinic");
  expect(mutations[0].header).toBe("1");
  expect(mutations[0].body.clinicName).toBe(values.clinicName);
  expect(mutations[0].body.role).toBeUndefined();
  expect(mutations[0].body.confirmPassword).toBeUndefined();
  await expect(page.locator("input[type=password]")).toHaveCount(0);
});
test("sign in, pending approval, approved dashboard, access restriction, and sign out", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto("/clinic");
  await expect(page).toHaveURL(/sign-in/);
  await page
    .getByLabel("Email address or username", { exact: true })
    .fill("owner@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("A long testing password!");
  await page.getByRole("button", { name: "Sign in", exact: true }).tap();
  await expect(
    page.getByRole("heading", { name: "Your clinic is awaiting review." }),
  ).toBeVisible();
  state.approve();
  await page.getByRole("button", { name: "Refresh registration status" }).tap();
  await expect(
    page.getByRole("heading", { name: "Clinic contact information" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View public clinic profile" }).tap();
  await expect(
    page.getByRole("heading", { name: clinic.name, exact: true }),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Access restricted." }),
  ).toBeVisible();
  await page.goto("/clinic");
  await page.getByRole("button", { name: "Sign out", exact: true }).tap();
  await expect(page).toHaveURL(/sign-in/);
  await page.goto("/clinic");
  await expect(page).toHaveURL(/sign-in/);
});
test("administrator reviews a registration through a confirmation step", async ({
  page,
}) => {
  const state = await fixture(page, { ...owner, role: "system_admin" });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: clinic.name, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Approve clinic", exact: true }).tap();
  await expect(
    page.getByRole("heading", { name: `Approve ${clinic.name}?` }),
  ).toBeVisible();
  await page.getByLabel("Review notes (optional)").fill("Reference reviewed.");
  await page.getByRole("button", { name: "Confirm decision" }).tap();
  await expect(page.getByRole("status").filter({ hasText: `${clinic.name} approved.` })).toContainText(
    `${clinic.name} approved.`,
  );
  await page.getByLabel("Registration status").selectOption("approved");
  await expect(
    page.getByRole("heading", { name: clinic.name, exact: true }),
  ).toBeVisible();
  expect(state.mutations[0].body).toEqual({
    decision: "approved",
    notes: "Reference reviewed.",
  });
  expect(state.mutations[0].header).toBe("1");
});
test("onboarding pages keep phone controls readable and do not overflow", async ({
  page,
}) => {
  await fixture(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of [
      "/clinic/register",
      "/clinic/sign-in",
      "/admin/sign-in",
    ]) {
      await page.goto(path);
      await page.locator("main h1").waitFor();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const input of await page
        .locator("input:not([type=checkbox])")
        .all())
        expect(
          await input.evaluate((el) =>
            parseFloat(getComputedStyle(el).fontSize),
          ),
        ).toBeGreaterThanOrEqual(16);
      for (const button of await page.locator("form button").all()) {
        const box = await button.boundingBox();
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/clinic/register");
  await page.screenshot({
    path: "test-results/registration-phone.png",
    fullPage: true,
  });
});

test("administrator sign-in has a separate URL, layout, endpoint, and logout destination", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto("/");
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
  await expect(
    page
      .locator("footer")
      .getByRole("link", { name: "Clinic sign in", exact: true }),
  ).toHaveAttribute("href", "/clinic/sign-in");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Administrator sign-in." }),
  ).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.locator("footer")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Register your clinic" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Email address or username", { exact: true })
    .fill("admin@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Administrator testing password!");
  await page.getByRole("button", { name: "Sign in", exact: true }).tap();
  await expect(page).toHaveURL(/\/admin$/);
  expect(state.mutations[0].path).toBe("/api/auth/admin/login");
  await page.getByRole("button", { name: "Sign out", exact: true }).tap();
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
  await page.goto("/clinic");
  await expect(page).toHaveURL(/\/clinic\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to your clinic." }),
  ).toBeVisible();
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/patient\/sign-in$/);
});

test("private clinic and administrator workspaces fit phones through desktop", async ({
  page,
}) => {
  const state = await fixture(page, owner);
  state.approve();
  for (const [path, role] of [
    ["/clinic", owner],
    ["/admin", { ...owner, role: "system_admin" }],
  ]) {
    if (path === "/admin") await fixture(page, role);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(path);
      await expect(
        page.getByRole("button", { name: "Sign out", exact: true }),
      ).toBeVisible();
      if (path === "/clinic")
        await expect(
          page.getByRole("heading", { name: "Clinic contact information" }),
        ).toBeVisible();
      else
        await expect(
          page.getByRole("button", { name: "Approve clinic" }),
        ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} at ${width}`,
      ).toBe(true);
      for (const button of await page.locator("main button").all()) {
        const box = await button.boundingBox();
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }
  }
});
