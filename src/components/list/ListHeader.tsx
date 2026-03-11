"use client";

import { useRef, useState } from "react";
import { Archive, Copy, MoreHorizontal, MoveHorizontal, PencilLine, Trash2 } from "lucide-react";

import { getListTitleError } from "@/lib/lists";
import type { ListWithCards } from "@/types";
import ListActionDialog from "@/components/list/ListActionDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

interface ListHeaderProps {
  list: ListWithCards;
  lists: ListWithCards[];
  canEdit?: boolean;
  onUpdateTitle: (title: string) => Promise<void>;
  onMove: (position: string) => Promise<void>;
  onCopy: (title: string, position: string) => Promise<void>;
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function ListHeader({
  list,
  lists,
  canEdit = true,
  onUpdateTitle,
  onMove,
  onCopy,
  onArchive,
  onDelete,
}: ListHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(list.title);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [actionMode, setActionMode] = useState<"move" | "copy" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    if (!canEdit) {
      return;
    }

    setEditValue(list.title);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const saveTitle = async () => {
    const trimmed = editValue.trim();

    if (!trimmed || trimmed === list.title) {
      setIsEditing(false);
      return;
    }

    const error = getListTitleError(trimmed);

    if (error) {
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
    setEditValue(list.title);
    setIsEditing(false);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-3.5 pb-2 pt-3">
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
            className="h-9 flex-1 rounded-md border border-transparent bg-white px-2.5 py-1 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-300/80"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={startEditing}
            disabled={!canEdit}
            className={`min-w-0 flex-1 truncate rounded-md px-1 py-1 text-left text-sm font-semibold text-slate-800 transition ${
              canEdit ? "cursor-pointer hover:bg-slate-300/50" : "cursor-default"
            }`}
          >
            {list.title}
          </button>
        )}

        {canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 rounded-full text-slate-500 hover:bg-slate-300/60 hover:text-slate-700"
                aria-label={`Actions for ${list.title}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => setActionMode("move")}>
                <MoveHorizontal className="size-4" />
                Move list
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setActionMode("copy")}>
                <Copy className="size-4" />
                Copy list
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={startEditing}>
                <PencilLine className="size-4" />
                Rename list
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setIsArchiveConfirmOpen(true);
                }}
              >
                <Archive className="size-4" />
                Archive list
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={(event) => {
                  event.preventDefault();
                  setIsDeleteConfirmOpen(true);
                }}
              >
                <Trash2 className="size-4" />
                Delete list
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <ConfirmDialog
        open={isArchiveConfirmOpen}
        onOpenChange={setIsArchiveConfirmOpen}
        title="Archive list?"
        description={`"${list.title}" will be removed from the board but can be restored later.`}
        confirmLabel="Archive list"
        onConfirm={onArchive}
      />

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Delete list?"
        description={`"${list.title}" and all its cards will be permanently deleted.`}
        confirmLabel="Delete list"
        confirmVariant="destructive"
        onConfirm={onDelete}
      />

      {actionMode ? (
        <ListActionDialog
          open={Boolean(actionMode)}
          onOpenChange={(open) => {
            if (!open) {
              setActionMode(null);
            }
          }}
          mode={actionMode}
          list={list}
          lists={lists}
          onMove={onMove}
          onCopy={onCopy}
        />
      ) : null}
    </>
  );
}
