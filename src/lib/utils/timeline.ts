import {
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  addDays,
  addWeeks,
  addMonths,
  startOfDay,
  startOfWeek,
  startOfMonth,
  isSameWeek,
  isSameMonth,
  format,
} from "date-fns";

export type TimelineScale = "day" | "week" | "month";

export const SCALE_CONFIG: Record<TimelineScale, { colWidth: number; label: string }> = {
  day: { colWidth: 40, label: "Day" },
  week: { colWidth: 120, label: "Week" },
  month: { colWidth: 160, label: "Month" },
};

// Average days per column unit, used to translate horizontal drag pixels into
// integer day deltas. Month uses 30.44 (365.25/12) for stable rounding.
const DAYS_PER_UNIT: Record<TimelineScale, number> = {
  day: 1,
  week: 7,
  month: 30.44,
};

export function getPixelsPerDay(scale: TimelineScale): number {
  return SCALE_CONFIG[scale].colWidth / DAYS_PER_UNIT[scale];
}

export function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function daysBetween(a: Date | string, b: Date | string): number {
  const dateA = typeof a === "string" ? new Date(a) : a;
  const dateB = typeof b === "string" ? new Date(b) : b;
  return differenceInDays(dateB, dateA);
}

// Bar start = explicit start_date if set, else 1 day before due_date.
// This avoids the old created_at fallback, which conflated "logged at" with
// "planned to start" and produced misleadingly long bars on legacy issues.
export function getEffectiveStart(issue: {
  start_date: string | null;
  due_date: string;
}): Date {
  if (issue.start_date) return startOfDay(new Date(issue.start_date));
  return addDays(startOfDay(new Date(issue.due_date)), -1);
}

export function getDateRange(
  issues: { start_date: string | null; due_date: string }[]
): { start: Date; end: Date } {
  if (issues.length === 0) {
    const now = new Date();
    return { start: now, end: addDays(now, 30) };
  }

  const dates = issues.flatMap((i) => [
    getEffectiveStart(i),
    startOfDay(new Date(i.due_date)),
  ]);

  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));

  return {
    start: addDays(min, -3),
    end: addDays(max, 5),
  };
}

export function getColumnForDate(
  date: Date | string,
  startDate: Date,
  scale: TimelineScale
): number {
  const d = typeof date === "string" ? new Date(date) : date;
  switch (scale) {
    case "day":
      return differenceInDays(d, startDate) + 1;
    case "week":
      return differenceInWeeks(d, startDate) + 1;
    case "month":
      return differenceInMonths(d, startDate) + 1;
  }
}

// Sub-column-precise pixel offset for a date. Used to position bars and the
// today marker so a 3-day bar at week scale shows as ~3 days wide, not a
// full week column.
export function getPixelOffset(
  date: Date | string,
  startDate: Date,
  scale: TimelineScale,
): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return differenceInDays(d, startDate) * getPixelsPerDay(scale);
}

export function getColumnCount(
  startDate: Date,
  endDate: Date,
  scale: TimelineScale
): number {
  switch (scale) {
    case "day":
      return differenceInDays(endDate, startDate) + 1;
    case "week":
      return differenceInWeeks(endDate, startDate) + 2;
    case "month":
      return differenceInMonths(endDate, startDate) + 2;
  }
}

export type DateHeader = {
  label: string;
  column: number;
  isToday?: boolean;
};

export function generateDateHeaders(
  startDate: Date,
  endDate: Date,
  scale: TimelineScale
): DateHeader[] {
  const headers: DateHeader[] = [];
  const today = startOfDay(new Date());

  let current: Date;
  let addFn: (date: Date, amount: number) => Date;
  let formatStr: string;

  switch (scale) {
    case "day":
      current = startOfDay(startDate);
      addFn = addDays;
      formatStr = "MMM d";
      break;
    case "week":
      current = startOfWeek(startDate, { weekStartsOn: 1 });
      addFn = addWeeks;
      formatStr = "MMM d";
      break;
    case "month":
      current = startOfMonth(startDate);
      addFn = addMonths;
      formatStr = "MMM yyyy";
      break;
  }

  let col = 1;
  while (current <= endDate) {
    let isToday = false;
    switch (scale) {
      case "day":
        isToday = current.getTime() === today.getTime();
        break;
      case "week":
        isToday = isSameWeek(current, today, { weekStartsOn: 1 });
        break;
      case "month":
        isToday = isSameMonth(current, today);
        break;
    }
    headers.push({
      label: format(current, formatStr),
      column: col,
      isToday,
    });
    current = addFn(current, 1);
    col++;
  }

  return headers;
}

export function getTodayColumn(
  startDate: Date,
  scale: TimelineScale
): number | null {
  const today = startOfDay(new Date());
  const col = getColumnForDate(today, startDate, scale);
  return col > 0 ? col : null;
}
