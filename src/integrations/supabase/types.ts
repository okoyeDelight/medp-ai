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
      consultation_sessions: {
        Row: {
          claimed_at: string | null
          created_at: string
          ends_at: string
          hospital_id: string
          id: string
          patient_id: string
          pin: string
          pin_expires_at: string
          provider_id: string | null
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          ends_at: string
          hospital_id: string
          id?: string
          patient_id: string
          pin: string
          pin_expires_at: string
          provider_id?: string | null
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          ends_at?: string
          hospital_id?: string
          id?: string
          patient_id?: string
          pin?: string
          pin_expires_at?: string
          provider_id?: string | null
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_sessions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      dose_logs: {
        Row: {
          created_at: string
          dose: string
          feel: string | null
          id: string
          remedy_emoji: string
          remedy_id: string
          remedy_local_name: string
          remedy_name: string
          taken_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dose: string
          feel?: string | null
          id?: string
          remedy_emoji: string
          remedy_id: string
          remedy_local_name: string
          remedy_name: string
          taken_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dose?: string
          feel?: string | null
          id?: string
          remedy_emoji?: string
          remedy_id?: string
          remedy_local_name?: string
          remedy_name?: string
          taken_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_safety_scores: {
        Row: {
          context: Json
          created_at: string
          id: string
          premium_discount_pct: number
          score: number
          updated_at: string
          user_id: string
          wellness_points: number
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          premium_discount_pct?: number
          score?: number
          updated_at?: string
          user_id: string
          wellness_points?: number
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          premium_discount_pct?: number
          score?: number
          updated_at?: string
          user_id?: string
          wellness_points?: number
        }
        Relationships: []
      }
      hospital_admins: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_admins_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_provider_whitelist: {
        Row: {
          added_by: string | null
          contact: string
          created_at: string
          hospital_id: string
          id: string
        }
        Insert: {
          added_by?: string | null
          contact: string
          created_at?: string
          hospital_id: string
          id?: string
        }
        Update: {
          added_by?: string | null
          contact?: string
          created_at?: string
          hospital_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_provider_whitelist_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_providers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          grant_method:
            | Database["public"]["Enums"]["provider_grant_method"]
            | null
          hospital_id: string
          id: string
          onboarded_distance_m: number | null
          onboarded_lat: number | null
          onboarded_lng: number | null
          staff_id_photo_path: string | null
          status: Database["public"]["Enums"]["provider_status"]
          temp_expires_at: string | null
          updated_at: string
          user_id: string
          ward_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          grant_method?:
            | Database["public"]["Enums"]["provider_grant_method"]
            | null
          hospital_id: string
          id?: string
          onboarded_distance_m?: number | null
          onboarded_lat?: number | null
          onboarded_lng?: number | null
          staff_id_photo_path?: string | null
          status?: Database["public"]["Enums"]["provider_status"]
          temp_expires_at?: string | null
          updated_at?: string
          user_id: string
          ward_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          grant_method?:
            | Database["public"]["Enums"]["provider_grant_method"]
            | null
          hospital_id?: string
          id?: string
          onboarded_distance_m?: number | null
          onboarded_lat?: number | null
          onboarded_lng?: number | null
          staff_id_photo_path?: string | null
          status?: Database["public"]["Enums"]["provider_status"]
          temp_expires_at?: string | null
          updated_at?: string
          user_id?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_providers_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_providers_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "hospital_wards"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_qr_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          hospital_id: string
          id: string
          kind: Database["public"]["Enums"]["qr_kind"]
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          hospital_id: string
          id?: string
          kind: Database["public"]["Enums"]["qr_kind"]
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          hospital_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["qr_kind"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_qr_tokens_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_wards: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_wards_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          city: string | null
          country: string
          created_at: string
          emergency_dial: string
          geofence_radius_m: number
          id: string
          latitude: number
          longitude: number
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string
          created_at?: string
          emergency_dial?: string
          geofence_radius_m?: number
          id?: string
          latitude: number
          longitude: number
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string
          created_at?: string
          emergency_dial?: string
          geofence_radius_m?: number
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_conditions: string[]
          active_medications: string[]
          created_at: string
          display_name: string | null
          email: string | null
          hmo_member_id: string | null
          hmo_provider: string | null
          id: string
          privacy_acknowledged_at: string | null
          privacy_guard: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          active_conditions?: string[]
          active_medications?: string[]
          created_at?: string
          display_name?: string | null
          email?: string | null
          hmo_member_id?: string | null
          hmo_provider?: string | null
          id?: string
          privacy_acknowledged_at?: string | null
          privacy_guard?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          active_conditions?: string[]
          active_medications?: string[]
          created_at?: string
          display_name?: string | null
          email?: string | null
          hmo_member_id?: string | null
          hmo_provider?: string | null
          id?: string
          privacy_acknowledged_at?: string | null
          privacy_guard?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      safety_score_events: {
        Row: {
          category: string
          created_at: string
          delta: number
          id: string
          metadata: Json
          reason: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          delta: number
          id?: string
          metadata?: Json
          reason: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          delta?: number
          id?: string
          metadata?: Json
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vitals_logs: {
        Row: {
          created_at: string
          diastolic: number | null
          glucose_mgdl: number | null
          id: string
          measured_at: string
          notes: string | null
          pulse_bpm: number | null
          signal_quality: string | null
          source: string
          systolic: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          diastolic?: number | null
          glucose_mgdl?: number | null
          id?: string
          measured_at?: string
          notes?: string | null
          pulse_bpm?: number | null
          signal_quality?: string | null
          source?: string
          systolic?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          diastolic?: number | null
          glucose_mgdl?: number | null
          id?: string
          measured_at?: string
          notes?: string | null
          pulse_bpm?: number | null
          signal_quality?: string | null
          source?: string
          systolic?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_my_account: { Args: never; Returns: undefined }
      has_active_consultation: {
        Args: { _patient_id: string; _provider_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_hospital_admin: {
        Args: { _hospital_id: string; _user_id: string }
        Returns: boolean
      }
      is_verified_provider: { Args: { _user_id: string }; Returns: boolean }
      provider_hospital_id: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "patient" | "provider" | "hospital_admin" | "platform_admin"
      provider_grant_method:
        | "implicit_qr"
        | "passive_qr"
        | "whitelist"
        | "admin_approve"
        | "staff_id"
      provider_status:
        | "pending_verification"
        | "temporary"
        | "active"
        | "revoked"
      qr_kind: "rotating" | "static"
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
      app_role: ["patient", "provider", "hospital_admin", "platform_admin"],
      provider_grant_method: [
        "implicit_qr",
        "passive_qr",
        "whitelist",
        "admin_approve",
        "staff_id",
      ],
      provider_status: [
        "pending_verification",
        "temporary",
        "active",
        "revoked",
      ],
      qr_kind: ["rotating", "static"],
    },
  },
} as const
