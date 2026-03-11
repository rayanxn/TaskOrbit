"use client";

import type { ListWithCards } from "@/types";

interface BoardTimelineViewProps {
  lists: ListWithCards[];
}

function formatTimelineDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function BoardTimelineView({ lists }: BoardTimelineViewProps) {
  const cards = lists
    .flatMap((list) =>
      list.cards.map((card) => ({
        id: card.id,
        title: card.title,
        dueDate: card.due_date,
        listTitle: list.title,
      }))
    )
    .sort((left, right) => {
      if (!left.dueDate && !right.dueDate) {
        return left.title.localeCompare(right.title);
      }

      if (!left.dueDate) {
        return 1;
      }

      if (!right.dueDate) {
        return -1;
      }

      return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
    });

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-white/18 bg-white/90 p-6 text-sm text-slate-600 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm">
        No cards match the current filters.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/18 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm">
      <div className="space-y-4">
        {cards.map((card, index) => (
          <div key={card.id} className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <div className="flex items-start gap-3 sm:justify-end">
              <div className="mt-1 hidden h-full w-px bg-slate-200 sm:block" />
              <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                {formatTimelineDate(card.dueDate)}
              </div>
            </div>
            <div className="relative rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="absolute -left-1.5 top-5 hidden size-3 rounded-full border-2 border-white bg-sky-500 sm:block" />
              <p className="text-sm font-semibold text-slate-900">{card.title}</p>
              <p className="mt-1 text-xs text-slate-500">{card.listTitle}</p>
              {index < cards.length - 1 ? <div className="mt-4 h-px bg-slate-100" /> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
