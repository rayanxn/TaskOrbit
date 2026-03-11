"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  createBoardCustomField,
  getCustomFieldsFallbackMessage,
  loadBoardCustomFields,
} from "@/lib/custom-fields-client";
import type { BoardCustomField, CustomFieldType } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CustomFieldsDialogProps {
  boardId: string;
  canManageFields: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while loading custom fields.";
}

export default function CustomFieldsDialog({
  boardId,
  canManageFields,
  open,
  onOpenChange,
}: CustomFieldsDialogProps) {
  const [fields, setFields] = useState<BoardCustomField[]>([]);
  const [schemaReady, setSchemaReady] = useState(true);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<CustomFieldType>("text");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isActive = true;

    const loadFields = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await loadBoardCustomFields(boardId);

        if (!isActive) {
          return;
        }

        setFields(result.fields);
        setSchemaReady(result.schemaReady);
      } catch (error) {
        if (isActive) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadFields();

    return () => {
      isActive = false;
    };
  }, [boardId, open]);

  const handleCreate = async () => {
    const trimmedName = fieldName.trim();

    if (!trimmedName) {
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const field = await createBoardCustomField(boardId, trimmedName, fieldType);
      setFields((current) => [...current, field]);
      setFieldName("");
      toast.success(`Created "${field.name}".`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Custom fields</DialogTitle>
          <DialogDescription>
            Add structured data to cards without overloading the title and description.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? <p className="text-sm text-slate-500">Loading custom fields...</p> : null}
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

        {!isLoading && !schemaReady ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-600">
            {getCustomFieldsFallbackMessage()}
          </div>
        ) : null}

        {!isLoading && schemaReady ? (
          <div className="space-y-4">
            <section className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Board fields</p>
                <p className="text-xs text-slate-500">
                  These definitions are shared across every card on the board.
                </p>
              </div>

              {fields.length > 0 ? (
                <div className="space-y-2">
                  {fields.map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                    >
                      <span className="text-sm font-medium text-slate-900">{field.name}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
                        {field.field_type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No custom fields defined yet.</p>
              )}
            </section>

            {canManageFields ? (
              <section className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Add field</p>
                  <p className="text-xs text-slate-500">
                    Start with a shared field definition. Card-level values land after this foundation.
                  </p>
                </div>

                <Input
                  value={fieldName}
                  onChange={(event) => setFieldName(event.target.value)}
                  placeholder="Field name"
                />

                <select
                  value={fieldType}
                  onChange={(event) => setFieldType(event.target.value as CustomFieldType)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Select</option>
                </select>

                <Button type="button" disabled={isCreating || !fieldName.trim()} onClick={() => void handleCreate()}>
                  <Plus className="size-4" />
                  {isCreating ? "Creating..." : "Create field"}
                </Button>
              </section>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
