import { test, expect } from "@playwright/test";

const WS = "/pw-workspace";
const SPRINT_GOAL = "Ship dashboard redesign and fix critical auth issues";

test("sprint planning is connected to dashboard, analytics, and project views", async ({
  page,
}) => {
  await page.goto(`${WS}/dashboard`);

  await expect(page.getByText("Sprint 24")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(SPRINT_GOAL)).toBeVisible();
  await expect(page.getByRole("link", { name: "Sprint Planning" })).toBeVisible();

  await page.getByRole("link", { name: "Sprint Planning" }).click();
  await expect(page).toHaveURL(/\/projects\/.+\/sprint-planning\?sprint=/, {
    timeout: 10000,
  });

  await expect(page.getByRole("button", { name: "Complete Sprint" })).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: "Analytics" })).toBeVisible();

  await page.locator("main").getByRole("link", { name: "Analytics" }).click();
  await expect(page).toHaveURL(/\/pw-workspace\/analytics\?tab=sprints&sprint=/, {
    timeout: 10000,
  });

  await expect(page.getByText("Sprint Context")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sprint 24" })).toBeVisible();
  await expect(page.getByText(SPRINT_GOAL)).toBeVisible();
  await expect(page.getByText(/in scope, .* completed/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Project Board" })).toBeVisible();

  await page.locator("main").getByRole("link", { name: "Project Board" }).click();
  await expect(page).toHaveURL(/\/projects\/.+\/board$/, { timeout: 10000 });
  await expect(page.getByText(`Goal: ${SPRINT_GOAL}`)).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: "Analytics" })).toBeVisible();
});
