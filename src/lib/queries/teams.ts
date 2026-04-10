import { createClient } from "@/lib/supabase/server";
import { hydrateActivities } from "@/lib/queries/activities";
import { enrichIssues, type IssueWithDetails } from "@/lib/queries/issues";
import type { ActivityWithActor } from "@/lib/utils/activities";
import type { IssueStatus, Tables } from "@/lib/types";
import { dedupeMembersByUserId, sortMembersByDisplayName } from "@/lib/utils/members";

export type IssueStatusCounts = Record<IssueStatus, number>;

function emptyIssueCounts(): IssueStatusCounts {
  return {
    todo: 0,
    in_progress: 0,
    in_review: 0,
    done: 0,
  };
}

function getActiveIssueCount(counts: IssueStatusCounts) {
  return counts.todo + counts.in_progress + counts.in_review;
}

export type TeamMemberWithProfile = {
  id: string;
  user_id: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  activeTaskCount: number;
  issueCounts: IssueStatusCounts;
};

export type TeamWithMembers = {
  id: string;
  name: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  members: TeamMemberWithProfile[];
  issueCounts: IssueStatusCounts;
  activeIssueCount: number;
};

export type TeamProject = Pick<
  Tables<"projects">,
  "id" | "workspace_id" | "name" | "description" | "color" | "team_id" | "updated_at"
>;

type TeamStatsBundle = {
  membersByTeam: Map<string, TeamMemberWithProfile[]>;
  countsByTeam: Map<string, IssueStatusCounts>;
  activeCountByTeam: Map<string, number>;
};

async function getTeamStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  teamIds: string[]
): Promise<TeamStatsBundle> {
  const { data: rawTeamMembers } = await supabase
    .from("team_members")
    .select("*")
    .in("team_id", teamIds);

  const teamMembers = [...new Map(
    (rawTeamMembers ?? []).map((teamMember) => [
      `${teamMember.team_id}:${teamMember.user_id}`,
      teamMember,
    ])
  ).values()];

  if (teamMembers.length === 0) {
    return {
      membersByTeam: new Map(),
      countsByTeam: new Map(),
      activeCountByTeam: new Map(),
    };
  }

  const userIds = [...new Set(teamMembers.map((teamMember) => teamMember.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .in("id", userIds);

  const profileMap = new Map<
    string,
    { id: string; full_name: string | null; email: string; avatar_url: string | null }
  >();
  for (const profile of profiles ?? []) {
    profileMap.set(profile.id, profile);
  }

  const { data: issues } = await supabase
    .from("issues")
    .select("assignee_id, status")
    .eq("workspace_id", workspaceId)
    .in("assignee_id", userIds);

  const issueCountsByUser = new Map<string, IssueStatusCounts>();
  for (const userId of userIds) {
    issueCountsByUser.set(userId, emptyIssueCounts());
  }

  for (const issue of issues ?? []) {
    if (!issue.assignee_id) continue;

    const counts = issueCountsByUser.get(issue.assignee_id) ?? emptyIssueCounts();
    counts[issue.status as IssueStatus] += 1;
    issueCountsByUser.set(issue.assignee_id, counts);
  }

  const membersByTeam = new Map<string, TeamMemberWithProfile[]>();
  for (const teamMember of teamMembers) {
    const profile = profileMap.get(teamMember.user_id);
    if (!profile) continue;

    const issueCounts = issueCountsByUser.get(teamMember.user_id) ?? emptyIssueCounts();
    const member: TeamMemberWithProfile = {
      id: teamMember.id,
      user_id: teamMember.user_id,
      profile,
      issueCounts,
      activeTaskCount: getActiveIssueCount(issueCounts),
    };

    const currentMembers = membersByTeam.get(teamMember.team_id) ?? [];
    currentMembers.push(member);
    membersByTeam.set(teamMember.team_id, currentMembers);
  }

  const countsByTeam = new Map<string, IssueStatusCounts>();
  const activeCountByTeam = new Map<string, number>();

  for (const [teamId, members] of membersByTeam) {
    const uniqueMembers = sortMembersByDisplayName(dedupeMembersByUserId(members));
    membersByTeam.set(teamId, uniqueMembers);

    const counts = uniqueMembers.reduce<IssueStatusCounts>((acc, member) => {
      acc.todo += member.issueCounts.todo;
      acc.in_progress += member.issueCounts.in_progress;
      acc.in_review += member.issueCounts.in_review;
      acc.done += member.issueCounts.done;
      return acc;
    }, emptyIssueCounts());

    countsByTeam.set(teamId, counts);
    activeCountByTeam.set(teamId, getActiveIssueCount(counts));
  }

  return { membersByTeam, countsByTeam, activeCountByTeam };
}

export async function getTeamsWithMembers(workspaceId: string): Promise<TeamWithMembers[]> {
  const supabase = await createClient();

  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name");

  if (!teams || teams.length === 0) {
    return [];
  }

  const teamIds = teams.map((team) => team.id);
  const { membersByTeam, countsByTeam, activeCountByTeam } = await getTeamStats(
    supabase,
    workspaceId,
    teamIds
  );

  return teams.map((team) => ({
    ...team,
    members: membersByTeam.get(team.id) ?? [],
    issueCounts: countsByTeam.get(team.id) ?? emptyIssueCounts(),
    activeIssueCount: activeCountByTeam.get(team.id) ?? 0,
  }));
}

export async function getTeamById(teamId: string): Promise<TeamWithMembers | null> {
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .maybeSingle();

  if (!team) {
    return null;
  }

  const { membersByTeam, countsByTeam, activeCountByTeam } = await getTeamStats(
    supabase,
    team.workspace_id,
    [team.id]
  );

  return {
    ...team,
    members: membersByTeam.get(team.id) ?? [],
    issueCounts: countsByTeam.get(team.id) ?? emptyIssueCounts(),
    activeIssueCount: activeCountByTeam.get(team.id) ?? 0,
  };
}

export async function getTeamIssues(teamId: string): Promise<IssueWithDetails[]> {
  const supabase = await createClient();
  const team = await getTeamById(teamId);

  if (!team || team.members.length === 0) {
    return [];
  }

  const userIds = team.members.map((member) => member.user_id);
  const { data: issues } = await supabase
    .from("issues")
    .select("*")
    .eq("workspace_id", team.workspace_id)
    .in("assignee_id", userIds)
    .order("updated_at", { ascending: false });

  return enrichIssues(issues ?? [], supabase);
}

export async function getTeamActivities(
  teamId: string,
  limit: number = 8
): Promise<ActivityWithActor[]> {
  const supabase = await createClient();
  const team = await getTeamById(teamId);

  if (!team) {
    return [];
  }

  const userIds = [...new Set(team.members.map((member) => member.user_id))];
  let issueIds: string[] = [];

  if (userIds.length > 0) {
    const { data: issues } = await supabase
      .from("issues")
      .select("id")
      .eq("workspace_id", team.workspace_id)
      .in("assignee_id", userIds);

    issueIds = (issues ?? []).map((issue) => issue.id);
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("team_id", teamId)
    .eq("is_archived", false);

  const projectIds = (projects ?? []).map((project) => project.id);

  const { data: activities } = await supabase
    .from("activities")
    .select("*")
    .eq("workspace_id", team.workspace_id)
    .order("created_at", { ascending: false })
    .limit(100);

  const relevantActivities = (activities ?? [])
    .filter((activity) => {
      if (activity.entity_type === "issue") {
        return issueIds.includes(activity.entity_id);
      }

      if (activity.entity_type === "team") {
        return activity.entity_id === teamId;
      }

      if (activity.entity_type === "project") {
        return projectIds.includes(activity.entity_id);
      }

      return false;
    })
    .slice(0, limit);

  return hydrateActivities(relevantActivities, supabase);
}

export async function getTeamProjects(
  teamId: string
): Promise<TeamProject[]> {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, workspace_id, name, description, color, team_id, updated_at")
    .eq("team_id", teamId)
    .eq("is_archived", false)
    .order("name");

  return projects ?? [];
}
