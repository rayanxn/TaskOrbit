import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug, getWorkspaceProjects } from "@/lib/queries/workspaces";
import { getUnreadNotificationCount } from "@/lib/queries/notifications";
import { getWorkspaceMembers } from "@/lib/queries/members";
import { WorkspaceProvider } from "@/providers/workspace-provider";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { LayoutShell } from "@/components/layout/layout-shell";
import type { Tables } from "@/lib/types";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const result = await getWorkspaceBySlug(workspaceSlug);

  if (!result?.workspace) {
    notFound();
  }

  const workspace = result.workspace;
  const membership = result;
  const projects = await getWorkspaceProjects(workspace.id);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profilePromise = user
    ? supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
    : null;
  const userWorkspacesPromise = user
    ? supabase
        .from("workspace_members")
        .select("role, workspace:workspaces!inner(id, name, slug)")
        .eq("user_id", user.id)
    : null;

  const [unreadCount, members, profileResult, userWorkspacesResult] = await Promise.all([
    user ? getUnreadNotificationCount(workspace.id, user.id) : 0,
    getWorkspaceMembers(workspace.id),
    profilePromise,
    userWorkspacesPromise,
  ]);

  const profile = profileResult?.data ?? null;
  const userName =
    profile?.full_name?.trim() ||
    (typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim().length > 0
      ? user.user_metadata.full_name.trim()
      : null);
  const userEmail = profile?.email ?? user?.email ?? null;
  const userAvatarUrl = profile?.avatar_url ?? null;
  const initials =
    userName
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ??
    userEmail?.slice(0, 2).toUpperCase() ??
    "U";

  const workspaces = (
    (userWorkspacesResult?.data ?? []) as Array<{
      role: Tables<"workspace_members">["role"];
      workspace: Pick<Tables<"workspaces">, "id" | "name" | "slug"> | null;
    }>
  )
    .flatMap((membership) =>
      membership.workspace
        ? [{ role: membership.role, workspace: membership.workspace }]
        : []
    )
    .sort((a, b) => a.workspace.name.localeCompare(b.workspace.name));

  const memberList = members.map((m) => ({
    user_id: m.user_id,
    profile: { full_name: m.profile.full_name, email: m.profile.email },
  }));

  return (
    <WorkspaceProvider workspace={workspace} membership={membership}>
      <WorkspaceShell
        workspaceSlug={workspace.slug}
        workspaceId={workspace.id}
        userId={user?.id ?? ""}
        projects={projects}
        members={memberList}
      >
        <LayoutShell
          workspaceSlug={workspace.slug}
          sidebarProps={{
            workspaceName: workspace.name,
            workspaceSlug: workspace.slug,
            projects,
            workspaceId: workspace.id,
            userId: user?.id ?? "",
            unreadCount,
          }}
          userInitials={initials}
          userName={userName}
          userEmail={userEmail}
          userAvatarUrl={userAvatarUrl}
          workspaces={workspaces}
        >
          {children}
        </LayoutShell>
      </WorkspaceShell>
    </WorkspaceProvider>
  );
}
