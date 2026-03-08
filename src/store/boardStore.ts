"use client";

import { create } from "zustand";

import {
  archiveBoard as archiveBoardAction,
  createBoard as createBoardAction,
  deleteBoard as deleteBoardAction,
  restoreBoard as restoreBoardAction,
  updateBoard as updateBoardAction,
} from "@/actions/boards";
import { splitBoards, upsertBoard } from "@/lib/boards";
import type { Board, BoardFormValues, UpdateBoardValues } from "@/types";

interface BoardState {
  boards: Board[];
  archivedBoards: Board[];
  currentBoard: Board | null;
  isLoading: boolean;
  hasHydrated: boolean;
  error: string | null;
  replaceBoardSnapshot: (boards: Board[]) => void;
  createBoard: (input: BoardFormValues) => Promise<Board>;
  updateBoard: (input: UpdateBoardValues) => Promise<Board>;
  archiveBoard: (boardId: string) => Promise<Board>;
  restoreBoard: (boardId: string) => Promise<Board>;
  deleteBoard: (boardId: string) => Promise<void>;
  setCurrentBoard: (board: Board | null) => void;
  clearError: () => void;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while managing boards.";
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  archivedBoards: [],
  currentBoard: null,
  isLoading: false,
  hasHydrated: false,
  error: null,
  replaceBoardSnapshot(boards) {
    set({
      ...splitBoards(boards),
      currentBoard: get().currentBoard
        ? boards.find((board) => board.id === get().currentBoard?.id) ?? null
        : null,
      isLoading: false,
      hasHydrated: true,
      error: null,
    });
  },
  async createBoard(input) {
    set({ isLoading: true, error: null });

    try {
      const board = await createBoardAction(input);
      const nextBoards = [...get().boards, ...get().archivedBoards];

      set({
        ...splitBoards(upsertBoard(nextBoards, board)),
        hasHydrated: true,
        isLoading: false,
      });

      return board;
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      throw error;
    }
  },
  async updateBoard(input) {
    set({ isLoading: true, error: null });

    try {
      const board = await updateBoardAction(input);
      const nextBoards = [...get().boards, ...get().archivedBoards];
      const currentBoard = get().currentBoard;

      set({
        ...splitBoards(upsertBoard(nextBoards, board)),
        currentBoard: currentBoard?.id === board.id ? board : currentBoard,
        hasHydrated: true,
        isLoading: false,
      });

      return board;
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      throw error;
    }
  },
  async archiveBoard(boardId) {
    set({ isLoading: true, error: null });

    try {
      const board = await archiveBoardAction(boardId);
      const nextBoards = [...get().boards, ...get().archivedBoards];
      const currentBoard = get().currentBoard;

      set({
        ...splitBoards(upsertBoard(nextBoards, board)),
        currentBoard: currentBoard?.id === board.id ? board : currentBoard,
        hasHydrated: true,
        isLoading: false,
      });

      return board;
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      throw error;
    }
  },
  async restoreBoard(boardId) {
    set({ isLoading: true, error: null });

    try {
      const board = await restoreBoardAction(boardId);
      const nextBoards = [...get().boards, ...get().archivedBoards];
      const currentBoard = get().currentBoard;

      set({
        ...splitBoards(upsertBoard(nextBoards, board)),
        currentBoard: currentBoard?.id === board.id ? board : currentBoard,
        hasHydrated: true,
        isLoading: false,
      });

      return board;
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      throw error;
    }
  },
  async deleteBoard(boardId) {
    set({ isLoading: true, error: null });

    try {
      await deleteBoardAction(boardId);

      set({
        boards: get().boards.filter((board) => board.id !== boardId),
        archivedBoards: get().archivedBoards.filter((board) => board.id !== boardId),
        currentBoard: get().currentBoard?.id === boardId ? null : get().currentBoard,
        hasHydrated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      throw error;
    }
  },
  setCurrentBoard(board) {
    set({ currentBoard: board });
  },
  clearError() {
    set({ error: null });
  },
}));
