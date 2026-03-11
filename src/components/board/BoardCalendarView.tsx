"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { ListWithCards } from "@/types";

interface BoardCalendarViewProps {
  lists: ListWithCards[];
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getCalendarDays(date: Date) {
  const monthStart = startOfMonth(date);
  const firstGridDay = new Date(monthStart);
  firstGridDay.setDate(firstGridDay.getDate() - firstGridDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstGridDay);
    day.setDate(firstGridDay.getDate() + index);
    return day;
  });
}

function toDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export default function BoardCalendarView({ lists }: BoardCalendarViewProps) {
  const cards = lists.flatMap((list) =>
    list.cards.map((card) => ({
      id: card.id,
      title: card.title,
      dueDate: card.due_date,
      listTitle: list.title,
    }))
  );
  const datedCards = cards.filter((card) => card.dueDate);
  const undatedCards = cards.filter((card) => !card.dueDate);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    datedCards[0]?.dueDate ? startOfMonth(new Date(datedCards[0].dueDate)) : startOfMonth(new Date())
  );
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
      }).format(visibleMonth),
    [visibleMonth]
  );
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const cardMap = (() => {
    const nextMap = new Map<string, typeof datedCards>();

    for (const card of datedCards) {
      const key = toDateKey(card.dueDate!);
      const dayCards = nextMap.get(key) ?? [];
      dayCards.push(card);
      nextMap.set(key, dayCards);
    }

    return nextMap;
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-white/18 bg-white/88 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm">
        <div>
          <p className="text-sm font-semibold text-slate-900">Calendar view</p>
          <p className="text-xs text-slate-500">Cards are grouped by due date.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
            className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="min-w-32 text-center text-sm font-medium text-slate-800">{monthLabel}</div>
          <button
            type="button"
            onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
            className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/18 bg-white/92 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm">
        <div className="grid grid-cols-7 border-b border-slate-200/70 bg-slate-900/[0.04] text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="px-2 py-3">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
            const dayCards = cardMap.get(toDateKey(day)) ?? [];

            return (
              <div
                key={toDateKey(day)}
                className="min-h-32 border-b border-r border-slate-200/70 px-2 py-2 last:border-r-0"
              >
                <div className="mb-2 text-xs font-semibold text-slate-500">
                  <span className={isCurrentMonth ? "text-slate-700" : "text-slate-400"}>
                    {day.getDate()}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {dayCards.map((card) => (
                    <div
                      key={card.id}
                      className="rounded-lg bg-sky-50 px-2 py-1.5 text-xs font-medium text-sky-900 ring-1 ring-sky-200"
                    >
                      <p className="truncate">{card.title}</p>
                      <p className="truncate text-[11px] text-sky-700/80">{card.listTitle}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {undatedCards.length > 0 ? (
        <div className="rounded-2xl border border-white/18 bg-white/88 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm">
          <p className="text-sm font-semibold text-slate-900">No due date</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {undatedCards.map((card) => (
              <span
                key={card.id}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                {card.title}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
