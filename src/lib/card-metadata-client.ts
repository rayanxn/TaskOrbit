"use client";

import { generateLastPosition, sortByPosition } from "@/lib/fractional-index";
import { createClient } from "@/lib/supabase/client";
import type {
  BoardLabel,
  CardActivityWithAuthor,
  CardAttachment,
  CardCommentWithAuthor,
  ChecklistWithItems,
} from "@/types";
import type { Database, Json } from "@/types/database";

type CardBoardRelation = { board_id: string } | Array<{ board_id: string }>;

interface CardBoardLookupRow {
  lists: CardBoardRelation;
}

export interface CardMetadataSnapshot {
  boardId: string | null;
  labels: BoardLabel[];
  selectedLabelIds: string[];
  checklists: ChecklistWithItems[];
  comments: CardCommentWithAuthor[];
  attachments: CardAttachment[];
  activity: CardActivityWithAuthor[];
  schemaReady: boolean;
}

function getBoardIdFromRelation(relation: CardBoardRelation) {
  return Array.isArray(relation) ? relation[0]?.board_id ?? null : relation.board_id;
}

function isMissingMetadataSchemaError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    error?.code === "PGRST205" ||
    error?.message?.includes("board_labels") ||
    error?.message?.includes("card_labels") ||
    error?.message?.includes("checklists") ||
    error?.message?.includes("checklist_items") ||
    error?.message?.includes("card_comments") ||
    error?.message?.includes("card_attachments") ||
    error?.message?.includes("card_activity")
  );
}

function getSupabase() {
  return createClient();
}

export async function loadCardMetadata(cardId: string): Promise<CardMetadataSnapshot> {
  const supabase = getSupabase();

  const { data: cardData, error: cardError } = await supabase
    .from("cards")
    .select("lists!inner(board_id)")
    .eq("id", cardId)
    .single();

  if (cardError || !cardData) {
    throw new Error("Card not found or access denied.");
  }

  const boardId = getBoardIdFromRelation((cardData as CardBoardLookupRow).lists);

  if (!boardId) {
    throw new Error("Card board could not be determined.");
  }

  const [
    labelsResult,
    cardLabelsResult,
    checklistsResult,
    commentsResult,
    attachmentsResult,
    activityResult,
  ] = await Promise.all([
    supabase.from("board_labels").select("*").eq("board_id", boardId).order("created_at", { ascending: true }),
    supabase.from("card_labels").select("*").eq("card_id", cardId),
    supabase.from("checklists").select("*").eq("card_id", cardId).order("position", { ascending: true }),
    supabase
      .from("card_comments")
      .select("*, profiles(id, email, full_name, avatar_url)")
      .eq("card_id", cardId)
      .order("created_at", { ascending: false }),
    supabase
      .from("card_attachments")
      .select("*")
      .eq("card_id", cardId)
      .order("created_at", { ascending: false }),
    supabase
      .from("card_activity")
      .select("*, profiles(id, email, full_name, avatar_url)")
      .eq("card_id", cardId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const errors = [
    labelsResult.error,
    cardLabelsResult.error,
    checklistsResult.error,
    commentsResult.error,
    attachmentsResult.error,
    activityResult.error,
  ].filter(Boolean);

  if (errors.some((error) => isMissingMetadataSchemaError(error))) {
    return {
      boardId,
      labels: [],
      selectedLabelIds: [],
      checklists: [],
      comments: [],
      attachments: [],
      activity: [],
      schemaReady: false,
    };
  }

  const firstError = errors[0];

  if (firstError) {
    throw new Error(firstError.message);
  }

  const checklistIds = (checklistsResult.data ?? []).map((checklist) => checklist.id);
  const checklistItemsResult = checklistIds.length
    ? await supabase
        .from("checklist_items")
        .select("*")
        .in("checklist_id", checklistIds)
        .order("position", { ascending: true })
    : { data: [], error: null };

  if (checklistItemsResult.error) {
    if (isMissingMetadataSchemaError(checklistItemsResult.error)) {
      return {
        boardId,
        labels: [],
        selectedLabelIds: [],
        checklists: [],
        comments: [],
        attachments: [],
        activity: [],
        schemaReady: false,
      };
    }

    throw new Error(checklistItemsResult.error.message);
  }

  const checklistItemsByChecklistId = new Map<string, Database["public"]["Tables"]["checklist_items"]["Row"][]>();
  for (const item of checklistItemsResult.data ?? []) {
    const items = checklistItemsByChecklistId.get(item.checklist_id) ?? [];
    items.push(item);
    checklistItemsByChecklistId.set(item.checklist_id, items);
  }

  return {
    boardId,
    labels: (labelsResult.data ?? []) as BoardLabel[],
    selectedLabelIds: (cardLabelsResult.data ?? []).map((entry) => entry.label_id),
    checklists: (checklistsResult.data ?? []).map((checklist) => ({
      ...checklist,
      items: sortByPosition(checklistItemsByChecklistId.get(checklist.id) ?? []),
    })),
    comments: (commentsResult.data ?? []) as CardCommentWithAuthor[],
    attachments: (attachmentsResult.data ?? []) as CardAttachment[],
    activity: (activityResult.data ?? []) as CardActivityWithAuthor[],
    schemaReady: true,
  };
}

async function logActivity(cardId: string, userId: string, action: string, details: Json = {}) {
  const supabase = getSupabase();
  const { error } = await supabase.from("card_activity").insert({
    card_id: cardId,
    user_id: userId,
    action,
    details,
  });

  if (error && !isMissingMetadataSchemaError(error)) {
    throw new Error(error.message);
  }
}

export async function createBoardLabel(boardId: string, name: string, color: string) {
  const supabase = getSupabase();
  const labelName = name.trim();

  if (!labelName) {
    throw new Error("A label name is required.");
  }

  const { data, error } = await supabase
    .from("board_labels")
    .insert({
      board_id: boardId,
      name: labelName,
      color,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as BoardLabel;
}

export async function setCardLabel(cardId: string, labelId: string, selected: boolean) {
  const supabase = getSupabase();

  if (selected) {
    const { error } = await supabase.from("card_labels").insert({
      card_id: cardId,
      label_id: labelId,
    });

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase
    .from("card_labels")
    .delete()
    .eq("card_id", cardId)
    .eq("label_id", labelId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createChecklist(cardId: string, title: string, userId: string) {
  const supabase = getSupabase();
  const checklistTitle = title.trim();

  if (!checklistTitle) {
    throw new Error("A checklist title is required.");
  }

  const { data: lastChecklist } = await supabase
    .from("checklists")
    .select("position")
    .eq("card_id", cardId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const position = generateLastPosition(lastChecklist?.position ?? null);

  const { data, error } = await supabase
    .from("checklists")
    .insert({
      card_id: cardId,
      title: checklistTitle,
      position,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await logActivity(cardId, userId, "created_checklist", { title: checklistTitle });

  return data;
}

export async function addChecklistItem(checklistId: string, cardId: string, title: string, userId: string) {
  const supabase = getSupabase();
  const itemTitle = title.trim();

  if (!itemTitle) {
    throw new Error("A checklist item title is required.");
  }

  const { data: lastItem } = await supabase
    .from("checklist_items")
    .select("position")
    .eq("checklist_id", checklistId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const position = generateLastPosition(lastItem?.position ?? null);

  const { data, error } = await supabase
    .from("checklist_items")
    .insert({
      checklist_id: checklistId,
      title: itemTitle,
      position,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await logActivity(cardId, userId, "added_checklist_item", { title: itemTitle });

  return data;
}

export async function toggleChecklistItem(itemId: string, cardId: string, isCompleted: boolean, userId: string) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("checklist_items")
    .update({ is_completed: isCompleted })
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await logActivity(cardId, userId, isCompleted ? "completed_checklist_item" : "reopened_checklist_item");

  return data;
}

export async function addComment(cardId: string, userId: string, content: string) {
  const supabase = getSupabase();
  const nextContent = content.trim();

  if (!nextContent) {
    throw new Error("A comment is required.");
  }

  const { data, error } = await supabase
    .from("card_comments")
    .insert({
      card_id: cardId,
      user_id: userId,
      content: nextContent,
    })
    .select("*, profiles(id, email, full_name, avatar_url)")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await logActivity(cardId, userId, "added_comment", {});

  return data as CardCommentWithAuthor;
}

export async function addAttachment(cardId: string, userId: string, url: string, title: string) {
  const supabase = getSupabase();
  const nextUrl = url.trim();
  const nextTitle = title.trim() || nextUrl;

  if (!nextUrl) {
    throw new Error("An attachment URL is required.");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(nextUrl);
  } catch {
    throw new Error("A valid attachment URL is required.");
  }

  const { data, error } = await supabase
    .from("card_attachments")
    .insert({
      card_id: cardId,
      user_id: userId,
      title: nextTitle,
      url: parsedUrl.toString(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await logActivity(cardId, userId, "added_attachment", { title: nextTitle });

  return data as CardAttachment;
}
