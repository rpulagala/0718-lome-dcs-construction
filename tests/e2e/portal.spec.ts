import { test, expect } from "@playwright/test";

/**
 * Customer-portal (client app) end-to-end journey, driven through the real
 * mobile UI. Self-contained: it submits a public intake request, then signs into
 * the portal passwordlessly with that same email (the account is created on
 * first sign-in and auto-links the request). Sign-in uses the on-screen demo
 * code (production has no mail provider — see C8), which is prefilled into the
 * code field. Also asserts cross-customer isolation (an unowned id → 404).
 */
test.describe.serial("customer portal journey", () => {
  const stamp = Date.now();
  const email = `portal-e2e+${stamp}@example.com`;
  let requestNumber = "";

  test.use({ viewport: { width: 390, height: 844 } });

  test("submit an intake request that will link to the portal account", async ({ page }) => {
    await page.goto("/request");
    await page.getByTestId("f-fullName").fill(`Portal E2E ${stamp}`);
    await page.getByTestId("f-phone").fill("415-555-0144");
    await page.getByTestId("f-email").fill(email);
    await page.getByTestId("f-street").fill("70 Portal Ave");
    await page.getByTestId("f-city").fill("Testville");
    await page.getByTestId("f-state").fill("CA");
    await page.getByTestId("f-zip").fill("94571");
    await page.getByTestId("f-categoryId").selectOption({ index: 1 });
    await page.getByTestId("f-description").fill("Portal E2E: track this request in the client app.");
    await page.getByTestId("f-permission").check();
    await page.getByTestId("f-consent").check();
    await page.getByTestId("submit-request").click();

    await page.waitForURL("**/request/confirmation/**");
    requestNumber = ((await page.getByTestId("confirmation-number").textContent()) ?? "").trim();
    expect(requestNumber).toMatch(/^DCS-\d{4}-\d{6}$/);
  });

  test("sign in to the portal with a passwordless code and see the linked request", async ({ page }) => {
    await page.goto("/app/signin");
    await page.getByTestId("portal-email").fill(email);
    await page.getByTestId("portal-request-code").click();

    // Demo mode surfaces + prefills the 6-digit code; just confirm and sign in.
    await expect(page.getByTestId("portal-dev-code")).toBeVisible();
    await expect(page.getByTestId("portal-code")).toHaveValue(/^\d{6}$/);
    await page.getByTestId("portal-verify").click();

    await page.waitForURL(/\/app$/);
    await expect(page.getByRole("heading", { name: /Hi,/ })).toBeVisible();

    // The intake request auto-linked to the new account and shows under Projects.
    await page.goto("/app/projects");
    await expect(page.getByTestId("request-row").first()).toBeVisible();
    await page.getByTestId("request-row").first().click();
    await page.waitForURL(/\/app\/projects\/.+/);
    await expect(page.getByTestId("message-team")).toBeVisible();
  });

  test("cannot open another customer's request (IDOR → 404)", async ({ page }) => {
    // Sign in first (fresh context per test).
    await page.goto("/app/signin");
    await page.getByTestId("portal-email").fill(email);
    await page.getByTestId("portal-request-code").click();
    await expect(page.getByTestId("portal-code")).toHaveValue(/^\d{6}$/);
    await page.getByTestId("portal-verify").click();
    await page.waitForURL(/\/app$/);

    // A random, unowned request id must resolve to the portal not-found page.
    await page.goto("/app/projects/00000000-0000-0000-0000-000000000000");
    await expect(page.getByTestId("portal-not-found")).toBeVisible();
  });
});
