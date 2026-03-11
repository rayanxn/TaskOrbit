"use client";

import { useState } from "react";
import { toast } from "sonner";

import { BOARD_BACKGROUND_OPTIONS } from "@/lib/backgrounds";
import { canEditBoard } from "@/lib/permissions";
import type { Board, BoardRole } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type BoardDueFilter = "all" | "overdue" | "upcoming" | "no-date";

interface BoardMenuDialogProps {
  board: Board;
  currentUserRole: BoardRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  dueFilter: BoardDueFilter;
  onSearchQueryChange: (value: string) => void;
  onDueFilterChange: (value: BoardDueFilter) => void;
  onResetFilters: () => void;
  onUpdateBackground: (background: string) => Promise<void>;
  onOpenArchivedItems: () => void;
  onOpenCustomFields: () => void;
  onOpenAutomation: () => void;
  onOpenPowerUps: () => void;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

export default function BoardMenuDialog({
  board,
  currentUserRole,
  open,
  onOpenChange,
  searchQuery,
  dueFilter,
  onSearchQueryChange,
  onDueFilterChange,
  onResetFilters,
  onUpdateBackground,
  onOpenArchivedItems,
  onOpenCustomFields,
  onOpenAutomation,
  onOpenPowerUps,
}: BoardMenuDialogProps) {
  const [isUpdatingBackground, setIsUpdatingBackground] = useState<string | null>(null);
  const canEditAppearance = canEditBoard(currentUserRole);

  const handleUpdateBackground = async (background: string) => {
    if (!canEditAppearance) {
      return;
    }

    setIsUpdatingBackground(background);

    try {
      await onUpdateBackground(background);
      toast.success("Board background updated.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUpdatingBackground(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Board menu</DialogTitle>
          <DialogDescription>
            Refine what you see on &ldquo;{board.title}&rdquo; and adjust the board presentation.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Search and filters</p>
            <p className="text-xs text-slate-500">
              Narrow the board to matching cards without changing the underlying data.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <Input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search card titles and descriptions"
            />
            <select
              value={dueFilter}
              onChange={(event) => onDueFilterChange(event.target.value as BoardDueFilter)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
            >
              <option value="all">All due dates</option>
              <option value="overdue">Overdue</option>
              <option value="upcoming">Upcoming</option>
              <option value="no-date">No date</option>
            </select>
            <Button type="button" variant="outline" onClick={onResetFilters}>
              Reset
            </Button>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Background</p>
            <p className="text-xs text-slate-500">
              {canEditAppearance
                ? "Choose the board atmosphere."
                : "Only board owners and admins can change the background."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {BOARD_BACKGROUND_OPTIONS.map((option) => {
              const isActive = board.background === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={!canEditAppearance || isUpdatingBackground === option.value}
                  onClick={() => void handleUpdateBackground(option.value)}
                  className={`overflow-hidden rounded-xl border text-left transition ${
                    isActive
                      ? "border-sky-500 shadow-[0_0_0_1px_rgba(14,165,233,0.25)]"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className="h-20 w-full"
                    style={{ background: option.cssBackground }}
                    aria-hidden="true"
                  />
                  <div className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-medium text-slate-900">{option.label}</span>
                    {isActive ? <span className="text-xs text-sky-700">Active</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
          <p className="text-sm font-semibold text-slate-900">Archived items</p>
          <p className="text-sm text-slate-600">
            Restore archived cards and lists without leaving the board workspace.
          </p>
          <Button type="button" variant="outline" onClick={onOpenArchivedItems}>
            Open archived items
          </Button>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Advanced features</p>
            <p className="text-xs text-slate-500">
              Extend the board with custom fields, automation, and integrations.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onOpenCustomFields}>
              Custom fields
            </Button>
            <Button type="button" variant="outline" onClick={onOpenAutomation}>
              Automation
            </Button>
            <Button type="button" variant="outline" onClick={onOpenPowerUps}>
              Power-Ups
            </Button>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
