export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      billing: {
        Row: {
          amount_invoiced_pence: number
          amount_paid_pence: number
          created_at: string
          id: string
          licence_year_ends: string | null
          licence_year_starts: string | null
          organisation_id: string
          stripe_subscription_id: string | null
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          amount_invoiced_pence?: number
          amount_paid_pence?: number
          created_at?: string
          id?: string
          licence_year_ends?: string | null
          licence_year_starts?: string | null
          organisation_id: string
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          amount_invoiced_pence?: number
          amount_paid_pence?: number
          created_at?: string
          id?: string
          licence_year_ends?: string | null
          licence_year_starts?: string | null
          organisation_id?: string
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          deleted_at: string | null
          distance_metres: number
          id: string
          is_platform_preset: boolean
          map_url: string | null
          marshal_points: Json
          name: string
          organisation_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          distance_metres: number
          id?: string
          is_platform_preset?: boolean
          map_url?: string | null
          marshal_points?: Json
          name: string
          organisation_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          distance_metres?: number
          id?: string
          is_platform_preset?: boolean
          map_url?: string | null
          marshal_points?: Json
          name?: string
          organisation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendance: {
        Row: {
          event_id: string
          recorded_at: string
          runner_id: string
          stagger_offset_seconds: number
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          event_id: string
          recorded_at?: string
          runner_id: string
          stagger_offset_seconds?: number
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          event_id?: string
          recorded_at?: string
          runner_id?: string
          stagger_offset_seconds?: number
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "runners"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          course_id: string
          created_at: string
          deleted_at: string | null
          format: Database["public"]["Enums"]["event_format"]
          group_id: string
          id: string
          lead_id: string | null
          marshals_required: number | null
          notes: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["event_status"]
          term: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          deleted_at?: string | null
          format?: Database["public"]["Enums"]["event_format"]
          group_id: string
          id?: string
          lead_id?: string | null
          marshals_required?: number | null
          notes?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["event_status"]
          term?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          deleted_at?: string | null
          format?: Database["public"]["Enums"]["event_format"]
          group_id?: string
          id?: string
          lead_id?: string | null
          marshals_required?: number | null
          notes?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          term?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_leads: {
        Row: {
          assigned_at: string
          group_id: string
          lead_id: string
        }
        Insert: {
          assigned_at?: string
          group_id: string
          lead_id: string
        }
        Update: {
          assigned_at?: string
          group_id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_leads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          deleted_at: string | null
          group_type: Database["public"]["Enums"]["group_type"]
          id: string
          name: string
          organisation_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          group_type?: Database["public"]["Enums"]["group_type"]
          id?: string
          name: string
          organisation_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          group_type?: Database["public"]["Enums"]["group_type"]
          id?: string
          name?: string
          organisation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          email: string
          expires_at: string
          group_assignments: string[]
          id: string
          invited_by: string
          invited_role: Database["public"]["Enums"]["user_role"]
          organisation_id: string | null
          sent_at: string
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          email: string
          expires_at?: string
          group_assignments?: string[]
          id?: string
          invited_by: string
          invited_role: Database["public"]["Enums"]["user_role"]
          organisation_id?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          email?: string
          expires_at?: string
          group_assignments?: string[]
          id?: string
          invited_by?: string
          invited_role?: Database["public"]["Enums"]["user_role"]
          organisation_id?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          location: string | null
          logo_url: string | null
          mat_parent_id: string | null
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          primary_admin_id: string | null
          status: Database["public"]["Enums"]["org_status"]
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          mat_parent_id?: string | null
          name: string
          org_type?: Database["public"]["Enums"]["org_type"]
          primary_admin_id?: string | null
          status?: Database["public"]["Enums"]["org_status"]
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          mat_parent_id?: string | null
          name?: string
          org_type?: Database["public"]["Enums"]["org_type"]
          primary_admin_id?: string | null
          status?: Database["public"]["Enums"]["org_status"]
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisations_mat_parent_id_fkey"
            columns: ["mat_parent_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisations_primary_admin_id_fkey"
            columns: ["primary_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string | null
          id: string
          organisation_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name?: string | null
          id: string
          organisation_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          organisation_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          adjusted_time_seconds: number
          created_at: string
          event_id: string
          finish_position: number
          finished_at: string
          id: string
          is_most_improved: boolean
          is_personal_best: boolean
          level_after: number | null
          level_before: number | null
          level_change: number | null
          medal: Database["public"]["Enums"]["medal"] | null
          raw_time_seconds: number
          runner_id: string
        }
        Insert: {
          adjusted_time_seconds: number
          created_at?: string
          event_id: string
          finish_position: number
          finished_at?: string
          id?: string
          is_most_improved?: boolean
          is_personal_best?: boolean
          level_after?: number | null
          level_before?: number | null
          level_change?: number | null
          medal?: Database["public"]["Enums"]["medal"] | null
          raw_time_seconds: number
          runner_id: string
        }
        Update: {
          adjusted_time_seconds?: number
          created_at?: string
          event_id?: string
          finish_position?: number
          finished_at?: string
          id?: string
          is_most_improved?: boolean
          is_personal_best?: boolean
          level_after?: number | null
          level_before?: number | null
          level_change?: number | null
          medal?: Database["public"]["Enums"]["medal"] | null
          raw_time_seconds?: number
          runner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "runners"
            referencedColumns: ["id"]
          },
        ]
      }
      runner_groups: {
        Row: {
          added_at: string
          group_id: string
          runner_id: string
        }
        Insert: {
          added_at?: string
          group_id: string
          runner_id: string
        }
        Update: {
          added_at?: string
          group_id?: string
          runner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "runner_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runner_groups_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "runners"
            referencedColumns: ["id"]
          },
        ]
      }
      runners: {
        Row: {
          cc_id: string
          created_at: string
          current_level: number
          deleted_at: string | null
          full_name: string
          id: string
          organisation_id: string
          parent_id: string | null
          personal_best_seconds: number | null
          streak_count: number
          updated_at: string
          year_group: string | null
        }
        Insert: {
          cc_id?: string
          created_at?: string
          current_level?: number
          deleted_at?: string | null
          full_name: string
          id?: string
          organisation_id: string
          parent_id?: string | null
          personal_best_seconds?: number | null
          streak_count?: number
          updated_at?: string
          year_group?: string | null
        }
        Update: {
          cc_id?: string
          created_at?: string
          current_level?: number
          deleted_at?: string | null
          full_name?: string
          id?: string
          organisation_id?: string
          parent_id?: string | null
          personal_best_seconds?: number | null
          streak_count?: number
          updated_at?: string
          year_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "runners_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runners_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_late_arrival: {
        Args: { p_full_name: string; p_group_id: string }
        Returns: {
          current_level: number
          full_name: string
          id: string
          personal_best_seconds: number
          streak_count: number
        }[]
      }
      belongs_to_organisation: { Args: { p_org_id: string }; Returns: boolean }
      calculate_level: { Args: { p_runner_id: string }; Returns: number }
      calculate_stagger: {
        Args: {
          p_course_distance_metres: number
          p_runner_level: number
          p_slowest_level: number
        }
        Returns: number
      }
      commit_event_results: {
        Args: { p_event_id: string; p_finishers: Json }
        Returns: {
          finish_position: number
          is_pb: boolean
          out_level_after: number
          runner_id: string
        }[]
      }
      current_organisation_id: { Args: never; Returns: string }
      current_role_value: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      generate_cc_id: { Args: never; Returns: string }
      is_school_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      leads_group: { Args: { p_group_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_target_id?: string
          p_target_table?: string
        }
        Returns: string
      }
      pace_to_level: { Args: { pace_seconds_per_km: number }; Returns: number }
      reset_demo_data: { Args: never; Returns: undefined }
    }
    Enums: {
      attendance_status: "present" | "dns" | "dnf"
      event_format: "scratch" | "handicap" | "relay"
      event_status: "scheduled" | "in_progress" | "completed" | "cancelled"
      group_type:
        | "year"
        | "class"
        | "club"
        | "pe_class"
        | "breakfast_club"
        | "custom"
      invitation_status: "sent" | "accepted" | "expired" | "revoked"
      medal: "gold" | "silver" | "bronze"
      org_status: "active" | "suspended" | "archived"
      org_type: "school" | "business" | "club" | "distributor" | "mat"
      user_role: "super_admin" | "school_admin" | "lead" | "parent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      attendance_status: ["present", "dns", "dnf"],
      event_format: ["scratch", "handicap", "relay"],
      event_status: ["scheduled", "in_progress", "completed", "cancelled"],
      group_type: [
        "year",
        "class",
        "club",
        "pe_class",
        "breakfast_club",
        "custom",
      ],
      invitation_status: ["sent", "accepted", "expired", "revoked"],
      medal: ["gold", "silver", "bronze"],
      org_status: ["active", "suspended", "archived"],
      org_type: ["school", "business", "club", "distributor", "mat"],
      user_role: ["super_admin", "school_admin", "lead", "parent"],
    },
  },
} as const
