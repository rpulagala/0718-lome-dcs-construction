import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

/** The week calendar renders a grid, a color legend, and filters by employee. */
test.describe("week calendar", () => {
  test("shows the grid + legend and filters to one employee", async ({ page }) => {
    await signIn(page, "admin@dcs.example");
    await page.goto("/calendar");

    await expect(page.getByTestId("calendar-grid")).toBeVisible();
    await expect(page.getByTestId("calendar-legend")).toBeVisible();
    await expect(page.getByTestId("legend-all")).toBeVisible();

    // Clicking an employee chip narrows the view (URL carries the assignee).
    const empChip = page.locator('[data-testid^="legend-"]').nth(1);
    await empChip.click();
    await expect(page).toHaveURL(/assigned=/);

    // Week navigation keeps the employee filter.
    await page.getByRole("link", { name: "Next week" }).click();
    await expect(page).toHaveURL(/week=.*assigned=|assigned=.*week=/);
  });
});
