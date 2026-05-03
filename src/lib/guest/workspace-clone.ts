import { randomBytes, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import type { Database, InsertTables, Tables } from "../types";

export const DEFAULT_GUEST_SOURCE_WORKSPACE_SLUG =
  process.env.GUEST_WORKSPACE_SOURCE_SLUG ?? "pw-workspace";

const GUEST_WORKSPACE_SLUG_PREFIX = "guest-workspace";
const GUEST_PERSONA_EMAIL_DOMAIN = "guest.flow.local";
const GUEST_WORKSPACE_LIFETIME_HOURS = 24;
const MAX_SLUG_ATTEMPTS = 8;
const FRESH_GUEST_SOURCE_SLUG = "fresh-start";

type AdminClient = SupabaseClient<Database>;

type CloneMaps = {
  workspaceId: string;
  users: Map<string, string>;
  teams: Map<string, string>;
  projects: Map<string, string>;
  labels: Map<string, string>;
  sprints: Map<string, string>;
  issues: Map<string, string>;
};

export type CloneGuestWorkspaceInput = {
  guestUserId: string;
  sourceWorkspaceSlug?: string;
  sourceWorkspaceId?: string;
  now?: Date;
  admin?: AdminClient;
};

export type CloneGuestWorkspaceResult = {
  workspace: Tables<"workspaces">;
  lifecycle: Tables<"guest_workspaces">;
  sourceWorkspace: Tables<"workspaces">;
  maps: CloneMaps;
};

export type CreateFreshGuestWorkspaceInput = {
  guestUserId: string;
  now?: Date;
  admin?: AdminClient;
};

export type CreateFreshGuestWorkspaceResult = {
  workspace: Tables<"workspaces">;
  lifecycle: Tables<"guest_workspaces">;
};

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function createSlugSuffix() {
  return randomBytes(4).toString("hex");
}

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "23505" ||
    error?.message?.toLowerCase().includes("duplicate") ||
    error?.message?.toLowerCase().includes("unique")
  );
}

function requireData<T>(
  data: T | null,
  error: { message: string } | null,
  message: string,
): T {
  if (error) {
    throw new Error(`${message}: ${error.message}`);
  }

  if (!data) {
    throw new Error(message);
  }

  return data;
}

function mapNullableId(id: string | null, idMap: Map<string, string>) {
  if (!id) return null;
  return idMap.get(id) ?? null;
}

function createGuestPersonaEmail(workspaceSlug: string, index: number) {
  return `persona-${workspaceSlug}-${index + 1}@${GUEST_PERSONA_EMAIL_DOMAIN}`;
}

function createGeneratedPassword() {
  return randomBytes(24).toString("base64url");
}

function getPersonaDisplayName(
  profile: Pick<Tables<"profiles">, "full_name" | "email"> | undefined,
  index: number,
) {
  const fullName = profile?.full_name?.trim();
  if (fullName) return fullName;

  const emailName = profile?.email?.split("@")[0]?.trim();
  if (emailName) return emailName;

  return `Guest Member ${index + 1}`;
}

async function loadSourceWorkspace({
  admin,
  sourceWorkspaceId,
  sourceWorkspaceSlug,
}: {
  admin: AdminClient;
  sourceWorkspaceId?: string;
  sourceWorkspaceSlug: string;
}) {
  const query = admin.from("workspaces").select("*");
  const { data, error } = sourceWorkspaceId
    ? await query.eq("id", sourceWorkspaceId).maybeSingle()
    : await query.eq("slug", sourceWorkspaceSlug).maybeSingle();

  return requireData(
    data,
    error,
    `Unable to load guest source workspace '${sourceWorkspaceId ?? sourceWorkspaceSlug}'`,
  );
}

async function createUniqueGuestWorkspace({
  admin,
  template,
  now,
}: {
  admin: AdminClient;
  template: {
    name: (suffix: string) => string;
    issuePrefix: string;
    issueCounter: number;
    defaultSprintLength: number;
    timezone: string;
  };
  now: Date;
}) {
  const nowIso = now.toISOString();
  let lastError: { message: string } | null = null;

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const suffix = createSlugSuffix();
    const slug = `${GUEST_WORKSPACE_SLUG_PREFIX}-${suffix}`;
    const { data, error } = await admin
      .from("workspaces")
      .insert({
        name: template.name(suffix),
        slug,
        issue_prefix: template.issuePrefix,
        issue_counter: template.issueCounter,
        default_sprint_length: template.defaultSprintLength,
        timezone: template.timezone,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select()
      .single();

    if (!error && data) {
      return data;
    }

    lastError = error;
    if (!isUniqueViolation(error)) {
      break;
    }
  }

  throw new Error(
    `Unable to create a unique guest workspace: ${lastError?.message ?? "unknown error"}`,
  );
}

async function prepareGuestProfile({
  admin,
  guestUserId,
  workspaceSlug,
}: {
  admin: AdminClient;
  guestUserId: string;
  workspaceSlug: string;
}) {
  const { error } = await admin.from("profiles").upsert(
    {
      id: guestUserId,
      full_name: "Guest User",
      email: `${workspaceSlug}@${GUEST_PERSONA_EMAIL_DOMAIN}`,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(`Unable to prepare guest profile: ${error.message}`);
  }
}

async function createGuestLifecycle({
  admin,
  clonedWorkspace,
  sourceWorkspace,
  sourceWorkspaceSlug,
  guestUserId,
  now,
}: {
  admin: AdminClient;
  clonedWorkspace: Tables<"workspaces">;
  sourceWorkspace?: Tables<"workspaces"> | null;
  sourceWorkspaceSlug: string;
  guestUserId: string;
  now: Date;
}) {
  const { data, error } = await admin
    .from("guest_workspaces")
    .insert({
      workspace_id: clonedWorkspace.id,
      workspace_slug: clonedWorkspace.slug,
      source_workspace_id: sourceWorkspace?.id ?? null,
      source_workspace_slug: sourceWorkspace?.slug ?? sourceWorkspaceSlug,
      guest_user_id: guestUserId,
      created_at: now.toISOString(),
      expires_at: addHours(now, GUEST_WORKSPACE_LIFETIME_HOURS).toISOString(),
    })
    .select()
    .single();

  return requireData(data, error, "Unable to create guest lifecycle metadata");
}

async function insertRows<T extends keyof Database["public"]["Tables"]>(
  admin: AdminClient,
  table: T,
  rows: InsertTables<T>[],
  message: string,
) {
  if (rows.length === 0) return [];

  const { data, error } = await admin.from(table).insert(rows as never[]).select();
  return requireData(data, error, message);
}

function uniqueByUserId(rows: InsertTables<"workspace_members">[]) {
  const byUser = new Map<string, InsertTables<"workspace_members">>();

  for (const row of rows) {
    if (!byUser.has(row.user_id) || row.role === "owner") {
      byUser.set(row.user_id, row);
    }
  }

  return [...byUser.values()];
}

async function loadProfilesById(admin: AdminClient, userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, Tables<"profiles">>();
  }

  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .in("id", [...new Set(userIds)]);
  const profiles = requireData(data, error, "Unable to load source profiles");

  return new Map(profiles.map((profile) => [profile.id, profile]));
}

async function createGuestPersonaUsers({
  admin,
  clonedWorkspace,
  sourceMemberships,
  sourceOwnerId,
  profilesById,
  userIdMap,
}: {
  admin: AdminClient;
  clonedWorkspace: Tables<"workspaces">;
  sourceMemberships: Tables<"workspace_members">[];
  sourceOwnerId: string;
  profilesById: Map<string, Tables<"profiles">>;
  userIdMap: Map<string, string>;
}) {
  const createdUserIds: string[] = [];

  for (const membership of sourceMemberships) {
    if (membership.user_id === sourceOwnerId || userIdMap.has(membership.user_id)) {
      continue;
    }

    const sourceProfile = profilesById.get(membership.user_id);
    const email = createGuestPersonaEmail(
      clonedWorkspace.slug,
      createdUserIds.length,
    );
    const fullName = getPersonaDisplayName(sourceProfile, createdUserIds.length);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: createGeneratedPassword(),
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        guest_persona: true,
        guest_workspace_id: clonedWorkspace.id,
        source_user_id: membership.user_id,
      },
    });

    if (error || !data.user) {
      throw new Error(
        `Unable to create guest persona for source user ${membership.user_id}: ${
          error?.message ?? "missing user"
        }`,
      );
    }

    createdUserIds.push(data.user.id);
    userIdMap.set(membership.user_id, data.user.id);

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        avatar_url: sourceProfile?.avatar_url ?? null,
      })
      .eq("id", data.user.id);

    if (profileError) {
      throw new Error(
        `Unable to prepare guest persona profile: ${profileError.message}`,
      );
    }
  }

  return createdUserIds;
}

export async function createFreshGuestWorkspace({
  guestUserId,
  now = new Date(),
  admin = createAdminClient(),
}: CreateFreshGuestWorkspaceInput): Promise<CreateFreshGuestWorkspaceResult> {
  const workspace = await createUniqueGuestWorkspace({
    admin,
    template: {
      name: () => "Fresh Workspace",
      issuePrefix: "FLO",
      issueCounter: 0,
      defaultSprintLength: 14,
      timezone: "UTC",
    },
    now,
  });

  let lifecycle: Tables<"guest_workspaces"> | null = null;

  try {
    await prepareGuestProfile({
      admin,
      guestUserId,
      workspaceSlug: workspace.slug,
    });

    lifecycle = await createGuestLifecycle({
      admin,
      clonedWorkspace: workspace,
      sourceWorkspace: null,
      sourceWorkspaceSlug: FRESH_GUEST_SOURCE_SLUG,
      guestUserId,
      now,
    });

    const { error: membershipError } = await admin
      .from("workspace_members")
      .insert({
        id: randomUUID(),
        workspace_id: workspace.id,
        user_id: guestUserId,
        role: "owner",
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

    if (membershipError) {
      throw new Error(`Unable to create guest workspace owner: ${membershipError.message}`);
    }

    return { workspace, lifecycle };
  } catch (error) {
    if (lifecycle) {
      await admin.from("guest_workspaces").delete().eq("id", lifecycle.id);
    }

    await admin.from("workspaces").delete().eq("id", workspace.id);
    throw error;
  }
}

export async function cloneGuestWorkspace({
  guestUserId,
  sourceWorkspaceSlug = DEFAULT_GUEST_SOURCE_WORKSPACE_SLUG,
  sourceWorkspaceId,
  now = new Date(),
  admin = createAdminClient(),
}: CloneGuestWorkspaceInput): Promise<CloneGuestWorkspaceResult> {
  const sourceWorkspace = await loadSourceWorkspace({
    admin,
    sourceWorkspaceId,
    sourceWorkspaceSlug,
  });

  const clonedWorkspace = await createUniqueGuestWorkspace({
    admin,
    template: {
      name: (suffix) => `Guest Workspace ${suffix.toUpperCase()}`,
      issuePrefix: sourceWorkspace.issue_prefix,
      issueCounter: sourceWorkspace.issue_counter,
      defaultSprintLength: sourceWorkspace.default_sprint_length,
      timezone: sourceWorkspace.timezone,
    },
    now,
  });

  let lifecycle: Tables<"guest_workspaces"> | null = null;
  let createdPersonaUserIds: string[] = [];

  try {
    await prepareGuestProfile({
      admin,
      guestUserId,
      workspaceSlug: clonedWorkspace.slug,
    });
    lifecycle = await createGuestLifecycle({
      admin,
      clonedWorkspace,
      sourceWorkspace,
      sourceWorkspaceSlug: sourceWorkspace.slug,
      guestUserId,
      now,
    });

    const [
      sourceMembershipsResult,
      sourceTeamsResult,
      sourceProjectsResult,
      sourceSprintsResult,
      sourceIssuesResult,
    ] = await Promise.all([
      admin
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", sourceWorkspace.id)
        .order("created_at", { ascending: true }),
      admin
        .from("teams")
        .select("*")
        .eq("workspace_id", sourceWorkspace.id)
        .order("created_at", { ascending: true }),
      admin
        .from("projects")
        .select("*")
        .eq("workspace_id", sourceWorkspace.id)
        .order("created_at", { ascending: true }),
      admin
        .from("sprints")
        .select("*")
        .eq("workspace_id", sourceWorkspace.id)
        .order("created_at", { ascending: true }),
      admin
        .from("issues")
        .select("*")
        .eq("workspace_id", sourceWorkspace.id)
        .order("issue_number", { ascending: true }),
    ]);

    const sourceMemberships = requireData(
      sourceMembershipsResult.data,
      sourceMembershipsResult.error,
      "Unable to load source workspace members",
    );
    const sourceTeams = requireData(
      sourceTeamsResult.data,
      sourceTeamsResult.error,
      "Unable to load source teams",
    );
    const sourceProjects = requireData(
      sourceProjectsResult.data,
      sourceProjectsResult.error,
      "Unable to load source projects",
    );
    const sourceSprints = requireData(
      sourceSprintsResult.data,
      sourceSprintsResult.error,
      "Unable to load source sprints",
    );
    const sourceIssues = requireData(
      sourceIssuesResult.data,
      sourceIssuesResult.error,
      "Unable to load source issues",
    );

    const sourceOwner =
      sourceMemberships.find((membership) => membership.role === "owner") ??
      sourceMemberships[0];

    if (!sourceOwner) {
      throw new Error("Guest source workspace must have at least one member");
    }

    const userIdMap = new Map<string, string>([[sourceOwner.user_id, guestUserId]]);
    const profilesById = await loadProfilesById(
      admin,
      sourceMemberships.map((membership) => membership.user_id),
    );
    createdPersonaUserIds = await createGuestPersonaUsers({
      admin,
      clonedWorkspace,
      sourceMemberships,
      sourceOwnerId: sourceOwner.user_id,
      profilesById,
      userIdMap,
    });

    const mapUserId = (userId: string | null) => {
      if (!userId) return null;
      return userIdMap.get(userId) ?? userId;
    };

    const teamIdMap = new Map<string, string>();
    const projectIdMap = new Map<string, string>();
    const labelIdMap = new Map<string, string>();
    const sprintIdMap = new Map<string, string>();
    const issueIdMap = new Map<string, string>();

    const membershipRows = uniqueByUserId(
      sourceMemberships.map((membership) => {
        const mappedUserId = mapUserId(membership.user_id)!;

        return {
          id: randomUUID(),
          workspace_id: clonedWorkspace.id,
          user_id: mappedUserId,
          role: mappedUserId === guestUserId ? "owner" : membership.role,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        };
      }),
    );

    await insertRows(
      admin,
      "workspace_members",
      membershipRows,
      "Unable to clone workspace members",
    );

    const teamRows: InsertTables<"teams">[] = sourceTeams.map((team) => {
      const id = randomUUID();
      teamIdMap.set(team.id, id);

      return {
        id,
        workspace_id: clonedWorkspace.id,
        name: team.name,
        created_at: team.created_at,
        updated_at: team.updated_at,
      };
    });

    await insertRows(admin, "teams", teamRows, "Unable to clone teams");

    const teamMemberRows: InsertTables<"team_members">[] = [];
    if (sourceTeams.length > 0) {
      const { data: sourceTeamMembers, error: sourceTeamMembersError } = await admin
        .from("team_members")
        .select("*")
        .in(
          "team_id",
          sourceTeams.map((team) => team.id),
        );

      const teamMembers = requireData(
        sourceTeamMembers,
        sourceTeamMembersError,
        "Unable to load source team members",
      );

      for (const teamMember of teamMembers) {
        const teamId = teamIdMap.get(teamMember.team_id);
        if (!teamId) continue;

        teamMemberRows.push({
          id: randomUUID(),
          team_id: teamId,
          user_id: mapUserId(teamMember.user_id)!,
        });
      }
    }

    await insertRows(
      admin,
      "team_members",
      teamMemberRows,
      "Unable to clone team members",
    );

    const projectRows: InsertTables<"projects">[] = sourceProjects.map((project) => {
      const id = randomUUID();
      projectIdMap.set(project.id, id);

      return {
        id,
        workspace_id: clonedWorkspace.id,
        name: project.name,
        description: project.description,
        color: project.color,
        lead_id: mapUserId(project.lead_id),
        team_id: mapNullableId(project.team_id, teamIdMap),
        is_private: project.is_private,
        is_archived: project.is_archived,
        created_at: project.created_at,
        updated_at: project.updated_at,
      };
    });

    await insertRows(admin, "projects", projectRows, "Unable to clone projects");

    for (const membership of sourceMemberships) {
      if (!membership.primary_project_id) continue;

      const mappedProjectId = projectIdMap.get(membership.primary_project_id);
      if (!mappedProjectId) continue;

      const mappedUserId = mapUserId(membership.user_id)!;
      const { error } = await admin
        .from("workspace_members")
        .update({ primary_project_id: mappedProjectId })
        .eq("workspace_id", clonedWorkspace.id)
        .eq("user_id", mappedUserId);

      if (error) {
        throw new Error(`Unable to remap member primary project: ${error.message}`);
      }
    }

    const sourceProjectIds = sourceProjects.map((project) => project.id);
    const { data: labelData, error: labelError } =
      sourceProjectIds.length > 0
        ? await admin.from("labels").select("*").in("project_id", sourceProjectIds)
        : { data: [], error: null };

    const labels = requireData(labelData, labelError, "Unable to load source labels");
    const labelRows: InsertTables<"labels">[] = labels.map((label) => {
      const id = randomUUID();
      labelIdMap.set(label.id, id);

      return {
        id,
        project_id: projectIdMap.get(label.project_id)!,
        name: label.name,
        color: label.color,
      };
    });

    await insertRows(admin, "labels", labelRows, "Unable to clone labels");

    const sprintRows: InsertTables<"sprints">[] = sourceSprints.map((sprint) => {
      const id = randomUUID();
      sprintIdMap.set(sprint.id, id);

      return {
        id,
        workspace_id: clonedWorkspace.id,
        project_id: projectIdMap.get(sprint.project_id)!,
        name: sprint.name,
        goal: sprint.goal,
        status: sprint.status,
        start_date: sprint.start_date,
        end_date: sprint.end_date,
        capacity: sprint.capacity,
        created_at: sprint.created_at,
        updated_at: sprint.updated_at,
      };
    });

    await insertRows(admin, "sprints", sprintRows, "Unable to clone sprints");

    const issueRows: InsertTables<"issues">[] = sourceIssues.map((issue) => {
      const id = randomUUID();
      issueIdMap.set(issue.id, id);

      return {
        id,
        workspace_id: clonedWorkspace.id,
        project_id: projectIdMap.get(issue.project_id)!,
        issue_number: issue.issue_number,
        issue_key: issue.issue_key,
        title: issue.title,
        description: issue.description,
        status: issue.status,
        priority: issue.priority,
        assignee_id: mapUserId(issue.assignee_id),
        parent_id: null,
        sprint_id: mapNullableId(issue.sprint_id, sprintIdMap),
        due_date: issue.due_date,
        story_points: issue.story_points,
        sort_order: issue.sort_order,
        created_by: mapUserId(issue.created_by)!,
        completed_at: issue.completed_at,
        checklist: issue.checklist,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
      };
    });

    await insertRows(admin, "issues", issueRows, "Unable to clone issues");

    for (const issue of sourceIssues) {
      const mappedParentId = mapNullableId(issue.parent_id, issueIdMap);
      if (!mappedParentId) continue;

      const { error } = await admin
        .from("issues")
        .update({ parent_id: mappedParentId })
        .eq("id", issueIdMap.get(issue.id)!);

      if (error) {
        throw new Error(`Unable to remap parent issue: ${error.message}`);
      }
    }

    const sourceIssueIds = sourceIssues.map((issue) => issue.id);
    const { data: issueLabelData, error: issueLabelError } =
      sourceIssueIds.length > 0
        ? await admin.from("issue_labels").select("*").in("issue_id", sourceIssueIds)
        : { data: [], error: null };

    const issueLabels = requireData(
      issueLabelData,
      issueLabelError,
      "Unable to load source issue labels",
    );
    const issueLabelRows: InsertTables<"issue_labels">[] = issueLabels.flatMap(
      (issueLabel) => {
        const issueId = issueIdMap.get(issueLabel.issue_id);
        const labelId = labelIdMap.get(issueLabel.label_id);

        return issueId && labelId ? [{ issue_id: issueId, label_id: labelId }] : [];
      },
    );

    await insertRows(
      admin,
      "issue_labels",
      issueLabelRows,
      "Unable to clone issue labels",
    );

    return {
      workspace: clonedWorkspace,
      lifecycle,
      sourceWorkspace,
      maps: {
        workspaceId: clonedWorkspace.id,
        users: userIdMap,
        teams: teamIdMap,
        projects: projectIdMap,
        labels: labelIdMap,
        sprints: sprintIdMap,
        issues: issueIdMap,
      },
    };
  } catch (error) {
    if (lifecycle) {
      await admin.from("guest_workspaces").delete().eq("id", lifecycle.id);
    }

    await admin.from("workspaces").delete().eq("id", clonedWorkspace.id);
    await Promise.all(
      createdPersonaUserIds.map((userId) =>
        admin.auth.admin.deleteUser(userId).catch(() => undefined),
      ),
    );
    throw error;
  }
}
