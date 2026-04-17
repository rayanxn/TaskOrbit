import Link from "next/link";
import { ArrowRight, FolderKanban, TriangleAlert, Users } from "lucide-react";
import type { TeamOverview } from "@/lib/queries/teams";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/format";
import { TeamActionsMenu } from "./team-actions-menu";

interface TeamCardProps {
  team: TeamOverview;
  workspaceSlug: string;
  canManage: boolean;
}

export function TeamCard({ team, workspaceSlug, canManage }: TeamCardProps) {
  const href = `/${workspaceSlug}/teams/${team.id}`;
  const accentColor = team.linkedProjects[0]?.color ?? "#9C9B90";
  const memberPreview = team.members.slice(0, 3);
  const remainingProjects = Math.max(team.linkedProjects.length - 3, 0);

  return (
    <Card className="overflow-hidden border-border-input">
      <div className="h-1.5" style={{ backgroundColor: accentColor }} />
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <Link href={href} className="inline-flex items-center gap-2 text-text transition-colors hover:text-primary">
              <span className="text-lg font-semibold tracking-[-0.02em]">
                {team.name}
              </span>
              <ArrowRight className="size-4" />
            </Link>
            <p className="mt-1 text-sm text-text-muted">
              {team.linkedProjects.length > 0
                ? `Ownership scoped to ${team.linkedProjects.length} linked ${team.linkedProjects.length === 1 ? "project" : "projects"}.`
                : "Valid team, no linked projects yet."}
            </p>
          </div>

          {canManage && (
            <TeamActionsMenu
              teamId={team.id}
              teamName={team.name}
              className="-mr-2 -mt-1"
            />
          )}
        </div>

        <Link href={href} className="block px-5 py-5 transition-colors hover:bg-surface-hover/40">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              icon={Users}
              label="Roster"
              value={`${team.members.length} ${team.members.length === 1 ? "member" : "members"}`}
            />
            <Metric
              icon={FolderKanban}
              label="Ownership"
              value={`${team.linkedProjects.length} ${team.linkedProjects.length === 1 ? "project" : "projects"}`}
            />
            <Metric
              icon={TriangleAlert}
              label="Active Work"
              value={`${team.rollup.activeIssues} ${team.rollup.activeIssues === 1 ? "issue" : "issues"}`}
            />
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-text-muted">
              Linked Projects
            </p>
            {team.linkedProjects.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {team.linkedProjects.slice(0, 3).map((project) => (
                  <span
                    key={project.id}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span>{project.name}</span>
                    <span className="text-text-muted">
                      {project.activeIssueCount} active
                    </span>
                  </span>
                ))}
                {remainingProjects > 0 && (
                  <span className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-muted">
                    +{remainingProjects} more
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-text-muted">
                Link a project to give this team a scoped backlog and activity feed.
              </p>
            )}
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1.4fr,1fr]">
            <div className="rounded-2xl border border-border bg-surface-subtle px-4 py-3">
              <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-text-muted">
                Staffing Signals
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <SignalPill
                  label="Inside roster"
                  value={team.rollup.insideRosterActiveIssues}
                />
                <SignalPill
                  label="Outside roster"
                  value={team.rollup.outsideRosterActiveIssues}
                  tone={team.rollup.outsideRosterActiveIssues > 0 ? "warning" : "neutral"}
                />
                <SignalPill
                  label="Unassigned"
                  value={team.rollup.unassignedActiveIssues}
                  tone={team.rollup.unassignedActiveIssues > 0 ? "warning" : "neutral"}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface-subtle px-4 py-3">
              <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-text-muted">
                Member Workload
              </p>
              {memberPreview.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {memberPreview.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar size="sm">
                          <AvatarFallback>
                            {getInitials(member.profile.full_name, member.profile.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm text-text">
                          {member.profile.full_name ?? member.profile.email}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-text-muted">
                        {member.workload.activeIssueCount} active
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-text-muted">
                  No members on the roster yet.
                </p>
              )}
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-subtle px-4 py-3">
      <div className="flex items-center gap-2 text-text-muted">
        <Icon className="size-4" />
        <span className="text-[11px] font-mono uppercase tracking-[0.08em]">
          {label}
        </span>
      </div>
      <p className="mt-3 text-base font-semibold text-text">{value}</p>
    </div>
  );
}

function SignalPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warning";
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
        tone === "warning"
          ? "border-warning/25 bg-warning/10 text-warning"
          : "border-border bg-surface text-text-secondary"
      }`}
    >
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </span>
  );
}
