export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      boards: {
        Row: {
          archived_at: string | null;
          background: string;
          created_at: string;
          id: string;
          is_archived: boolean;
          owner_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          background?: string;
          created_at?: string;
          id?: string;
          is_archived?: boolean;
          owner_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          background?: string;
          created_at?: string;
          id?: string;
          is_archived?: boolean;
          owner_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "boards_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cards: {
        Row: {
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: string;
          list_id: string;
          position: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          list_id: string;
          position: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          list_id?: string;
          position?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cards_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
        ];
      };
      lists: {
        Row: {
          board_id: string;
          created_at: string;
          id: string;
          position: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          board_id: string;
          created_at?: string;
          id?: string;
          position: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          board_id?: string;
          created_at?: string;
          id?: string;
          position?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lists_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "boards";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
