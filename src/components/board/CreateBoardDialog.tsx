"use client";

import { useState } from "react";

import { BOARD_BACKGROUND_OPTIONS } from "@/lib/backgrounds";
import {
  BOARD_TITLE_MAX_LENGTH,
  isBoardValidationError,
  validateBoardFormValues,
  type BoardFormErrors,
} from "@/lib/boards";
import { cn } from "@/lib/utils";
import type { BoardFormValues } from "@/types";
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

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BoardFormValues) => Promise<void>;
  initialValues?: Partial<BoardFormValues>;
  mode?: "create" | "edit";
}

function getDefaultValues(initialValues?: Partial<BoardFormValues>): BoardFormValues {
  return {
    title: initialValues?.title ?? "",
    background: initialValues?.background ?? BOARD_BACKGROUND_OPTIONS[0].value,
  };
}

export default function CreateBoardDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  mode = "create",
}: CreateBoardDialogProps) {
  const [values, setValues] = useState<BoardFormValues>(getDefaultValues(initialValues));
  const [fieldErrors, setFieldErrors] = useState<BoardFormErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedBackground = BOARD_BACKGROUND_OPTIONS.find(
    (background) => background.value === values.background
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setErrorMessage(null);

    const validationResult = validateBoardFormValues(values);

    if (!validationResult.success) {
      setFieldErrors(validationResult.fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(validationResult.data);
      onOpenChange(false);
    } catch (error) {
      if (isBoardValidationError(error)) {
        setFieldErrors(error.fieldErrors);
        setErrorMessage(null);
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Unable to save this board.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create board" : "Edit board"}</DialogTitle>
          <DialogDescription>
            Pick a title and background. You can archive boards later without deleting them.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="board-title">Title</Label>
            <Input
              id="board-title"
              name="title"
              value={values.title}
              onChange={(event) =>
                setValues((currentValues) => ({
                  ...currentValues,
                  title: event.target.value,
                }))
              }
              maxLength={BOARD_TITLE_MAX_LENGTH}
              placeholder="Product roadmap"
              autoFocus
              aria-invalid={fieldErrors.title ? "true" : "false"}
            />
            <p className="text-xs text-muted-foreground">
              {values.title.length}/{BOARD_TITLE_MAX_LENGTH}
            </p>
            {fieldErrors.title ? (
              <p className="text-sm text-destructive" role="alert">
                {fieldErrors.title}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <Label>Background</Label>
            <div className="grid gap-3 sm:grid-cols-4">
              {BOARD_BACKGROUND_OPTIONS.map((background) => (
                <button
                  key={background.value}
                  type="button"
                  className={cn(
                    "overflow-hidden rounded-xl border text-left transition hover:shadow-sm",
                    values.background === background.value
                      ? "ring-2 ring-primary ring-offset-2"
                      : "hover:border-primary/40"
                  )}
                  onClick={() =>
                    setValues((currentValues) => ({
                      ...currentValues,
                      background: background.value,
                    }))
                  }
                >
                  <div
                    className="h-20 w-full"
                    style={{ background: background.cssBackground }}
                    aria-hidden="true"
                  />
                  <div className="bg-background px-3 py-2 text-sm font-medium">
                    {background.label}
                  </div>
                </button>
              ))}
            </div>
            {selectedBackground && (
              <p className="text-sm text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{selectedBackground.label}</span>
              </p>
            )}
            {fieldErrors.background ? (
              <p className="text-sm text-destructive" role="alert">
                {fieldErrors.background}
              </p>
            ) : null}
          </div>

          {errorMessage && (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create board"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
