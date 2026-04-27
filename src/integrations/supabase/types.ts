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
  public: {
    Tables: {
      guardian_helpers: {
        Row: {
          confirmed: boolean
          confirmed_at: string | null
          guardian_id: string
          helper_id: string
          id: string
          requested_at: string
        }
        Insert: {
          confirmed?: boolean
          confirmed_at?: string | null
          guardian_id: string
          helper_id: string
          id?: string
          requested_at?: string
        }
        Update: {
          confirmed?: boolean
          confirmed_at?: string | null
          guardian_id?: string
          helper_id?: string
          id?: string
          requested_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_helpers_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardian_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_link_attempts: {
        Row: {
          failed_attempts: number
          helper_id: string
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          failed_attempts?: number
          helper_id: string
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          failed_attempts?: number
          helper_id?: string
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      guardian_profiles: {
        Row: {
          created_at: string
          failed_attempts: number
          id: string
          link_code: string
          locked_until: string | null
          pin_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          id: string
          link_code?: string
          locked_until?: string | null
          pin_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          id?: string
          link_code?: string
          locked_until?: string | null
          pin_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      helper_profiles: {
        Row: {
          age: number | null
          bio: string | null
          categories: Database["public"]["Enums"]["task_category"][]
          created_at: string
          guardian_name: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean
          is_under_18: boolean
          per_job_rate: number | null
          rate_type: string | null
          school_name: string | null
          school_verified: boolean
        }
        Insert: {
          age?: number | null
          bio?: string | null
          categories?: Database["public"]["Enums"]["task_category"][]
          created_at?: string
          guardian_name?: string | null
          hourly_rate?: number | null
          id: string
          is_active?: boolean
          is_under_18?: boolean
          per_job_rate?: number | null
          rate_type?: string | null
          school_name?: string | null
          school_verified?: boolean
        }
        Update: {
          age?: number | null
          bio?: string | null
          categories?: Database["public"]["Enums"]["task_category"][]
          created_at?: string
          guardian_name?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          is_under_18?: boolean
          per_job_rate?: number | null
          rate_type?: string | null
          school_name?: string | null
          school_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "helper_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homeowner_profiles: {
        Row: {
          accessibility_notes: string | null
          address: string | null
          age_range: string | null
          created_at: string
          id: string
          trusted_contact_email: string | null
          trusted_contact_name: string | null
        }
        Insert: {
          accessibility_notes?: string | null
          address?: string | null
          age_range?: string | null
          created_at?: string
          id: string
          trusted_contact_email?: string | null
          trusted_contact_name?: string | null
        }
        Update: {
          accessibility_notes?: string | null
          address?: string | null
          age_range?: string | null
          created_at?: string
          id?: string
          trusted_contact_email?: string | null
          trusted_contact_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homeowner_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_helper_approvals: {
        Row: {
          approved: boolean
          approved_at: string | null
          guardian_id: string | null
          helper_id: string
          id: string
          job_id: string
          requested_at: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          guardian_id?: string | null
          helper_id: string
          id?: string
          job_id: string
          requested_at?: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          guardian_id?: string | null
          helper_id?: string
          id?: string
          job_id?: string
          requested_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_helper_approvals_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardian_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_helper_approvals_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_interests: {
        Row: {
          created_at: string
          helper_id: string
          id: string
          job_id: string
          message: string | null
        }
        Insert: {
          created_at?: string
          helper_id: string
          id?: string
          job_id: string
          message?: string | null
        }
        Update: {
          created_at?: string
          helper_id?: string
          id?: string
          job_id?: string
          message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_interests_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_interests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_pin_attempts: {
        Row: {
          failed_attempts: number
          helper_id: string
          id: string
          job_id: string
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          failed_attempts?: number
          helper_id: string
          id?: string
          job_id: string
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          failed_attempts?: number
          helper_id?: string
          id?: string
          job_id?: string
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          budget: number
          category: Database["public"]["Enums"]["task_category"]
          completed_at: string | null
          completion_pin: string | null
          created_at: string
          description: string
          helper_id: string | null
          homeowner_id: string
          id: string
          neighbourhood: string | null
          scheduled_date: string | null
          scheduled_time_window: string | null
          start_pin: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          budget: number
          category: Database["public"]["Enums"]["task_category"]
          completed_at?: string | null
          completion_pin?: string | null
          created_at?: string
          description: string
          helper_id?: string | null
          homeowner_id: string
          id?: string
          neighbourhood?: string | null
          scheduled_date?: string | null
          scheduled_time_window?: string | null
          start_pin?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          budget?: number
          category?: Database["public"]["Enums"]["task_category"]
          completed_at?: string | null
          completion_pin?: string | null
          created_at?: string
          description?: string
          helper_id?: string | null
          homeowner_id?: string
          id?: string
          neighbourhood?: string | null
          scheduled_date?: string | null
          scheduled_time_window?: string | null
          start_pin?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          job_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          job_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          job_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          neighbourhood: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          neighbourhood?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          neighbourhood?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      helper_profiles_public: {
        Row: {
          bio: string | null
          categories: Database["public"]["Enums"]["task_category"][] | null
          created_at: string | null
          hourly_rate: number | null
          id: string | null
          is_active: boolean | null
          per_job_rate: number | null
          rate_type: string | null
          school_verified: boolean | null
        }
        Insert: {
          bio?: string | null
          categories?: Database["public"]["Enums"]["task_category"][] | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string | null
          is_active?: boolean | null
          per_job_rate?: number | null
          rate_type?: string | null
          school_verified?: boolean | null
        }
        Update: {
          bio?: string | null
          categories?: Database["public"]["Enums"]["task_category"][] | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string | null
          is_active?: boolean | null
          per_job_rate?: number | null
          rate_type?: string | null
          school_verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "helper_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_job_with_pin: {
        Args: { _helper_id: string; _job_id: string; _pin: string }
        Returns: boolean
      }
      confirm_guardian_link: {
        Args: { _helper_id: string; _pin: string }
        Returns: boolean
      }
      generate_pin: { Args: never; Returns: string }
      get_helper_for_job: {
        Args: { _helper_id: string; _job_id: string }
        Returns: {
          age: number
          avatar_url: string
          bio: string
          full_name: string
          hourly_rate: number
          id: string
          is_under_18: boolean
          per_job_rate: number
          rate_type: string
          school_name: string
        }[]
      }
      get_job_pin_lock: {
        Args: { _job_id: string }
        Returns: {
          failed_attempts: number
          locked_until: string
        }[]
      }
      get_job_pins: {
        Args: { _job_id: string }
        Returns: {
          completion_pin: string
          start_pin: string
        }[]
      }
      get_job_pins_for_helper: {
        Args: { _job_id: string }
        Returns: {
          completion_pin: string
          start_pin: string
        }[]
      }
      guardian_setup: { Args: { _pin: string }; Returns: string }
      is_job_participant: {
        Args: { _job_id: string; _user_id: string }
        Returns: boolean
      }
      list_guardian_pending: {
        Args: never
        Returns: {
          helper_id: string
          helper_name: string
          job_category: Database["public"]["Enums"]["task_category"]
          job_description: string
          job_id: string
          kind: string
          requested_at: string
        }[]
      }
      request_guardian_link: { Args: { _code: string }; Returns: string }
      request_job_approval: { Args: { _job_id: string }; Returns: boolean }
      verify_completion_pin: {
        Args: { _job_id: string; _pin: string }
        Returns: boolean
      }
      verify_start_pin: {
        Args: { _job_id: string; _pin: string }
        Returns: boolean
      }
    }
    Enums: {
      job_status:
        | "open"
        | "matched"
        | "in_progress"
        | "completed"
        | "disputed"
        | "cancelled"
      task_category:
        | "lawn_care"
        | "snow_removal"
        | "leaf_raking"
        | "errands"
        | "car_washing"
        | "gardening"
        | "pet_care"
        | "other"
      user_role: "helper" | "homeowner" | "admin" | "guardian"
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
  public: {
    Enums: {
      job_status: [
        "open",
        "matched",
        "in_progress",
        "completed",
        "disputed",
        "cancelled",
      ],
      task_category: [
        "lawn_care",
        "snow_removal",
        "leaf_raking",
        "errands",
        "car_washing",
        "gardening",
        "pet_care",
        "other",
      ],
      user_role: ["helper", "homeowner", "admin", "guardian"],
    },
  },
} as const
