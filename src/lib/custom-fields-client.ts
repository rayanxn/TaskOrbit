"use client";

import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { BoardCustomField, CustomFieldType } from "@/types";

function isMissingCustomFieldsSchemaError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    error?.code === "PGRST205" ||
    error?.message?.includes("board_custom_fields") ||
    error?.message?.includes("card_custom_field_values")
  );
}

export function getCustomFieldsFallbackMessage() {
  return "Custom fields will appear here after the Phase 7 migration is applied.";
}

export async function loadBoardCustomFields(boardId: string): Promise<{
  schemaReady: boolean;
  fields: BoardCustomField[];
}> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("board_custom_fields")
    .select("*")
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingCustomFieldsSchemaError(error)) {
      return {
        schemaReady: false,
        fields: [],
      };
    }

    throw new Error(error.message);
  }

  return {
    schemaReady: true,
    fields: (data ?? []) as BoardCustomField[],
  };
}

export async function createBoardCustomField(
  boardId: string,
  name: string,
  fieldType: CustomFieldType
) {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("board_custom_fields")
    .insert({
      board_id: boardId,
      name: name.trim(),
      field_type: fieldType,
      options_json: [],
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingCustomFieldsSchemaError(error)) {
      throw new Error(getCustomFieldsFallbackMessage());
    }

    throw new Error(error.message);
  }

  return data as BoardCustomField;
}
