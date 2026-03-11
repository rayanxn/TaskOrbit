"use client";

import { useEffect, useMemo, useState } from "react";

import { generatePositionAtIndex, sortByPosition } from "@/lib/fractional-index";
import { getListTitleError } from "@/lib/lists";
import type { ListWithCards } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ListActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "move" | "copy";
  list: ListWithCards;
  lists: ListWithCards[];
  onMove: (position: string) => Promise<void>;
  onCopy: (title: string, position: string) => Promise<void>;
}

export default function ListActionDialog({
  open,
  onOpenChange,
  mode,
  list,
  lists,
  onMove,
  onCopy,
}: ListActionDialogProps) {
  const [titleValue, setTitleValue] = useState(list.title);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [slotValue, setSlotValue] = useState("0");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orderedLists = useMemo(() => sortByPosition(lists), [lists]);
  const currentIndex = orderedLists.findIndex((item) => item.id === list.id);
  const availableLists = useMemo(
    () => (mode === "move" ? orderedLists.filter((item) => item.id !== list.id) : orderedLists),
    [list.id, mode, orderedLists]
  );

  const slotOptions = useMemo(
    () => [
      { value: "0", label: "At the beginning" },
      ...availableLists.map((item, index) => ({
        value: String(index + 1),
        label: `After ${item.title}`,
      })),
    ],
    [availableLists]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitleValue(list.title);
    setTitleError(null);
    setErrorMessage(null);
    setSlotValue(
      mode === "move"
        ? String(Math.max(0, currentIndex))
        : String(Math.max(0, Math.min(currentIndex + 1, orderedLists.length)))
    );
  }, [currentIndex, list.title, mode, open, orderedLists.length]);

  const handleSubmit = async () => {
    setTitleError(null);
    setErrorMessage(null);

    if (mode === "move" && availableLists.length === 0) {
      onOpenChange(false);
      return;
    }

    const position = generatePositionAtIndex(
      orderedLists,
      Number(slotValue),
      mode === "move" ? list.id : undefined
    );

    if (mode === "copy") {
      const nextTitleError = getListTitleError(titleValue);

      if (nextTitleError) {
        setTitleError(nextTitleError);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (mode === "move") {
        await onMove(position);
      } else {
        await onCopy(titleValue, position);
      }

      onOpenChange(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update the list.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "move" ? "Move list" : "Copy list"}</DialogTitle>
          <DialogDescription>
            {mode === "move"
              ? "Choose where this list should appear in the board."
              : "Create a duplicate list in a new board position with its current cards."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === "copy" ? (
            <div className="space-y-2">
              <Label htmlFor="copy-list-title">Title</Label>
              <Input
                id="copy-list-title"
                value={titleValue}
                onChange={(event) => {
                  setTitleValue(event.target.value);
                  if (titleError) {
                    setTitleError(null);
                  }
                }}
                aria-invalid={Boolean(titleError)}
              />
              {titleError ? <p className="text-sm text-destructive">{titleError}</p> : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="list-position">Position</Label>
            <select
              id="list-position"
              value={slotValue}
              onChange={(event) => setSlotValue(event.target.value)}
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            >
              {slotOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {mode === "move" && availableLists.length === 0 ? (
              <p className="text-sm text-muted-foreground">This is the only list on the board.</p>
            ) : null}
          </div>

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || (mode === "move" && availableLists.length === 0)}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {isSubmitting
              ? mode === "move"
                ? "Moving..."
                : "Copying..."
              : mode === "move"
                ? "Move list"
                : "Copy list"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
