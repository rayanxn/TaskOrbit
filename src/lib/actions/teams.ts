"use server";

import { refresh, revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createActivity } from "@/lib/actions/activities";
import type { ActionResponse, Tables } from "@/lib/types";

async function requireTeamManager(workspaceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: "Not authenticated" } as const;
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role === "member") {
    return {
      supabase,
      user,
      error: "Only workspace owners and admins can manage teams",
    } as const;
  }

  return { supabase, user, error: null } as const;
}

async function getTeamContext(teamId: string) {
  const supabase = await createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .maybeSingle();

  return { supabase, team } as const;
}

function parseMemberIds(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  return [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))];
}

export async function createTeam(
  formData: FormData
): Promise<ActionResponse<Tables<"teams">>> {
  const workspaceId = formData.get("workspaceId") as string | null;
  const name = (formData.get("name") as string | null)?.trim();
  const memberIds = parseMemberIds(formData.get("memberIds"));

  if (!workspaceId || !name) {
    return { error: "Workspace and team name are required" };
  }

  const auth = await requireTeamManager(workspaceId);
  if (auth.error) {
    return { error: auth.error };
  }

  const { supabase, user } = auth;

  const { data: team, error } = await supabase
    .from("teams")
    .insert({
      workspace_id: workspaceId,
      name,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  if (memberIds.length > 0) {
    const { data: workspaceMembers } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .in("user_id", memberIds);

    const validMemberIds = (workspaceMembers ?? []).map((member) => member.user_id);
    if (validMemberIds.length > 0) {
      const { error: memberError } = await supabase.from("team_members").insert(
        validMemberIds.map((userId) => ({
          team_id: team.id,
          user_id: userId,
        }))
      );

      if (memberError) {
        await supabase.from("teams").delete().eq("id", team.id);
        return { error: memberError.message };
      }
    }
  }

  try {
    await createActivity({
      supabase,
      workspaceId,
      actorId: user.id,
      action: "created",
      entityType: "team",
      entityId: team.id,
      metadata: {
        name: team.name,
        member_count: memberIds.length,
      },
    });
  } catch {
    // Activity logging should not block the primary operation
  }

  revalidatePath("/", "layout");
  refresh();
  return { data: team };
}

export async function updateTeam(
  teamId: string,
  formData: FormData
): Promise<ActionResponse<Tables<"teams">>> {
  const nextName = (formData.get("name") as string | null)?.trim();
  if (!nextName) {
    return { error: "Team name is required" };
  }

  const context = await getTeamContext(teamId);
  if (!context.team) {
    return { error: "Team not found" };
  }

  const auth = await requireTeamManager(context.team.workspace_id);
  if (auth.error) {
    return { error: auth.error };
  }

  const { supabase, user } = auth;
  const previousName = context.team.name;

  const { data: team, error } = await supabase
    .from("teams")
    .update({ name: nextName })
    .eq("id", teamId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  try {
    await createActivity({
      supabase,
      workspaceId: team.workspace_id,
      actorId: user.id,
      action: "updated",
      entityType: "team",
      entityId: team.id,
      metadata: {
        name: team.name,
        previous_name: previousName,
        changes: { name: team.name },
      },
    });
  } catch {
    // Activity logging should not block the primary operation
  }

  revalidatePath("/", "layout");
  refresh();
  return { data: team };
}

export async function deleteTeam(
  teamId: string
): Promise<ActionResponse<void>> {
  const context = await getTeamContext(teamId);
  if (!context.team) {
    return { error: "Team not found" };
  }

  const auth = await requireTeamManager(context.team.workspace_id);
  if (auth.error) {
    return { error: auth.error };
  }

  const { supabase, user } = auth;

  const { error: unlinkError } = await supabase
    .from("projects")
    .update({ team_id: null })
    .eq("team_id", teamId);

  if (unlinkError) {
    return { error: unlinkError.message };
  }

  await supabase.from("team_members").delete().eq("team_id", teamId);

  const { error } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId);

  if (error) {
    return { error: error.message };
  }

  try {
    await createActivity({
      supabase,
      workspaceId: context.team.workspace_id,
      actorId: user.id,
      action: "deleted",
      entityType: "team",
      entityId: teamId,
      metadata: { name: context.team.name },
    });
  } catch {
    // Activity logging should not block the primary operation
  }

  revalidatePath("/", "layout");
  return { data: undefined };
}

export async function addTeamMember(
  teamId: string,
  userId: string
): Promise<ActionResponse<Tables<"team_members">>> {
  const context = await getTeamContext(teamId);
  if (!context.team) {
    return { error: "Team not found" };
  }

  const auth = await requireTeamManager(context.team.workspace_id);
  if (auth.error) {
    return { error: auth.error };
  }

  const { supabase, user } = auth;

  const { data: workspaceMember } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", context.team.workspace_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!workspaceMember) {
    return { error: "Member is not part of this workspace" };
  }

  const { data: existingMember } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMember) {
    return { data: existingMember };
  }

  const { data: teamMember, error } = await supabase
    .from("team_members")
    .insert({
      team_id: teamId,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();

    await createActivity({
      supabase,
      workspaceId: context.team.workspace_id,
      actorId: user.id,
      action: "added_member",
      entityType: "team",
      entityId: teamId,
      metadata: {
        name: context.team.name,
        member_name: profile?.full_name ?? profile?.email ?? "member",
        member_id: userId,
      },
    });
  } catch {
    // Activity logging should not block the primary operation
  }

  revalidatePath("/", "layout");
  refresh();
  return { data: teamMember };
}

export async function removeTeamMember(
  teamId: string,
  userId: string
): Promise<ActionResponse<void>> {
  const context = await getTeamContext(teamId);
  if (!context.team) {
    return { error: "Team not found" };
  }

  const auth = await requireTeamManager(context.team.workspace_id);
  if (auth.error) {
    return { error: auth.error };
  }

  const { supabase, user } = auth;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", userId);

  if (error) {
    return { error: error.message };
  }

  try {
    await createActivity({
      supabase,
      workspaceId: context.team.workspace_id,
      actorId: user.id,
      action: "removed_member",
      entityType: "team",
      entityId: teamId,
      metadata: {
        name: context.team.name,
        member_name: profile?.full_name ?? profile?.email ?? "member",
        member_id: userId,
      },
    });
  } catch {
    // Activity logging should not block the primary operation
  }

  revalidatePath("/", "layout");
  refresh();
  return { data: undefined };
}
