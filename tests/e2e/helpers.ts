import { expect, type Page } from "@playwright/test";

export const DEV_PASSWORD = "Password123!";

/** Sign in through the real credentials form and land on the dashboard. */
export async function signIn(page: Page, email: string, password = DEV_PASSWORD) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill(password);
  await page.getByTestId("signin-submit").click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByTestId("dash-search")).toBeVisible();
}
