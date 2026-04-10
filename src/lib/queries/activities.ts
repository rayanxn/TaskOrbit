import { createClient } from "@/lib/supabase/server";
import type { ActivityWithActor } from "@/lib/utils/activities";
import type { Json } from "@/lib/types";

export type { ActivityWithActor } from "@/lib/utils/activities";
export { formatActivityAction } from "@/lib/utils/activities";

export async function hydrateActivities(
  activities: {
    id: string;
    workspace_id: string;
    actor_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata: Json;
    created_at: string;
  }[],
  supabase: Awaited<ReturnType<typeof createClient>>
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

  const projectIds = [
    ...new Set(
      activities
        .map((activity) => (activity.metadata as Record<string, unknown>)?.project_id)
        .filter(Boolean)
    ),
  ] as string[];
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
    const metadata = activity.metadata as Record<string, unknown>;
    const projectId = metadata?.project_id as string | undefined;

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
