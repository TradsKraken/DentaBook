import { test, expect } from "@playwright/test";

const publicURL = process.env.PLAYWRIGHT_BASE_URL;
const adminURL = process.env.PLAYWRIGHT_ADMIN_URL;

test("LAN development owner can use every portal through the real APIs", async ({ browser }) => {
  test.skip(process.env.PLAYWRIGHT_DEVELOPMENT !== "1" || !publicURL || !adminURL,
    "Requires an explicitly selected development deployment");
  // Prevent the development credential check from targeting the live hosts.
  for (const origin of [publicURL, adminURL]) {
    const url = new URL(origin);
    expect(url.hostname).toBe("10.10.1.113");
    expect(["3013", "3015"]).toContain(url.port);
    expect(url.protocol).toBe("http:");
  }
  const errors = [];
  for (const width of [390, 320, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    try {
      for (const portal of ["patient", "clinic", "admin"]) {
        const origin = portal === "admin" ? adminURL : publicURL;
        await page.goto(`${origin}/${portal}/sign-in`);
        await page.getByLabel("Email address or username", { exact: true }).fill("admin");
        await page.getByLabel("Password", { exact: true }).fill("admin123");
        await page.getByRole("button", { name: "Sign in", exact: true }).tap();
        await expect(page).toHaveURL(`${origin}${portal === "patient" ? "/patient/account" : `/${portal}`}`);
        await expect(page.locator("main h1")).toBeVisible();
        const me = await context.request.get(origin + "/api/auth/me");
        expect(me.status()).toBe(200);
        const user = (await me.json()).user;
        expect(user.username).toBe("admin");
        expect(user.ownerAccess).toBe(true);
        expect(user.role).toBe({ patient: "patient", clinic: "clinic_staff", admin: "system_admin" }[portal]);
        const cookies = await context.cookies(origin);
        const session = cookies.find(cookie => cookie.name === `dentabook_${portal === "admin" ? "admin" : "public"}_session`);
        expect(session.httpOnly).toBe(true);
        expect(session.sameSite).toBe("Strict");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (portal === "clinic") {
          const options = await context.request.get(publicURL + "/api/workspaces/clinic/options");
          expect(options.status()).toBe(200);
          const records = (await options.json()).clinics;
          if (records.length) {
            await page.getByLabel("Clinic", { exact: true }).selectOption(records[0].id);
            await expect(page.getByRole("heading", { name: records[0].name, exact: true })).toBeVisible();
          } else {
            await expect(page.getByText("No clinics have been registered yet.")).toBeVisible();
          }
          expect((await context.request.get(publicURL + "/api/workspaces/patient/appointments")).status()).toBe(403);
          expect((await context.request.get(publicURL + "/api/workspaces/admin/clinics")).status()).toBe(404);
        }
        if (portal === "admin") {
          expect((await context.request.get(adminURL + "/api/workspaces/admin/clinics")).status()).toBe(200);
          expect((await context.request.get(adminURL + "/api/workspaces/clinic/options")).status()).toBe(404);
        }
        for (const control of await page.locator("input:not([type=checkbox]), select, textarea").all()) {
          expect(await control.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
        }
        for (const button of await page.locator(".button:visible, form button:visible").all()) {
          const box = await button.boundingBox();
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
        if (width === 390) await page.screenshot({ path: `test-results/development-${portal}-390.png`, fullPage: true });
      }
    } finally {
      for (const origin of [publicURL, adminURL]) {
        await context.request.post(origin + "/api/auth/logout", {
          headers: { Origin: origin, "X-DentaBook-Request": "1" }, data: {},
        });
      }
      await context.close();
    }
  }
  expect(errors).toEqual([]);
});
