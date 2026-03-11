"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAuthenticatedUser } from "@/lib/auth";
import { getArchiveSchemaErrorMessage, isMissingArchiveSchemaError } from "@/lib/archive-support";
import { generateLastPosition } from "@/lib/fractional-index";
import { parseListTitle } from "@/lib/lists";
import type { CopyListValues, List, ListWithCards } from "@/types";
import type { Database } from "@/types/database";

interface AccessibleListRow {
  id: string;
  board_id: string;
  title: string;
}

function revalidateListViews(boardId: string) {
  revalidatePath(`/boards/${boardId}`);
  revalidatePath("/boards");
}

async function getListWithCards(
  supabase: SupabaseClient<Database>,
  listId: string
): Promise<ListWithCards> {
  const { data, error } = await supabase
    .from("lists")
    .select("*, cards(*)")
    .eq("id", listId)
    .single();

  if (error || !data) {
    throw new Error("List not found or access denied.");
  }

  return data as ListWithCards;
}

async function getAccessibleList(
  supabase: SupabaseClient<Database>,
  listId: string
): Promise<AccessibleListRow> {

  const { data: existingList, error: listError } = await supabase
    .from("lists")
    .select("id, board_id, title")
    .eq("id", listId)
    .single();

  if (listError || !existingList) {
    throw new Error("List not found or access denied.");
  }

  return existingList as AccessibleListRow;
}

export async function createList(boardId: string, title: string): Promise<List> {
  const { supabase } = await requireAuthenticatedUser();
  const parsedTitle = parseListTitle(title);

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("id")
    .eq("id", boardId)
    .single();

  if (boardError || !board) {
    throw new Error("Board not found or access denied.");
  }

  // Get last list position
  const { data: lastList } = await supabase
    .from("lists")
    .select("position")
    .eq("board_id", boardId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const position = generateLastPosition(lastList?.position ?? null);

  const { data, error } = await supabase
    .from("lists")
    .insert({
      board_id: boardId,
      title: parsedTitle,
      position,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidateListViews(boardId);

  return data as List;
}

export async function updateListTitle(listId: string, title: string): Promise<List> {
  const { supabase } = await requireAuthenticatedUser();
  const parsedTitle = parseListTitle(title);
  const existingList = await getAccessibleList(supabase, listId);

  const { data, error } = await supabase
    .from("lists")
    .update({ title: parsedTitle })
    .eq("id", listId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidateListViews(existingList.board_id);

  return data as List;
}

export async function deleteList(listId: string): Promise<{ boardId: string }> {
  const { supabase } = await requireAuthenticatedUser();
  const existingList = await getAccessibleList(supabase, listId);

  const { error } = await supabase.from("lists").delete().eq("id", listId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateListViews(existingList.board_id);

  return { boardId: existingList.board_id };
}

export async function reorderList(listId: string, newPosition: string): Promise<List> {
  const { supabase } = await requireAuthenticatedUser();
  const existingList = await getAccessibleList(supabase, listId);
  const position = newPosition.trim();

  if (!position) {
    throw new Error("A valid list position is required.");
  }

  const { data, error } = await supabase
    .from("lists")
    .update({ position })
    .eq("id", listId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidateListViews(existingList.board_id);

  return data as List;
}

export async function copyList(input: CopyListValues): Promise<ListWithCards> {
  const { supabase } = await requireAuthenticatedUser();
  const existingList = await getAccessibleList(supabase, input.listId);
  const title = parseListTitle(input.title);
  const position = input.position.trim();

  if (!position) {
    throw new Error("A valid list position is required.");
  }

  const { data, error } = await supabase
    .from("lists")
    .insert({
      board_id: existingList.board_id,
      title,
      position,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { data: sourceCards, error: sourceCardsError } = await supabase
    .from("cards")
    .select("title, description, due_date, position")
    .eq("list_id", input.listId)
    .order("position", { ascending: true });

  if (sourceCardsError) {
    throw new Error(sourceCardsError.message);
  }

  if ((sourceCards ?? []).length > 0) {
    const { error: insertCardsError } = await supabase.from("cards").insert(
      (sourceCards ?? []).map((card) => ({
        list_id: data.id,
        title: card.title,
        description: card.description,
        due_date: card.due_date,
        position: card.position,
      }))
    );

    if (insertCardsError) {
      throw new Error(insertCardsError.message);
    }
  }

  const copiedList = await getListWithCards(supabase, data.id);

  revalidateListViews(existingList.board_id);

  return copiedList;
}

export async function archiveList(listId: string): Promise<List> {
  const { supabase } = await requireAuthenticatedUser();
  const existingList = await getAccessibleList(supabase, listId);
  const archivedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("lists")
    .update({
      is_archived: true,
      archived_at: archivedAt,
    })
    .eq("id", listId)
    .select("*")
    .single();

  if (error) {
    if (isMissingArchiveSchemaError(error)) {
      throw new Error(getArchiveSchemaErrorMessage());
    }

    throw new Error(error.message);
  }

  const { error: cardError } = await supabase
    .from("cards")
    .update({
      is_archived: true,
      archived_at: archivedAt,
    })
    .eq("list_id", listId);

  if (cardError) {
    if (isMissingArchiveSchemaError(cardError)) {
      throw new Error(getArchiveSchemaErrorMessage());
    }

    throw new Error(cardError.message);
  }

  revalidateListViews(existingList.board_id);

  return data as List;
}

export async function restoreList(listId: string): Promise<ListWithCards> {
  const { supabase } = await requireAuthenticatedUser();
  const existingList = await getAccessibleList(supabase, listId);
  const { data: lastActiveList, error: lastListError } = await supabase
    .from("lists")
    .select("position")
    .eq("board_id", existingList.board_id)
    .eq("is_archived", false)
    .neq("id", listId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastListError) {
    if (isMissingArchiveSchemaError(lastListError)) {
      throw new Error(getArchiveSchemaErrorMessage());
    }

    throw new Error(lastListError.message);
  }

  const position = generateLastPosition(lastActiveList?.position ?? null);
  const { data, error } = await supabase
    .from("lists")
    .update({
      is_archived: false,
      archived_at: null,
      position,
    })
    .eq("id", listId)
    .select("*")
    .single();

  if (error) {
    if (isMissingArchiveSchemaError(error)) {
      throw new Error(getArchiveSchemaErrorMessage());
    }

    throw new Error(error.message);
  }

  const { error: cardError } = await supabase
    .from("cards")
    .update({
      is_archived: false,
      archived_at: null,
    })
    .eq("list_id", listId);

  if (cardError) {
    if (isMissingArchiveSchemaError(cardError)) {
      throw new Error(getArchiveSchemaErrorMessage());
    }

    throw new Error(cardError.message);
  }

  const restoredList = await getListWithCards(supabase, data.id);

  revalidateListViews(existingList.board_id);

  return restoredList;
}
