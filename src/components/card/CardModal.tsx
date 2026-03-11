"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Archive, Copy, MoveHorizontal, Share2 } from "lucide-react";
import { toast } from "sonner";

import {
  formatCardDueDateInputValue,
  getCardTitleError,
} from "@/lib/cards";
import { generatePositionAtIndex, sortByPosition } from "@/lib/fractional-index";
import type { Card as CardRecord, CardUpdatePatch, ListWithCards } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import CardMetadataPanel from "@/components/card/CardMetadataPanel";

interface CardModalProps {
  card: CardRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lists: ListWithCards[];
  boardId: string;
  currentUserId: string;
  canEditContent?: boolean;
  onMove: (cardId: string, listId: string, position: string) => Promise<void>;
  onCopy: (cardId: string, title: string, listId: string, position: string) => Promise<void>;
  onUpdate: (cardId: string, input: CardUpdatePatch) => Promise<void>;
  onArchive: (cardId: string) => Promise<void>;
  onDelete: (cardId: string) => Promise<void>;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

export default function CardModal({
  card,
  open,
  onOpenChange,
  lists,
  boardId,
  currentUserId,
  canEditContent = true,
  onMove,
  onCopy,
  onUpdate,
  onArchive,
  onDelete,
}: CardModalProps) {
  const [titleValue, setTitleValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [dueDateValue, setDueDateValue] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<"move" | "copy" | null>(null);
  const [destinationListId, setDestinationListId] = useState("");
  const [positionSlotValue, setPositionSlotValue] = useState("0");
  const [copyTitleValue, setCopyTitleValue] = useState("");
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isSavingDueDate, setIsSavingDueDate] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const dueDateId = useId();
  const copyTitleId = useId();
  const destinationListIdControl = useId();
  const positionId = useId();

  useEffect(() => {
    if (!card) {
      return;
    }

    setTitleValue(card.title);
    setDescriptionValue(card.description ?? "");
    setDueDateValue(formatCardDueDateInputValue(card.due_date));
    setTitleError(null);
    setErrorMessage(null);
    setActionMode(null);
    setDestinationListId(card.list_id);
    setPositionSlotValue("0");
    setCopyTitleValue(card.title);
    setActionErrorMessage(null);
  }, [card]);

  const isBusy = useMemo(
    () =>
      isSavingTitle ||
      isSavingDescription ||
      isSavingDueDate ||
      isArchiving ||
      isDeleting ||
      isSubmittingAction,
    [
      isArchiving,
      isDeleting,
      isSavingDescription,
      isSavingDueDate,
      isSavingTitle,
      isSubmittingAction,
    ]
  );

  const orderedLists = useMemo(() => sortByPosition(lists), [lists]);
  const originList = card ? orderedLists.find((list) => list.id === card.list_id) ?? null : null;
  const destinationList =
    orderedLists.find((list) => list.id === destinationListId) ?? originList ?? orderedLists[0] ?? null;
  const currentCardIndex =
    card && originList ? originList.cards.findIndex((item) => item.id === card.id) : -1;
  const destinationCards = destinationList ? sortByPosition(destinationList.cards) : [];
  const targetPositionCards =
    actionMode === "move" && card && destinationListId === card.list_id
      ? destinationCards.filter((item) => item.id !== card.id)
      : destinationCards;
  const positionOptions = targetPositionCards.map((item, index) => ({
    value: String(index + 1),
    label: `After ${item.title}`,
  }));
  const isMoveUnchanged =
    actionMode === "move" &&
    destinationListId === card?.list_id &&
    positionSlotValue === String(Math.max(0, currentCardIndex));

  useEffect(() => {
    if (!card || !actionMode) {
      return;
    }

    if (actionMode === "move") {
      if (destinationListId === card.list_id) {
        setPositionSlotValue(String(Math.max(0, currentCardIndex)));
      } else {
        setPositionSlotValue(String(destinationCards.length));
      }

      return;
    }

    setPositionSlotValue(String(destinationCards.length));
  }, [
    actionMode,
    card,
    currentCardIndex,
    destinationCards.length,
    destinationListId,
  ]);

  if (!card) {
    return null;
  }

  const saveTitle = async () => {
    const nextTitle = titleValue.trim();

    if (nextTitle === card.title) {
      setTitleError(null);
      return;
    }

    const nextTitleError = getCardTitleError(nextTitle);

    if (nextTitleError) {
      setTitleError(nextTitleError);
      return;
    }

    setIsSavingTitle(true);
    setTitleError(null);
    setErrorMessage(null);

    try {
      await onUpdate(card.id, { title: nextTitle });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingTitle(false);
    }
  };

  const saveDescription = async () => {
    if (descriptionValue === (card.description ?? "")) {
      return;
    }

    setIsSavingDescription(true);
    setErrorMessage(null);

    try {
      await onUpdate(card.id, { description: descriptionValue });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingDescription(false);
    }
  };

  const saveDueDate = async (nextDueDate: string) => {
    if (nextDueDate === formatCardDueDateInputValue(card.due_date)) {
      return;
    }

    setIsSavingDueDate(true);
    setErrorMessage(null);

    try {
      await onUpdate(card.id, { dueDate: nextDueDate || null });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setDueDateValue(formatCardDueDateInputValue(card.due_date));
    } finally {
      setIsSavingDueDate(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await onDelete(card.id);
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    setErrorMessage(null);

    try {
      await onArchive(card.id);
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsArchiving(false);
    }
  };

  const handleSubmitAction = async () => {
    if (!destinationList) {
      setActionErrorMessage("A destination list is required.");
      return;
    }

    setActionErrorMessage(null);

    if (actionMode === "copy") {
      const nextTitleError = getCardTitleError(copyTitleValue);

      if (nextTitleError) {
        setActionErrorMessage(nextTitleError);
        return;
      }
    }

    const position = generatePositionAtIndex(
      destinationCards,
      Number(positionSlotValue),
      actionMode === "move" && destinationList.id === card.list_id ? card.id : undefined
    );

    setIsSubmittingAction(true);

    try {
      if (actionMode === "move") {
        await onMove(card.id, destinationList.id, position);
      } else {
        await onCopy(card.id, copyTitleValue, destinationList.id, position);
      }

      onOpenChange(false);
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit card</DialogTitle>
          <DialogDescription>Changes are saved automatically as you edit.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <label htmlFor={titleId} className="text-sm font-medium text-foreground">
              Title
            </label>
            <Input
              id={titleId}
              type="text"
              value={titleValue}
              onChange={(event) => {
                setTitleValue(event.target.value);
                if (titleError) {
                  setTitleError(null);
                }
              }}
              onBlur={() => void saveTitle()}
              onKeyDown={(event) => {
                if (!canEditContent) {
                  return;
                }

                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveTitle();
                } else if (event.key === "Escape") {
                  setTitleValue(card.title);
                  setTitleError(null);
                }
              }}
              disabled={isDeleting || !canEditContent}
              aria-invalid={Boolean(titleError)}
            />
            {titleError ? <p className="text-sm text-destructive">{titleError}</p> : null}
          </div>

          <div className="space-y-2">
            <label htmlFor={descriptionId} className="text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              id={descriptionId}
              value={descriptionValue}
              onChange={(event) => setDescriptionValue(event.target.value)}
              onBlur={() => void saveDescription()}
              rows={6}
              disabled={isDeleting || !canEditContent}
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-32 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Add a more detailed description..."
            />
          </div>

          <div className="space-y-2">
            <label htmlFor={dueDateId} className="text-sm font-medium text-foreground">
              Due date
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id={dueDateId}
                type="date"
                value={dueDateValue}
                onChange={(event) => {
                  const nextDueDate = event.target.value;

                  setDueDateValue(nextDueDate);
                  void saveDueDate(nextDueDate);
                }}
                disabled={isDeleting || isSavingDueDate || !canEditContent}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!dueDateValue || isDeleting || isSavingDueDate || !canEditContent}
                onClick={() => {
                  setDueDateValue("");
                  void saveDueDate("");
                }}
              >
                Clear date
              </Button>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {canEditContent ? (
                <>
                  <Button
                    type="button"
                    variant={actionMode === "move" ? "secondary" : "outline"}
                    disabled={isBusy}
                    onClick={() => {
                      setActionMode((current) => (current === "move" ? null : "move"));
                      setDestinationListId(card.list_id);
                      setActionErrorMessage(null);
                    }}
                  >
                    <MoveHorizontal className="size-4" />
                    Move card
                  </Button>
                  <Button
                    type="button"
                    variant={actionMode === "copy" ? "secondary" : "outline"}
                    disabled={isBusy}
                    onClick={() => {
                      setActionMode((current) => (current === "copy" ? null : "copy"));
                      setDestinationListId(card.list_id);
                      setCopyTitleValue(card.title);
                      setActionErrorMessage(null);
                    }}
                  >
                    <Copy className="size-4" />
                    Copy card
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                disabled={isBusy}
                onClick={() => toast("Card sharing lands in a later phase.")}
              >
                <Share2 className="size-4" />
                Share
              </Button>
            </div>

            {canEditContent && actionMode ? (
              <div className="space-y-3 rounded-lg border bg-background p-3 shadow-xs">
                {actionMode === "copy" ? (
                  <div className="space-y-2">
                    <label htmlFor={copyTitleId} className="text-sm font-medium text-foreground">
                      Title
                    </label>
                    <Input
                      id={copyTitleId}
                      value={copyTitleValue}
                      onChange={(event) => setCopyTitleValue(event.target.value)}
                      disabled={isBusy}
                    />
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor={destinationListIdControl} className="text-sm font-medium text-foreground">
                      List
                    </label>
                    <select
                      id={destinationListIdControl}
                      value={destinationListId}
                      onChange={(event) => setDestinationListId(event.target.value)}
                      disabled={isBusy}
                      className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                    >
                      {orderedLists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor={positionId} className="text-sm font-medium text-foreground">
                      Position
                    </label>
                    <select
                      id={positionId}
                      value={positionSlotValue}
                      onChange={(event) => setPositionSlotValue(event.target.value)}
                      disabled={isBusy}
                      className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                    >
                      <option value="0">At the top</option>
                      {positionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {actionErrorMessage ? (
                  <p className="text-sm text-destructive">{actionErrorMessage}</p>
                ) : null}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    disabled={isBusy || Boolean(isMoveUnchanged)}
                    onClick={() => {
                      void handleSubmitAction();
                    }}
                  >
                    {isSubmittingAction
                      ? actionMode === "move"
                        ? "Moving..."
                        : "Copying..."
                      : actionMode === "move"
                        ? "Move card"
                        : "Copy card"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isBusy}
                    onClick={() => {
                      setActionMode(null);
                      setActionErrorMessage(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {canEditContent ? (isBusy ? "Saving changes..." : "Saved.") : "Read-only access."}
            </p>
            {canEditContent ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isArchiving || isDeleting}
                  onClick={() => void handleArchive()}
                >
                  <Archive className="size-4" />
                  {isArchiving ? "Archiving..." : "Archive card"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isDeleting || isArchiving}
                  onClick={() => void handleDelete()}
                >
                  {isDeleting ? "Deleting..." : "Delete card"}
                </Button>
              </div>
            ) : null}
          </div>

          <CardMetadataPanel
            key={card.id}
            boardId={boardId}
            cardId={card.id}
            currentUserId={currentUserId}
            canEditContent={canEditContent}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
