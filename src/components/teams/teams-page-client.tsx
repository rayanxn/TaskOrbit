"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import type { WorkspaceMember } from "@/lib/queries/members";
import type { IssueStatusCounts, TeamWithMembers } from "@/lib/queries/teams";
import { InviteMemberButton } from "@/components/teams/invite-member-button";
import { TeamFormModal } from "@/components/teams/team-form-modal";
import { TeamsList } from "@/components/teams/teams-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

interface TeamsPageClientProps {
  teams: TeamWithMembers[];
  workspaceId: string;
  workspaceSlug: string;
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

export function TeamsPageClient({
  teams,
  workspaceId,
  workspaceSlug,
  workspaceMembers,
  canManageTeams,
}: TeamsPageClientProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [currentTeams, setCurrentTeams] = useState(teams);

  useEffect(() => {
    setCurrentTeams(teams);
  }, [teams]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-text">
          Teams
        </h1>
        <div className="flex items-center gap-2">
          <InviteMemberButton workspaceId={workspaceId} />
          {canManageTeams && (
            <Button onClick={() => setCreateOpen(true)}>Create Team</Button>
          )}
        </div>
      </div>

      {currentTeams.length > 0 ? (
        <TeamsList
          teams={currentTeams}
          workspaceSlug={workspaceSlug}
          canManageTeams={canManageTeams}
        />
      ) : (
        <EmptyState
          icon={Users}
          title="No teams yet"
          description="Create teams to organize your workspace members."
        />
      )}

      <TeamFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        workspaceMembers={workspaceMembers}
        onSuccess={({ team, members }) => {
          setCurrentTeams((existing) => {
            const nextTeam: TeamWithMembers = {
              ...team,
              members,
              issueCounts: emptyIssueCounts(),
              activeIssueCount: 0,
            };

            return [...existing, nextTeam].sort((a, b) => a.name.localeCompare(b.name));
          });
        }}
      />
    </>
  );
}
