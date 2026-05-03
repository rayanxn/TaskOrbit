"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  usePresenceChannel,
  type Peer,
  type PeerProfile,
  type PresenceView,
} from "@/lib/hooks/use-presence-channel";

const SELF_UPDATE_TTL = 1_500;

interface PresenceContextValue {
  selfUserId: string | null;
  peers: Peer[];
  peersByIssue: Map<string, Peer[]>;
  draggingByIssue: Map<string, Peer>;
  setFocusedIssue: (issueId: string | null) => void;
  broadcastDragStart: (issueId: string) => void;
  broadcastDragEnd: (issueId: string) => void;
  markSelfUpdated: (issueId: string) => void;
  isSelfUpdate: (issueId: string) => boolean;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);

interface PresenceProviderProps {
  projectId: string;
  view: PresenceView;
  members: { user_id: string; profile: PeerProfile }[];
  children: React.ReactNode;
}

export function PresenceProvider({
  projectId,
  view,
  members,
  children,
}: PresenceProviderProps) {
  const channel = usePresenceChannel({ projectId, view, members });
  const recentSelfIdsRef = useRef<Map<string, number>>(new Map());

  // Periodically purge expired self-update marks so the realtime hook can
  // start treating updates as remote again.
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      const map = recentSelfIdsRef.current;
      for (const [issueId, expiresAt] of map.entries()) {
        if (expiresAt <= now) map.delete(issueId);
      }
    }, 750);
    return () => window.clearInterval(id);
  }, []);

  const markSelfUpdated = useCallback((issueId: string) => {
    recentSelfIdsRef.current.set(issueId, Date.now() + SELF_UPDATE_TTL);
  }, []);

  const isSelfUpdate = useCallback((issueId: string) => {
    const expiresAt = recentSelfIdsRef.current.get(issueId);
    return typeof expiresAt === "number" && expiresAt > Date.now();
  }, []);

  const value = useMemo<PresenceContextValue>(
    () => ({
      selfUserId: channel.selfUserId,
      peers: channel.peers,
      peersByIssue: channel.peersByIssue,
      draggingByIssue: channel.draggingByIssue,
      setFocusedIssue: channel.setFocusedIssue,
      broadcastDragStart: channel.broadcastDragStart,
      broadcastDragEnd: channel.broadcastDragEnd,
      markSelfUpdated,
      isSelfUpdate,
    }),
    [
      channel.selfUserId,
      channel.peers,
      channel.peersByIssue,
      channel.draggingByIssue,
      channel.setFocusedIssue,
      channel.broadcastDragStart,
      channel.broadcastDragEnd,
      markSelfUpdated,
      isSelfUpdate,
    ],
  );

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence(): PresenceContextValue {
  const ctx = useContext(PresenceContext);
  if (!ctx) {
    throw new Error("usePresence must be used within a PresenceProvider");
  }
  return ctx;
}

/** Safe variant — returns null if no provider is mounted. */
export function useOptionalPresence(): PresenceContextValue | null {
  return useContext(PresenceContext);
}
