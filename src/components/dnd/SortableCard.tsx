"use client";

import { useDndContext } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { Card as CardRecord } from "@/types";
import TaskCard from "@/components/card/Card";
import { cn } from "@/lib/utils";

interface SortableCardProps {
  card: CardRecord;
  listId: string;
  onOpen: () => void;
}

export default function SortableCard({ card, listId, onOpen }: SortableCardProps) {
  const { active, over } = useDndContext();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card:${card.id}`,
    data: { type: "card", listId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const activeId = String(active?.id ?? "");
  const overId = String(over?.id ?? "");
  const isAnyCardDragging = activeId.startsWith("card:");
  const isActiveCard = activeId === `card:${card.id}`;
  const isCardDropTarget = overId === `card:${card.id}` && activeId !== overId;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative rounded-xl transition",
        isAnyCardDragging && !isActiveCard && "will-change-transform",
        isCardDropTarget &&
          "after:absolute after:-top-1 after:left-3 after:right-3 after:h-1 after:rounded-full after:bg-sky-500 after:shadow-[0_0_0_1px_rgba(255,255,255,0.7)] after:content-['']"
      )}
    >
      <TaskCard
        card={card}
        onOpen={onOpen}
        isDragTarget={isCardDropTarget}
        isDraggingHint
      />
    </div>
  );
}
