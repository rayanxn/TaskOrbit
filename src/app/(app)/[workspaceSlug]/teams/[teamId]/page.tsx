import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enrichIssues } from "@/lib/queries/issues";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getWorkspaceMembers } from "@/lib/queries/members";
import {
  getTeamActivities,
  getTeamById,
  getTeamIssues,
  getTeamProjects,
} from "@/lib/queries/teams";
import type { IssueWithDetails } from "@/lib/queries/issues";
import { TeamDetailClient } from "@/components/teams/team-detail-client";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; teamId: string }>;
}) {
  const { workspaceSlug, teamId } = await params;

  const result = await getWorkspaceBySlug(workspaceSlug);
  if (!result?.workspace) {
    notFound();
  }

  const workspace = result.workspace;

  const [team, issues, activities, projects, workspaceMembers] = await Promise.all([
    getTeamById(teamId),
    getTeamIssues(teamId),
    getTeamActivities(teamId),
    getTeamProjects(teamId),
    getWorkspaceMembers(workspace.id),
  ]);

  if (!team || team.workspace_id !== workspace.id) {
    notFound();
  }

  const activityIssueMap: Record<string, IssueWithDetails> = {};
  for (const issue of issues) {
    activityIssueMap[issue.id] = issue;
  }

  const missingIssueIds = [
    ...new Set(
      activities
        .filter((activity) => activity.entity_type === "issue" && activity.action !== "deleted")
        .map((activity) => activity.entity_id)
    ),
  ].filter((issueId) => !activityIssueMap[issueId]);

  if (missingIssueIds.length > 0) {
    const supabase = await createClient();
    const { data: rawIssues } = await supabase
      .from("issues")
      .select("*")
      .in("id", missingIssueIds);

    if (rawIssues && rawIssues.length > 0) {
      const enriched = await enrichIssues(rawIssues, supabase);
      for (const issue of enriched) {
        activityIssueMap[issue.id] = issue;
      }
    }
  }

  return (
    <TeamDetailClient
      workspaceName={workspace.name}
      workspaceSlug={workspaceSlug}
      team={team}
      issues={issues}
      activities={activities}
      activityIssueMap={activityIssueMap}
      projects={projects}
      workspaceMembers={workspaceMembers}
      canManageTeams={result.role !== "member"}
    />
  );
}
