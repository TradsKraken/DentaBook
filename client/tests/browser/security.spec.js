import { test, expect } from "@playwright/test";

test("old patient links preserve their destination inside the patient portal", async ({ page }) => {
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/clinics") return route.fulfill({ json: { clinics: [] } });
    return route.fulfill({ status: 401, json: { error: "Please sign in." } });
  });
  for (const [oldPath, next] of [
    ["/book?clinic=chosen", "/patient/book?clinic=chosen"],
    ["/account", "/patient/account"],
    ["/appointments", "/patient/appointments"],
  ]) {
    await page.goto(oldPath);
    await expect(page.getByRole("heading", { name: "Sign in to continue." })).toBeVisible();
    const url = new URL(page.url());
    expect(url.pathname).toBe("/patient/sign-in");
    expect(url.searchParams.get("next")).toBe(next);
  }
  await page.goto("/register-clinic");
  await expect(page).toHaveURL(/\/clinic\/register$/);
  await expect(page.getByText("Clinic portal", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
});

test("production responses enforce browser security headers and block inline scripts", async ({ page, request }) => {
  test.skip(!process.env.PLAYWRIGHT_BASE_URL, "Requires the production Nginx container");
  const response = await request.get("/patient/sign-in");
  expect(response.headers()["content-security-policy"]).toContain("script-src 'self'");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  await page.goto("/patient/sign-in");
  await expect(page.getByRole("heading", { name: "Sign in to continue." })).toBeVisible();
  const executed = await page.evaluate(() => {
    const script = document.createElement("script");
    script.textContent = "window.injectedScriptExecuted = true";
    document.body.append(script);
    return window.injectedScriptExecuted === true;
  });
  expect(executed).toBe(false);
  const assets = await page.locator("script[src]").evaluateAll(scripts => scripts.map(script => script.src));
  expect(assets.length).toBeGreaterThan(0);
  for (const asset of assets) {
    const result = await request.get(asset);
    expect(result.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  }
});
