"use client";

import { useMemo, useState } from "react";

import type { Card as CardRecord, CardUpdatePatch, ListWithCards } from "@/types";
import AddCardInput from "@/components/card/AddCardInput";
import CardModal from "@/components/card/CardModal";
import TaskCard from "@/components/card/Card";

interface ListContainerProps {
  lists?: ListWithCards[];
  boardId?: string;
  currentUserId?: string;
  listId: string;
  cards: CardRecord[];
  onAddCard: (title: string) => Promise<void>;
  onMoveCard?: (cardId: string, listId: string, position: string) => Promise<void>;
  onCopyCard?: (cardId: string, title: string, listId: string, position: string) => Promise<void>;
  onUpdateCard: (cardId: string, input: CardUpdatePatch) => Promise<void>;
  onArchiveCard?: (cardId: string) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
}

export default function ListContainer({
  lists = [],
  boardId = "",
  currentUserId = "",
  listId,
  cards,
  onAddCard,
  onMoveCard = async () => {},
  onCopyCard = async () => {},
  onUpdateCard,
  onArchiveCard = async () => {},
  onDeleteCard,
}: ListContainerProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedCardId) ?? null,
    [cards, selectedCardId]
  );

  return (
    <>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 py-1">
        {cards.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">No cards yet</p>
        ) : (
          cards.map((card) => (
            <TaskCard key={card.id} card={card} onOpen={() => setSelectedCardId(card.id)} />
          ))
        )}
        <AddCardInput onAdd={onAddCard} />
      </div>

      <CardModal
        card={selectedCard}
        open={Boolean(selectedCard)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCardId(null);
          }
        }}
        lists={lists}
        boardId={boardId}
        currentUserId={currentUserId}
        onMove={onMoveCard}
        onCopy={onCopyCard}
        onUpdate={onUpdateCard}
        onArchive={onArchiveCard}
        onDelete={onDeleteCard}
      />
    </>
  );
}
