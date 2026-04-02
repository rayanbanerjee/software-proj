import { expect, test } from "@playwright/test";

test("documents route renders the workspace shell", async ({ page }) => {
  await page.goto("/documents");
  await expect(page.getByText("Recently touched")).toBeVisible();
  await expect(page.getByRole("link", { name: "Project kickoff" })).toBeVisible();
});
