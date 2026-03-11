"use server";

import { requireAuthenticatedUser } from "@/lib/auth";
import { isMissingArchiveSchemaError } from "@/lib/archive-support";
import type { ArchivedBoardCard, ArchivedBoardItems, ArchivedBoardList, List } from "@/types";

export async function getArchivedBoardItems(boardId: string): Promise<ArchivedBoardItems> {
  const { supabase } = await requireAuthenticatedUser();
  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("id")
    .eq("id", boardId)
    .single();

  if (boardError || !board) {
    throw new Error("Board not found or access denied.");
  }

  const { data: boardLists, error: boardListsError } = await supabase
    .from("lists")
    .select("id, title")
    .eq("board_id", boardId);

  if (boardListsError) {
    throw new Error(boardListsError.message);
  }

  const { data: archivedLists, error: archivedListsError } = await supabase
    .from("lists")
    .select("*")
    .eq("board_id", boardId)
    .eq("is_archived", true)
    .order("archived_at", { ascending: false });

  if (archivedListsError) {
    if (isMissingArchiveSchemaError(archivedListsError)) {
      return {
        schemaReady: false,
        lists: [],
        cards: [],
      };
    }

    throw new Error(archivedListsError.message);
  }

  const listIds = (boardLists ?? []).map((list) => list.id);
  const listTitleById = new Map((boardLists ?? []).map((list) => [list.id, list.title]));
  const archivedCards: ArchivedBoardCard[] = [];

  if (listIds.length > 0) {
    const { data: archivedCardRows, error: archivedCardsError } = await supabase
      .from("cards")
      .select("*")
      .in("list_id", listIds)
      .eq("is_archived", true)
      .order("archived_at", { ascending: false });

    if (archivedCardsError) {
      if (isMissingArchiveSchemaError(archivedCardsError)) {
        return {
          schemaReady: false,
          lists: [],
          cards: [],
        };
      }

      throw new Error(archivedCardsError.message);
    }

    archivedCards.push(
      ...((archivedCardRows ?? []) as ArchivedBoardCard[]).map((card) => ({
        ...card,
        listTitle: listTitleById.get(card.list_id) ?? null,
      }))
    );
  }

  const cardCountByListId = archivedCards.reduce<Record<string, number>>((accumulator, card) => {
    accumulator[card.list_id] = (accumulator[card.list_id] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    schemaReady: true,
    lists: ((archivedLists ?? []) as List[]).map(
      (list) =>
        ({
          ...list,
          cardCount: cardCountByListId[list.id] ?? 0,
        }) satisfies ArchivedBoardList
    ),
    cards: archivedCards,
  };
}
