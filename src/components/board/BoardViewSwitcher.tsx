"use client";

import { CalendarRange, GitBranch, KanbanSquare, Rows3 } from "lucide-react";

import type { BoardView } from "@/types";
import { cn } from "@/lib/utils";

interface BoardViewSwitcherProps {
  currentView: BoardView;
  onViewChange: (view: BoardView) => void;
}

const BOARD_VIEW_OPTIONS: Array<{
  value: BoardView;
  label: string;
  icon: typeof KanbanSquare;
}> = [
  { value: "board", label: "Board", icon: KanbanSquare },
  { value: "table", label: "Table", icon: Rows3 },
  { value: "calendar", label: "Calendar", icon: CalendarRange },
  { value: "timeline", label: "Timeline", icon: GitBranch },
];

export default function BoardViewSwitcher({
  currentView,
  onViewChange,
}: BoardViewSwitcherProps) {
  return (
    <div className="board-scrollbar -mx-1 overflow-x-auto px-1">
      <div className="inline-flex min-w-full gap-2 sm:min-w-0">
        {BOARD_VIEW_OPTIONS.map((option) => {
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onViewChange(option.value)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition",
                currentView === option.value
                  ? "border-white/28 bg-white/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "border-transparent bg-black/10 text-white/78 hover:bg-black/16 hover:text-white"
              )}
            >
              <Icon className="size-4" />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
