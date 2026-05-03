import { notFound } from "next/navigation";
import { getProjectIssues } from "@/lib/queries/issues";
import {
  getProjectById,
  getProjectLabels,
  getProjectSprints,
} from "@/lib/queries/projects";
import { getWorkspaceMembers } from "@/lib/queries/members";
import { getProjectActiveSprintSummary } from "@/lib/queries/sprints";
import { SprintHeader } from "@/components/sprints/sprint-header";
import { TimelineWithDetail } from "./timeline-with-detail";

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}) {
  const { workspaceSlug, projectId } = await params;

  const project = await getProjectById(projectId);
  if (!project) notFound();

  const [issues, labels, sprints, activeSprintSummary, members] =
    await Promise.all([
      getProjectIssues(projectId),
      getProjectLabels(projectId),
      getProjectSprints(projectId),
      getProjectActiveSprintSummary(projectId),
      getWorkspaceMembers(project.workspace_id),
    ]);

  return (
    <div className="flex h-full flex-col">
      {activeSprintSummary && (
        <SprintHeader
          sprint={activeSprintSummary.sprint}
          totalIssues={activeSprintSummary.totalIssues}
          doneIssues={activeSprintSummary.doneIssues}
          totalPoints={activeSprintSummary.totalPoints}
          donePoints={activeSprintSummary.donePoints}
          workspaceSlug={workspaceSlug}
          projectId={projectId}
        />
      )}
      <div className="flex-1">
        <TimelineWithDetail
          initialIssues={issues}
          projectId={projectId}
          members={members}
          sprints={sprints}
          labels={labels}
        />
      </div>
    </div>
  );
}
