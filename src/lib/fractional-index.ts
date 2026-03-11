import { generateKeyBetween } from "fractional-indexing";

export function generateLastPosition(lastPosition: string | null): string {
  return generateKeyBetween(lastPosition, null);
}

export function generateFirstPosition(firstPosition: string | null): string {
  return generateKeyBetween(null, firstPosition);
}

export function generatePositionBetween(before: string | null, after: string | null): string {
  return generateKeyBetween(before, after);
}

export function generatePositionAtIndex<T extends { id: string; position: string }>(
  items: T[],
  targetIndex: number,
  excludeId?: string
): string {
  const filteredItems = sortByPosition(
    excludeId ? items.filter((item) => item.id !== excludeId) : items
  );
  const boundedIndex = Math.max(0, Math.min(targetIndex, filteredItems.length));
  const before = filteredItems[boundedIndex - 1]?.position ?? null;
  const after = filteredItems[boundedIndex]?.position ?? null;

  return generatePositionBetween(before, after);
}

export function sortByPosition<T extends { position: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));
}
