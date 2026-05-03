"use client";

import { useCallback, useState, Suspense } from "react";
import { TimelineView, type TimelineGroupBy } from "@/components/timeline/timeline-view";
import { IssueDetailPanel } from "@/components/issues/issue-detail-panel";
import { FilterBar } from "@/components/filters/filter-bar";
import { useIssueFilters } from "@/lib/hooks/use-issue-filters";
import { useIssueFromUrl } from "@/lib/hooks/use-issue-from-url";
import type { IssueWithDetails } from "@/lib/queries/issues";
import { getIssueClient } from "@/lib/queries/issues-client";
import type { Tables } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface TimelineWithDetailProps {
  initialIssues: IssueWithDetails[];
  projectId: string;
  members?: {
    user_id: string;
    profile: {
      id: string;
      full_name: string | null;
      email: string;
      avatar_url: string | null;
    };
  }[];
  sprints?: Tables<"sprints">[];
  labels?: { id: string; name: string; color: string }[];
}

const GROUP_BY_OPTIONS: { value: TimelineGroupBy; label: string }[] = [
  { value: "none", label: "None" },
  { value: "sprint", label: "Sprint" },
  { value: "assignee", label: "Assignee" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
];

function TimelineWithDetailInner({
  initialIssues,
  projectId,
  members = [],
  sprints = [],
  labels = [],
}: TimelineWithDetailProps) {
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [selectedIssueFallback, setSelectedIssueFallback] =
    useState<IssueWithDetails | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<TimelineGroupBy>("none");

  const openIssue = useCallback((issue: IssueWithDetails) => {
    setSelectedIssueId(issue.id);
    setSelectedIssueFallback(issue);
    setDetailOpen(true);
  }, []);

  const handleIssueClick = useCallback(
    async (id: string) => {
      const issue =
        initialIssues.find((item) => item.id === id) ??
        (await getIssueClient(id));
      if (issue) openIssue(issue);
    },
    [initialIssues, openIssue],
  );

  useIssueFromUrl(initialIssues, openIssue);

  const {
    filters,
    searchQuery,
    setSearchQuery,
    toggleFilter,
    clearFilter,
    clearAll,
    hasActiveFilters,
    issueFilterFn,
    searchInputRef,
  } = useIssueFilters({
    issues: initialIssues,
    enabledFilters: ["status", "priority", "assignee", "label"],
  });

  const selectedIssue = selectedIssueId
    ? initialIssues.find((issue) => issue.id === selectedIssueId) ??
      selectedIssueFallback
    : null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <FilterBar
            filters={filters}
            searchQuery={searchQuery}
            searchInputRef={searchInputRef}
            onSearchChange={setSearchQuery}
            onToggleFilter={toggleFilter}
            onClearFilter={clearFilter}
            onClearAll={clearAll}
            hasActiveFilters={hasActiveFilters}
            enabledFilters={["status", "priority", "assignee", "label"]}
            members={members}
            labels={labels}
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-text-secondary shrink-0">
          <span className="font-mono uppercase tracking-widest text-[10px] text-text-muted">
            Group
          </span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as TimelineGroupBy)}
            className={cn(
              "h-8 rounded-lg border border-border bg-surface px-2 text-xs",
              "focus:outline-none focus:ring-2 focus:ring-primary/30",
            )}
          >
            {GROUP_BY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <TimelineView
        initialIssues={initialIssues}
        projectId={projectId}
        sprints={sprints}
        groupBy={groupBy}
        issueFilter={issueFilterFn}
        onIssueClick={handleIssueClick}
      />
      <IssueDetailPanel
        key={selectedIssue?.id ?? "issue-detail-empty"}
        issue={selectedIssue}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        members={members}
        sprints={sprints}
        labels={labels}
        onIssueNavigate={handleIssueClick}
      />
    </div>
  );
}

export function TimelineWithDetail(props: TimelineWithDetailProps) {
  return (
    <Suspense>
      <TimelineWithDetailInner {...props} />
    </Suspense>
  );
}
