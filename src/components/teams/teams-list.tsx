import type { TeamWithMembers } from "@/lib/queries/teams";
import { TeamCard } from "./team-card";

export function TeamsList({
  teams,
  workspaceSlug,
  canManageTeams,
}: {
  teams: TeamWithMembers[];
  workspaceSlug: string;
  canManageTeams: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          workspaceSlug={workspaceSlug}
          canManageTeams={canManageTeams}
        />
      ))}
    </div>
  );
}
