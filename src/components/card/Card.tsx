"use client";

import { CalendarDays, GripVertical } from "lucide-react";

import { formatCardDueDateLabel } from "@/lib/cards";
import type { Card as CardRecord } from "@/types";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  card: CardRecord;
  onOpen: () => void;
  isDragTarget?: boolean;
  isDraggingHint?: boolean;
}

export default function TaskCard({
  card,
  onOpen,
  isDragTarget = false,
  isDraggingHint = false,
}: TaskCardProps) {
  const dueDateLabel = formatCardDueDateLabel(card.due_date);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative w-full rounded-xl bg-white px-3 py-2.5 text-left shadow-[0_1px_1px_rgba(15,23,42,0.08),0_6px_18px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/6 transition duration-150",
        isDraggingHint && "cursor-grab active:cursor-grabbing",
        isDragTarget
          ? "bg-sky-50 ring-sky-400/65 shadow-[0_1px_1px_rgba(14,165,233,0.12),0_12px_28px_rgba(14,165,233,0.18)]"
          : "hover:-translate-y-0.5 hover:bg-slate-50 hover:ring-sky-300/35 hover:shadow-[0_1px_1px_rgba(15,23,42,0.1),0_10px_24px_rgba(15,23,42,0.12)]"
      )}
    >
      <div className="absolute right-3 top-3 rounded-full bg-slate-100/85 p-1 text-slate-400 opacity-0 transition duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
        <GripVertical className="size-3.5" />
      </div>

      <p className="pr-6 text-sm font-medium leading-5 text-slate-800">{card.title}</p>
      {dueDateLabel ? (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500 transition group-hover:bg-slate-200/80 group-hover:text-slate-600">
          <CalendarDays className="size-3.5" />
          {dueDateLabel}
        </div>
      ) : null}
    </button>
  );
}
