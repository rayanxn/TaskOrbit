"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { getBoardBackground } from "@/lib/backgrounds";
import { sortByPosition } from "@/lib/fractional-index";
import { getBoardWithLists } from "@/lib/list-queries";
import { getBoardInvitations, getBoardParticipants } from "@/lib/member-queries";
import { canEditContent as canEditBoardContent } from "@/lib/permissions";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import type {
  BoardInvitation,
  BoardParticipant,
  BoardView,
  BoardVisibility,
  BoardWithDetails,
  CardUpdatePatch,
  ListWithCards,
} from "@/types";
import ArchivedItemsDialog from "@/components/board/ArchivedItemsDialog";
import AutomationHubDialog from "@/components/board/AutomationHubDialog";
import BoardCalendarView from "@/components/board/BoardCalendarView";
import CustomFieldsDialog from "@/components/board/CustomFieldsDialog";
import BoardHeader from "@/components/board/BoardHeader";
import BoardMenuDialog, { type BoardDueFilter } from "@/components/board/BoardMenuDialog";
import BoardTableView from "@/components/board/BoardTableView";
import BoardTimelineView from "@/components/board/BoardTimelineView";
import PowerUpsDialog from "@/components/board/PowerUpsDialog";
import ShareDialog from "@/components/board/ShareDialog";
import AddListButton from "@/components/list/AddListButton";
import BoardDndContext from "@/components/dnd/BoardDndContext";
import SortableList from "@/components/dnd/SortableList";
import { useBoardStore } from "@/store/boardStore";
import { useMemberStore } from "@/store/memberStore";

interface BoardDetailClientProps {
  initialBoard: BoardWithDetails;
  initialParticipants: BoardParticipant[];
  initialInvitations: BoardInvitation[];
  currentUserId: string;
}

const BOARD_REFRESH_DEBOUNCE_MS = 400;
const BOARD_POLL_INTERVAL_MS = 5000;
const BOARD_PRESENCE_HEARTBEAT_MS = 5000;
const BOARD_PRESENCE_TTL_MS = 15000;

function createTabId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function matchesDueFilter(dueDate: string | null, dueFilter: BoardDueFilter) {
  if (dueFilter === "all") {
    return true;
  }

  if (dueFilter === "no-date") {
    return dueDate === null;
  }

  if (!dueDate) {
    return false;
  }

  const dueTimestamp = new Date(dueDate).getTime();
  const now = Date.now();

  if (Number.isNaN(dueTimestamp)) {
    return false;
  }

  if (dueFilter === "overdue") {
    return dueTimestamp < now;
  }

  return dueTimestamp >= now;
}

function filterBoardLists(
  lists: ListWithCards[],
  searchQuery: string,
  dueFilter: BoardDueFilter
) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery && dueFilter === "all") {
    return lists;
  }

  return lists.map((list) => ({
    ...list,
    cards: list.cards.filter((card) => {
      const matchesSearch =
        !normalizedQuery ||
        card.title.toLowerCase().includes(normalizedQuery) ||
        (card.description ?? "").toLowerCase().includes(normalizedQuery);

      return matchesSearch && matchesDueFilter(card.due_date, dueFilter);
    }),
  }));
}

export default function BoardDetailClient({
  initialBoard,
  initialParticipants,
  initialInvitations,
  currentUserId,
}: BoardDetailClientProps) {
  const currentBoard = useBoardStore((state) => state.currentBoard);
  const currentBoardLists = useBoardStore((state) => state.currentBoardLists);
  const setCurrentBoardDetail = useBoardStore((state) => state.setCurrentBoardDetail);
  const clearCurrentBoardDetail = useBoardStore((state) => state.clearCurrentBoardDetail);
  const updateBoard = useBoardStore((state) => state.updateBoard);
  const updateBoardVisibility = useBoardStore((state) => state.updateBoardVisibility);
  const addList = useBoardStore((state) => state.addList);
  const copyList = useBoardStore((state) => state.copyList);
  const archiveList = useBoardStore((state) => state.archiveList);
  const restoreList = useBoardStore((state) => state.restoreList);
  const updateListTitle = useBoardStore((state) => state.updateListTitle);
  const removeList = useBoardStore((state) => state.removeList);
  const addCard = useBoardStore((state) => state.addCard);
  const copyCard = useBoardStore((state) => state.copyCard);
  const archiveCard = useBoardStore((state) => state.archiveCard);
  const restoreCard = useBoardStore((state) => state.restoreCard);
  const moveCard = useBoardStore((state) => state.moveCard);
  const updateCard = useBoardStore((state) => state.updateCard);
  const removeCard = useBoardStore((state) => state.removeCard);
  const reorderList = useBoardStore((state) => state.reorderList);

  const participants = useMemberStore((state) => state.participants);
  const pendingInvitations = useMemberStore((state) => state.pendingInvitations);
  const currentUserRole = useMemberStore((state) => state.currentUserRole);
  const setInitialData = useMemberStore((state) => state.setInitialData);
  const inviteMember = useMemberStore((state) => state.inviteMember);
  const removeMember = useMemberStore((state) => state.removeMember);
  const updateMemberRole = useMemberStore((state) => state.updateMemberRole);
  const cancelInvitation = useMemberStore((state) => state.cancelInvitation);
  const clearMembers = useMemberStore((state) => state.clear);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isBoardMenuOpen, setIsBoardMenuOpen] = useState(false);
  const [isArchivedItemsOpen, setIsArchivedItemsOpen] = useState(false);
  const [isCustomFieldsOpen, setIsCustomFieldsOpen] = useState(false);
  const [isAutomationOpen, setIsAutomationOpen] = useState(false);
  const [isPowerUpsOpen, setIsPowerUpsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<BoardView>("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [dueFilter, setDueFilter] = useState<BoardDueFilter>("all");
  const [realtimeOnlineUserIds, setRealtimeOnlineUserIds] = useState<string[]>([]);
  const [fallbackOnlineUserIds, setFallbackOnlineUserIds] = useState<string[]>([]);
  const boardRefreshChannelRef = useRef<BroadcastChannel | null>(null);
  const refreshBoardRef = useRef<(force?: boolean) => void>(() => {});
  const tabIdRef = useRef("");
  const lastRefreshAtRef = useRef(0);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  if (!tabIdRef.current) {
    tabIdRef.current = createTabId();
  }

  const initialLists = useMemo(
    () =>
      sortByPosition(initialBoard.lists).map((list) => ({
        ...list,
        cards: sortByPosition(list.cards),
      })),
    [initialBoard]
  );
  const board = currentBoard ?? initialBoard;
  const lists = currentBoard ? currentBoardLists : initialLists;
  const background = getBoardBackground(board.background);
  const displayParticipants = participants.length > 0 ? participants : initialParticipants;
  const displayRole =
    currentUserRole ??
    displayParticipants.find((participant) => participant.userId === currentUserId)?.role ??
    null;
  const canEditContent = canEditBoardContent(displayRole);
  const canDragContent =
    canEditContent && currentView === "board" && !searchQuery.trim() && dueFilter === "all";
  const onlineUserIds = useMemo(
    () => Array.from(new Set([...fallbackOnlineUserIds, ...realtimeOnlineUserIds])),
    [fallbackOnlineUserIds, realtimeOnlineUserIds]
  );
  const visibleLists = useMemo(
    () => filterBoardLists(lists, searchQuery, dueFilter),
    [dueFilter, lists, searchQuery]
  );

  const broadcastBoardRefresh = () => {
    const refreshMessage = {
      type: "board-refresh",
      boardId: board.id,
      sourceId: tabIdRef.current,
      sentAt: Date.now(),
    };

    boardRefreshChannelRef.current?.postMessage(refreshMessage);

    try {
      window.localStorage.setItem(
        `task-orbit:board-refresh:${board.id}`,
        JSON.stringify(refreshMessage)
      );
    } catch {
      // Ignore storage write failures and rely on the broadcast channel.
    }
  };

  useEffect(() => {
    setCurrentBoardDetail(initialBoard);
    setInitialData(initialParticipants, initialInvitations, currentUserId);

    return () => {
      clearCurrentBoardDetail();
      clearMembers();
    };
  }, [
    clearCurrentBoardDetail,
    clearMembers,
    currentUserId,
    initialBoard,
    initialInvitations,
    initialParticipants,
    setCurrentBoardDetail,
    setInitialData,
  ]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let isActive = true;
    let refreshTimeoutId: number | null = null;
    const fallbackPresence = new Map<string, number>();
    const syncPresenceState = () => {
      const cutoff = Date.now() - BOARD_PRESENCE_TTL_MS;
      const nextOnlineUserIds = Array.from(fallbackPresence.entries())
        .filter(([, timestamp]) => timestamp >= cutoff)
        .map(([userId]) => userId);

      if (isActive) {
        setFallbackOnlineUserIds(Array.from(new Set(nextOnlineUserIds)));
      }
    };
    const refreshBoard = async (force = false) => {
      if (!isActive) {
        return;
      }

      const now = Date.now();

      if (!force) {
        if (refreshPromiseRef.current) {
          return refreshPromiseRef.current;
        }

        if (now - lastRefreshAtRef.current < BOARD_REFRESH_DEBOUNCE_MS) {
          return;
        }
      }

      const refreshPromise = (async () => {
        try {
          const [nextBoard, nextParticipants, nextInvitations] = await Promise.all([
            getBoardWithLists(supabase, board.id),
            getBoardParticipants(supabase, board.id),
            getBoardInvitations(supabase, board.id),
          ]);

          if (!isActive) {
            return;
          }

          if (nextBoard) {
            setCurrentBoardDetail(nextBoard);
          }

          if (nextParticipants.length > 0) {
            setInitialData(nextParticipants, nextInvitations, currentUserId);
          }
        } finally {
          lastRefreshAtRef.current = Date.now();
          refreshPromiseRef.current = null;
        }
      })();

      refreshPromiseRef.current = refreshPromise;

      return refreshPromise;
    };
    const queueRefresh = (force = false) => {
      if (!isActive) {
        return;
      }

      if (refreshTimeoutId !== null) {
        window.clearTimeout(refreshTimeoutId);
      }

      refreshTimeoutId = window.setTimeout(() => {
        refreshTimeoutId = null;
        void refreshBoard(force);
      }, force ? 0 : BOARD_REFRESH_DEBOUNCE_MS);
    };
    refreshBoardRef.current = queueRefresh;
    const boardRefreshChannel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel(`task-orbit:board-sync:${board.id}`);
    const boardPresenceChannel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel(`task-orbit:board-presence:${board.id}`);
    const boardRefreshStorageKey = `task-orbit:board-refresh:${board.id}`;
    const presenceStorageKeyPrefix = `task-orbit:board-presence:${board.id}:`;
    const publishPresence = () => {
      const timestamp = Date.now();

      fallbackPresence.set(currentUserId, timestamp);
      syncPresenceState();
      boardPresenceChannel?.postMessage({
        type: "presence-heartbeat",
        userId: currentUserId,
        sourceId: tabIdRef.current,
        sentAt: timestamp,
      });

      try {
        window.localStorage.setItem(`${presenceStorageKeyPrefix}${currentUserId}`, String(timestamp));
      } catch {
        // Ignore storage write failures and rely on in-memory presence.
      }
    };
    const handleVisibilityRefresh = () => {
      publishPresence();

      if (document.visibilityState === "visible") {
        queueRefresh(true);
      }
    };
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === boardRefreshStorageKey && event.newValue) {
        try {
          const message = JSON.parse(event.newValue) as {
            type?: string;
            boardId?: string;
            sourceId?: string;
          };

          if (
            message.type === "board-refresh" &&
            message.boardId === board.id &&
            message.sourceId !== tabIdRef.current
          ) {
            queueRefresh(true);
          }
        } catch {
          // Ignore malformed refresh payloads.
        }

        return;
      }

      if (!event.key?.startsWith(presenceStorageKeyPrefix) || !event.newValue) {
        return;
      }

      const userId = event.key.slice(presenceStorageKeyPrefix.length);
      const timestamp = Number(event.newValue);

      if (!userId || Number.isNaN(timestamp)) {
        return;
      }

      fallbackPresence.set(userId, timestamp);
      syncPresenceState();
    };

    const boardChannel = supabase
      .channel(`board-sync:${board.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lists", filter: `board_id=eq.${board.id}` },
        () => {
          queueRefresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards" },
        () => {
          queueRefresh();
        }
      );

    const presenceChannel = supabase.channel(`board-presence:${board.id}`, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    presenceChannel.on("presence", { event: "sync" }, () => {
      if (!isActive) {
        return;
      }

      const state = presenceChannel.presenceState<{ userId: string }>();
      const nextOnlineUserIds = Object.values(state)
        .flat()
        .map((entry) => entry.userId)
        .filter(Boolean);

      setRealtimeOnlineUserIds(Array.from(new Set(nextOnlineUserIds)));
    });

    boardRefreshChannelRef.current = boardRefreshChannel;

    boardRefreshChannel?.addEventListener("message", (event: MessageEvent) => {
      const message = event.data as {
        type?: string;
        boardId?: string;
        sourceId?: string;
      };

      if (
        message.type === "board-refresh" &&
        message.boardId === board.id &&
        message.sourceId !== tabIdRef.current
      ) {
        queueRefresh(true);
      }
    });

    boardPresenceChannel?.addEventListener("message", (event: MessageEvent) => {
      const message = event.data as {
        type?: string;
        sourceId?: string;
        userId?: string;
        sentAt?: number;
      };

      if (
        message.type !== "presence-heartbeat" ||
        !message.userId ||
        message.sourceId === tabIdRef.current
      ) {
        return;
      }

      fallbackPresence.set(message.userId, message.sentAt ?? Date.now());
      syncPresenceState();
    });

    const visibilityIntervalId = window.setInterval(() => {
      syncPresenceState();

      if (document.visibilityState === "visible") {
        queueRefresh();
      }
    }, BOARD_POLL_INTERVAL_MS);
    const heartbeatIntervalId = window.setInterval(() => {
      publishPresence();
      syncPresenceState();
    }, BOARD_PRESENCE_HEARTBEAT_MS);

    document.addEventListener("visibilitychange", handleVisibilityRefresh);
    window.addEventListener("focus", handleVisibilityRefresh);
    window.addEventListener("storage", handleStorageEvent);

    publishPresence();
    void boardChannel.subscribe();
    void presenceChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await presenceChannel.track({ userId: currentUserId });
      }
    });
    queueRefresh(true);

    return () => {
      isActive = false;
      if (refreshTimeoutId !== null) {
        window.clearTimeout(refreshTimeoutId);
      }
      window.clearInterval(visibilityIntervalId);
      window.clearInterval(heartbeatIntervalId);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      window.removeEventListener("focus", handleVisibilityRefresh);
      window.removeEventListener("storage", handleStorageEvent);
      boardRefreshChannelRef.current = null;
      refreshBoardRef.current = () => {};
      boardRefreshChannel?.close();
      boardPresenceChannel?.close();
      setRealtimeOnlineUserIds([]);
      setFallbackOnlineUserIds([]);
      void supabase.removeChannel(boardChannel);
      void supabase.removeChannel(presenceChannel);
    };
  }, [board.id, currentUserId, setCurrentBoardDetail, setInitialData]);

  const handleUpdateBoardTitle = async (title: string) => {
    try {
      const updated = await updateBoard({ boardId: board.id, title, background: board.background });
      broadcastBoardRefresh();
      toast.success(`Renamed board to "${updated.title}".`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const handleUpdateVisibility = async (visibility: BoardVisibility) => {
    try {
      await updateBoardVisibility(board.id, visibility);
      broadcastBoardRefresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const handleUpdateBoardBackground = async (background: string) => {
    try {
      await updateBoard({ boardId: board.id, title: board.title, background });
      broadcastBoardRefresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const handleAddList = async (title: string) => {
    try {
      const list = await addList(board.id, title);
      broadcastBoardRefresh();
      toast.success(`Created list "${list.title}".`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const handleUpdateListTitle = async (listId: string, title: string) => {
    try {
      await updateListTitle(listId, title);
      broadcastBoardRefresh();
      toast.success("List renamed.");
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const handleDeleteList = async (listId: string) => {
    const list = lists.find((item) => item.id === listId);

    try {
      await removeList(listId);
      broadcastBoardRefresh();
      toast.success(`Deleted list "${list?.title ?? "Untitled"}".`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const handleArchiveList = async (listId: string) => {
    const list = lists.find((item) => item.id === listId);

    try {
      await archiveList(listId);
      broadcastBoardRefresh();
      refreshBoardRef.current(true);
      toast.success(`Archived "${list?.title ?? "list"}".`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const handleRestoreList = async (listId: string) => {
    try {
      const restoredList = await restoreList(listId);
      broadcastBoardRefresh();
      refreshBoardRef.current(true);
      toast.success(`Restored "${restoredList.title}".`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const handleMoveList = async (listId: string, position: string) => {
    const list = lists.find((item) => item.id === listId);

    try {
      await reorderList(listId, position);
      broadcastBoardRefresh();
      toast.success(`Moved list "${list?.title ?? "Untitled"}".`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const handleCopyList = async (listId: string, title: string, position: string) => {
    try {
      const copiedList = await copyList({ listId, title, position });
      broadcastBoardRefresh();
      refreshBoardRef.current(true);
      toast.success(`Copied list to "${copiedList.title}".`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const handleAddCard = async (listId: string, title: string) => {
    try {
      const card = await addCard(listId, title);
      broadcastBoardRefresh();
      toast.success(`Created card "${card.title}".`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const handleUpdateCard = async (cardId: string, input: CardUpdatePatch) => {
    try {
      await updateCard({ cardId, ...input });
      broadcastBoardRefresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const card = lists.flatMap((list) => list.cards).find((item) => item.id === cardId);

    try {
      await removeCard(cardId);
      broadcastBoardRefresh();
      toast.success(`Deleted card "${card?.title ?? "Untitled"}".`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const handleArchiveCard = async (cardId: string) => {
    const card = lists.flatMap((list) => list.cards).find((item) => item.id === cardId);

    try {
      await archiveCard(cardId);
      broadcastBoardRefresh();
      toast.success(`Archived "${card?.title ?? "card"}".`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const handleRestoreCard = async (cardId: string) => {
    try {
      const restoredCard = await restoreCard(cardId);
      broadcastBoardRefresh();
      toast.success(`Restored "${restoredCard.title}".`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const openArchivedItemsDialog = () => {
    setIsBoardMenuOpen(false);
    setIsArchivedItemsOpen(true);
  };

  const openCustomFieldsDialog = () => {
    setIsBoardMenuOpen(false);
    setIsCustomFieldsOpen(true);
  };

  const openAutomationDialog = () => {
    setIsBoardMenuOpen(false);
    setIsAutomationOpen(true);
  };

  const openPowerUpsDialog = () => {
    setIsBoardMenuOpen(false);
    setIsPowerUpsOpen(true);
  };

  const handleMoveCard = async (cardId: string, listId: string, position: string) => {
    const card = lists.flatMap((list) => list.cards).find((item) => item.id === cardId);
    const targetList = lists.find((list) => list.id === listId);

    try {
      await moveCard({ cardId, listId, position });
      broadcastBoardRefresh();
      toast.success(`Moved "${card?.title ?? "card"}" to "${targetList?.title ?? "list"}".`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const handleCopyCard = async (cardId: string, title: string, listId: string, position: string) => {
    try {
      const copiedCard = await copyCard({ cardId, title, listId, position });
      broadcastBoardRefresh();
      toast.success(`Copied card to "${copiedCard.title}".`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const handleInvite = async (email: string, role: "admin" | "member") => {
    await inviteMember({ boardId: board.id, email, role });
    broadcastBoardRefresh();
  };

  const handleRemoveMember = async (userId: string) => {
    await removeMember(board.id, userId);
    broadcastBoardRefresh();
  };

  const handleUpdateRole = async (userId: string, role: "admin" | "member") => {
    await updateMemberRole(board.id, userId, role);
    broadcastBoardRefresh();
  };

  const handleCancelInvitation = async (invitationId: string) => {
    await cancelInvitation(invitationId);
    broadcastBoardRefresh();
  };

  return (
    <div
      className="relative flex min-h-[calc(100vh-3rem)] flex-1 flex-col overflow-hidden"
      style={{ background: background.cssBackground }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.24),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.26),_transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.08)_0%,_rgba(255,255,255,0)_18%,_rgba(15,23,42,0.08)_100%)]" />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <BoardHeader
          board={board}
          participants={displayParticipants}
          onlineUserIds={onlineUserIds}
          currentUserRole={displayRole}
          currentView={currentView}
          onViewChange={setCurrentView}
          onUpdateTitle={handleUpdateBoardTitle}
          onOpenShare={() => setIsShareOpen(true)}
          onOpenBoardMenu={() => setIsBoardMenuOpen(true)}
        />

        <div className="relative min-h-0 flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-8 bg-gradient-to-r from-slate-950/12 to-transparent lg:block" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-8 bg-gradient-to-l from-slate-950/12 to-transparent lg:block" />

          {currentView === "board" ? (
            <div className="board-scrollbar relative min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-5 pt-4 sm:px-5">
              <BoardDndContext lists={visibleLists} canEditContent={canDragContent}>
                <div className="flex h-full min-w-max snap-x snap-proximity items-start gap-3 pb-2">
                  {visibleLists.map((list) => (
                    <SortableList
                      key={list.id}
                      list={list}
                      lists={visibleLists}
                      boardId={board.id}
                      currentUserId={currentUserId}
                      canEditContent={canEditContent}
                      canDragContent={canDragContent}
                      onUpdateTitle={(title) => handleUpdateListTitle(list.id, title)}
                      onMoveList={(position) => handleMoveList(list.id, position)}
                      onCopyList={(title, position) => handleCopyList(list.id, title, position)}
                      onArchiveList={() => handleArchiveList(list.id)}
                      onDelete={() => handleDeleteList(list.id)}
                      onAddCard={(title) => handleAddCard(list.id, title)}
                      onMoveCard={handleMoveCard}
                      onCopyCard={handleCopyCard}
                      onUpdateCard={handleUpdateCard}
                      onArchiveCard={handleArchiveCard}
                      onDeleteCard={handleDeleteCard}
                    />
                  ))}
                  {canEditContent ? <AddListButton onAdd={handleAddList} /> : null}
                </div>
              </BoardDndContext>
            </div>
          ) : (
            <div className="board-scrollbar relative min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4 sm:px-5">
              {currentView === "table" ? <BoardTableView lists={visibleLists} /> : null}
              {currentView === "calendar" ? <BoardCalendarView lists={visibleLists} /> : null}
              {currentView === "timeline" ? <BoardTimelineView lists={visibleLists} /> : null}
            </div>
          )}
        </div>
      </div>

      <ShareDialog
        board={board}
        participants={displayParticipants}
        onlineUserIds={onlineUserIds}
        pendingInvitations={pendingInvitations}
        currentUserRole={displayRole}
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        onInvite={handleInvite}
        onRemoveMember={handleRemoveMember}
        onUpdateRole={handleUpdateRole}
        onCancelInvitation={handleCancelInvitation}
        onUpdateVisibility={handleUpdateVisibility}
      />

      <BoardMenuDialog
        board={board}
        currentUserRole={displayRole}
        open={isBoardMenuOpen}
        onOpenChange={setIsBoardMenuOpen}
        searchQuery={searchQuery}
        dueFilter={dueFilter}
        onSearchQueryChange={setSearchQuery}
        onDueFilterChange={setDueFilter}
        onResetFilters={() => {
          setSearchQuery("");
          setDueFilter("all");
        }}
        onUpdateBackground={handleUpdateBoardBackground}
        onOpenArchivedItems={openArchivedItemsDialog}
        onOpenCustomFields={openCustomFieldsDialog}
        onOpenAutomation={openAutomationDialog}
        onOpenPowerUps={openPowerUpsDialog}
      />

      <ArchivedItemsDialog
        boardId={board.id}
        canEditContent={canEditContent}
        open={isArchivedItemsOpen}
        onOpenChange={setIsArchivedItemsOpen}
        onRestoreList={handleRestoreList}
        onRestoreCard={handleRestoreCard}
      />

      <CustomFieldsDialog
        boardId={board.id}
        canManageFields={displayRole === "owner" || displayRole === "admin"}
        open={isCustomFieldsOpen}
        onOpenChange={setIsCustomFieldsOpen}
      />

      <AutomationHubDialog open={isAutomationOpen} onOpenChange={setIsAutomationOpen} />

      <PowerUpsDialog open={isPowerUpsOpen} onOpenChange={setIsPowerUpsOpen} />
    </div>
  );
}
