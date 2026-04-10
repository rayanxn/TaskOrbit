import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const WS = "/pw-workspace";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setCurrentUserRole(role: "owner" | "member") {
  const { data: workspace } = await admin
    .from("workspaces")
    .select("id")
    .eq("slug", "pw-workspace")
    .single();

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", "playwright@test.flow.dev")
    .single();

  if (!workspace || !profile) {
    throw new Error("Missing Playwright workspace or profile");
  }

  const { error } = await admin
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", workspace.id)
    .eq("user_id", profile.id);

  if (error) {
    throw new Error(error.message);
  }
}

test.describe.serial("Teams Collaboration Hub", () => {
  const teamName = `Collab Hub ${Date.now()}`;
  const renamedTeamName = `${teamName} Edited`;

  test("renders overview cards, detail tabs, and issue activity drill-in", async ({
    page,
  }) => {
    await page.goto(`${WS}/teams`);

    await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Team" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Engineering" })).toBeVisible();

    const engineeringCard = page.getByRole("button", { name: "Open Engineering" });
    await engineeringCard.click();

    await expect(page).toHaveURL(/\/pw-workspace\/teams\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name: "Engineering" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Members" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Projects" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Member Workload" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Team Activity" })).toBeVisible();

    await page.getByRole("tab", { name: "Projects" }).click();
    const projectsPanel = page.getByRole("tabpanel", { name: "Projects" });
    await expect(projectsPanel.getByRole("link", { name: /API Platform/i })).toBeVisible();
    await expect(projectsPanel.getByRole("link", { name: /Frontend v2\.4/i })).toBeVisible();
    await expect(projectsPanel.getByRole("link", { name: /Mobile App/i })).toBeVisible();

    await page.getByRole("tab", { name: "Overview" }).click();
    const firstActivity = page
      .getByRole("tabpanel", { name: "Overview" })
      .getByRole("button")
      .first();
    await expect(firstActivity).toBeVisible();

    const activityText = await firstActivity.textContent();
    const issueKey = activityText?.match(/FLO-\d+/)?.[0];

    expect(issueKey).toBeTruthy();
    await firstActivity.click();

    await expect(page).toHaveURL(new RegExp(`issue=${issueKey}`));
    await expect(
      page.getByRole("heading", { name: new RegExp(`${issueKey}:`, "i") })
    ).toBeVisible();

    const optionTexts = await page.locator("select option").allTextContents();
    expect(new Set(optionTexts).size).toBe(optionTexts.length);
  });

  test("supports team create, rename, add/remove members, and delete", async ({
    page,
  }) => {
    await page.goto(`${WS}/teams`);

    await page.getByRole("button", { name: "Create Team" }).click();
    await expect(page.getByRole("heading", { name: "Create Team" })).toBeVisible();

    await page.getByLabel("Team Name").fill(teamName);
    await page.getByLabel("Initial Members").fill("Sarah");
    await page.getByRole("button", { name: /sarah@test\.flow\.dev/i }).click();
    await page.getByLabel("Initial Members").fill("Tom");
    await page.getByRole("button", { name: /tom@test\.flow\.dev/i }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Create Team" }).click();

    const createdCard = page.getByRole("button", { name: `Open ${teamName}` });
    await expect(createdCard).toBeVisible();
    await createdCard.click();

    await expect(page.getByRole("heading", { name: teamName })).toBeVisible();

    await page.getByRole("button", { name: "Edit Team" }).click();
    await expect(page.getByRole("heading", { name: "Edit Team" })).toBeVisible();
    await page.getByLabel("Team Name").fill(renamedTeamName);
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByRole("heading", { name: renamedTeamName })).toBeVisible();

    await page.getByRole("tab", { name: "Members" }).click();
    await expect(page.getByText("sarah@test.flow.dev")).toBeVisible();
    await expect(page.getByText("tom@test.flow.dev")).toBeVisible();

    await page.getByRole("button", { name: "Add member" }).click();
    await page.getByPlaceholder("Search workspace members...").fill("David");
    await page.getByRole("button", { name: /david@test\.flow\.dev/i }).click();
    await expect(page.getByText("david@test.flow.dev")).toBeVisible();

    await page
      .getByRole("button", { name: "Remove sarah@test.flow.dev" })
      .click();
    await page.getByRole("button", { name: "Remove Member" }).click();
    await expect(page.getByText("sarah@test.flow.dev")).not.toBeVisible();

    await page.getByRole("button", { name: "Delete Team" }).click();
    await page.getByRole("button", { name: "Delete Team" }).last().click();

    await page.waitForURL(/\/pw-workspace\/teams$/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();
    await expect(page.getByText(renamedTeamName)).not.toBeVisible();
  });

  test("hides team management controls for workspace members", async ({ page }) => {
    await setCurrentUserRole("member");

    try {
      await page.goto(`${WS}/teams`);
      await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Create Team" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /Manage / })).toHaveCount(0);

      const designCard = page.getByRole("button", { name: "Open Design" });
      await designCard.click();

      await expect(page.getByRole("heading", { name: "Design" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Edit Team" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Delete Team" })).toHaveCount(0);

      await page.getByRole("tab", { name: "Members" }).click();
      await expect(page.getByRole("button", { name: "Add member" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
    } finally {
      await setCurrentUserRole("owner");
    }
  });
});
