import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

/** Principal-admin can reach the management surfaces and see seeded data. */
test.describe("principal admin area", () => {
  test("admin can view users and add a project category", async ({ page }) => {
    await signIn(page, "admin@dcs.example");

    await page.goto("/admin/users");
    await expect(page.getByTestId("user-row-admin@dcs.example")).toBeVisible();
    await expect(page.getByTestId("user-row-emp1@dcs.example")).toBeVisible();

    await page.goto("/admin/categories");
    const newCategory = `E2E Category ${Date.now()}`;
    await page.getByTestId("category-name").fill(newCategory);
    await page.getByTestId("category-submit").click();
    await expect(page.getByTestId("categories-msg")).toBeVisible();
    await expect(page.getByRole("cell", { name: newCategory })).toBeVisible();
  });
});
