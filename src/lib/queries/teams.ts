import { createClient } from "@/lib/supabase/server";
import type { IssueStatus, Tables } from "@/lib/types";
import { enrichIssues, type IssueWithDetails } from "@/lib/queries/issues";
import {
  hydrateActivities,
  type ActivityWithActor,
} from "@/lib/queries/activities";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type ProfileSummary = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
};

type TeamIssueSeed = Pick<Tables<"issues">, "id" | "project_id" | "status" | "assignee_id">;

type TeamMemberLoad = {
  totalIssueCount: number;
  activeIssueCount: number;
  doneIssueCount: number;
};

export type TeamMemberWithProfile = {
  id: string;
  user_id: string;
  profile: ProfileSummary;
  workload: TeamMemberLoad;
};

export type TeamProjectSummary = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  team_id: string | null;
  lead: ProfileSummary | null;
  totalIssues: number;
  activeIssueCount: number;
  issueCounts: Record<IssueStatus, number>;
};

export type TeamIssueRollup = {
  totalIssues: number;
  activeIssues: number;
  issueCounts: Record<IssueStatus, number>;
  insideRosterActiveIssues: number;
  outsideRosterActiveIssues: number;
  unassignedActiveIssues: number;
};

export type TeamOverview = {
  id: string;
  name: string;
  workspace_id: string;
  members: TeamMemberWithProfile[];
  linkedProjects: TeamProjectSummary[];
  rollup: TeamIssueRollup;
};

export type TeamProjectOption = {
  id: string;
  name: string;
  color: string;
  currentTeam: {
    id: string;
    name: string;
  } | null;
};

export type TeamMemberOption = {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  profile: ProfileSummary;
};

export type TeamScope = TeamOverview & {
  issues: IssueWithDetails[];
  recentActivity: ActivityWithActor[];
  outsideRosterIssues: IssueWithDetails[];
  unassignedIssues: IssueWithDetails[];
  availableProjects: TeamProjectOption[];
  availableMembers: TeamMemberOption[];
};

function emptyIssueCounts(): Record<IssueStatus, number> {
  return {
    todo: 0,
    in_progress: 0,
    in_review: 0,
    done: 0,
  };
}

function emptyRollup(): TeamIssueRollup {
  return {
    totalIssues: 0,
    activeIssues: 0,
    issueCounts: emptyIssueCounts(),
    insideRosterActiveIssues: 0,
    outsideRosterActiveIssues: 0,
    unassignedActiveIssues: 0,
  };
}

async function getWorkspaceMemberProfiles(
  workspaceId: string,
  supabase: SupabaseClient
): Promise<TeamMemberOption[]> {
  const { data: workspaceMembers } = await supabase
    .from("workspace_members")
    .select("id, user_id, role")
    .eq("workspace_id", workspaceId);

  if (!workspaceMembers || workspaceMembers.length === 0) return [];

  const userIds = [...new Set(workspaceMembers.map((member) => member.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .in("id", userIds);

  const profileMap = new Map<string, ProfileSummary>();
  for (const profile of profiles ?? []) {
    profileMap.set(profile.id, profile);
  }

  return workspaceMembers
    .filter((member) => profileMap.has(member.user_id))
    .map((member) => ({
      ...member,
      profile: profileMap.get(member.user_id)!,
    }));
}

async function getTeamBaseData(workspaceId: string, supabase: SupabaseClient) {
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name");

  if (!teams || teams.length === 0) {
    return {
      teams: [] as Tables<"teams">[],
      teamMembers: [] as Tables<"team_members">[],
      profileMap: new Map<string, ProfileSummary>(),
      projects: [] as Tables<"projects">[],
      issues: [] as TeamIssueSeed[],
    };
  }

  const teamIds = teams.map((team) => team.id);
  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("*")
    .in("team_id", teamIds);

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_archived", false)
    .order("name");

  const projectIds = (projects ?? []).map((project) => project.id);
  const { data: issues } =
    projectIds.length > 0
      ? await supabase
          .from("issues")
          .select("id, project_id, status, assignee_id")
          .in("project_id", projectIds)
      : { data: [] as TeamIssueSeed[] | null };

  const profileIds = [
    ...new Set(
      [
        ...(teamMembers ?? []).map((member) => member.user_id),
        ...(projects ?? []).map((project) => project.lead_id).filter(Boolean),
      ] as string[],
    ),
  ];

  const profileMap = new Map<string, ProfileSummary>();
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .in("id", profileIds);

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, profile);
    }
  }

  return {
    teams,
    teamMembers: teamMembers ?? [],
    profileMap,
    projects: projects ?? [],
    issues: issues ?? [],
  };
}

function buildTeamOverview(
  team: Tables<"teams">,
  teamMembers: Tables<"team_members">[],
  profileMap: Map<string, ProfileSummary>,
  projects: Tables<"projects">[],
  issues: TeamIssueSeed[]
): TeamOverview {
  const memberLoadMap = new Map<string, TeamMemberLoad>();
  const memberUserIds = new Set(teamMembers.map((member) => member.user_id));

  for (const member of teamMembers) {
    memberLoadMap.set(member.user_id, {
      totalIssueCount: 0,
      activeIssueCount: 0,
      doneIssueCount: 0,
    });
  }

  const linkedProjects = projects.filter((project) => project.team_id === team.id);
  const linkedProjectIds = new Set(linkedProjects.map((project) => project.id));
  const issueCountsByProject = new Map<string, Record<IssueStatus, number>>();
  const activeIssueCountByProject = new Map<string, number>();
  const rollup = emptyRollup();

  for (const issue of issues) {
    if (!linkedProjectIds.has(issue.project_id)) continue;

    if (!issueCountsByProject.has(issue.project_id)) {
      issueCountsByProject.set(issue.project_id, emptyIssueCounts());
      activeIssueCountByProject.set(issue.project_id, 0);
    }

    rollup.totalIssues += 1;
    rollup.issueCounts[issue.status as IssueStatus] += 1;
    issueCountsByProject.get(issue.project_id)![issue.status as IssueStatus] += 1;

    const isActive = issue.status !== "done";
    if (isActive) {
      rollup.activeIssues += 1;
      activeIssueCountByProject.set(
        issue.project_id,
        (activeIssueCountByProject.get(issue.project_id) ?? 0) + 1,
      );

      if (!issue.assignee_id) {
        rollup.unassignedActiveIssues += 1;
      } else if (memberUserIds.has(issue.assignee_id)) {
        rollup.insideRosterActiveIssues += 1;
      } else {
        rollup.outsideRosterActiveIssues += 1;
      }
    }

    if (issue.assignee_id && memberUserIds.has(issue.assignee_id)) {
      const memberLoad = memberLoadMap.get(issue.assignee_id);
      if (!memberLoad) continue;

      memberLoad.totalIssueCount += 1;
      if (isActive) {
        memberLoad.activeIssueCount += 1;
      } else {
        memberLoad.doneIssueCount += 1;
      }
    }
  }

  const members = teamMembers
    .map((member) => {
      const profile = profileMap.get(member.user_id);
      if (!profile) return null;

      return {
        id: member.id,
        user_id: member.user_id,
        profile,
        workload: memberLoadMap.get(member.user_id) ?? {
          totalIssueCount: 0,
          activeIssueCount: 0,
          doneIssueCount: 0,
        },
      };
    })
    .filter((member): member is TeamMemberWithProfile => Boolean(member))
    .sort((left, right) => {
      if (right.workload.activeIssueCount !== left.workload.activeIssueCount) {
        return right.workload.activeIssueCount - left.workload.activeIssueCount;
      }

      const leftName = left.profile.full_name ?? left.profile.email;
      const rightName = right.profile.full_name ?? right.profile.email;
      return leftName.localeCompare(rightName);
    });

  return {
    id: team.id,
    name: team.name,
    workspace_id: team.workspace_id,
    members,
    linkedProjects: linkedProjects.map((project) => ({
      id: project.id,
      name: project.name,
      color: project.color,
      description: project.description,
      team_id: project.team_id,
      lead: project.lead_id ? profileMap.get(project.lead_id) ?? null : null,
      totalIssues: Object.values(issueCountsByProject.get(project.id) ?? emptyIssueCounts()).reduce(
        (sum, count) => sum + count,
        0,
      ),
      activeIssueCount: activeIssueCountByProject.get(project.id) ?? 0,
      issueCounts: issueCountsByProject.get(project.id) ?? emptyIssueCounts(),
    })),
    rollup,
  };
}

async function getTeamActivity(
  workspaceId: string,
  teamId: string,
  linkedProjectIds: string[],
  issueIds: string[],
  supabase: SupabaseClient
): Promise<ActivityWithActor[]> {
  const { data: activities } = await supabase
    .from("activities")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(80);

  if (!activities || activities.length === 0) return [];

  const linkedProjectIdSet = new Set(linkedProjectIds);
  const issueIdSet = new Set(issueIds);
  const filtered = activities.filter((activity) => {
    const meta = activity.metadata as Record<string, unknown> | null;

    if (activity.entity_type === "team") {
      return activity.entity_id === teamId;
    }

    if (activity.entity_type === "project") {
      return linkedProjectIdSet.has(activity.entity_id);
    }

    if (activity.entity_type === "issue") {
      return (
        issueIdSet.has(activity.entity_id) ||
        (typeof meta?.project_id === "string" &&
          linkedProjectIdSet.has(meta.project_id))
      );
    }

    if (activity.entity_type === "sprint") {
      return (
        typeof meta?.project_id === "string" &&
        linkedProjectIdSet.has(meta.project_id)
      );
    }

    return false;
  });

  return hydrateActivities(filtered.slice(0, 12), supabase);
}

export async function getTeamsOverview(
  workspaceId: string
): Promise<TeamOverview[]> {
  const supabase = await createClient();
  const { teams, teamMembers, profileMap, projects, issues } =
    await getTeamBaseData(workspaceId, supabase);

  if (teams.length === 0) return [];

  const membersByTeam = new Map<string, Tables<"team_members">[]>();
  for (const member of teamMembers) {
    if (!membersByTeam.has(member.team_id)) {
      membersByTeam.set(member.team_id, []);
    }
    membersByTeam.get(member.team_id)!.push(member);
  }

  return teams.map((team) =>
    buildTeamOverview(
      team,
      membersByTeam.get(team.id) ?? [],
      profileMap,
      projects,
      issues,
    ),
  );
}

export async function getTeamScope(
  workspaceId: string,
  teamId: string
): Promise<TeamScope | null> {
  const supabase = await createClient();
  const { teams, teamMembers, profileMap, projects, issues } =
    await getTeamBaseData(workspaceId, supabase);

  const team = teams.find((entry) => entry.id === teamId);
  if (!team) return null;

  const overview = buildTeamOverview(
    team,
    teamMembers.filter((member) => member.team_id === teamId),
    profileMap,
    projects,
    issues,
  );

  const linkedProjectIds = overview.linkedProjects.map((project) => project.id);
  const rawScopedIssues =
    linkedProjectIds.length > 0
      ? (
          await supabase
            .from("issues")
            .select("*")
            .in("project_id", linkedProjectIds)
            .order("sort_order", { ascending: true })
        ).data ?? []
      : [];

  const scopedIssues = await enrichIssues(rawScopedIssues, supabase);
  const teamMemberIds = new Set(overview.members.map((member) => member.user_id));
  const outsideRosterIssues = scopedIssues.filter(
    (issue) =>
      issue.status !== "done" &&
      issue.assignee_id &&
      !teamMemberIds.has(issue.assignee_id),
  );
  const unassignedIssues = scopedIssues.filter(
    (issue) => issue.status !== "done" && !issue.assignee_id,
  );

  const [recentActivity, workspaceMembers] = await Promise.all([
    getTeamActivity(
      workspaceId,
      teamId,
      linkedProjectIds,
      scopedIssues.map((issue) => issue.id),
      supabase,
    ),
    getWorkspaceMemberProfiles(workspaceId, supabase),
  ]);

  const availableProjects = projects.map((project) => {
    const currentTeam =
      project.team_id != null
        ? teams.find((entry) => entry.id === project.team_id) ?? null
        : null;

    return {
      id: project.id,
      name: project.name,
      color: project.color,
      currentTeam: currentTeam
        ? { id: currentTeam.id, name: currentTeam.name }
        : null,
    };
  });

  const availableMembers = workspaceMembers
    .filter((member) => !teamMemberIds.has(member.user_id))
    .sort((left, right) => {
      const leftName = left.profile.full_name ?? left.profile.email;
      const rightName = right.profile.full_name ?? right.profile.email;
      return leftName.localeCompare(rightName);
    });

  return {
    ...overview,
    issues: scopedIssues,
    recentActivity,
    outsideRosterIssues,
    unassignedIssues,
    availableProjects,
    availableMembers,
  };
}
