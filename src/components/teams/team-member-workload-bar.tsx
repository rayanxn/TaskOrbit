"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { IssueWithDetails } from "@/lib/queries/issues";
import type { TeamMemberWithProfile } from "@/lib/queries/teams";
import { getInitials } from "@/lib/utils/format";
import { STATUS_CONFIG, STATUS_ORDER } from "@/lib/utils/statuses";

interface TeamMemberWorkloadBarProps {
  member: TeamMemberWithProfile;
  issues: IssueWithDetails[];
  trailing?: React.ReactNode;
}

export function TeamMemberWorkloadBar({
  member,
  issues,
  trailing,
}: TeamMemberWorkloadBarProps) {
  const memberIssues = issues.filter((issue) => issue.assignee_id === member.user_id);
  const counts = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = memberIssues.filter((issue) => issue.status === status).length;
      return acc;
    },
    {
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
    }
  );
  const total = memberIssues.length;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <Avatar size="sm">
          <AvatarImage
            src={member.profile.avatar_url ?? undefined}
            alt={member.profile.full_name ?? member.profile.email}
          />
          <AvatarFallback>
            {getInitials(member.profile.full_name, member.profile.email)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">
                {member.profile.full_name ?? member.profile.email}
              </p>
              <p className="truncate text-xs text-text-muted">
                {member.profile.email}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-surface-hover px-2 py-1 text-[11px] font-mono text-text-muted">
                {total} {total === 1 ? "issue" : "issues"}
              </span>
              {trailing}
            </div>
          </div>

          <div className="mt-3">
            <div className="flex h-2 overflow-hidden rounded-full bg-surface-hover">
              {total === 0 ? (
                <div className="h-full w-full bg-surface-hover" />
              ) : (
                STATUS_ORDER.map((status) => {
                  const count = counts[status];
                  if (count === 0) return null;

                  return (
                    <div
                      key={status}
                      className="h-full"
                      style={{
                        width: `${(count / total) * 100}%`,
                        backgroundColor: STATUS_CONFIG[status].color,
                      }}
                    />
                  );
                })
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-mono text-text-muted">
              {STATUS_ORDER.map((status) => (
                <span key={status} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: STATUS_CONFIG[status].color }}
                  />
                  <span>
                    {STATUS_CONFIG[status].label} {counts[status]}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
