import ArchivedBoardsPageClient from "@/components/board/ArchivedBoardsPageClient";
import { listBoards } from "@/lib/board-queries";
import { createClient } from "@/lib/supabase/server";

export default async function ArchivedBoardsPage() {
  const supabase = await createClient();
  const boards = await listBoards(supabase);

  return <ArchivedBoardsPageClient initialBoards={boards} />;
}
