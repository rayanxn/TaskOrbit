"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Link2, MessageSquare, Tag } from "lucide-react";
import { toast } from "sonner";

import {
  addAttachment,
  addChecklistItem,
  addComment,
  createBoardLabel,
  createChecklist,
  loadCardMetadata,
  setCardLabel,
  type CardMetadataSnapshot,
  toggleChecklistItem,
} from "@/lib/card-metadata-client";
import type { ChecklistWithItems } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CardMetadataPanelProps {
  boardId: string;
  cardId: string;
  currentUserId: string;
  canEditContent: boolean;
}

const LABEL_COLORS = [
  { value: "green", className: "bg-emerald-500" },
  { value: "yellow", className: "bg-amber-400" },
  { value: "orange", className: "bg-orange-500" },
  { value: "red", className: "bg-rose-500" },
  { value: "blue", className: "bg-sky-500" },
  { value: "purple", className: "bg-violet-500" },
];

const EMPTY_SNAPSHOT: CardMetadataSnapshot = {
  boardId: null,
  labels: [],
  selectedLabelIds: [],
  checklists: [],
  comments: [],
  attachments: [],
  activity: [],
  schemaReady: true,
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function formatActivityLabel(action: string) {
  return action.replaceAll("_", " ");
}

export default function CardMetadataPanel({
  boardId,
  cardId,
  currentUserId,
  canEditContent,
}: CardMetadataPanelProps) {
  const [metadata, setMetadata] = useState<CardMetadataSnapshot>(EMPTY_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].value);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newCommentValue, setNewCommentValue] = useState("");
  const [attachmentTitle, setAttachmentTitle] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [checklistDrafts, setChecklistDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let isActive = true;

    void loadCardMetadata(cardId)
      .then((snapshot) => {
        if (!isActive) {
          return;
        }

        setMetadata(snapshot);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setErrorMessage(getErrorMessage(error));
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [cardId]);

  const checklistProgress = useMemo(
    () =>
      Object.fromEntries(
        metadata.checklists.map((checklist) => {
          const completed = checklist.items.filter((item) => item.is_completed).length;
          return [checklist.id, `${completed}/${checklist.items.length || 0}`];
        })
      ),
    [metadata.checklists]
  );

  const handleToggleLabel = async (labelId: string) => {
    const isSelected = metadata.selectedLabelIds.includes(labelId);

    try {
      await setCardLabel(cardId, labelId, !isSelected);
      setMetadata((current) => ({
        ...current,
        selectedLabelIds: isSelected
          ? current.selectedLabelIds.filter((currentLabelId) => currentLabelId !== labelId)
          : [...current.selectedLabelIds, labelId],
      }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCreateLabel = async () => {
    try {
      const label = await createBoardLabel(boardId, newLabelName, newLabelColor);
      await setCardLabel(cardId, label.id, true);

      setMetadata((current) => ({
        ...current,
        labels: [...current.labels, label],
        selectedLabelIds: [...current.selectedLabelIds, label.id],
      }));
      setNewLabelName("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCreateChecklist = async () => {
    try {
      const checklist = await createChecklist(cardId, newChecklistTitle, currentUserId);
      setMetadata((current) => ({
        ...current,
        checklists: [...current.checklists, { ...checklist, items: [] }],
        activity: current.activity,
      }));
      setNewChecklistTitle("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleAddChecklistItem = async (checklistId: string) => {
    const draft = checklistDrafts[checklistId] ?? "";

    try {
      const item = await addChecklistItem(checklistId, cardId, draft, currentUserId);
      setMetadata((current) => ({
        ...current,
        checklists: current.checklists.map((checklist) =>
          checklist.id === checklistId
            ? { ...checklist, items: [...checklist.items, item] }
            : checklist
        ),
      }));
      setChecklistDrafts((current) => ({ ...current, [checklistId]: "" }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleToggleChecklistItem = async (checklistId: string, itemId: string, nextValue: boolean) => {
    try {
      await toggleChecklistItem(itemId, cardId, nextValue, currentUserId);
      setMetadata((current) => ({
        ...current,
        checklists: current.checklists.map((checklist) =>
          checklist.id === checklistId
            ? {
                ...checklist,
                items: checklist.items.map((item) =>
                  item.id === itemId ? { ...item, is_completed: nextValue } : item
                ),
              }
            : checklist
        ),
      }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleAddComment = async () => {
    try {
      const comment = await addComment(cardId, currentUserId, newCommentValue);
      setMetadata((current) => ({
        ...current,
        comments: [comment, ...current.comments],
      }));
      setNewCommentValue("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleAddAttachment = async () => {
    try {
      const attachment = await addAttachment(cardId, currentUserId, attachmentUrl, attachmentTitle);
      setMetadata((current) => ({
        ...current,
        attachments: [attachment, ...current.attachments],
      }));
      setAttachmentTitle("");
      setAttachmentUrl("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm text-slate-500">
        Loading card metadata...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {errorMessage}
      </div>
    );
  }

  if (!metadata.schemaReady) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm text-slate-600">
        Card metadata will appear here after the Phase 4 migration is applied.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Tag className="size-4" />
          Labels
        </div>
        <div className="flex flex-wrap gap-2">
          {metadata.labels.length > 0 ? (
            metadata.labels.map((label) => {
              const color = LABEL_COLORS.find((option) => option.value === label.color) ?? LABEL_COLORS[0];
              const isSelected = metadata.selectedLabelIds.includes(label.id);

              return (
                <button
                  key={label.id}
                  type="button"
                  disabled={!canEditContent}
                  onClick={() => void handleToggleLabel(label.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? "border-slate-300 bg-white text-slate-900 shadow-sm"
                      : "border-slate-200 bg-white/70 text-slate-500"
                  }`}
                >
                  <span className={`size-2.5 rounded-full ${color.className}`} />
                  {label.name}
                </button>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">No labels yet.</p>
          )}
        </div>
        {canEditContent ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <Input
              value={newLabelName}
              onChange={(event) => setNewLabelName(event.target.value)}
              placeholder="Create a label"
            />
            <select
              value={newLabelColor}
              onChange={(event) => setNewLabelColor(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
            >
              {LABEL_COLORS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              disabled={!newLabelName.trim()}
              onClick={() => void handleCreateLabel()}
            >
              Add label
            </Button>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <CheckSquare className="size-4" />
          Checklists
        </div>
        {metadata.checklists.length > 0 ? (
          metadata.checklists.map((checklist: ChecklistWithItems) => (
            <div key={checklist.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{checklist.title}</p>
                <span className="text-xs text-slate-500">{checklistProgress[checklist.id]}</span>
              </div>
              <div className="space-y-2">
                {checklist.items.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={item.is_completed}
                      disabled={!canEditContent}
                      onChange={(event) =>
                        void handleToggleChecklistItem(checklist.id, item.id, event.target.checked)
                      }
                    />
                    <span className={item.is_completed ? "line-through text-slate-400" : ""}>
                      {item.title}
                    </span>
                  </label>
                ))}
              </div>
              {canEditContent ? (
                <div className="mt-3 flex gap-2">
                  <Input
                    value={checklistDrafts[checklist.id] ?? ""}
                    onChange={(event) =>
                      setChecklistDrafts((current) => ({
                        ...current,
                        [checklist.id]: event.target.value,
                      }))
                    }
                    placeholder="Add an item"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!checklistDrafts[checklist.id]?.trim()}
                    onClick={() => void handleAddChecklistItem(checklist.id)}
                  >
                    Add
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No checklists yet.</p>
        )}
        {canEditContent ? (
          <div className="flex gap-2">
            <Input
              value={newChecklistTitle}
              onChange={(event) => setNewChecklistTitle(event.target.value)}
              placeholder="Create a checklist"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!newChecklistTitle.trim()}
              onClick={() => void handleCreateChecklist()}
            >
              Add checklist
            </Button>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <MessageSquare className="size-4" />
          Comments
        </div>
        {canEditContent ? (
          <div className="space-y-2">
            <textarea
              value={newCommentValue}
              onChange={(event) => setNewCommentValue(event.target.value)}
              rows={3}
              className="border-input w-full rounded-md border bg-white px-3 py-2 text-sm shadow-xs outline-none"
              placeholder="Write a comment..."
            />
            <Button
              type="button"
              variant="outline"
              disabled={!newCommentValue.trim()}
              onClick={() => void handleAddComment()}
            >
              Add comment
            </Button>
          </div>
        ) : null}
        <div className="space-y-3">
          {metadata.comments.length > 0 ? (
            metadata.comments.map((comment) => (
              <div key={comment.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">
                    {comment.profiles?.full_name ?? comment.profiles?.email ?? "Unknown user"}
                  </p>
                  <span className="text-xs text-slate-500">{formatTimestamp(comment.created_at)}</span>
                </div>
                <p className="text-sm text-slate-700">{comment.content}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No comments yet.</p>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Link2 className="size-4" />
          Attachments
        </div>
        {canEditContent ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              value={attachmentTitle}
              onChange={(event) => setAttachmentTitle(event.target.value)}
              placeholder="Attachment title"
            />
            <Input
              value={attachmentUrl}
              onChange={(event) => setAttachmentUrl(event.target.value)}
              placeholder="https://example.com"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!attachmentUrl.trim()}
              onClick={() => void handleAddAttachment()}
            >
              Add link
            </Button>
          </div>
        ) : null}
        <div className="space-y-2">
          {metadata.attachments.length > 0 ? (
            metadata.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                <span className="truncate">{attachment.title}</span>
                <span className="ml-4 shrink-0 text-xs text-slate-500">
                  {formatTimestamp(attachment.created_at)}
                </span>
              </a>
            ))
          ) : (
            <p className="text-sm text-slate-500">No attachments yet.</p>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4">
        <p className="text-sm font-semibold text-slate-900">Activity</p>
        <div className="space-y-2">
          {metadata.activity.length > 0 ? (
            metadata.activity.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-sm text-slate-700">
                  <span className="font-medium text-slate-900">
                    {entry.profiles?.full_name ?? entry.profiles?.email ?? "Unknown user"}
                  </span>{" "}
                  {formatActivityLabel(entry.action)}
                </p>
                <p className="mt-1 text-xs text-slate-500">{formatTimestamp(entry.created_at)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No activity yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
