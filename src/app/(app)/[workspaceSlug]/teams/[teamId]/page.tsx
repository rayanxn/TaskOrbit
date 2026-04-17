import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { TeamDetailClient } from "@/components/teams/team-detail-client";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getTeamScope } from "@/lib/queries/teams";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; teamId: string }>;
}) {
  const { workspaceSlug, teamId } = await params;
  const workspaceResult = await getWorkspaceBySlug(workspaceSlug);

  if (!workspaceResult?.workspace) {
    notFound();
  }

  const team = await getTeamScope(workspaceResult.workspace.id, teamId);
  if (!team) {
    notFound();
  }

  const canManage =
    workspaceResult.role === "owner" || workspaceResult.role === "admin";

  return (
    <div className="flex flex-col gap-5 px-8 py-6">
      <Breadcrumb
        workspaceName={workspaceResult.workspace.name}
        pageName={`Teams / ${team.name}`}
      />
      <TeamDetailClient
        team={team}
        workspaceSlug={workspaceSlug}
        canManage={canManage}
      />
    </div>
  );
}
