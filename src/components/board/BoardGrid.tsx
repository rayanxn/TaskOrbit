"use client";

import Link from "next/link";
import { ArchiveX, KanbanSquare } from "lucide-react";

import type { Board, BoardFormValues } from "@/types";
import BoardCard from "@/components/board/BoardCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BoardGridProps {
  boards: Board[];
  mode?: "active" | "archived";
  isLoading?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: EmptyStateAction;
  onEdit?: (boardId: string, values: BoardFormValues) => Promise<void>;
  onArchive?: (boardId: string) => Promise<void>;
  onRestore?: (boardId: string) => Promise<void>;
  onDelete?: (boardId: string) => Promise<void>;
}

function BoardGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm"
        >
          <div className="h-28 animate-pulse bg-muted" />
          <div className="space-y-3 px-4 py-4">
            <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BoardGrid({
  boards,
  mode = "active",
  isLoading = false,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: BoardGridProps) {
  if (isLoading && boards.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoadingSpinner size="sm" />
          Loading boards...
        </div>
        <BoardGridSkeleton />
      </div>
    );
  }

  if (boards.length === 0) {
    const Icon = mode === "archived" ? ArchiveX : KanbanSquare;

    return (
      <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed bg-card/60 px-6 py-16 text-center">
        <div className="rounded-full border bg-background p-4">
          <Icon className="size-8 text-muted-foreground" />
        </div>
        <h2 className="mt-5 text-xl font-semibold">{emptyTitle}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{emptyDescription}</p>
        {emptyAction ? (
          emptyAction.href ? (
            <Button className="mt-6" asChild>
              <Link href={emptyAction.href}>{emptyAction.label}</Link>
            </Button>
          ) : (
            <Button className="mt-6" onClick={emptyAction.onClick}>
              {emptyAction.label}
            </Button>
          )
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {boards.map((board) => (
        <BoardCard
          key={board.id}
          board={board}
          mode={mode}
          onEdit={onEdit}
          onArchive={onArchive}
          onRestore={onRestore}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
