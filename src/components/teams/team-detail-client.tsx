"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { IssueDetailPanel } from "@/components/issues/issue-detail-panel";
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card";
import { useIssueFromUrl } from "@/lib/hooks/use-issue-from-url";
import { addTeamMember, deleteTeam, removeTeamMember } from "@/lib/actions/teams";
import type { WorkspaceMember } from "@/lib/queries/members";
import type { IssueWithDetails } from "@/lib/queries/issues";
import type {
  IssueStatusCounts,
  TeamMemberWithProfile,
  TeamProject,
  TeamWithMembers,
} from "@/lib/queries/teams";
import type { ActivityWithActor } from "@/lib/utils/activities";
import { sortMembersByDisplayName } from "@/lib/utils/members";
import { AddTeamMemberCombobox } from "@/components/teams/add-team-member-combobox";
import { TeamFormModal } from "@/components/teams/team-form-modal";
import { TeamMemberWorkloadBar } from "@/components/teams/team-member-workload-bar";

interface TeamDetailClientProps {
  workspaceName: string;
  workspaceSlug: string;
  team: TeamWithMembers;
  issues: IssueWithDetails[];
  activities: ActivityWithActor[];
  activityIssueMap: Record<string, IssueWithDetails>;
  projects: TeamProject[];
  workspaceMembers: WorkspaceMember[];
  canManageTeams: boolean;
}

function emptyIssueCounts(): IssueStatusCounts {
  return {
    todo: 0,
    in_progress: 0,
    in_review: 0,
    done: 0,
  };
}

export function TeamDetailClient({
  workspaceName,
  workspaceSlug,
  team,
  issues,
  activities,
  activityIssueMap,
  projects,
  workspaceMembers,
  canManageTeams,
}: TeamDetailClientProps) {
  const router = useRouter();
  const [currentTeam, setCurrentTeam] = useState(team);
  const [selectedIssue, setSelectedIssue] = useState<IssueWithDetails | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamWithMembers["members"][number] | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCurrentTeam(team);
  }, [team]);

  const openIssue = useCallback((issue: IssueWithDetails) => {
    setSelectedIssue(issue);
    setDetailOpen(true);
  }, []);

  const allIssues = useMemo(
    () => [...issues, ...Object.values(activityIssueMap)],
    [activityIssueMap, issues]
  );

  useIssueFromUrl(allIssues, openIssue);

  const availableMembers = workspaceMembers.filter(
    (member) =>
      !currentTeam.members.some((teamMember) => teamMember.user_id === member.user_id)
  );

  const handleIssueClick = useCallback(
    (id: string) => {
      const issue = issues.find((entry) => entry.id === id) ?? activityIssueMap[id] ?? null;
      if (issue) {
        openIssue(issue);
      }
    },
    [activityIssueMap, issues, openIssue]
  );

  async function handleAddMember(userId: string) {
    const result = await addTeamMember(currentTeam.id, userId);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (!result.data) {
      toast.error("Unable to add member");
      return;
    }

    const workspaceMember = workspaceMembers.find((member) => member.user_id === userId);
    if (workspaceMember) {
      const nextMember: TeamMemberWithProfile = {
        id: result.data.id,
        user_id: workspaceMember.user_id,
        profile: workspaceMember.profile,
        issueCounts: emptyIssueCounts(),
        activeTaskCount: 0,
      };

      setCurrentTeam((existing) => {
        if (existing.members.some((member) => member.user_id === userId)) {
          return existing;
        }

        return {
          ...existing,
          members: sortMembersByDisplayName([...existing.members, nextMember]),
        };
      });
    }

    toast.success("Member added");
    router.refresh();
  }

  async function handleDeleteTeam() {
    setDeletePending(true);
    const result = await deleteTeam(currentTeam.id);
    setDeletePending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setDeleteOpen(false);
    toast.success("Team deleted");
    window.location.assign(`/${workspaceSlug}/teams`);
  }

  function handleRemoveMember() {
    if (!memberToRemove) return;

    startTransition(async () => {
      const removedMember = memberToRemove;
      const result = await removeTeamMember(currentTeam.id, removedMember.user_id);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setCurrentTeam((existing) => ({
        ...existing,
        members: existing.members.filter(
          (member) => member.user_id !== removedMember.user_id
        ),
        issueCounts: {
          todo: Math.max(0, existing.issueCounts.todo - removedMember.issueCounts.todo),
          in_progress: Math.max(
            0,
            existing.issueCounts.in_progress - removedMember.issueCounts.in_progress
          ),
          in_review: Math.max(
            0,
            existing.issueCounts.in_review - removedMember.issueCounts.in_review
          ),
          done: Math.max(0, existing.issueCounts.done - removedMember.issueCounts.done),
        },
        activeIssueCount: Math.max(
          0,
          existing.activeIssueCount - removedMember.activeTaskCount
        ),
      }));
      toast.success("Member removed");
      setMemberToRemove(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-col py-6 px-8 gap-5">
        <div className="text-[13px] py-3 flex items-center gap-2">
          <span className="text-text-secondary">{workspaceName}</span>
          <span className="text-text-muted">/</span>
          <Link
            href={`/${workspaceSlug}/teams`}
            className="text-text-secondary transition-colors hover:text-text"
          >
            Teams
          </Link>
          <span className="text-text-muted">/</span>
          <span className="text-text font-medium">{currentTeam.name}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-text">
              {currentTeam.name}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              {currentTeam.members.length}{" "}
              {currentTeam.members.length === 1 ? "member" : "members"} ·{" "}
              {currentTeam.activeIssueCount} active{" "}
              {currentTeam.activeIssueCount === 1 ? "issue" : "issues"}
            </p>
          </div>

          {canManageTeams && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Edit Team
              </Button>
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                Delete Team
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <div className="rounded-2xl border border-border bg-surface p-5">
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-text">Member Workload</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    Current distribution of assigned work across the team.
                  </p>
                </div>

                {currentTeam.members.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-text-muted">
                    No members on this team yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentTeam.members.map((member) => (
                      <TeamMemberWorkloadBar
                        key={member.id}
                        member={member}
                        issues={issues}
                      />
                    ))}
                  </div>
                )}
              </div>

              <RecentActivityCard
                activities={activities}
                workspaceSlug={workspaceSlug}
                onIssueClick={handleIssueClick}
                title="Team Activity"
                showInboxLink={false}
              />
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-text">Members</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    Full roster and workload visibility for this team.
                  </p>
                </div>
                {canManageTeams && (
                  <AddTeamMemberCombobox
                    members={availableMembers}
                    disabled={isPending}
                    onSelect={handleAddMember}
                  />
                )}
              </div>

              {currentTeam.members.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-text-muted">
                  Add workspace members to start collaborating as a team.
                </div>
              ) : (
                <div className="space-y-3">
                  {currentTeam.members.map((member) => (
                    <TeamMemberWorkloadBar
                      key={member.id}
                      member={member}
                      issues={issues}
                      trailing={
                        canManageTeams ? (
                          <button
                            type="button"
                            onClick={() => setMemberToRemove(member)}
                            aria-label={`Remove ${member.profile.email}`}
                            className="text-xs font-medium text-text-muted transition-colors hover:text-danger"
                          >
                            Remove
                          </button>
                        ) : null
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="projects" className="mt-6">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-text">Projects</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Projects currently linked to this team.
                </p>
              </div>

              {projects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-text-muted">
                  This team does not have any linked projects yet. Associate a team when
                  creating a project or update the project settings later.
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/${workspaceSlug}/projects/${project.id}/board`}
                      className="flex items-center justify-between rounded-xl border border-border px-4 py-3 transition-colors hover:bg-surface-hover"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text">
                            {project.name}
                          </p>
                          {project.description && (
                            <p className="truncate text-xs text-text-muted">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-medium text-text-secondary">
                        Open board
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <IssueDetailPanel
        issue={selectedIssue}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        members={workspaceMembers}
      />

      <TeamFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        team={currentTeam}
        onSuccess={({ team: updatedTeam }) => {
          setCurrentTeam((existing) => ({
            ...existing,
            ...updatedTeam,
          }));
        }}
      />

      <DeleteConfirmationModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete team?"
        description={`Projects linked to ${currentTeam.name} will be preserved and unlinked from the team.`}
        onConfirm={handleDeleteTeam}
        loading={deletePending}
        confirmLabel="Delete Team"
      />

      <DeleteConfirmationModal
        open={!!memberToRemove}
        onOpenChange={(open) => {
          if (!open) {
            setMemberToRemove(null);
          }
        }}
        title="Remove team member?"
        description={`${memberToRemove?.profile.full_name ?? memberToRemove?.profile.email ?? "This member"} will be removed from ${currentTeam.name}.`}
        onConfirm={handleRemoveMember}
        loading={isPending}
        confirmLabel="Remove Member"
      />
    </>
  );
}
