import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/types";

const WS = "/pw-workspace";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let admin: SupabaseClient<Database>;
let workspaceId: string;
let projectId: string;
let issueKey: string;

async function cleanupComment(body: string) {
  const { data: comments } = await admin
    .from("comments")
    .select("id")
    .eq("body", body);

  const commentIds = comments?.map((comment) => comment.id) ?? [];
  if (commentIds.length === 0) return;

  const { data: activities } = await admin
    .from("activities")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("action", "commented")
    .filter("metadata->>comment_preview", "eq", body.slice(0, 100));

  const activityIds = activities?.map((activity) => activity.id) ?? [];
  if (activityIds.length > 0) {
    await admin.from("notifications").delete().in("activity_id", activityIds);
    await admin.from("activities").delete().in("id", activityIds);
  }

  await admin.from("comments").delete().in("id", commentIds);
}

test.describe.serial("comment thread", () => {
  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Missing Supabase env for comment thread test");
    }

    admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: workspace, error: workspaceError } = await admin
      .from("workspaces")
      .select("id")
      .eq("slug", WS.slice(1))
      .single();

    if (workspaceError || !workspace) {
      throw new Error(
        `Failed to load comment test workspace: ${workspaceError?.message ?? "missing"}`
      );
    }

    workspaceId = workspace.id;

    const { data: issue, error: issueError } = await admin
      .from("issues")
      .select("issue_key, project_id")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (issueError || !issue) {
      throw new Error(
        `Failed to load comment test issue: ${issueError?.message ?? "missing"}`
      );
    }

    projectId = issue.project_id;
    issueKey = issue.issue_key;
  });

  test("does not duplicate a newly submitted comment as Unknown", async ({
    page,
  }) => {
    const body = `PW duplicate comment guard ${Date.now()}`;

    try {
      await page.goto(`${WS}/projects/${projectId}/list?issue=${issueKey}`);

      const panel = page.getByRole("dialog", {
        name: new RegExp(`^${issueKey}:`),
      });
      await expect(panel).toBeVisible({ timeout: 10000 });

      await panel
        .getByPlaceholder("Leave a comment... (@ to mention)")
        .fill(body);
      await panel
        .getByPlaceholder("Leave a comment... (@ to mention)")
        .press("Enter");

      await expect(panel.getByText(body)).toHaveCount(1, { timeout: 10000 });

      await page.waitForTimeout(1500);

      await expect(panel.getByText(body)).toHaveCount(1);
      const commentRow = panel.locator(".group", { hasText: body });
      await expect(commentRow).toHaveCount(1);
      await expect(commentRow).not.toContainText("Unknown");
    } finally {
      await cleanupComment(body);
    }
  });
});
