import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * End-to-end lifecycle across all three internal roles' concerns, driven through
 * the real UI: a customer submits intake, then a principal admin processes the
 * request, writes an estimate, sends + accepts it, converts it to a project, and
 * tracks a milestone. Serial because each step depends on the prior one.
 */
test.describe.serial("customer intake → estimate → project", () => {
  const stamp = Date.now();
  const customerName = `E2E Tester ${stamp}`;
  const customerEmail = `e2e+${stamp}@example.com`;
  let requestNumber = "";

  test("a customer submits a work request and sees a confirmation", async ({ page }) => {
    await page.goto("/request");
    await page.getByTestId("f-fullName").fill(customerName);
    await page.getByTestId("f-phone").fill("415-555-0133");
    await page.getByTestId("f-email").fill(customerEmail);
    await page.getByTestId("f-street").fill("55 Journey Lane");
    await page.getByTestId("f-city").fill("Testville");
    await page.getByTestId("f-state").fill("CA");
    await page.getByTestId("f-zip").fill("94571");
    // Index 0 is the disabled placeholder; pick the first real category.
    await page.getByTestId("f-categoryId").selectOption({ index: 1 });
    await page.getByTestId("f-description").fill(
      "Automated end-to-end test submission covering the full intake pipeline.",
    );
    await page.getByTestId("f-permission").check();
    await page.getByTestId("f-consent").check();
    await page.getByTestId("submit-request").click();

    await page.waitForURL("**/request/confirmation/**");
    const number = await page.getByTestId("confirmation-number").textContent();
    expect(number).toMatch(/^DCS-\d{4}-\d{6}$/);
    requestNumber = (number ?? "").trim();
  });

  test("an admin finds and opens the new request, changes status, adds a note", async ({ page }) => {
    await signIn(page, "admin@dcs.example");
    await page.goto("/requests");
    await page.getByTestId("requests-search").fill(requestNumber);
    await page.getByTestId("requests-search").press("Enter");
    await page.getByRole("link", { name: requestNumber }).first().click();

    await expect(page.getByRole("heading", { name: new RegExp(requestNumber) })).toBeVisible();

    // Advance status NEW → Reviewing.
    await page.getByTestId("status-select").selectOption("REVIEWING");
    await page.getByTestId("status-submit").click();
    await expect(page.getByTestId("manage-msg")).toBeVisible();

    // Add an internal note; it should appear on the timeline.
    await page.getByTestId("note-body").fill("Reviewed intake; scope looks straightforward.");
    await page.getByTestId("note-submit").click();
    await expect(page.getByTestId("timeline")).toContainText("Internal note added");
  });

  test("the admin drafts, sends, and accepts an estimate", async ({ page }) => {
    await signIn(page, "admin@dcs.example");
    await page.goto("/requests");
    await page.getByTestId("requests-search").fill(requestNumber);
    await page.getByTestId("requests-search").press("Enter");
    await page.getByRole("link", { name: requestNumber }).first().click();

    await page.getByTestId("estimate-new").click();
    await page.getByTestId("estimate-amount").fill("15000.00");
    await page.getByTestId("estimate-submit").click();
    await expect(page.getByTestId("estimate-item")).toBeVisible();

    // Send to customer, then accept.
    await page.getByTestId("estimate-to-SENT").click();
    await expect(page.getByTestId("estimate-msg")).toContainText(/sent/i);
    await page.getByTestId("estimate-to-ACCEPTED").click();
    await expect(page.getByTestId("estimate-msg")).toContainText(/accepted/i);
  });

  test("the admin converts the accepted estimate into a tracked project", async ({ page }) => {
    await signIn(page, "admin@dcs.example");
    await page.goto("/requests");
    await page.getByTestId("requests-search").fill(requestNumber);
    await page.getByTestId("requests-search").press("Enter");
    await page.getByRole("link", { name: requestNumber }).first().click();

    await page.getByTestId("project-name").fill(`Project for ${requestNumber}`);
    await page.getByTestId("project-create").click();
    await expect(page.getByTestId("project-name-display")).toBeVisible();

    // Add a milestone and complete it.
    await page.getByTestId("milestone-title").fill("Permit approval");
    await page.getByTestId("milestone-add").click();
    await expect(page.getByTestId("milestone-item")).toContainText("Permit approval");

    // The project now shows on the cross-project manager view.
    await page.goto("/projects");
    await expect(page.getByTestId("projects-table")).toContainText(`Project for ${requestNumber}`);
  });
});
