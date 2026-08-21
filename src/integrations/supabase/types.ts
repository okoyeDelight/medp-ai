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
      consultation_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          sender_role: string
          triage_session_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          sender_role: string
          triage_session_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          sender_role?: string
          triage_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_messages_triage_session_id_fkey"
            columns: ["triage_session_id"]
            isOneToOne: false
            referencedRelation: "triage_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_sessions: {
        Row: {
          claimed_at: string | null
          created_at: string
          ends_at: string
          hospital_id: string
          id: string
          last_heartbeat: string
          patient_id: string
          pin: string | null
          pin_expires_at: string
          provider_id: string | null
          revoked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          ends_at: string
          hospital_id: string
          id?: string
          last_heartbeat?: string
          patient_id: string
          pin?: string | null
          pin_expires_at: string
          provider_id?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          ends_at?: string
          hospital_id?: string
          id?: string
          last_heartbeat?: string
          patient_id?: string
          pin?: string | null
          pin_expires_at?: string
          provider_id?: string | null
          revoked_at?: string | null
          status?: string
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
      doctor_pharmacist_messages: {
        Row: {
          body: string
          created_at: string
          handoff_id: string
          id: string
          sender_id: string | null
          sender_role: string
        }
        Insert: {
          body: string
          created_at?: string
          handoff_id: string
          id?: string
          sender_id?: string | null
          sender_role: string
        }
        Update: {
          body?: string
          created_at?: string
          handoff_id?: string
          id?: string
          sender_id?: string | null
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_pharmacist_messages_handoff_id_fkey"
            columns: ["handoff_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_handoffs"
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
      drug_herb_interactions: {
        Row: {
          affected_systems: string[]
          citation: string | null
          clinical_advice: string
          created_at: string
          drug_name: string
          drug_name_lc: string | null
          herb_id: string
          herb_name: string
          id: string
          last_synced_at: string
          mechanism: string
          severity: Database["public"]["Enums"]["interaction_severity"]
          source_api: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["interaction_verification"]
        }
        Insert: {
          affected_systems?: string[]
          citation?: string | null
          clinical_advice: string
          created_at?: string
          drug_name: string
          drug_name_lc?: string | null
          herb_id: string
          herb_name: string
          id?: string
          last_synced_at?: string
          mechanism: string
          severity: Database["public"]["Enums"]["interaction_severity"]
          source_api?: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["interaction_verification"]
        }
        Update: {
          affected_systems?: string[]
          citation?: string | null
          clinical_advice?: string
          created_at?: string
          drug_name?: string
          drug_name_lc?: string | null
          herb_id?: string
          herb_name?: string
          id?: string
          last_synced_at?: string
          mechanism?: string
          severity?: Database["public"]["Enums"]["interaction_severity"]
          source_api?: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["interaction_verification"]
        }
        Relationships: []
      }
      followup_tokens: {
        Row: {
          created_at: string
          doctor_id: string
          doctor_last_name: string | null
          doctor_license: string | null
          expires_at: string
          id: string
          patient_id: string
          redeemed_at: string | null
          redeemed_session_id: string | null
          token: string
          triage_session_id: string | null
        }
        Insert: {
          created_at?: string
          doctor_id: string
          doctor_last_name?: string | null
          doctor_license?: string | null
          expires_at: string
          id?: string
          patient_id: string
          redeemed_at?: string | null
          redeemed_session_id?: string | null
          token: string
          triage_session_id?: string | null
        }
        Update: {
          created_at?: string
          doctor_id?: string
          doctor_last_name?: string | null
          doctor_license?: string | null
          expires_at?: string
          id?: string
          patient_id?: string
          redeemed_at?: string | null
          redeemed_session_id?: string | null
          token?: string
          triage_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followup_tokens_triage_session_id_fkey"
            columns: ["triage_session_id"]
            isOneToOne: false
            referencedRelation: "triage_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      nafdac_herbal_registry: {
        Row: {
          created_at: string
          cyp450_risk_level: string
          id: string
          interaction_advisory: string
          nafdac_code: string
          product_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cyp450_risk_level: string
          id?: string
          interaction_advisory: string
          nafdac_code: string
          product_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cyp450_risk_level?: string
          id?: string
          interaction_advisory?: string
          nafdac_code?: string
          product_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      owner_preview_allowlist: {
        Row: {
          created_at: string
          email: string
          id: string
          note: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          note?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          note?: string | null
        }
        Relationships: []
      }
      owner_preview_audit: {
        Row: {
          action: string
          created_at: string
          email: string | null
          hospital_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          email?: string | null
          hospital_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          email?: string | null
          hospital_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_preview_audit_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_care_team: {
        Row: {
          assigned_by: string | null
          created_at: string
          hospital_id: string
          id: string
          notes: string | null
          patient_id: string
          provider_id: string
          status: Database["public"]["Enums"]["care_team_status"]
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          hospital_id: string
          id?: string
          notes?: string | null
          patient_id: string
          provider_id: string
          status?: Database["public"]["Enums"]["care_team_status"]
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          provider_id?: string
          status?: Database["public"]["Enums"]["care_team_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_care_team_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacies: {
        Row: {
          address: string | null
          auto_duty: boolean
          created_at: string
          duty_status: string
          hours_close: string | null
          hours_open: string | null
          id: string
          is_licensed_pharmacy: boolean
          lat: number | null
          license_number: string
          lng: number | null
          name: string
          owner_user_id: string
          phone: string | null
          price_naira: number
          pricing_mode: string
          quick_replies: string[]
          service_radius_km: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          auto_duty?: boolean
          created_at?: string
          duty_status?: string
          hours_close?: string | null
          hours_open?: string | null
          id?: string
          is_licensed_pharmacy?: boolean
          lat?: number | null
          license_number: string
          lng?: number | null
          name: string
          owner_user_id: string
          phone?: string | null
          price_naira?: number
          pricing_mode?: string
          quick_replies?: string[]
          service_radius_km?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          auto_duty?: boolean
          created_at?: string
          duty_status?: string
          hours_close?: string | null
          hours_open?: string | null
          id?: string
          is_licensed_pharmacy?: boolean
          lat?: number | null
          license_number?: string
          lng?: number | null
          name?: string
          owner_user_id?: string
          phone?: string | null
          price_naira?: number
          pricing_mode?: string
          quick_replies?: string[]
          service_radius_km?: number
          updated_at?: string
        }
        Relationships: []
      }
      pharmacy_chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string | null
          sender_role: string
          session_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_role: string
          session_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_chat_sessions: {
        Row: {
          accepted_at: string | null
          archived_transcript: Json | null
          created_at: string
          ended_at: string | null
          id: string
          interaction_report: Json | null
          patient_id: string
          pharmacist_user_id: string
          pharmacy_id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          archived_transcript?: Json | null
          created_at?: string
          ended_at?: string | null
          id?: string
          interaction_report?: Json | null
          patient_id: string
          pharmacist_user_id: string
          pharmacy_id: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          archived_transcript?: Json | null
          created_at?: string
          ended_at?: string | null
          id?: string
          interaction_report?: Json | null
          patient_id?: string
          pharmacist_user_id?: string
          pharmacy_id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_chat_sessions_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_handoffs: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          created_at: string
          dispense_pin: string
          dispensed_at: string | null
          doctor_id: string
          id: string
          interaction_report: Json | null
          patient_id: string
          pharmacist_user_id: string
          pharmacy_id: string
          prescription: Json | null
          ready_at: string | null
          status: string
          triage_session_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          dispense_pin: string
          dispensed_at?: string | null
          doctor_id: string
          id?: string
          interaction_report?: Json | null
          patient_id: string
          pharmacist_user_id: string
          pharmacy_id: string
          prescription?: Json | null
          ready_at?: string | null
          status?: string
          triage_session_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          dispense_pin?: string
          dispensed_at?: string | null
          doctor_id?: string
          id?: string
          interaction_report?: Json | null
          patient_id?: string
          pharmacist_user_id?: string
          pharmacy_id?: string
          prescription?: Json | null
          ready_at?: string | null
          status?: string
          triage_session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_handoffs_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_handoffs_triage_session_id_fkey"
            columns: ["triage_session_id"]
            isOneToOne: false
            referencedRelation: "triage_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      triage_documents: {
        Row: {
          file_name: string
          generated_at: string
          handoff_id: string
          id: string
          kind: string
          storage_path: string
        }
        Insert: {
          file_name: string
          generated_at?: string
          handoff_id: string
          id?: string
          kind: string
          storage_path: string
        }
        Update: {
          file_name?: string
          generated_at?: string
          handoff_id?: string
          id?: string
          kind?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "triage_documents_handoff_id_fkey"
            columns: ["handoff_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_handoffs"
            referencedColumns: ["id"]
          },
        ]
      }
      triage_reports: {
        Row: {
          created_at: string
          patient_id: string
          report: Json
          triage_session_id: string
        }
        Insert: {
          created_at?: string
          patient_id: string
          report: Json
          triage_session_id: string
        }
        Update: {
          created_at?: string
          patient_id?: string
          report?: Json
          triage_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "triage_reports_triage_session_id_fkey"
            columns: ["triage_session_id"]
            isOneToOne: true
            referencedRelation: "triage_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      triage_sessions: {
        Row: {
          age_band: string | null
          cancelled_at: string | null
          claimed_at: string | null
          concluded_at: string | null
          created_at: string
          doctor_id: string | null
          gender: string | null
          hospital_id: string | null
          id: string
          patient_accepted_at: string | null
          patient_id: string
          pin_expires_at: string
          provider_last_name: string | null
          provider_license: string | null
          requested_at: string | null
          requested_by: string | null
          status: string
          symptom_category: string | null
          triage_pin: string | null
          updated_at: string
        }
        Insert: {
          age_band?: string | null
          cancelled_at?: string | null
          claimed_at?: string | null
          concluded_at?: string | null
          created_at?: string
          doctor_id?: string | null
          gender?: string | null
          hospital_id?: string | null
          id?: string
          patient_accepted_at?: string | null
          patient_id: string
          pin_expires_at?: string
          provider_last_name?: string | null
          provider_license?: string | null
          requested_at?: string | null
          requested_by?: string | null
          status?: string
          symptom_category?: string | null
          triage_pin?: string | null
          updated_at?: string
        }
        Update: {
          age_band?: string | null
          cancelled_at?: string | null
          claimed_at?: string | null
          concluded_at?: string | null
          created_at?: string
          doctor_id?: string | null
          gender?: string | null
          hospital_id?: string | null
          id?: string
          patient_accepted_at?: string | null
          patient_id?: string
          pin_expires_at?: string
          provider_last_name?: string | null
          provider_license?: string | null
          requested_at?: string | null
          requested_by?: string | null
          status?: string
          symptom_category?: string | null
          triage_pin?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "triage_sessions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
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
      accept_triage: { Args: { _session_id: string }; Returns: string }
      claim_triage_pin: { Args: { _pin: string }; Returns: string }
      decline_triage: { Args: { _session_id: string }; Returns: undefined }
      delete_my_account: { Args: never; Returns: undefined }
      demo_bypass_pharmacist: { Args: never; Returns: string }
      demo_bypass_verification: { Args: never; Returns: undefined }
      expire_stale_triage: { Args: never; Returns: number }
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
      is_handoff_clinician: { Args: { _handoff_id: string }; Returns: boolean }
      is_hospital_admin: {
        Args: { _hospital_id: string; _user_id: string }
        Returns: boolean
      }
      is_on_care_team: {
        Args: { _patient_id: string; _provider_id: string }
        Returns: boolean
      }
      is_owner_preview: { Args: { _user_id?: string }; Returns: boolean }
      is_pharmacy_chat_participant: {
        Args: { _session_id: string }
        Returns: boolean
      }
      is_verified_provider: { Args: { _user_id: string }; Returns: boolean }
      issue_followup_token: {
        Args: { _hours?: number; _session_id: string }
        Returns: string
      }
      patient_heartbeat: { Args: { _session_id: string }; Returns: undefined }
      provider_hospital_id: { Args: { _user_id: string }; Returns: string }
      redeem_followup_token: { Args: { _token_id: string }; Returns: string }
      request_triage: { Args: { _session_id: string }; Returns: string }
      start_owner_preview: {
        Args: never
        Returns: {
          hospital_id: string
          hospital_name: string
          is_owner_preview: boolean
        }[]
      }
      terminate_if_stale: {
        Args: { _session_id: string }
        Returns: {
          status: string
          terminated: boolean
        }[]
      }
    }
    Enums: {
      app_role: "patient" | "provider" | "hospital_admin" | "platform_admin"
      care_team_status: "active" | "scheduled" | "historical"
      interaction_severity: "severe" | "moderate" | "mild"
      interaction_verification: "pending" | "verified"
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
      care_team_status: ["active", "scheduled", "historical"],
      interaction_severity: ["severe", "moderate", "mild"],
      interaction_verification: ["pending", "verified"],
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
