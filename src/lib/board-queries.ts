import type { SupabaseClient } from "@supabase/supabase-js";

import type { Board } from "@/types";
import type { Database } from "@/types/database";

export async function listBoards(supabase: SupabaseClient<Database>): Promise<Board[]> {
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as Board[];
}
