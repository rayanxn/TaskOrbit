"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type PresenceView = "board" | "list";

export interface PeerProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export interface PresencePayload {
  userId: string;
  view: PresenceView;
  focusedIssueId: string | null;
  draggingIssueId: string | null;
  ts: number;
}

export interface Peer extends PresencePayload {
  profile: PeerProfile;
}

interface DragBroadcast {
  userId: string;
  issueId: string;
  ts: number;
}

interface UsePresenceChannelOptions {
  projectId: string;
  view: PresenceView;
  members: { user_id: string; profile: PeerProfile }[];
}

const HEARTBEAT_MS = 30_000;
const DRAG_BROADCAST_TTL = 4_000;

export function usePresenceChannel({
  projectId,
  view,
  members,
}: UsePresenceChannelOptions) {
  const [selfUserId, setSelfUserId] = useState<string | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [draggingFromBroadcast, setDraggingFromBroadcast] = useState<
    Record<string, DragBroadcast>
  >({});

  const channelRef = useRef<RealtimeChannel | null>(null);
  const stateRef = useRef<PresencePayload | null>(null);
  const subscribedRef = useRef(false);

  const profileById = useMemo(() => {
    const map = new Map<string, PeerProfile>();
    for (const member of members) {
      map.set(member.user_id, member.profile);
    }
    return map;
  }, [members]);

  // Fetch the current user's id once.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (data.user) setSelfUserId(data.user.id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe once we have user + project.
  useEffect(() => {
    if (!selfUserId || !projectId) return;

    const supabase = createClient();
    const channel = supabase.channel(`project:${projectId}:presence`, {
      config: {
        presence: { key: selfUserId },
        broadcast: { self: false },
      },
    });
    channelRef.current = channel;

    const initial: PresencePayload = {
      userId: selfUserId,
      view,
      focusedIssueId: null,
      draggingIssueId: null,
      ts: Date.now(),
    };
    stateRef.current = initial;

    const reduceFromState = () => {
      const raw = channel.presenceState() as Record<
        string,
        Array<Record<string, unknown>>
      >;
      const next: Peer[] = [];
      for (const userId of Object.keys(raw)) {
        if (userId === selfUserId) continue;
        const entries = raw[userId];
        if (!entries || entries.length === 0) continue;
        const last = entries[entries.length - 1] as unknown as PresencePayload;
        const profile =
          profileById.get(userId) ??
          ({
            id: userId,
            full_name: null,
            email: "",
            avatar_url: null,
          } satisfies PeerProfile);
        next.push({
          userId,
          view: last.view ?? "board",
          focusedIssueId: last.focusedIssueId ?? null,
          draggingIssueId: last.draggingIssueId ?? null,
          ts: last.ts ?? Date.now(),
          profile,
        });
      }
      next.sort((a, b) => a.userId.localeCompare(b.userId));
      setPeers(next);
    };

    channel
      .on("presence", { event: "sync" }, reduceFromState)
      .on("presence", { event: "join" }, reduceFromState)
      .on("presence", { event: "leave" }, reduceFromState)
      .on(
        "broadcast",
        { event: "drag:start" },
        ({ payload }: { payload: DragBroadcast }) => {
          if (!payload || payload.userId === selfUserId) return;
          setDraggingFromBroadcast((prev) => ({
            ...prev,
            [payload.userId]: payload,
          }));
        },
      )
      .on(
        "broadcast",
        { event: "drag:end" },
        ({ payload }: { payload: DragBroadcast }) => {
          if (!payload || payload.userId === selfUserId) return;
          setDraggingFromBroadcast((prev) => {
            if (!prev[payload.userId]) return prev;
            const next = { ...prev };
            delete next[payload.userId];
            return next;
          });
        },
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          subscribedRef.current = true;
          await channel.track(stateRef.current ?? initial);
        }
      });

    const heartbeat = window.setInterval(() => {
      if (subscribedRef.current && stateRef.current) {
        channel.track({ ...stateRef.current, ts: Date.now() });
      }
    }, HEARTBEAT_MS);

    // Auto-clear stale broadcast entries.
    const sweep = window.setInterval(() => {
      const now = Date.now();
      setDraggingFromBroadcast((prev) => {
        let changed = false;
        const next: Record<string, DragBroadcast> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.ts < DRAG_BROADCAST_TTL) {
            next[k] = v;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1_000);

    return () => {
      window.clearInterval(heartbeat);
      window.clearInterval(sweep);
      subscribedRef.current = false;
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [selfUserId, projectId, view, profileById]);

  // Patch local presence state and re-track.
  const patchState = useCallback((patch: Partial<PresencePayload>) => {
    if (!stateRef.current) return;
    const next: PresencePayload = {
      ...stateRef.current,
      ...patch,
      ts: Date.now(),
    };
    stateRef.current = next;
    if (subscribedRef.current && channelRef.current) {
      channelRef.current.track(next);
    }
  }, []);

  const setFocusedIssue = useCallback(
    (issueId: string | null) => patchState({ focusedIssueId: issueId }),
    [patchState],
  );

  const broadcastDragStart = useCallback(
    (issueId: string) => {
      if (!channelRef.current || !selfUserId) return;
      patchState({ draggingIssueId: issueId });
      channelRef.current.send({
        type: "broadcast",
        event: "drag:start",
        payload: { userId: selfUserId, issueId, ts: Date.now() },
      });
    },
    [patchState, selfUserId],
  );

  const broadcastDragEnd = useCallback(
    (issueId: string) => {
      if (!channelRef.current || !selfUserId) return;
      patchState({ draggingIssueId: null });
      channelRef.current.send({
        type: "broadcast",
        event: "drag:end",
        payload: { userId: selfUserId, issueId, ts: Date.now() },
      });
    },
    [patchState, selfUserId],
  );

  // Merge presence + broadcast into a single dragging-by-issue map.
  const draggingByIssue = useMemo(() => {
    const map = new Map<string, Peer>();
    for (const peer of peers) {
      if (peer.draggingIssueId) {
        map.set(peer.draggingIssueId, peer);
      }
    }
    // Broadcast events override (lower-latency) until the next presence sync.
    for (const broadcast of Object.values(draggingFromBroadcast)) {
      const existing = peers.find((p) => p.userId === broadcast.userId);
      if (!existing) continue;
      map.set(broadcast.issueId, { ...existing, draggingIssueId: broadcast.issueId });
    }
    return map;
  }, [peers, draggingFromBroadcast]);

  const peersByIssue = useMemo(() => {
    const map = new Map<string, Peer[]>();
    for (const peer of peers) {
      if (!peer.focusedIssueId) continue;
      const list = map.get(peer.focusedIssueId) ?? [];
      list.push(peer);
      map.set(peer.focusedIssueId, list);
    }
    return map;
  }, [peers]);

  return {
    selfUserId,
    peers,
    peersByIssue,
    draggingByIssue,
    setFocusedIssue,
    broadcastDragStart,
    broadcastDragEnd,
  };
}
