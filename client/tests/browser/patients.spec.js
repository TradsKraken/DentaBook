import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
const patient = {
  id: "44444444-4444-4444-8444-444444444444",
  name: "Patient Test User",
  email: "patient@example.com",
  role: "patient",
};
async function fixture(page, initial = null) {
  let current = initial;
  const writes = [];
  const privateReads = [];
  await page.route("**/api/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const respond = (json, status = 200) => route.fulfill({ json, status });
    if (request.method() === "POST")
      writes.push({
        path,
        body: request.postDataJSON(),
        header: request.headers()["x-dentabook-request"],
      });
    if (path === "/api/auth/me")
      return current
        ? respond({ user: current, clinic: null })
        : respond({ error: "Please sign in." }, 401);
    if (path === "/api/clinics") return respond({ clinics: [] });
    if (path === "/api/auth/register-patient")
      return respond({ registered: true }, 201);
    if (path === "/api/auth/patient/login") {
      current = patient;
      return respond({ signedIn: true });
    }
    if (path === "/api/auth/logout") {
      current = null;
      return route.fulfill({ status: 204 });
    }
    if (path === "/api/workspaces/patient/appointments") {
      privateReads.push(path);
      return respond({ appointments: [] });
    }
    return respond({ error: "Not found" }, 404);
  });
  return { writes, privateReads };
}
test("guests browse public pages but private patient pages require sign-in", async ({
  page,
}) => {
  const state = await fixture(page);
  for (const path of ["/", "/clinics", "/services", "/calculator", "/about"]) {
    await page.goto(path);
    await page.locator("main h1").waitFor();
    expect(new URL(page.url()).pathname).toBe(path);
  }
  for (const path of [
    "/patient/book?clinic=chosen-clinic",
    "/patient/appointments",
    "/patient/account",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Sign in to continue." }),
    ).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/patient/sign-in");
    expect(new URL(page.url()).searchParams.get("next")).toBe(path);
  }
  expect(state.privateReads).toEqual([]);
});
test("patient signup and sign-in return to the original booking page", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto("/patient/book?clinic=chosen-clinic");
  await expect(
    page.getByRole("heading", { name: "Sign in to continue." }),
  ).toBeVisible();
  await expect(
    page.locator("footer").getByRole("link", { name: "Patient registration" }),
  ).toHaveAttribute(
    "href",
    "/patient/register?next=%2Fpatient%2Fbook%3Fclinic%3Dchosen-clinic",
  );
  await page
    .locator("main form")
    .getByRole("link", { name: "Create a patient account" })
    .tap();
  const values = {
    name: "Patient Test User",
    email: "patient@example.com",
    phone: "09123456789",
    password: "Patient testing password!",
    confirmation: "Patient testing password!",
  };
  for (const [name, value] of Object.entries(values))
    await page.locator(`input[name="${name}"]`).fill(value);
  await page.getByRole("button", { name: "Create patient account" }).tap();
  await expect(
    page.getByRole("heading", { name: "Your patient account is ready." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Sign in to continue" }).tap();
  await page.getByLabel("Email address or username", { exact: true }).fill(values.email);
  await page.getByLabel("Password", { exact: true }).fill(values.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).tap();
  await expect(page).toHaveURL(/\/patient\/book\?clinic=chosen-clinic$/);
  await expect(
    page.getByRole("heading", { name: "Online booking is not available yet." }),
  ).toBeVisible();
  expect(state.writes[0].path).toBe("/api/auth/register-patient");
  expect(state.writes[0].body.role).toBeUndefined();
  expect(state.writes[0].body.confirmation).toBeUndefined();
  expect(state.writes[1].path).toBe("/api/auth/patient/login");
  expect(state.writes.every((write) => write.header === "1")).toBe(true);
  await page.goto("/patient/appointments");
  await expect(
    page.getByRole("heading", { name: "No appointments yet." }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("link", { name: "My account", exact: true })
    .tap();
  await expect(
    page.getByRole("heading", { name: "Welcome, Patient Test User." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).tap();
  // Logout and the route guard can both navigate here. A safe next=/account
  // query is valid; the contract is returning to patient sign-in, not its query.
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe("/patient/sign-in");
  await page.goto("/patient/appointments");
  await expect(
    page.getByRole("heading", { name: "Sign in to continue." }),
  ).toBeVisible();
});
test("patient sign-in rejects unsafe return destinations", async ({ page }) => {
  await fixture(page, patient);
  for (const next of [
    "https://untrusted.example",
    "//untrusted.example",
    "/admin",
    "/clinic",
    "/\\untrusted.example",
  ]) {
    await page.goto(`/patient/sign-in?next=${encodeURIComponent(next)}`);
    await expect(page).toHaveURL(/\/patient\/account$/);
  }
});
test("patient account pages are mobile-first and retain accessible controls", async ({
  page,
}) => {
  await fixture(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/patient/sign-in", "/patient/register"]) {
      await page.goto(path);
      await page.locator("main h1").waitFor();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const input of await page.locator("input").all())
        expect(
          await input.evaluate((el) =>
            parseFloat(getComputedStyle(el).fontSize),
          ),
        ).toBeGreaterThanOrEqual(16);
      for (const button of await page.locator("form button").all()) {
        const box = await button.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  }
  await fixture(page, patient);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/patient/account", "/patient/appointments"]) {
      await page.goto(path);
      await page.locator("main h1").waitFor();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});
