import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

// Fixtures are confined to tests; the application itself has no fallback clinics.
const clinic = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Directory Test Clinic",
  address: "Quezon City",
  phone: "0281234567",
  email: "clinic@example.com",
  description: "Clinic information from the API.",
  depositPercentage: 20,
  services: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Teeth cleaning",
      category: "Preventive",
      price: 800,
      duration: 30,
    },
  ],
  dentists: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Directory Test Dentist",
      title: "General Dentist",
      credentials: "",
    },
  ],
};
async function directoryResponse(page, clinics = []) {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ status: 401, json: { error: "Please sign in." } }),
  );
  await page.route("**/api/clinics", (route) =>
    route.fulfill({ json: { clinics } }),
  );
}
test("empty database has no invented listings, booking submission, or open dashboard", async ({
  page,
}) => {
  await directoryResponse(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "No clinics listed yet." }),
  ).toBeVisible();
  await expect(page.locator(".clinic-card")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(
    /demo|sample data|interactive preview|SmileCare|BrightLife|Maria Santos/i,
  );
  await page.goto("/patient/book");
  await expect(
    page.getByRole("heading", { name: "Sign in to continue." }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/patient\/sign-in\?next=/);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Page not found." }),
  ).toBeVisible();
});
test("directory error is distinct from no clinics and can be retried", async ({
  page,
}) => {
  let recovered = false;
  await page.route("**/api/clinics", (route) => {
    return route.fulfill(
      !recovered
        ? { status: 503, json: { error: "Service unavailable" } }
        : { json: { clinics: [clinic] } },
    );
  });
  await page.goto("/clinics");
  await expect(
    page.getByRole("heading", { name: "We couldn’t load the clinics." }),
  ).toBeVisible();
  recovered = true;
  await page.getByRole("button", { name: "Try again" }).tap();
  await expect(page.locator(".clinic-card")).toContainText(clinic.name);
});
test("search, clinic profiles, contact links, and estimates use API records", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await directoryResponse(page, [clinic]);
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Search clinics or services" })
    .fill("cleaning");
  await page.getByRole("button", { name: "Find my dentist" }).tap();
  await expect(page.locator(".clinic-card")).toHaveCount(1);
  await page.locator(".clinic-title a").tap();
  await expect(page.getByRole("heading", { name: clinic.name })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Call clinic", exact: true }),
  ).toHaveAttribute("href", "tel:0281234567");
  await page.getByRole("button", { name: "Dentists", exact: true }).tap();
  await expect(
    page.getByRole("heading", { name: "Directory Test Dentist" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Estimate my cost" }).tap();
  await page.getByRole("checkbox").check();
  await expect(page.locator(".total-row")).toContainText("₱800.00");
  await expect(
    page.getByRole("link", { name: "View clinic contact details" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile first layouts and controls work across phone, tablet, and desktop", async ({
  page,
}) => {
  await directoryResponse(page, [clinic]);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of [
      "/",
      "/clinics",
      `/clinics/${clinic.id}`,
      "/services",
      "/calculator",
      "/patient/book",
      "/patient/appointments",
      "/dashboard",
      "/about",
    ]) {
      await page.goto(path);
      await page.locator("main h1").waitFor();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} at ${width}`,
      ).toBe(true);
      if (width > 390) continue;
      for (const input of await page
        .locator("input:not([type=checkbox]), select, textarea")
        .all()) {
        expect(
          await input.evaluate((el) =>
            parseFloat(getComputedStyle(el).fontSize),
          ),
        ).toBeGreaterThanOrEqual(16);
      }
      for (const control of await page
        .locator(".button:visible, .menu-button, .tabs button")
        .all()) {
        const box = await control.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByRole("button", { name: "Open menu" }).tap();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Book a visit" })
    .tap();
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});
