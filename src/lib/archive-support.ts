export function isMissingArchiveSchemaError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "42703" ||
    error?.code === "42P01" ||
    error?.code === "PGRST204" ||
    error?.message?.includes("is_archived") ||
    error?.message?.includes("archived_at")
  );
}

export function getArchiveSchemaErrorMessage() {
  return "List and card archiving requires the latest Supabase migrations.";
}
