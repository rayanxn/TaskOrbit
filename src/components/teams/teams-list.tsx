import type { TeamOverview } from "@/lib/queries/teams";
import { TeamCard } from "./team-card";

interface TeamsListProps {
  teams: TeamOverview[];
  workspaceSlug: string;
  canManage: boolean;
}

export function TeamsList({ teams, workspaceSlug, canManage }: TeamsListProps) {
  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-medium text-text">No teams yet</h2>
        <p className="mt-1 text-sm text-text-muted">
          Create teams to define ownership across the workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          workspaceSlug={workspaceSlug}
          canManage={canManage}
        />
      ))}
    </div>
  );
}
