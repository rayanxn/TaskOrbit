import BoardsPageClient from "@/components/board/BoardsPageClient";
import { listBoards } from "@/lib/board-queries";
import { createClient } from "@/lib/supabase/server";

export default async function BoardsPage() {
  const supabase = await createClient();
  const boards = await listBoards(supabase);

  return <BoardsPageClient initialBoards={boards} />;
}
