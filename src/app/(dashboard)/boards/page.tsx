import BoardsPageClient from "@/components/board/BoardsPageClient";
import PendingInvitationsBanner from "@/components/board/PendingInvitationsBanner";
import { getPendingInvitationsForUser } from "@/actions/members";
import { listBoards } from "@/lib/board-queries";
import { createClient } from "@/lib/supabase/server";

export default async function BoardsPage() {
  const supabase = await createClient();
  const [boards, pendingInvitations] = await Promise.all([
    listBoards(supabase),
    getPendingInvitationsForUser(),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PendingInvitationsBanner invitations={pendingInvitations} />
      <BoardsPageClient initialBoards={boards} />
    </div>
  );
}
