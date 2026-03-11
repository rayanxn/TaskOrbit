import type { Database } from "@/types/database";

// Profile type (extends Supabase auth.users)
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Board type
export type Board = Database["public"]["Tables"]["boards"]["Row"];

export interface BoardFormValues {
  title: string;
  background: string;
}

export interface UpdateBoardValues extends BoardFormValues {
  boardId: string;
}

export type BoardView = "board" | "table" | "calendar" | "timeline";

// List type
export type List = Database["public"]["Tables"]["lists"]["Row"];

// Card type
export type Card = Database["public"]["Tables"]["cards"]["Row"];

export interface ArchivedBoardList extends List {
  cardCount: number;
}

export interface ArchivedBoardCard extends Card {
  listTitle: string | null;
}

export interface ArchivedBoardItems {
  schemaReady: boolean;
  lists: ArchivedBoardList[];
  cards: ArchivedBoardCard[];
}

export interface CardUpdatePatch {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
}

export interface UpdateCardValues extends CardUpdatePatch {
  cardId: string;
}

export interface MoveCardValues {
  cardId: string;
  listId: string;
  position: string;
}

export interface CopyCardValues {
  cardId: string;
  title: string;
  listId: string;
  position: string;
}

export interface CopyListValues {
  listId: string;
  title: string;
  position: string;
}

export type BoardRole = "owner" | "admin" | "member";
export type BoardVisibility = "private" | "public";

export type BoardMembership = Database["public"]["Tables"]["board_memberships"]["Row"];
export type BoardInvitation = Database["public"]["Tables"]["board_invitations"]["Row"];
export type BoardCustomField = Database["public"]["Tables"]["board_custom_fields"]["Row"];
export type CardCustomFieldValue = Database["public"]["Tables"]["card_custom_field_values"]["Row"];

export interface BoardParticipant {
  userId: string;
  role: BoardRole;
  profile: Profile;
}

export interface InviteMemberValues {
  boardId: string;
  email: string;
  role: "admin" | "member";
}

export interface BoardInvitationWithDetails extends BoardInvitation {
  boards: Pick<Board, "id" | "title" | "background">;
  profiles: Pick<Profile, "id" | "email" | "full_name">;
}

export type BoardLabel = Database["public"]["Tables"]["board_labels"]["Row"];
export type CardLabel = Database["public"]["Tables"]["card_labels"]["Row"];
export type Checklist = Database["public"]["Tables"]["checklists"]["Row"];
export type ChecklistItem = Database["public"]["Tables"]["checklist_items"]["Row"];
export type CardComment = Database["public"]["Tables"]["card_comments"]["Row"];
export type CardAttachment = Database["public"]["Tables"]["card_attachments"]["Row"];
export type CardActivity = Database["public"]["Tables"]["card_activity"]["Row"];

export interface ChecklistWithItems extends Checklist {
  items: ChecklistItem[];
}

export interface CardCommentWithAuthor extends CardComment {
  profiles: Pick<Profile, "id" | "email" | "full_name" | "avatar_url"> | null;
}

export interface CardActivityWithAuthor extends CardActivity {
  profiles: Pick<Profile, "id" | "email" | "full_name" | "avatar_url"> | null;
}

export type CustomFieldType = "text" | "number" | "date" | "select";

// Board with nested lists and cards
export interface BoardWithDetails extends Board {
  lists: ListWithCards[];
}

// List with nested cards
export interface ListWithCards extends List {
  cards: Card[];
}

// Realtime payload types
export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE";

export interface RealtimePayload<T = unknown> {
  commit_timestamp: string;
  eventType: RealtimeEvent;
  new: T;
  old: T;
  schema: string;
  table: string;
}
