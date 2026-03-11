"use client";

import { useEffect, useState } from "react";
import { ArchiveRestore, History } from "lucide-react";

import { getArchivedBoardItems } from "@/actions/archive-items";
import { getArchiveSchemaErrorMessage } from "@/lib/archive-support";
import type { ArchivedBoardItems } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ArchivedItemsDialogProps {
  boardId: string;
  canEditContent: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestoreList: (listId: string) => Promise<void>;
  onRestoreCard: (cardId: string) => Promise<void>;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while loading archived items.";
}

export default function ArchivedItemsDialog({
  boardId,
  canEditContent,
  open,
  onOpenChange,
  onRestoreList,
  onRestoreCard,
}: ArchivedItemsDialogProps) {
  const [items, setItems] = useState<ArchivedBoardItems>({
    schemaReady: true,
    lists: [],
    cards: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isActive = true;

    const loadItems = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextItems = await getArchivedBoardItems(boardId);

        if (isActive) {
          setItems(nextItems);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadItems();

    return () => {
      isActive = false;
    };
  }, [boardId, open]);

  const handleRestoreList = async (listId: string) => {
    setIsRestoringId(listId);
    setErrorMessage(null);

    try {
      await onRestoreList(listId);
      setItems((current) => ({
        ...current,
        lists: current.lists.filter((list) => list.id !== listId),
        cards: current.cards.filter((card) => card.list_id !== listId),
      }));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsRestoringId(null);
    }
  };

  const handleRestoreCard = async (cardId: string) => {
    setIsRestoringId(cardId);
    setErrorMessage(null);

    try {
      await onRestoreCard(cardId);
      setItems((current) => ({
        ...current,
        cards: current.cards.filter((card) => card.id !== cardId),
      }));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsRestoringId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Archived items</DialogTitle>
          <DialogDescription>Restore cards and lists without recreating them.</DialogDescription>
        </DialogHeader>

        {isLoading ? <p className="text-sm text-slate-500">Loading archived items...</p> : null}
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

        {!isLoading && !items.schemaReady ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-600">
            {getArchiveSchemaErrorMessage()}
          </div>
        ) : null}

        {!isLoading && items.schemaReady ? (
          <div className="space-y-5">
            <section className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Archived lists</p>
                <p className="text-xs text-slate-500">
                  Restoring a list also returns its archived cards to the board.
                </p>
              </div>

              {items.lists.length > 0 ? (
                <div className="space-y-2">
                  {items.lists.map((list) => (
                    <div
                      key={list.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{list.title}</p>
                        <p className="text-xs text-slate-500">
                          {list.cardCount} archived {list.cardCount === 1 ? "card" : "cards"}
                        </p>
                      </div>
                      {canEditContent ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isRestoringId === list.id}
                          onClick={() => void handleRestoreList(list.id)}
                        >
                          <ArchiveRestore className="size-4" />
                          {isRestoringId === list.id ? "Restoring..." : "Restore"}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No archived lists yet.</p>
              )}
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Archived cards</p>
                <p className="text-xs text-slate-500">
                  Cards return to their original list when restored.
                </p>
              </div>

              {items.cards.length > 0 ? (
                <div className="space-y-2">
                  {items.cards.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{card.title}</p>
                        <p className="truncate text-xs text-slate-500">
                          {card.listTitle ? `From ${card.listTitle}` : "Original list unavailable"}
                        </p>
                      </div>
                      {canEditContent ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isRestoringId === card.id}
                          onClick={() => void handleRestoreCard(card.id)}
                        >
                          <History className="size-4" />
                          {isRestoringId === card.id ? "Restoring..." : "Restore"}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No archived cards yet.</p>
              )}
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
