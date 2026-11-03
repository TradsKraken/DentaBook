import { expect } from "@playwright/test";
export async function clinicSection(page, label) {
  const nav = page.getByRole("navigation", { name: "Clinic workspace", exact: true });
  await expect(page.locator(".clinic-page-header h1")).toBeVisible();
  if (!(await nav.isVisible())) await page.getByRole("button", { name: "Open clinic navigation", exact: true }).click();
  await nav.getByRole("button", { name: label, exact: true }).click();
  await expect(page.locator(".clinic-page-header h1")).toHaveText(label === "Appointment inbox" ? "Appointments" : label);
}
