import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getTeamsOverview } from "@/lib/queries/teams";
import { TeamsList } from "@/components/teams/teams-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CreateTeamButton } from "@/components/teams/create-team-button";

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const result = await getWorkspaceBySlug(workspaceSlug);
  if (!result?.workspace) notFound();

  const teams = await getTeamsOverview(result.workspace.id);
  const canManage = result.role === "owner" || result.role === "admin";

  return (
    <div className="flex flex-col py-6 px-8 gap-5">
      <Breadcrumb workspaceName={result.workspace.name} pageName="Teams" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-text">
          Teams
        </h1>
        {canManage && <CreateTeamButton workspaceId={result.workspace.id} />}
      </div>
      {teams.length > 0 ? (
        <TeamsList
          teams={teams}
          workspaceSlug={workspaceSlug}
          canManage={canManage}
        />
      ) : (
        <EmptyState
          icon={Users}
          title="No teams yet"
          description="Create teams to define project ownership and scoped workload."
        />
      )}
    </div>
  );
}
