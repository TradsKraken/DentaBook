import { test, expect } from "@playwright/test";

const origins = {
  public: process.env.PLAYWRIGHT_BASE_URL,
  admin: process.env.PLAYWRIGHT_ADMIN_URL,
};
const patientPublicURL = process.env.PLAYWRIGHT_PATIENT_PUBLIC_URL || "https://dentabook.forgroup.space";
const paths = {
  public: ["/", "/clinics", "/services", "/calculator", "/patient/sign-in", "/patient/register", "/clinic/sign-in", "/clinic/register"],
  admin: ["/admin/sign-in"],
};

test.describe("production public and administrator listeners", () => {
  test.skip(!origins.public || !origins.admin, "Requires public and administrator listener URLs");
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("patient and clinic access share the public host while administrator access stays isolated", async ({ request }) => {
    for (const [portal, origin] of Object.entries(origins)) {
      const health = await request.get(origin + "/api/health");
      expect(health.status()).toBe(200);
      expect((await health.json()).database.connected).toBe(true);
      expect((await request.get(origin + "/api/auth/me")).status()).toBe(401);
      const login = portal === "public" ? "patient" : "admin";
      expect((await request.post(origin + `/api/auth/${login}/login`, {
        headers: { Origin: "https://untrusted.example", "X-DentaBook-Request": "1" }, data: {},
      })).status()).toBe(403);
    }
    for (const path of ["/admin", "/admin/sign-in", "/%61dmin/sign-in"]) {
      expect((await request.get(origins.public + path)).status()).toBe(404);
    }
    expect((await request.post(origins.public + "/api/auth/admin/login", {
      headers: { "X-DentaBook-Request": "1", "X-DentaBook-Portal": "admin" }, data: {},
    })).status()).toBe(404);
    expect((await request.get(origins.public + "/api/workspaces/admin/clinics")).status()).toBe(404);
    for (const portal of ["patient", "clinic"]) {
      expect((await request.get(origins.admin + `/${portal}/sign-in`)).status()).toBe(404);
      expect((await request.post(origins.admin + `/api/auth/${portal}/login`, {
        headers: { "X-DentaBook-Request": "1" }, data: {},
      })).status()).toBe(404);
    }
    const root = await request.get(origins.admin + "/", { maxRedirects: 0 });
    expect(root.status()).toBe(302);
    expect(root.headers().location).toBe("/admin/sign-in");
    expect((await request.get(origins.admin + "/index.html")).status()).toBe(404);
  });

  test("live portal journeys preserve their origin and work on phones, tablets, and desktop", async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const width of [390, 320, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      for (const [portal, origin] of Object.entries(origins)) {
        for (const path of paths[portal]) {
          const response = await page.goto(origin + path);
          expect(response.status()).toBe(200);
          expect(response.headers()["content-security-policy"]).toContain("script-src 'self'");
          await expect(page.locator("main h1")).toBeVisible();
          await page.waitForLoadState("networkidle");
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${portal} ${path} at ${width}px`).toBe(true);
          for (const input of await page.locator("input:not([type=checkbox]), select, textarea").all()) {
            expect(await input.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
          }
          for (const button of await page.locator(".button:visible, .menu-button:visible, form button:visible, nav a:visible").all()) {
            const box = await button.boundingBox();
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
          if (path === "/") {
            expect(await page.locator('a[href*="/admin"]').count()).toBe(0);
            await expect(page.getByRole("heading", { name: "No clinics listed yet." })).toBeVisible();
            await expect(page.locator('footer a').filter({ hasText: "Clinic sign in" })).toHaveAttribute("href", patientPublicURL + "/clinic/sign-in");
          }
          if (portal === "admin" || path.startsWith("/clinic/")) {
            await expect(page.getByRole("navigation")).toHaveCount(0);
            await expect(page.getByRole("link", { name: "DentaBook home" })).toHaveAttribute("href", patientPublicURL + "/");
          }
          if (width === 390 && ["/", "/clinic/sign-in", "/admin/sign-in"].includes(path)) {
            expect(await page.evaluate(() => {
              const script = document.createElement("script");
              script.textContent = "window.portalInlineExecuted = true";
              document.body.append(script);
              return window.portalInlineExecuted === true;
            })).toBe(false);
            const screenshot = path.startsWith("/clinic/") ? "clinic" : portal;
            await page.screenshot({ path: `test-results/${screenshot}-390.png`, fullPage: true });
          }
        }
      }
    }
    await page.goto(origins.public + "/patient/account");
    await expect(page).toHaveURL(/\/patient\/sign-in\?next=/);
    await page.goto(origins.public + "/clinic");
    await expect(page).toHaveURL(/\/clinic\/sign-in$/);
    await page.goto(origins.admin + "/");
    expect(new URL(page.url()).origin).toBe(new URL(origins.admin).origin);
    await expect(page).toHaveURL(/\/admin\/sign-in$/);
    await page.goto(origins.admin + "/admin");
    await expect(page).toHaveURL(/\/admin\/sign-in$/);
    expect(errors).toEqual([]);
  });
});
