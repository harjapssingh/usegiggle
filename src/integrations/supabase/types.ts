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
      helper_profiles: {
        Row: {
          age: number | null
          bio: string | null
          categories: Database["public"]["Enums"]["task_category"][]
          created_at: string
          guardian_approved: boolean
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
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
          guardian_approved?: boolean
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
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
          guardian_approved?: boolean
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
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
      jobs: {
        Row: {
          budget: number
          category: Database["public"]["Enums"]["task_category"]
          created_at: string
          description: string
          helper_id: string | null
          homeowner_id: string
          id: string
          neighbourhood: string | null
          scheduled_date: string | null
          scheduled_time_window: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          budget: number
          category: Database["public"]["Enums"]["task_category"]
          created_at?: string
          description: string
          helper_id?: string | null
          homeowner_id: string
          id?: string
          neighbourhood?: string | null
          scheduled_date?: string | null
          scheduled_time_window?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          budget?: number
          category?: Database["public"]["Enums"]["task_category"]
          created_at?: string
          description?: string
          helper_id?: string | null
          homeowner_id?: string
          id?: string
          neighbourhood?: string | null
          scheduled_date?: string | null
          scheduled_time_window?: string | null
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
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
      user_role: "helper" | "homeowner" | "admin"
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
      user_role: ["helper", "homeowner", "admin"],
    },
  },
} as const
