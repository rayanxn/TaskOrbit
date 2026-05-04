"use client";

import { useState, useCallback, useEffect, useMemo, useRef, Suspense } from "react";
import { IssueList } from "@/components/issues/issue-list";
import { IssueDetailPanel } from "@/components/issues/issue-detail-panel";
import { useIssueFromUrl } from "@/lib/hooks/use-issue-from-url";
import { FilterBar } from "@/components/filters/filter-bar";
import { useIssueFilters } from "@/lib/hooks/use-issue-filters";
import { useRealtimeIssues } from "@/lib/hooks/use-realtime-issues";
import { PresenceProvider, usePresence } from "@/providers/presence-provider";
import { PresenceStack } from "@/components/presence/presence-stack";
import type { IssueWithDetails } from "@/lib/queries/issues";
import { getIssueClient } from "@/lib/queries/issues-client";

interface ListViewContentProps {
  projectId: string;
  issues: IssueWithDetails[];
  members: { user_id: string; profile: { id: string; full_name: string | null; email: string; avatar_url: string | null } }[];
  sprints: { id: string; name: string; status: string; project_id?: string }[];
  labels: { id: string; name: string; color: string }[];
}

function ListViewContentInner({
  projectId,
  issues: initialIssues,
  members,
  sprints,
  labels,
}: ListViewContentProps) {
  const presence = usePresence();
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [selectedIssueFallback, setSelectedIssueFallback] = useState<IssueWithDetails | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [flashingIds, setFlashingIds] = useState<Set<string>>(() => new Set());
  const flashTimers = useRef<Map<string, number>>(new Map());

  const handleRemoteUpdate = useCallback((issueId: string) => {
    setFlashingIds((prev) => {
      if (prev.has(issueId)) return prev;
      const next = new Set(prev);
      next.add(issueId);
      return next;
    });
    const existing = flashTimers.current.get(issueId);
    if (existing) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      setFlashingIds((prev) => {
        if (!prev.has(issueId)) return prev;
        const next = new Set(prev);
        next.delete(issueId);
        return next;
      });
      flashTimers.current.delete(issueId);
    }, 700);
    flashTimers.current.set(issueId, timer);
  }, []);

  useEffect(() => {
    const timers = flashTimers.current;
    return () => {
      for (const t of timers.values()) window.clearTimeout(t);
      timers.clear();
    };
  }, []);

  const { issues } = useRealtimeIssues({
    projectId,
    initialIssues,
    isSelfUpdate: presence.isSelfUpdate,
    onRemoteUpdate: handleRemoteUpdate,
  });

  const {
    filters,
    searchQuery,
    setSearchQuery,
    toggleFilter,
    clearFilter,
    clearAll,
    filteredIssues,
    hasActiveFilters,
    searchInputRef,
  } = useIssueFilters({
    issues,
    enabledFilters: ["status", "priority", "assignee", "label"],
  });

  const openIssue = useCallback(
    (issue: IssueWithDetails) => {
      setSelectedIssueId(issue.id);
      setSelectedIssueFallback(issue);
      setDetailOpen(true);
    },
    []
  );

  const selectedIssue = selectedIssueId
    ? issues.find((issue) => issue.id === selectedIssueId) ?? selectedIssueFallback
    : null;

  const handleIssueClick = useCallback(
    async (id: string) => {
      const issue = issues.find((i) => i.id === id) ?? (await getIssueClient(id));
      if (issue) openIssue(issue);
    },
    [issues, openIssue]
  );

  useIssueFromUrl(issues, openIssue);

  useEffect(() => {
    presence.setFocusedIssue(detailOpen && selectedIssueId ? selectedIssueId : null);
  }, [detailOpen, selectedIssueId, presence]);

  const watchersByIssue = useMemo(
    () => presence.peersByIssue,
    [presence.peersByIssue],
  );

  return (
    <>
      <div className="flex items-center justify-between gap-4 px-6 pb-2">
        <div className="min-w-0 flex-1">
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
        <PresenceStack peers={presence.peers} />
      </div>
      <IssueList
        issues={filteredIssues}
        showProject={false}
        onIssueClick={handleIssueClick}
        treeMode
        watchersByIssue={watchersByIssue}
        flashingIds={flashingIds}
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
    </>
  );
}

export function ListViewContent(props: ListViewContentProps) {
  return (
    <Suspense>
      <PresenceProvider
        projectId={props.projectId}
        view="list"
        members={props.members}
      >
        <ListViewContentInner {...props} />
      </PresenceProvider>
    </Suspense>
  );
}
