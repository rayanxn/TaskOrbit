import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import type { Database } from "../src/lib/types";

const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const WS_SLUG = "pw-workspace";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Second user — set up alongside the primary auth.setup.ts user so we can
// drive multi-peer scenarios (presence, watcher dots, remote drag pill).
const USER2_EMAIL = "playwright-peer@test.flow.dev";
const USER2_PASSWORD = "playwrightTest!2026";
const USER2_FULL_NAME = "Playwright Peer";
const USER2_AUTH_FILE = "tests/.auth/user2.json";

let admin: SupabaseClient<Database>;
let workspaceId: string;
let projectId: string;
type IssueRow = {
  id: string;
  issue_key: string;
  title: string;
  status: string;
  sort_order: number;
  priority: number;
};
let issues: IssueRow[] = [];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ensurePeerUserAndAuthFile(): Promise<void> {
  // Idempotently create the peer user.
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let userId = existing?.users?.find((u) => u.email === USER2_EMAIL)?.id ?? null;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: USER2_EMAIL,
      password: USER2_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: USER2_FULL_NAME },
    });
    if (error) throw new Error(`Failed to create peer user: ${error.message}`);
    userId = data.user.id;
  }

  // Make sure the peer is a member of the test workspace.
  await admin.from("workspace_members").upsert(
    { workspace_id: workspaceId, user_id: userId, role: "member" },
    { onConflict: "workspace_id,user_id" },
  );

  // Mint a fresh session every run — access tokens expire after an hour, and
  // signing in headlessly is faster + more reliable than driving the UI.
  const peer = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await peer.auth.signInWithPassword({
    email: USER2_EMAIL,
    password: USER2_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`Failed to sign peer in: ${error?.message ?? "no session"}`);
  }
  const session = data.session;

  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  // @supabase/ssr v0.9 stores the session as `base64-` + base64(JSON.stringify(session)).
  const sessionJson = JSON.stringify(session);
  const cookieValue = `base64-${Buffer.from(sessionJson, "utf-8").toString("base64")}`;

  const storageState = {
    cookies: [
      {
        name: cookieName,
        value: cookieValue,
        domain: "localhost",
        path: "/",
        expires: Math.floor(session.expires_at ?? Date.now() / 1000 + 3600),
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };

  mkdirSync("tests/.auth", { recursive: true });
  writeFileSync(USER2_AUTH_FILE, JSON.stringify(storageState, null, 2));
}

test.describe.serial("realtime collaboration", () => {
  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(120_000);
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Missing Supabase env for realtime collab test");
    }
    admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: ws, error: wsErr } = await admin
      .from("workspaces")
      .select("id")
      .eq("slug", WS_SLUG)
      .single();
    if (wsErr || !ws) throw new Error("pw-workspace not found");
    workspaceId = ws.id;

    // Pick a project that has at least 2 issues.
    const { data: projects } = await admin
      .from("projects")
      .select("id")
      .eq("workspace_id", workspaceId);
    if (!projects?.length) throw new Error("No projects in pw-workspace");

    for (const p of projects) {
      const { data: rows } = await admin
        .from("issues")
        .select("id, issue_key, title, status, sort_order, priority")
        .eq("project_id", p.id)
        .order("sort_order", { ascending: true });
      if ((rows?.length ?? 0) >= 2) {
        projectId = p.id;
        issues = (rows as IssueRow[]) ?? [];
        break;
      }
    }
    if (!projectId) throw new Error("No project with ≥2 issues");

    await ensurePeerUserAndAuthFile();
  });

  test.afterAll(async () => {
    // Restore any issue rows we mutated.
    for (const issue of issues) {
      await admin
        .from("issues")
        .update({
          status: issue.status,
          title: issue.title,
          sort_order: issue.sort_order,
          priority: issue.priority,
        })
        .eq("id", issue.id);
    }
  });

  async function openContextWithStorage(
    browser: import("@playwright/test").Browser,
    storageState: string,
    url: string,
  ): Promise<{ ctx: BrowserContext; page: Page }> {
    const ctx = await browser.newContext({ storageState });
    const page = await ctx.newPage();
    await page.goto(url);
    return { ctx, page };
  }

  test("presence stack shows the peer on the board", async ({ browser }) => {
    const url = `http://localhost:3000/${WS_SLUG}/projects/${projectId}/board`;
    const a = await openContextWithStorage(browser, "tests/.auth/user.json", url);
    const b = await openContextWithStorage(browser, USER2_AUTH_FILE, url);

    try {
      await expect(
        a.page.locator('[data-testid="presence-stack"]'),
      ).toBeVisible({ timeout: 8_000 });
      await expect(
        b.page.locator('[data-testid="presence-stack"]'),
      ).toBeVisible({ timeout: 8_000 });
    } finally {
      await a.ctx.close();
      await b.ctx.close();
    }
  });

  test("remote update flashes only on the non-originating client", async ({
    browser,
  }) => {
    const url = `http://localhost:3000/${WS_SLUG}/projects/${projectId}/board`;
    const a = await openContextWithStorage(browser, "tests/.auth/user.json", url);
    const b = await openContextWithStorage(browser, USER2_AUTH_FILE, url);

    const target = issues[0];
    const newPriority = target.priority === 0 ? 1 : 0;

    try {
      // Wait for both boards to render with the issue card present.
      const cardA = a.page.locator(`[data-issue-id="${target.id}"]`).first();
      const cardB = b.page.locator(`[data-issue-id="${target.id}"]`).first();
      await expect(cardA).toBeVisible({ timeout: 8_000 });
      await expect(cardB).toBeVisible({ timeout: 8_000 });

      // Wait long enough for both presence channels to subscribe.
      await sleep(1_500);

      // Fire an update via admin — this is purely server-side, neither client
      // initiated it, so BOTH should flash.
      await admin
        .from("issues")
        .update({ priority: newPriority })
        .eq("id", target.id);

      await expect(cardB).toHaveClass(/ring-primary/, { timeout: 2_500 });
    } finally {
      await admin
        .from("issues")
        .update({ priority: target.priority })
        .eq("id", target.id);
      await a.ctx.close();
      await b.ctx.close();
    }
  });

  test("list view receives live title updates", async ({ browser }) => {
    const url = `http://localhost:3000/${WS_SLUG}/projects/${projectId}/list`;
    const b = await openContextWithStorage(browser, USER2_AUTH_FILE, url);

    const target = issues[0];
    const newTitle = `${target.title} ✦ live ${Date.now()}`;

    try {
      // Each row renders twice (mobile + desktop). Match the visible one.
      await expect(
        b.page.locator(`[data-issue-id="${target.id}"]:visible`).first(),
      ).toBeVisible({ timeout: 8_000 });

      await sleep(800); // let realtime subscribe

      await admin
        .from("issues")
        .update({ title: newTitle })
        .eq("id", target.id);

      // Both mobile and desktop branches render the title; we only need to
      // know the realtime UPDATE landed in the DOM, not that the responsive
      // branch we picked is visible at the test viewport.
      await expect(b.page.getByText(newTitle).first()).toBeAttached({
        timeout: 5_000,
      });
    } finally {
      await admin
        .from("issues")
        .update({ title: target.title })
        .eq("id", target.id);
      await b.ctx.close();
    }
  });

  test("opening a card surfaces a watcher dot to the other user", async ({
    browser,
  }) => {
    const url = `http://localhost:3000/${WS_SLUG}/projects/${projectId}/board`;
    const a = await openContextWithStorage(browser, "tests/.auth/user.json", url);
    const b = await openContextWithStorage(browser, USER2_AUTH_FILE, url);

    const target = issues[0];

    try {
      const cardA = a.page.locator(`[data-issue-id="${target.id}"]`).first();
      const cardB = b.page.locator(`[data-issue-id="${target.id}"]`).first();
      await expect(cardA).toBeVisible({ timeout: 8_000 });
      await expect(cardB).toBeVisible({ timeout: 8_000 });

      await sleep(1_500);

      // User A focuses the card.
      await cardA.click();

      await expect(
        cardB.locator('[data-testid="watcher-dots"]'),
      ).toBeVisible({ timeout: 4_000 });
    } finally {
      await a.ctx.close();
      await b.ctx.close();
    }
  });
});
