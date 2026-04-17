import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types";
import type { ActivityWithActor } from "@/lib/utils/activities";

export type { ActivityWithActor } from "@/lib/utils/activities";
export { formatActivityAction } from "@/lib/utils/activities";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function hydrateActivities(
  activities: Tables<"activities">[],
  supabase: SupabaseClient
): Promise<ActivityWithActor[]> {
  if (activities.length === 0) return [];

  const actorIds = [...new Set(activities.map((activity) => activity.actor_id))];
  const actorMap = new Map<
    string,
    { id: string; full_name: string | null; email: string; avatar_url: string | null }
  >();

  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .in("id", actorIds);

    for (const profile of profiles ?? []) {
      actorMap.set(profile.id, profile);
    }
  }

  const issueIds = [
    ...new Set(
      activities
        .filter((activity) => activity.entity_type === "issue")
        .map((activity) => activity.entity_id),
    ),
  ];

  const issueProjectMap = new Map<string, string>();
  if (issueIds.length > 0) {
    const { data: issues } = await supabase
      .from("issues")
      .select("id, project_id")
      .in("id", issueIds);

    for (const issue of issues ?? []) {
      issueProjectMap.set(issue.id, issue.project_id);
    }
  }

  const projectIds = [
    ...new Set(
      activities
        .map((activity) => {
          const meta = activity.metadata as Record<string, unknown> | null;
          if (activity.entity_type === "project") return activity.entity_id;
          if (typeof meta?.project_id === "string") return meta.project_id;
          if (activity.entity_type === "issue") {
            return issueProjectMap.get(activity.entity_id) ?? null;
          }
          return null;
        })
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const projectMap = new Map<string, string>();
  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds);

    for (const project of projects ?? []) {
      projectMap.set(project.id, project.name);
    }
  }

  return activities.map((activity) => {
    const meta = activity.metadata as Record<string, unknown> | null;
    const projectId =
      activity.entity_type === "project"
        ? activity.entity_id
        : typeof meta?.project_id === "string"
          ? meta.project_id
          : activity.entity_type === "issue"
            ? issueProjectMap.get(activity.entity_id) ?? null
            : null;

    return {
      ...activity,
      actor: actorMap.get(activity.actor_id) ?? null,
      project_name: projectId ? projectMap.get(projectId) ?? null : null,
    };
  });
}

export async function getRecentActivities(
  workspaceId: string,
  limit: number = 6
): Promise<ActivityWithActor[]> {
  const supabase = await createClient();

  const { data: activities } = await supabase
    .from("activities")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return hydrateActivities(activities ?? [], supabase);
}
