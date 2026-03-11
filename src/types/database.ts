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
      board_invitations: {
        Row: {
          board_id: string;
          created_at: string;
          id: string;
          invitee_email: string;
          inviter_id: string;
          role: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          board_id: string;
          created_at?: string;
          id?: string;
          invitee_email: string;
          inviter_id: string;
          role: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          board_id?: string;
          created_at?: string;
          id?: string;
          invitee_email?: string;
          inviter_id?: string;
          role?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "board_invitations_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "boards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "board_invitations_inviter_id_fkey";
            columns: ["inviter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      board_memberships: {
        Row: {
          board_id: string;
          created_at: string;
          id: string;
          role: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          board_id: string;
          created_at?: string;
          id?: string;
          role: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          board_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "board_memberships_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "boards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "board_memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      board_custom_fields: {
        Row: {
          board_id: string;
          created_at: string;
          field_type: string;
          id: string;
          name: string;
          options_json: Json;
          updated_at: string;
        };
        Insert: {
          board_id: string;
          created_at?: string;
          field_type: string;
          id?: string;
          name: string;
          options_json?: Json;
          updated_at?: string;
        };
        Update: {
          board_id?: string;
          created_at?: string;
          field_type?: string;
          id?: string;
          name?: string;
          options_json?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "board_custom_fields_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "boards";
            referencedColumns: ["id"];
          },
        ];
      };
      board_labels: {
        Row: {
          board_id: string;
          color: string;
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          board_id: string;
          color: string;
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          board_id?: string;
          color?: string;
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "board_labels_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "boards";
            referencedColumns: ["id"];
          },
        ];
      };
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
          visibility: string;
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
          visibility?: string;
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
          visibility?: string;
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
          archived_at: string | null;
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: string;
          is_archived: boolean;
          list_id: string;
          position: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          is_archived?: boolean;
          list_id: string;
          position: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          is_archived?: boolean;
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
      card_custom_field_values: {
        Row: {
          card_id: string;
          created_at: string;
          field_id: string;
          id: string;
          updated_at: string;
          value_date: string | null;
          value_number: number | null;
          value_option: string | null;
          value_text: string | null;
        };
        Insert: {
          card_id: string;
          created_at?: string;
          field_id: string;
          id?: string;
          updated_at?: string;
          value_date?: string | null;
          value_number?: number | null;
          value_option?: string | null;
          value_text?: string | null;
        };
        Update: {
          card_id?: string;
          created_at?: string;
          field_id?: string;
          id?: string;
          updated_at?: string;
          value_date?: string | null;
          value_number?: number | null;
          value_option?: string | null;
          value_text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "card_custom_field_values_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "card_custom_field_values_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "board_custom_fields";
            referencedColumns: ["id"];
          },
        ];
      };
      card_activity: {
        Row: {
          action: string;
          card_id: string;
          created_at: string;
          details: Json;
          id: string;
          user_id: string;
        };
        Insert: {
          action: string;
          card_id: string;
          created_at?: string;
          details?: Json;
          id?: string;
          user_id: string;
        };
        Update: {
          action?: string;
          card_id?: string;
          created_at?: string;
          details?: Json;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "card_activity_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "card_activity_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      card_attachments: {
        Row: {
          card_id: string;
          created_at: string;
          id: string;
          title: string;
          url: string;
          user_id: string;
        };
        Insert: {
          card_id: string;
          created_at?: string;
          id?: string;
          title: string;
          url: string;
          user_id: string;
        };
        Update: {
          card_id?: string;
          created_at?: string;
          id?: string;
          title?: string;
          url?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "card_attachments_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "card_attachments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      card_comments: {
        Row: {
          card_id: string;
          content: string;
          created_at: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          card_id: string;
          content: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          card_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "card_comments_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "card_comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      card_labels: {
        Row: {
          card_id: string;
          created_at: string;
          id: string;
          label_id: string;
        };
        Insert: {
          card_id: string;
          created_at?: string;
          id?: string;
          label_id: string;
        };
        Update: {
          card_id?: string;
          created_at?: string;
          id?: string;
          label_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "card_labels_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "card_labels_label_id_fkey";
            columns: ["label_id"];
            isOneToOne: false;
            referencedRelation: "board_labels";
            referencedColumns: ["id"];
          },
        ];
      };
      checklist_items: {
        Row: {
          checklist_id: string;
          created_at: string;
          id: string;
          is_completed: boolean;
          position: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          checklist_id: string;
          created_at?: string;
          id?: string;
          is_completed?: boolean;
          position: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          checklist_id?: string;
          created_at?: string;
          id?: string;
          is_completed?: boolean;
          position?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey";
            columns: ["checklist_id"];
            isOneToOne: false;
            referencedRelation: "checklists";
            referencedColumns: ["id"];
          },
        ];
      };
      checklists: {
        Row: {
          card_id: string;
          created_at: string;
          id: string;
          position: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          card_id: string;
          created_at?: string;
          id?: string;
          position: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          card_id?: string;
          created_at?: string;
          id?: string;
          position?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checklists_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
        ];
      };
      lists: {
        Row: {
          archived_at: string | null;
          board_id: string;
          created_at: string;
          id: string;
          is_archived: boolean;
          position: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          board_id: string;
          created_at?: string;
          id?: string;
          is_archived?: boolean;
          position: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          board_id?: string;
          created_at?: string;
          id?: string;
          is_archived?: boolean;
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
    Functions: {
      user_can_admin_board: {
        Args: {
          target_board_id: string;
        };
        Returns: boolean;
      };
      user_can_edit_board_content: {
        Args: {
          target_board_id: string;
        };
        Returns: boolean;
      };
      user_can_view_board: {
        Args: {
          target_board_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
