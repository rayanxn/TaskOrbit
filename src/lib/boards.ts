import {
  DEFAULT_BOARD_BACKGROUND,
  isBoardBackground,
  resolveBoardBackground,
} from "@/lib/backgrounds";
import type { Board, BoardFormValues } from "@/types";

export const BOARD_TITLE_MAX_LENGTH = 80;

export interface BoardFormErrors {
  title?: string;
  background?: string;
}

export class BoardValidationError extends Error {
  fieldErrors: BoardFormErrors;

  constructor(fieldErrors: BoardFormErrors) {
    const firstError =
      fieldErrors.title ?? fieldErrors.background ?? "Board details are invalid.";

    super(firstError);
    this.name = "BoardValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export function normalizeBoardTitle(title: string) {
  return title.trim().replace(/\s+/g, " ");
}

export function getBoardTitleError(title: string) {
  const normalizedTitle = normalizeBoardTitle(title);

  if (!normalizedTitle) {
    return "Board title is required.";
  }

  if (normalizedTitle.length > BOARD_TITLE_MAX_LENGTH) {
    return `Board title must be ${BOARD_TITLE_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}

export function validateBoardFormValues(values: Partial<BoardFormValues>) {
  const normalizedTitle = normalizeBoardTitle(values.title ?? "");
  const background = values.background?.trim() || DEFAULT_BOARD_BACKGROUND;
  const fieldErrors: BoardFormErrors = {};
  const titleError = getBoardTitleError(values.title ?? "");

  if (titleError) {
    fieldErrors.title = titleError;
  }

  if (!isBoardBackground(background)) {
    fieldErrors.background = "Choose one of the available board backgrounds.";
  }

  if (fieldErrors.title || fieldErrors.background) {
    return {
      success: false as const,
      fieldErrors,
    };
  }

  return {
    success: true as const,
    data: {
      title: normalizedTitle,
      background: resolveBoardBackground(background),
    },
  };
}

export function parseBoardFormValues(values: Partial<BoardFormValues>) {
  const result = validateBoardFormValues(values);

  if (!result.success) {
    throw new BoardValidationError(result.fieldErrors);
  }

  return result.data;
}

export function isBoardValidationError(error: unknown): error is BoardValidationError {
  return error instanceof BoardValidationError;
}

export function sortBoardsByDate(boards: Board[], mode: "active" | "archived") {
  return [...boards].sort((left, right) => {
    const leftDate =
      mode === "archived"
        ? Date.parse(left.archived_at ?? left.updated_at)
        : Date.parse(left.updated_at);
    const rightDate =
      mode === "archived"
        ? Date.parse(right.archived_at ?? right.updated_at)
        : Date.parse(right.updated_at);

    return rightDate - leftDate;
  });
}

export function splitBoards(boards: Board[]) {
  return {
    boards: sortBoardsByDate(
      boards.filter((board) => !board.is_archived),
      "active"
    ),
    archivedBoards: sortBoardsByDate(
      boards.filter((board) => board.is_archived),
      "archived"
    ),
  };
}

export function upsertBoard(boards: Board[], board: Board) {
  const nextBoards = boards.filter((item) => item.id !== board.id);
  nextBoards.push(board);
  return nextBoards;
}
