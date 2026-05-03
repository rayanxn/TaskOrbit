"use client";

import { useActionState, useState } from "react";
import { Plus, Sparkles, UserRound } from "lucide-react";
import { continueAsGuest } from "@/lib/actions/auth";
import type { ActionResponse } from "@/lib/types";

type GuestMode = "demo" | "fresh";

type GuestModeChooserProps = {
  disabled?: boolean;
};

function getPendingLabel(mode: GuestMode | null) {
  if (mode === "fresh") return "Creating fresh workspace...";
  return "Preparing demo workspace...";
}

export function GuestModeChooser({ disabled = false }: GuestModeChooserProps) {
  const [open, setOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GuestMode | null>(null);
  const [state, formAction, pending] = useActionState<
    ActionResponse | null,
    FormData
  >(async (_prev, formData) => {
    return await continueAsGuest(formData);
  }, null);

  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        disabled={disabled || pending}
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm font-medium text-text transition-colors hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-50"
      >
        <UserRound className="h-4 w-4" />
        {pending ? getPendingLabel(selectedMode) : "Continue as guest"}
      </button>

      {state?.error && (
        <div className="mt-3 rounded-lg border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger">
          {state.error}
        </div>
      )}

      {open && (
        <form action={formAction} className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="submit"
            name="mode"
            value="demo"
            disabled={disabled || pending}
            onClick={() => setSelectedMode("demo")}
            className="flex min-h-20 flex-col items-start justify-center gap-1 rounded-lg border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-50"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-text">
              <Sparkles className="h-4 w-4" />
              Explore demo data
            </span>
            <span className="text-xs text-text-secondary">Preloaded workspace</span>
          </button>

          <button
            type="submit"
            name="mode"
            value="fresh"
            disabled={disabled || pending}
            onClick={() => setSelectedMode("fresh")}
            className="flex min-h-20 flex-col items-start justify-center gap-1 rounded-lg border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-50"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-text">
              <Plus className="h-4 w-4" />
              Start fresh
            </span>
            <span className="text-xs text-text-secondary">Empty workspace</span>
          </button>
        </form>
      )}
    </div>
  );
}
