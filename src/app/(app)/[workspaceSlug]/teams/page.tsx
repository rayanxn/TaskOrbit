import { notFound } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getTeamsWithMembers } from "@/lib/queries/teams";
import { getWorkspaceMembers } from "@/lib/queries/members";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { TeamsPageClient } from "@/components/teams/teams-page-client";

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const result = await getWorkspaceBySlug(workspaceSlug);
  if (!result?.workspace) notFound();

  const [teams, workspaceMembers] = await Promise.all([
    getTeamsWithMembers(result.workspace.id),
    getWorkspaceMembers(result.workspace.id),
  ]);

  return (
    <div className="flex flex-col py-6 px-8 gap-5">
      <Breadcrumb workspaceName={result.workspace.name} pageName="Teams" />
      <TeamsPageClient
        teams={teams}
        workspaceId={result.workspace.id}
        workspaceSlug={workspaceSlug}
        workspaceMembers={workspaceMembers}
        canManageTeams={result.role !== "member"}
      />
    </div>
  );
}
