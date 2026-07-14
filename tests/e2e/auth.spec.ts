import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * Authorization is enforced server-side. These negative cases prove that hiding
 * UI is never the control: unauthenticated and under-privileged users are
 * redirected regardless of what links they can see.
 */
test.describe("authorization", () => {
  test("unauthenticated user is redirected from the dashboard to sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/signin/);
  });

  test("unauthenticated user is redirected from a request detail URL", async ({ page }) => {
    await page.goto("/requests/some-id");
    await expect(page).toHaveURL(/\/signin/);
  });

  test("invalid credentials show an error and do not sign in", async ({ page }) => {
    await page.goto("/signin");
    await page.getByTestId("signin-email").fill("admin@dcs.example");
    await page.getByTestId("signin-password").fill("wrong-password");
    await page.getByTestId("signin-submit").click();
    await expect(page.getByTestId("signin-error")).toBeVisible();
    await expect(page).toHaveURL(/\/signin/);
  });

  test("an employee cannot reach the admin area (redirected)", async ({ page }) => {
    await signIn(page, "emp1@dcs.example");
    await page.goto("/admin/users");
    await expect(page).not.toHaveURL(/\/admin/);
  });

  test("an employee cannot reach the cross-project view (redirected to dashboard)", async ({ page }) => {
    await signIn(page, "emp1@dcs.example");
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
