import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TEST_EMAIL = "playwright@test.flow.dev";
const SWITCH_WORKSPACE_NAME = "Playwright Switch Workspace";
const SWITCH_WORKSPACE_SLUG = "pw-workspace-switch";

let admin: SupabaseClient<Database>;
let testUserId: string | null = null;
let switchWorkspaceId: string | null = null;

test.describe.serial("account menu", () => {
  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Missing Supabase env for account menu test");
    }

    admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: users, error: usersError } = await admin.auth.admin.listUsers();
    if (usersError) {
      throw new Error(`Failed to load test user: ${usersError.message}`);
    }

    testUserId = users.users.find((user) => user.email === TEST_EMAIL)?.id ?? null;
    if (!testUserId) {
      throw new Error(`Test user ${TEST_EMAIL} was not found`);
    }

    const { data: existingWorkspace, error: existingWorkspaceError } = await admin
      .from("workspaces")
      .select("id")
      .eq("slug", SWITCH_WORKSPACE_SLUG)
      .maybeSingle();

    if (existingWorkspaceError) {
      throw new Error(
        `Failed to load switch workspace: ${existingWorkspaceError.message}`
      );
    }

    if (existingWorkspace) {
      switchWorkspaceId = existingWorkspace.id;
    } else {
      const { data: createdWorkspace, error: createWorkspaceError } = await admin
        .from("workspaces")
        .insert({
          name: SWITCH_WORKSPACE_NAME,
          slug: SWITCH_WORKSPACE_SLUG,
        })
        .select("id")
        .single();

      if (createWorkspaceError) {
        throw new Error(
          `Failed to create switch workspace: ${createWorkspaceError.message}`
        );
      }

      switchWorkspaceId = createdWorkspace.id;
    }

    const { error: membershipError } = await admin.from("workspace_members").upsert(
      {
        workspace_id: switchWorkspaceId,
        user_id: testUserId,
        role: "admin",
      },
      { onConflict: "workspace_id,user_id" }
    );

    if (membershipError) {
      throw new Error(
        `Failed to attach test user to switch workspace: ${membershipError.message}`
      );
    }
  });

  test.afterAll(async () => {
    if (!switchWorkspaceId) return;

    if (testUserId) {
      await admin
        .from("workspace_members")
        .delete()
        .eq("workspace_id", switchWorkspaceId)
        .eq("user_id", testUserId);
    }

    await admin.from("workspaces").delete().eq("id", switchWorkspaceId);
  });

  test("shows account details and switches workspaces", async ({ page }) => {
    await page.goto("/pw-workspace/dashboard");
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    await page.getByRole("button", { name: "Open account menu" }).click();

    await expect(page.getByText(TEST_EMAIL)).toBeVisible();
    await expect(page.getByRole("link", { name: /Profile settings/i })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Playwright Switch Workspace/i })
    ).toBeVisible();
    await expect(page.getByText("Current", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: /Playwright Switch Workspace/i }).click();

    await expect(page).toHaveURL(`/${SWITCH_WORKSPACE_SLUG}/dashboard`);
    await expect(page.locator("aside")).toContainText(SWITCH_WORKSPACE_NAME);
  });
});
