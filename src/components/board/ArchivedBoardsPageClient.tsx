"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { ArrowLeft, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

import { splitBoards } from "@/lib/boards";
import type { Board } from "@/types";
import BoardGrid from "@/components/board/BoardGrid";
import { Button } from "@/components/ui/button";
import { useBoardStore } from "@/store/boardStore";

interface ArchivedBoardsPageClientProps {
  initialBoards: Board[];
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while updating archived boards.";
}

export default function ArchivedBoardsPageClient({
  initialBoards,
}: ArchivedBoardsPageClientProps) {
  const archivedBoards = useBoardStore((state) => state.archivedBoards);
  const isLoading = useBoardStore((state) => state.isLoading);
  const hasHydrated = useBoardStore((state) => state.hasHydrated);
  const error = useBoardStore((state) => state.error);
  const replaceBoardSnapshot = useBoardStore((state) => state.replaceBoardSnapshot);
  const restoreBoard = useBoardStore((state) => state.restoreBoard);
  const deleteBoard = useBoardStore((state) => state.deleteBoard);

  const initialState = useMemo(() => splitBoards(initialBoards), [initialBoards]);

  useEffect(() => {
    replaceBoardSnapshot(initialBoards);
  }, [replaceBoardSnapshot, initialBoards]);

  const handleRestoreBoard = async (boardId: string) => {
    try {
      const board = await restoreBoard(boardId);
      toast.success(`Restored "${board.title}".`);
    } catch (restoreError) {
      toast.error(getErrorMessage(restoreError));
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    try {
      await deleteBoard(boardId);
      toast.success("Board deleted permanently.");
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError));
    }
  };

  const visibleArchivedBoards = hasHydrated ? archivedBoards : initialState.archivedBoards;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Archived boards</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Restore boards when they become active again, or remove them permanently once they are
            no longer needed.
          </p>
        </div>

        <Button variant="outline" asChild>
          <Link href="/boards">
            <ArrowLeft className="size-4" />
            Back to boards
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border bg-card/70 px-4 py-3 text-sm text-muted-foreground sm:px-5">
        <span className="font-medium text-foreground">{visibleArchivedBoards.length}</span>{" "}
        archived boards ready to restore.
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <BoardGrid
        boards={visibleArchivedBoards}
        mode="archived"
        isLoading={isLoading}
        emptyTitle="No archived boards"
        emptyDescription="Archived boards will appear here so you can restore them or delete them permanently."
        emptyAction={{
          label: "Return to boards",
          href: "/boards",
        }}
        onRestore={handleRestoreBoard}
        onDelete={handleDeleteBoard}
      />

      {visibleArchivedBoards.length > 0 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <ArchiveRestore className="size-4" />
          Permanent deletion removes the board and every list and card under it.
        </div>
      ) : null}
    </div>
  );
}
