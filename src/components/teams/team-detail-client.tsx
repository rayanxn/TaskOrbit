"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderKanban, Link2 } from "lucide-react";
import type { TeamScope } from "@/lib/queries/teams";
import { addTeamMember, linkProjectToTeam, removeTeamMember, unlinkProjectFromTeam } from "@/lib/actions/teams";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { IssueList } from "@/components/issues/issue-list";
import { IssueDetailPanel } from "@/components/issues/issue-detail-panel";
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card";
import { getInitials } from "@/lib/utils/format";
import { getIssueClient } from "@/lib/queries/issues-client";
import type { IssueWithDetails } from "@/lib/queries/issues";
import { TeamActionsMenu } from "./team-actions-menu";

type TeamTab = "overview" | "members" | "projects";

interface TeamDetailClientProps {
  team: TeamScope;
  workspaceSlug: string;
  canManage: boolean;
}

export function TeamDetailClient({
  team,
  workspaceSlug,
  canManage,
}: TeamDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TeamTab>("overview");
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<IssueWithDetails | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const allMembers = [
    ...team.members.map((member) => ({
      user_id: member.user_id,
      profile: {
        full_name: member.profile.full_name,
        email: member.profile.email,
      },
    })),
    ...team.availableMembers.map((member) => ({
      user_id: member.user_id,
      profile: {
        full_name: member.profile.full_name,
        email: member.profile.email,
      },
    })),
  ];

  const scopedOpenIssues = team.issues.filter((issue) => issue.status !== "done");
  const otherWorkspaceProjects = team.availableProjects.filter(
    (project) => project.currentTeam?.id !== team.id,
  );

  async function openIssue(issueId: string) {
    const issue =
      team.issues.find((entry) => entry.id === issueId) ??
      (await getIssueClient(issueId));

    if (!issue) return;

    setSelectedIssue(issue);
    setDetailOpen(true);
  }

  async function runAction(
    key: string,
    action: () => Promise<{ error?: string }>
  ) {
    setActionKey(key);
    setActionError(null);

    const result = await action();
    setActionKey(null);

    if (result.error) {
      setActionError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5 rounded-[28px] border border-border-input bg-surface px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                href={`/${workspaceSlug}/teams`}
                className="inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-text"
              >
                <ArrowLeft className="size-4" />
                Back to Teams
              </Link>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-text">
                {team.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-text-muted">
                {team.linkedProjects.length > 0
                  ? "Team workload and activity are scoped to the projects linked below."
                  : "This team is valid but transitional. Link a project to make ownership, workload, and activity meaningful."}
              </p>
            </div>

            {canManage && (
              <TeamActionsMenu
                teamId={team.id}
                teamName={team.name}
                afterDeleteHref={`/${workspaceSlug}/teams`}
              />
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <HeaderStat label="Members" value={String(team.members.length)} />
            <HeaderStat label="Linked Projects" value={String(team.linkedProjects.length)} />
            <HeaderStat label="Active Issues" value={String(team.rollup.activeIssues)} />
            <HeaderStat label="Outside Roster" value={String(team.rollup.outsideRosterActiveIssues)} tone={team.rollup.outsideRosterActiveIssues > 0 ? "warning" : "default"} />
            <HeaderStat label="Unassigned" value={String(team.rollup.unassignedActiveIssues)} tone={team.rollup.unassignedActiveIssues > 0 ? "warning" : "default"} />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TeamTab)}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>

          {actionError && (
            <p className="mt-4 text-sm text-danger">{actionError}</p>
          )}

          <TabsContent value="overview" className="space-y-5">
            {team.linkedProjects.length === 0 ? (
              <Card>
                <CardContent className="p-0">
                  <EmptyState
                    icon={Link2}
                    title="Link a project to activate this team"
                    description="Teams without linked projects keep their roster, but their workload and activity remain intentionally empty."
                    actionLabel={canManage ? "Manage project ownership" : undefined}
                    onAction={canManage ? () => setActiveTab("projects") : undefined}
                    secondaryLabel={canManage ? "Use the Projects tab to assign ownership." : undefined}
                  />
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle>Owned Projects</CardTitle>
                      <CardDescription>
                        The work scope that defines this team.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {team.linkedProjects.map((project) => (
                        <div
                          key={project.id}
                          className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-subtle px-4 py-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: project.color }}
                              />
                              <span className="truncate text-sm font-medium text-text">
                                {project.name}
                              </span>
                            </div>
                            {project.description && (
                              <p className="mt-1 text-sm text-text-muted">
                                {project.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <OverviewPill label="Active" value={project.activeIssueCount} />
                            <OverviewPill label="Total" value={project.totalIssues} />
                            <OverviewPill
                              label="Done"
                              value={project.issueCounts.done}
                            />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Delivery Signals</CardTitle>
                      <CardDescription>
                        Staffing mismatches stay visible instead of being hidden by the roster.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                      <SignalCard
                        title="Inside roster"
                        value={team.rollup.insideRosterActiveIssues}
                        description="Active issues assigned to current team members."
                      />
                      <SignalCard
                        title="Outside roster"
                        value={team.rollup.outsideRosterActiveIssues}
                        description="Active issues in owned projects assigned outside the team."
                        warning={team.rollup.outsideRosterActiveIssues > 0}
                      />
                      <SignalCard
                        title="Unassigned"
                        value={team.rollup.unassignedActiveIssues}
                        description="Owned work with no assignee."
                        warning={team.rollup.unassignedActiveIssues > 0}
                      />
                      <SignalCard
                        title="Done"
                        value={team.rollup.issueCounts.done}
                        description="Completed issues across linked projects."
                      />
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle>Open Work</CardTitle>
                      <CardDescription>
                        Scoped issues from linked projects only.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      {scopedOpenIssues.length > 0 ? (
                        <IssueList
                          issues={scopedOpenIssues}
                          onIssueClick={openIssue}
                        />
                      ) : (
                        <div className="px-6 pb-6 text-sm text-text-muted">
                          No active issues in linked projects.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <RecentActivityCard
                    activities={team.recentActivity}
                    workspaceSlug={workspaceSlug}
                    onIssueClick={openIssue}
                  />
                </div>

                {(team.outsideRosterIssues.length > 0 || team.unassignedIssues.length > 0) && (
                  <div className="grid gap-5 xl:grid-cols-2">
                    <IssueAlertCard
                      title="Outside-Team Assignments"
                      description="These issues belong to the team's projects but are assigned outside the roster."
                      issues={team.outsideRosterIssues}
                      onIssueClick={openIssue}
                    />
                    <IssueAlertCard
                      title="Unassigned Work"
                      description="Owned issues with no assignee."
                      issues={team.unassignedIssues}
                      onIssueClick={openIssue}
                    />
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Roster Workload</CardTitle>
                <CardDescription>
                  Member workload includes issues from this team&apos;s linked projects only.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {team.members.length > 0 ? (
                  team.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-subtle px-4 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(member.profile.full_name, member.profile.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text">
                            {member.profile.full_name ?? member.profile.email}
                          </p>
                          <p className="truncate text-xs text-text-muted">
                            {member.profile.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <OverviewPill label="Active" value={member.workload.activeIssueCount} />
                        <OverviewPill label="Total" value={member.workload.totalIssueCount} />
                        <OverviewPill label="Done" value={member.workload.doneIssueCount} />
                        {canManage && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionKey === `remove-${member.id}`}
                            onClick={() =>
                              runAction(`remove-${member.id}`, () => removeTeamMember(member.id))
                            }
                          >
                            {actionKey === `remove-${member.id}` ? "Removing..." : "Remove"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-muted">No members in this team yet.</p>
                )}
              </CardContent>
            </Card>

            {canManage && (
              <Card>
                <CardHeader>
                <CardTitle>Add Workspace Members</CardTitle>
                <CardDescription>
                  Adding a member updates the roster without changing the team&apos;s project backlog.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {team.availableMembers.length > 0 ? (
                    team.availableMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-subtle px-4 py-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text">
                            {member.profile.full_name ?? member.profile.email}
                          </p>
                          <p className="truncate text-xs text-text-muted">
                            {member.profile.email} · {member.role}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          disabled={actionKey === `add-${member.user_id}`}
                          onClick={() =>
                            runAction(`add-${member.user_id}`, () =>
                              addTeamMember(team.id, member.user_id),
                            )
                          }
                        >
                          {actionKey === `add-${member.user_id}` ? "Adding..." : "Add to team"}
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-text-muted">
                      Every workspace member already belongs to this team or another team workflow is not needed.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid gap-5 xl:grid-cols-2">
              <IssueAlertCard
                title="Outside-Team Assignments"
                description="Project-owned work assigned outside the roster."
                issues={team.outsideRosterIssues}
                onIssueClick={openIssue}
              />
              <IssueAlertCard
                title="Unassigned Issues"
                description="Owned work that still needs a clear assignee."
                issues={team.unassignedIssues}
                onIssueClick={openIssue}
              />
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Owned Projects</CardTitle>
                <CardDescription>
                  This is the canonical source of truth for what the team owns.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {team.linkedProjects.length > 0 ? (
                  team.linkedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-subtle px-4 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          <p className="truncate text-sm font-medium text-text">
                            {project.name}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-text-muted">
                          {project.activeIssueCount} active · {project.totalIssues} total
                          {project.lead && (
                            <span>
                              {" "}· Lead {project.lead.full_name ?? project.lead.email}
                            </span>
                          )}
                        </p>
                      </div>
                      {canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionKey === `unlink-${project.id}`}
                          onClick={() =>
                            runAction(`unlink-${project.id}`, () =>
                              unlinkProjectFromTeam(team.id, project.id),
                            )
                          }
                        >
                          {actionKey === `unlink-${project.id}` ? "Unlinking..." : "Unlink"}
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={FolderKanban}
                    title="No linked projects"
                    description="Link an existing project to make this team operational."
                  />
                )}
              </CardContent>
            </Card>

            {canManage && (
              <Card>
                <CardHeader>
                  <CardTitle>Workspace Projects</CardTitle>
                  <CardDescription>
                    Assign ownership here. Moving a project to this team will remove it from its current owner.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {otherWorkspaceProjects.length > 0 ? (
                    otherWorkspaceProjects.map((project) => (
                      <div
                        key={project.id}
                        className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-subtle px-4 py-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: project.color }}
                            />
                            <p className="truncate text-sm font-medium text-text">
                              {project.name}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-text-muted">
                            {project.currentTeam
                              ? `Currently owned by ${project.currentTeam.name}`
                              : "Currently unassigned"}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          disabled={actionKey === `link-${project.id}`}
                          onClick={() =>
                            runAction(`link-${project.id}`, () =>
                              linkProjectToTeam(team.id, project.id),
                            )
                          }
                        >
                          {actionKey === `link-${project.id}`
                            ? "Updating..."
                            : project.currentTeam
                              ? "Move here"
                              : "Link project"}
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-text-muted">
                      Every active project in the workspace is already owned by this team.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <IssueDetailPanel
        key={selectedIssue?.id ?? "team-issue-detail"}
        issue={selectedIssue}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        members={allMembers}
        onIssueNavigate={openIssue}
        syncUrl={false}
      />
    </>
  );
}

function HeaderStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        tone === "warning"
          ? "border-warning/25 bg-warning/10"
          : "border-border bg-surface-subtle"
      }`}
    >
      <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-text">{value}</p>
    </div>
  );
}

function OverviewPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary">
      <span>{label}</span>
      <span className="font-mono text-text">{value}</span>
    </span>
  );
}

function SignalCard({
  title,
  value,
  description,
  warning = false,
}: {
  title: string;
  value: number;
  description: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        warning ? "border-warning/25 bg-warning/10" : "border-border bg-surface-subtle"
      }`}
    >
      <p className="text-sm font-medium text-text">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-text">{value}</p>
      <p className="mt-2 text-sm text-text-muted">{description}</p>
    </div>
  );
}

function IssueAlertCard({
  title,
  description,
  issues,
  onIssueClick,
}: {
  title: string;
  description: string;
  issues: TeamScope["outsideRosterIssues"];
  onIssueClick: (issueId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {issues.length > 0 ? (
          <IssueList issues={issues} onIssueClick={onIssueClick} />
        ) : (
          <div className="px-6 pb-6 text-sm text-text-muted">Nothing to review here.</div>
        )}
      </CardContent>
    </Card>
  );
}
