"use client";

import { formatCardDueDateLabel } from "@/lib/cards";
import type { ListWithCards } from "@/types";

interface BoardTableViewProps {
  lists: ListWithCards[];
}

export default function BoardTableView({ lists }: BoardTableViewProps) {
  const rows = lists.flatMap((list) =>
    list.cards.map((card) => ({
      id: card.id,
      title: card.title,
      description: card.description,
      dueDate: card.due_date,
      listTitle: list.title,
    }))
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/18 bg-white/90 p-6 text-sm text-slate-600 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm">
        No cards match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/18 bg-white/92 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-slate-900/[0.04] text-left text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Card</th>
            <th className="px-4 py-3 font-medium">List</th>
            <th className="px-4 py-3 font-medium">Due</th>
            <th className="px-4 py-3 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-200/70 text-slate-700">
              <td className="px-4 py-3 font-medium text-slate-900">{row.title}</td>
              <td className="px-4 py-3">{row.listTitle}</td>
              <td className="px-4 py-3">{formatCardDueDateLabel(row.dueDate) ?? "No date"}</td>
              <td className="px-4 py-3 text-slate-500">
                {row.description?.trim() ? row.description : "No description"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
