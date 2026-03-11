"use client";

import type { CardUpdatePatch, ListWithCards } from "@/types";
import ListContainer from "@/components/list/ListContainer";
import ListHeader from "@/components/list/ListHeader";

interface ListColumnProps {
  list: ListWithCards;
  lists?: ListWithCards[];
  boardId?: string;
  currentUserId?: string;
  onUpdateTitle: (title: string) => Promise<void>;
  onMoveList?: (position: string) => Promise<void>;
  onCopyList?: (title: string, position: string) => Promise<void>;
  onArchiveList?: () => Promise<void>;
  onDelete: () => Promise<void>;
  onAddCard: (title: string) => Promise<void>;
  onMoveCard?: (cardId: string, listId: string, position: string) => Promise<void>;
  onCopyCard?: (cardId: string, title: string, listId: string, position: string) => Promise<void>;
  onUpdateCard: (cardId: string, input: CardUpdatePatch) => Promise<void>;
  onArchiveCard?: (cardId: string) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
}

export default function ListColumn({
  list,
  lists = [list],
  boardId = "",
  currentUserId = "",
  onUpdateTitle,
  onMoveList = async () => {},
  onCopyList = async () => {},
  onArchiveList = async () => {},
  onDelete,
  onAddCard,
  onMoveCard = async () => {},
  onCopyCard = async () => {},
  onUpdateCard,
  onArchiveCard = async () => {},
  onDeleteCard,
}: ListColumnProps) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/50">
      <ListHeader
        list={list}
        lists={lists}
        onUpdateTitle={onUpdateTitle}
        onMove={onMoveList}
        onCopy={onCopyList}
        onArchive={onArchiveList}
        onDelete={onDelete}
      />
      <ListContainer
        lists={lists}
        boardId={boardId}
        currentUserId={currentUserId}
        listId={list.id}
        cards={list.cards}
        onAddCard={onAddCard}
        onMoveCard={onMoveCard}
        onCopyCard={onCopyCard}
        onUpdateCard={onUpdateCard}
        onArchiveCard={onArchiveCard}
        onDeleteCard={onDeleteCard}
      />
    </div>
  );
}
