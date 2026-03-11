"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  Globe,
  Lock,
  MoreHorizontal,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

import { getBoardTitleError } from "@/lib/boards";
import type { Board, BoardParticipant, BoardRole, BoardView } from "@/types";
import BoardMemberAvatars from "@/components/board/BoardMemberAvatars";
import BoardViewSwitcher from "@/components/board/BoardViewSwitcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BoardHeaderProps {
  board: Board;
  participants: BoardParticipant[];
  onlineUserIds?: string[];
  currentUserRole: BoardRole | null;
  currentView: BoardView;
  onViewChange: (view: BoardView) => void;
  onUpdateTitle: (title: string) => Promise<void>;
  onOpenShare: () => void;
  onOpenBoardMenu: () => void;
}

function BoardToolbarPill({
  className,
  children,
}: Readonly<{ className?: string; children: React.ReactNode }>) {
  return (
    <div
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full bg-black/14 px-3 text-sm font-medium text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export default function BoardHeader({
  board,
  participants,
  onlineUserIds = [],
  currentUserRole,
  currentView,
  onViewChange,
  onUpdateTitle,
  onOpenShare,
  onOpenBoardMenu,
}: BoardHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(board.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const canEditTitle = currentUserRole === "owner" || currentUserRole === "admin";
  const visibility = board.visibility === "public" ? "public" : "private";

  const startEditing = () => {
    if (!canEditTitle) {
      return;
    }

    setEditValue(board.title);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const saveTitle = async () => {
    const trimmed = editValue.trim();

    if (!trimmed || trimmed === board.title) {
      setIsEditing(false);
      return;
    }

    const error = getBoardTitleError(trimmed);

    if (error) {
      toast.error(error);
      setIsEditing(false);
      return;
    }

    try {
      await onUpdateTitle(trimmed);
    } finally {
      setIsEditing(false);
    }
  };

  const cancelEditing = () => {
    setEditValue(board.title);
    setIsEditing(false);
  };

  return (
    <div className="sticky top-0 z-30 border-b border-white/12 bg-slate-950/28 shadow-[0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Link
            href="/boards"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-black/14 px-3 text-sm font-medium text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-black/20 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Boards</span>
          </Link>

          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(event) => setEditValue(event.target.value)}
              onBlur={() => void saveTitle()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void saveTitle();
                } else if (event.key === "Escape") {
                  cancelEditing();
                }
              }}
              className="h-10 max-w-full rounded-lg border border-white/25 bg-white/14 px-3 text-xl font-semibold text-white outline-none backdrop-blur focus:ring-2 focus:ring-white/40 sm:max-w-md sm:text-2xl"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={startEditing}
              disabled={!canEditTitle}
              className={cn(
                "min-w-0 max-w-full truncate rounded-lg px-2 py-1 text-left text-xl font-semibold text-white transition sm:text-2xl",
                canEditTitle ? "cursor-pointer hover:bg-black/10" : "cursor-default"
              )}
            >
              {board.title}
            </button>
          )}

          <BoardToolbarPill className="h-8 px-2.5 text-[13px] text-white/84">
            {visibility === "public" ? (
              <>
                <Globe className="size-3.5" />
                Public
              </>
            ) : (
              <>
                <Lock className="size-3.5" />
                Private
              </>
            )}
          </BoardToolbarPill>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <BoardMemberAvatars
              participants={participants}
              onlineUserIds={onlineUserIds}
              onOpenShare={onOpenShare}
            />
          </div>

          <Button
            type="button"
            size="sm"
            onClick={onOpenShare}
            className="rounded-full bg-white/94 px-3 text-slate-800 shadow-sm hover:bg-white sm:px-4"
          >
            <Share2 className="size-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenBoardMenu}
            className="rounded-full border border-white/18 bg-white/10 px-3 text-white hover:bg-white/18 hover:text-white"
            aria-label="Open board menu"
          >
            <MoreHorizontal className="size-4" />
            <span className="hidden md:inline">Menu</span>
          </Button>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-2 sm:px-5">
        <BoardViewSwitcher currentView={currentView} onViewChange={onViewChange} />
      </div>
    </div>
  );
}
