"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { addDays } from "date-fns";
import { toast } from "sonner";
import type { IssueWithDetails } from "@/lib/queries/issues";
import type { Tables } from "@/lib/types";
import { useRealtimeIssues } from "@/lib/hooks/use-realtime-issues";
import { updateIssue } from "@/lib/actions/issues";
import type { TimelineScale } from "@/lib/utils/timeline";
import {
  SCALE_CONFIG,
  getDateRange,
  getColumnCount,
  generateDateHeaders,
  getEffectiveStart,
  getPixelsPerDay,
  getPixelOffset,
  toDateString,
} from "@/lib/utils/timeline";
import { STATUS_CONFIG, STATUS_ORDER } from "@/lib/utils/statuses";
import { PRIORITY_CONFIG } from "@/lib/utils/priorities";
import type { IssueStatus, IssuePriority } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const SCALES: TimelineScale[] = ["day", "week", "month"];
const ROW_HEIGHT = 44;
const GROUP_HEADER_HEIGHT = 28;
const CLICK_THRESHOLD_PX = 4;
const MIN_BAR_WIDTH_PX = 8;

export type TimelineGroupBy =
  | "none"
  | "sprint"
  | "assignee"
  | "status"
  | "priority";

type DatedIssue = IssueWithDetails & { due_date: string };

type DragMode = "move" | "resize-start" | "resize-end";

interface DragState {
  id: string;
  mode: DragMode;
  startX: number;
  originalStart: Date;
  originalDue: Date;
  deltaDays: number;
  hasMoved: boolean;
}

type IssueEntry = {
  kind: "issue";
  key: string;
  issue: DatedIssue;
  top: number;
  height: number;
  rowParity: number;
};
type GroupHeaderEntry = {
  kind: "header";
  key: string;
  label: string;
  top: number;
  height: number;
};
type Entry = IssueEntry | GroupHeaderEntry;

interface TimelineViewProps {
  initialIssues: IssueWithDetails[];
  projectId: string;
  sprints?: Tables<"sprints">[];
  groupBy?: TimelineGroupBy;
  issueFilter?: (issue: IssueWithDetails) => boolean;
  onIssueClick?: (id: string) => void;
}

const SPRINT_BAND_STYLES: Record<
  Tables<"sprints">["status"],
  { fill: string; label: string; border: string }
> = {
  active: {
    fill: "bg-primary/8",
    label: "bg-primary/15 text-primary",
    border: "border-l border-r border-primary/30",
  },
  planning: {
    fill: "bg-text-muted/5",
    label: "bg-text-muted/15 text-text-secondary",
    border: "border-l border-r border-dashed border-text-muted/30",
  },
  completed: {
    fill: "bg-text-muted/5",
    label: "bg-text-muted/10 text-text-muted",
    border: "border-l border-r border-text-muted/20",
  },
};

function groupIssue(
  issue: DatedIssue,
  groupBy: TimelineGroupBy,
  sprintMap: Map<string, Tables<"sprints">>,
): { key: string; label: string; sortKey: string } {
  switch (groupBy) {
    case "sprint": {
      if (!issue.sprint_id) return { key: "no-sprint", label: "No sprint", sortKey: "~" };
      const sprint = sprintMap.get(issue.sprint_id);
      return {
        key: issue.sprint_id,
        label: sprint?.name ?? "Sprint",
        sortKey: sprint?.start_date ?? sprint?.name ?? issue.sprint_id,
      };
    }
    case "assignee": {
      if (!issue.assignee)
        return { key: "unassigned", label: "Unassigned", sortKey: "~" };
      const name = issue.assignee.full_name ?? issue.assignee.email;
      return { key: issue.assignee.id, label: name, sortKey: name.toLowerCase() };
    }
    case "status": {
      const status = issue.status as IssueStatus;
      return {
        key: status,
        label: STATUS_CONFIG[status].label,
        sortKey: String(STATUS_ORDER.indexOf(status)).padStart(2, "0"),
      };
    }
    case "priority": {
      const p = issue.priority as IssuePriority;
      return {
        key: String(p),
        label: PRIORITY_CONFIG[p].label,
        sortKey: String(p),
      };
    }
    case "none":
    default:
      return { key: "all", label: "All", sortKey: "" };
  }
}

export function TimelineView({
  initialIssues,
  projectId,
  sprints = [],
  groupBy = "none",
  issueFilter,
  onIssueClick,
}: TimelineViewProps) {
  const [scale, setScale] = useState<TimelineScale>("week");
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const { issues, setIssues } = useRealtimeIssues({ projectId, initialIssues });

  const sprintMap = useMemo(
    () => new Map(sprints.map((s) => [s.id, s])),
    [sprints],
  );

  const datedIssues = useMemo<DatedIssue[]>(
    () =>
      issues
        .filter((i): i is DatedIssue => Boolean(i.due_date))
        .filter((i) => (issueFilter ? issueFilter(i) : true)),
    [issues, issueFilter],
  );

  const entries = useMemo<Entry[]>(() => {
    if (datedIssues.length === 0) return [];

    // Bucket by group key
    const buckets = new Map<
      string,
      { label: string; sortKey: string; issues: DatedIssue[] }
    >();
    for (const issue of datedIssues) {
      const g = groupIssue(issue, groupBy, sprintMap);
      const existing = buckets.get(g.key);
      if (existing) existing.issues.push(issue);
      else
        buckets.set(g.key, {
          label: g.label,
          sortKey: g.sortKey,
          issues: [issue],
        });
    }

    // Order groups by sortKey (stable)
    const orderedGroups = [...buckets.entries()].sort((a, b) =>
      a[1].sortKey.localeCompare(b[1].sortKey),
    );

    // Within each group, sort by due_date asc
    for (const [, bucket] of orderedGroups) {
      bucket.issues.sort((a, b) => a.due_date.localeCompare(b.due_date));
    }

    const result: Entry[] = [];
    let cursor = 0;
    let parity = 0;
    for (const [key, { label, issues: groupIssues }] of orderedGroups) {
      if (groupBy !== "none") {
        result.push({
          kind: "header",
          key: `header-${key}`,
          label,
          top: cursor,
          height: GROUP_HEADER_HEIGHT,
        });
        cursor += GROUP_HEADER_HEIGHT;
        parity = 0;
      }
      for (const issue of groupIssues) {
        result.push({
          kind: "issue",
          key: issue.id,
          issue,
          top: cursor,
          height: ROW_HEIGHT,
          rowParity: parity,
        });
        cursor += ROW_HEIGHT;
        parity = 1 - parity;
      }
    }
    return result;
  }, [datedIssues, groupBy, sprintMap]);

  const totalHeight = entries.length
    ? entries[entries.length - 1].top + entries[entries.length - 1].height
    : 0;

  const range = useMemo(
    () => (datedIssues.length > 0 ? getDateRange(datedIssues) : null),
    [datedIssues],
  );

  const beginDrag = useCallback(
    (
      e: React.PointerEvent<HTMLElement>,
      issue: DatedIssue,
      mode: DragMode,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const next: DragState = {
        id: issue.id,
        mode,
        startX: e.clientX,
        originalStart: getEffectiveStart(issue),
        originalDue: new Date(issue.due_date),
        deltaDays: 0,
        hasMoved: false,
      };
      dragRef.current = next;
      setDrag(next);
    },
    [],
  );

  const moveDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const current = dragRef.current;
      if (!current) return;
      const pxPerDay = getPixelsPerDay(scale);
      const deltaPx = e.clientX - current.startX;
      const deltaDays = Math.round(deltaPx / pxPerDay);
      const moved =
        current.hasMoved || Math.abs(deltaPx) >= CLICK_THRESHOLD_PX;
      if (deltaDays === current.deltaDays && moved === current.hasMoved) return;
      const next = { ...current, deltaDays, hasMoved: moved };
      dragRef.current = next;
      setDrag(next);
    },
    [scale],
  );

  const endDrag = useCallback(
    async (e: React.PointerEvent<HTMLElement>, issue: DatedIssue) => {
      const current = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!current) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // capture may already be released
      }

      if (!current.hasMoved) {
        onIssueClick?.(issue.id);
        return;
      }

      const { mode, deltaDays, originalStart, originalDue } = current;
      let newStart = originalStart;
      let newDue = originalDue;

      if (mode === "move") {
        newStart = addDays(originalStart, deltaDays);
        newDue = addDays(originalDue, deltaDays);
      } else if (mode === "resize-start") {
        newStart = addDays(originalStart, deltaDays);
        if (newStart > newDue) newStart = newDue;
      } else if (mode === "resize-end") {
        newDue = addDays(originalDue, deltaDays);
        if (newDue < newStart) newDue = newStart;
      }

      const startStr = toDateString(newStart);
      const dueStr = toDateString(newDue);
      if (startStr === issue.start_date && dueStr === issue.due_date) {
        return;
      }

      // Optimistic local update so the bar lands at its new position
      // immediately; realtime will reconcile.
      setIssues((prev) =>
        prev.map((i) =>
          i.id === issue.id
            ? { ...i, start_date: startStr, due_date: dueStr }
            : i,
        ),
      );

      const result = await updateIssue(issue.id, {
        start_date: startStr,
        due_date: dueStr,
      });
      if (result.error) {
        toast.error(result.error);
        // Revert on failure
        setIssues((prev) =>
          prev.map((i) =>
            i.id === issue.id
              ? {
                  ...i,
                  start_date: issue.start_date,
                  due_date: issue.due_date,
                }
              : i,
          ),
        );
      }
    },
    [onIssueClick, setIssues],
  );

  if (datedIssues.length === 0 || !range) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <h2 className="text-lg font-medium text-text">No timeline data</h2>
        <p className="mt-1 text-sm text-text-muted">
          Issues need a due date to appear on the timeline.
        </p>
      </div>
    );
  }

  const { start, end } = range;
  const colCount = getColumnCount(start, end, scale);
  const { colWidth } = SCALE_CONFIG[scale];
  const headers = generateDateHeaders(start, end, scale);
  const gridWidth = colCount * colWidth;
  const pxPerDay = getPixelsPerDay(scale);
  const todayOffset = getPixelOffset(new Date(), start, scale);
  const todayWithinRange = todayOffset >= 0 && todayOffset <= gridWidth;

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    if (headerRef.current) {
      headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }

  function scrollToToday() {
    const body = bodyRef.current;
    if (!body || !todayWithinRange) return;
    const target = todayOffset + pxPerDay / 2 - body.clientWidth / 2;
    body.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
    if (headerRef.current) {
      headerRef.current.scrollLeft = Math.max(0, target);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scale toggle + Today */}
      <div className="flex items-center justify-end px-6 py-3 gap-2 border-b border-border/50">
        <button
          type="button"
          onClick={scrollToToday}
          disabled={!todayWithinRange}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium border border-border transition-colors",
            todayWithinRange
              ? "text-text hover:bg-surface-hover"
              : "text-text-muted opacity-50 cursor-not-allowed",
          )}
        >
          Today
        </button>
        <div className="flex items-center gap-1">
          {SCALES.map((s) => (
            <button
              key={s}
              onClick={() => setScale(s)}
              aria-pressed={scale === s}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                scale === s
                  ? "bg-primary text-background"
                  : "text-text-secondary hover:bg-surface-hover",
              )}
            >
              {SCALE_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: issue list */}
        <div className="w-72 shrink-0 border-r border-border/50 flex flex-col">
          <div className="h-10 border-b border-border/50 px-4 flex items-center">
            <span className="text-[10px] font-medium uppercase tracking-widest text-text-muted font-mono">
              Issue
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {entries.map((entry) =>
              entry.kind === "header" ? (
                <div
                  key={entry.key}
                  className="flex items-center gap-2 px-4 bg-surface-inset border-b border-border/30"
                  style={{ height: entry.height }}
                >
                  <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
                    {entry.label}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  key={entry.key}
                  onClick={() => onIssueClick?.(entry.issue.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 border-b border-border/20 text-left transition-colors hover:bg-surface-hover",
                    entry.rowParity === 1 && "bg-surface-inset/50",
                  )}
                  style={{ height: entry.height }}
                >
                  <span
                    className="inline-flex items-center justify-center rounded-full px-1.5 h-4 shrink-0 text-[9px] font-mono font-semibold"
                    style={{
                      color:
                        PRIORITY_CONFIG[entry.issue.priority as IssuePriority].color,
                      backgroundColor:
                        PRIORITY_CONFIG[entry.issue.priority as IssuePriority].bgColor,
                    }}
                    title={`Priority: ${PRIORITY_CONFIG[entry.issue.priority as IssuePriority].label}`}
                  >
                    {PRIORITY_CONFIG[entry.issue.priority as IssuePriority].label}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded px-1.5 h-4 shrink-0 text-[9px] font-mono font-medium"
                    style={{
                      color:
                        STATUS_CONFIG[entry.issue.status as IssueStatus].color,
                      backgroundColor:
                        STATUS_CONFIG[entry.issue.status as IssueStatus].color +
                        "20",
                    }}
                    title={`Status: ${STATUS_CONFIG[entry.issue.status as IssueStatus].label}`}
                  >
                    <span
                      className="inline-block size-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          STATUS_CONFIG[entry.issue.status as IssueStatus].color,
                      }}
                    />
                    {STATUS_CONFIG[entry.issue.status as IssueStatus].label}
                  </span>
                  <span className="text-[11px] font-mono text-text-muted shrink-0">
                    {entry.issue.issue_key}
                  </span>
                  <span
                    className="text-xs text-text truncate"
                    title={entry.issue.title}
                  >
                    {entry.issue.title}
                  </span>
                </button>
              ),
            )}
          </div>
        </div>

        {/* Right panel: timeline grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            ref={headerRef}
            className="h-10 border-b border-border/50 overflow-hidden"
          >
            <div className="relative h-full" style={{ width: gridWidth }}>
              {headers.map((header) => (
                <div
                  key={header.column}
                  className={cn(
                    "absolute top-0 h-full flex items-center justify-center border-r border-border/20 text-[10px] font-mono",
                    header.isToday
                      ? "text-primary font-semibold"
                      : "text-text-muted",
                  )}
                  style={{
                    left: (header.column - 1) * colWidth,
                    width: colWidth,
                  }}
                >
                  {header.label}
                </div>
              ))}
            </div>
          </div>

          <div
            ref={bodyRef}
            className="flex-1 overflow-auto"
            onScroll={handleScroll}
          >
            <div
              className="relative"
              style={{
                width: gridWidth,
                height: totalHeight,
              }}
            >
              {/* Column grid lines */}
              {headers.map((header) => (
                <div
                  key={`grid-${header.column}`}
                  className="absolute top-0 h-full border-r border-border/10"
                  style={{
                    left: (header.column - 1) * colWidth,
                    width: colWidth,
                  }}
                />
              ))}

              {/* Row backgrounds (alternating + group header band) */}
              {entries.map((entry) =>
                entry.kind === "header" ? (
                  <div
                    key={`bg-${entry.key}`}
                    className="absolute left-0 w-full bg-surface-inset border-b border-border/30"
                    style={{ top: entry.top, height: entry.height }}
                  />
                ) : entry.rowParity === 1 ? (
                  <div
                    key={`bg-${entry.key}`}
                    className="absolute left-0 w-full bg-surface-inset/50"
                    style={{ top: entry.top, height: entry.height }}
                  />
                ) : null,
              )}

              {/* Sprint bands */}
              {sprints
                .filter((s) => s.start_date && s.end_date)
                .map((sprint) => {
                  const left = Math.max(
                    0,
                    getPixelOffset(sprint.start_date!, start, scale),
                  );
                  const rawRight =
                    getPixelOffset(sprint.end_date!, start, scale) + pxPerDay;
                  const right = Math.min(gridWidth, rawRight);
                  if (right <= 0 || left >= gridWidth || right <= left)
                    return null;
                  const styles = SPRINT_BAND_STYLES[sprint.status];
                  return (
                    <div
                      key={`sprint-${sprint.id}`}
                      className={cn(
                        "absolute top-0 h-full pointer-events-none",
                        styles.fill,
                        styles.border,
                      )}
                      style={{
                        left,
                        width: right - left,
                      }}
                    >
                      <div
                        className={cn(
                          "absolute top-1 left-1 px-1.5 py-0.5 rounded font-mono text-[9px] font-semibold uppercase tracking-wide truncate max-w-[calc(100%-0.5rem)]",
                          styles.label,
                        )}
                        title={sprint.name}
                      >
                        {sprint.name}
                      </div>
                    </div>
                  );
                })}

              {/* Today marker */}
              {todayWithinRange && (
                <div
                  className="absolute top-0 h-full w-0.5 bg-primary/60 z-10"
                  style={{
                    left: todayOffset + pxPerDay / 2,
                  }}
                >
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 rounded-b bg-primary px-1.5 py-0.5 font-mono text-[9px] font-semibold text-background">
                    TODAY
                  </div>
                </div>
              )}

              {/* Issue bars */}
              {entries.map((entry) => {
                if (entry.kind !== "issue") return null;
                const issue = entry.issue;
                const isDragging = drag?.id === issue.id;
                const baseStart = getEffectiveStart(issue);
                const baseDue = new Date(issue.due_date);

                let displayStart = baseStart;
                let displayDue = baseDue;
                if (isDragging && drag) {
                  if (drag.mode === "move") {
                    displayStart = addDays(baseStart, drag.deltaDays);
                    displayDue = addDays(baseDue, drag.deltaDays);
                  } else if (drag.mode === "resize-start") {
                    const candidate = addDays(baseStart, drag.deltaDays);
                    displayStart = candidate > baseDue ? baseDue : candidate;
                  } else if (drag.mode === "resize-end") {
                    const candidate = addDays(baseDue, drag.deltaDays);
                    displayDue = candidate < baseStart ? baseStart : candidate;
                  }
                }

                const rawStart = getPixelOffset(displayStart, start, scale);
                const rawEnd =
                  getPixelOffset(displayDue, start, scale) + pxPerDay;
                const barStart = Math.max(0, rawStart);
                const barEnd = Math.max(rawEnd, barStart + MIN_BAR_WIDTH_PX);
                const barWidth = barEnd - barStart;
                const statusColor =
                  STATUS_CONFIG[issue.status as IssueStatus].color;

                const initials = issue.assignee?.full_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <div
                    key={`bar-${entry.key}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${issue.issue_key}: ${issue.title}`}
                    onPointerDown={(e) => beginDrag(e, issue, "move")}
                    onPointerMove={moveDrag}
                    onPointerUp={(e) => endDrag(e, issue)}
                    onPointerCancel={() => {
                      dragRef.current = null;
                      setDrag(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onIssueClick?.(issue.id);
                      }
                    }}
                    className={cn(
                      "absolute flex items-center select-none touch-none rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isDragging ? "cursor-grabbing" : "cursor-grab",
                    )}
                    style={{
                      left: barStart,
                      width: barWidth,
                      top: entry.top + 10,
                      height: entry.height - 20,
                    }}
                  >
                    <div
                      className="h-full w-full rounded-md flex items-center justify-end px-1.5 transition-opacity hover:opacity-90"
                      style={{ backgroundColor: statusColor + "30" }}
                    >
                      <div
                        className="h-full rounded-md"
                        style={{
                          backgroundColor: statusColor,
                          width: "100%",
                          opacity: 0.7,
                          position: "absolute",
                          left: 0,
                          top: 0,
                          borderRadius: "6px",
                        }}
                      />
                      {issue.assignee && initials && (
                        <div
                          className="relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface/90"
                          title={issue.assignee.full_name ?? undefined}
                        >
                          <span className="text-[8px] font-semibold text-text">
                            {initials}
                          </span>
                        </div>
                      )}
                    </div>
                    <div
                      onPointerDown={(e) => beginDrag(e, issue, "resize-start")}
                      onPointerMove={moveDrag}
                      onPointerUp={(e) => endDrag(e, issue)}
                      className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize"
                      aria-hidden
                    />
                    <div
                      onPointerDown={(e) => beginDrag(e, issue, "resize-end")}
                      onPointerMove={moveDrag}
                      onPointerUp={(e) => endDrag(e, issue)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize"
                      aria-hidden
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
