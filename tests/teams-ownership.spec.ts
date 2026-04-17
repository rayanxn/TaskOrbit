import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const WS = "/pw-workspace";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

let engineeringTeamId = "";
let designTeamId = "";
let productTeamId = "";
let designSystemProjectId = "";

test.describe.serial("Teams ownership model", () => {
  test.beforeAll(async () => {
    const { data: workspace } = await admin
      .from("workspaces")
      .select("id")
      .eq("slug", "pw-workspace")
      .single();

    const { data: teams } = await admin
      .from("teams")
      .select("id, name")
      .eq("workspace_id", workspace!.id);

    engineeringTeamId = teams!.find((team) => team.name === "Engineering")!.id;
    designTeamId = teams!.find((team) => team.name === "Design")!.id;
    productTeamId = teams!.find((team) => team.name === "Product")!.id;

    const { data: designSystem } = await admin
      .from("projects")
      .select("id")
      .eq("workspace_id", workspace!.id)
      .eq("name", "Design System")
      .single();

    designSystemProjectId = designSystem!.id;

    await admin
      .from("projects")
      .update({ team_id: designTeamId })
      .eq("id", designSystemProjectId);
  });

  test.afterAll(async () => {
    if (!designSystemProjectId || !designTeamId) return;

    await admin
      .from("projects")
      .update({ team_id: designTeamId })
      .eq("id", designSystemProjectId);
  });

  test("shows empty-team CTA, scoped ownership, and issue drill-in from team activity", async ({
    page,
  }) => {
    await page.goto(`${WS}/teams/${productTeamId}`);

    await expect(
      page.getByRole("heading", { name: "Product", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Link a project to activate this team")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Manage project ownership" }),
    ).toBeVisible();

    await page.goto(`${WS}/teams/${engineeringTeamId}`);

    await expect(
      page.getByRole("heading", { name: "Engineering", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("API Platform").first()).toBeVisible();
    await expect(page.getByText("Frontend v2.4").first()).toBeVisible();
    await expect(page.getByText("Mobile App").first()).toBeVisible();
    const outsideAssignmentsCard = page
      .locator("div")
      .filter({ hasText: "Outside-Team Assignments" })
      .first();
    await expect(outsideAssignmentsCard).toBeVisible();
    await expect(outsideAssignmentsCard).toContainText("Implement sprint completion flow");
    await expect(outsideAssignmentsCard).toContainText("Design mobile navigation");

    await page.getByRole("tab", { name: "Members" }).click();
    const botRow = page
      .locator("div")
      .filter({ hasText: "Playwright Bot" })
      .filter({ hasText: "3" })
      .first();
    await expect(botRow).toBeVisible();

    await page.getByRole("tab", { name: "Overview" }).click();
    await page.getByRole("button", { name: /moved flo-/i }).first().click();
    await expect(page.getByTitle("Copy link (C)")).toBeVisible();
  });

  test("reassigns project ownership from team detail and preserves project-side team editing", async ({
    page,
  }) => {
    await page.goto(`${WS}/teams/${productTeamId}`);
    await page.getByRole("tab", { name: "Projects" }).click();

    await expect(page.getByText("Currently owned by Design").first()).toBeVisible();
    await page.getByRole("button", { name: "Move here" }).nth(1).click();
    await expect(page.getByRole("button", { name: "Unlink" })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText("3 active · 4 total")).toBeVisible();

    await page.goto(`${WS}/projects/${designSystemProjectId}/settings`);

    const teamSelect = page.getByLabel("Team");
    await expect(teamSelect).toHaveValue(productTeamId);

    await teamSelect.selectOption({ value: designTeamId });
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(teamSelect).toHaveValue(designTeamId);

    await page.goto(`${WS}/teams/${productTeamId}`);
    await expect(page.getByText("Link a project to activate this team")).toBeVisible();
  });
});
