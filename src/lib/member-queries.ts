import type { SupabaseClient } from "@supabase/supabase-js";

import type { BoardInvitation, BoardParticipant } from "@/types";
import type { Database } from "@/types/database";

type BoardOwnerRow = {
  owner_id: string;
  profiles:
    | Database["public"]["Tables"]["profiles"]["Row"]
    | Database["public"]["Tables"]["profiles"]["Row"][]
    | null;
};

type MembershipRow = Database["public"]["Tables"]["board_memberships"]["Row"] & {
  profiles:
    | Database["public"]["Tables"]["profiles"]["Row"]
    | Database["public"]["Tables"]["profiles"]["Row"][]
    | null;
};

function getSingleProfile(
  value:
    | Database["public"]["Tables"]["profiles"]["Row"]
    | Database["public"]["Tables"]["profiles"]["Row"][]
    | null
) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getBoardParticipants(
  supabase: SupabaseClient<Database>,
  boardId: string
): Promise<BoardParticipant[]> {
  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("owner_id, profiles!boards_owner_id_fkey(*)")
    .eq("id", boardId)
    .single();

  if (boardError || !board) {
    return [];
  }

  const ownerProfile = getSingleProfile((board as BoardOwnerRow).profiles);

  if (!ownerProfile) {
    return [];
  }

  const participants: BoardParticipant[] = [
    {
      userId: board.owner_id,
      role: "owner",
      profile: ownerProfile,
    },
  ];

  const { data: memberships } = await supabase
    .from("board_memberships")
    .select("*, profiles(*)")
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });

  for (const membership of (memberships ?? []) as MembershipRow[]) {
    const profile = getSingleProfile(membership.profiles);

    if (!profile) {
      continue;
    }

    participants.push({
      userId: membership.user_id,
      role: membership.role as "admin" | "member",
      profile,
    });
  }

  return participants;
}

export async function getBoardInvitations(
  supabase: SupabaseClient<Database>,
  boardId: string
): Promise<BoardInvitation[]> {
  const { data, error } = await supabase
    .from("board_invitations")
    .select("*")
    .eq("board_id", boardId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []) as BoardInvitation[];
}
