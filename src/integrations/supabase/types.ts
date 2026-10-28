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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      availability_rules: {
        Row: {
          business_id: string
          end_time: string
          id: string
          start_time: string
          weekday: number
        }
        Insert: {
          business_id: string
          end_time: string
          id?: string
          start_time: string
          weekday: number
        }
        Update: {
          business_id?: string
          end_time?: string
          id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_internal_notes: {
        Row: {
          booking_id: string
          business_id: string
          notes: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          business_id: string
          notes?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          business_id?: string
          notes?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_internal_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_internal_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          business_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_notes: string | null
          customer_phone: string | null
          end_at: string
          id: string
          service_id: string | null
          service_name: string | null
          service_price: number | null
          start_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          business_id: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_notes?: string | null
          customer_phone?: string | null
          end_at: string
          id?: string
          service_id?: string | null
          service_name?: string | null
          service_price?: number | null
          start_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string | null
          end_at?: string
          id?: string
          service_id?: string | null
          service_name?: string | null
          service_price?: number | null
          start_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          accent_color: string
          address: string | null
          auto_confirm: boolean
          buffer_min: number
          cancellation_window_hours: number
          category: string | null
          city: string | null
          cover_url: string | null
          created_at: string
          currency: string
          description: string | null
          email: string | null
          id: string
          instagram: string | null
          is_published: boolean
          logo_url: string | null
          max_advance_days: number
          min_notice_hours: number
          name: string
          owner_id: string | null
          phone: string | null
          slot_interval_min: number
          slug: string
          timezone: string
          updated_at: string
          website: string | null
        }
        Insert: {
          accent_color?: string
          address?: string | null
          auto_confirm?: boolean
          buffer_min?: number
          cancellation_window_hours?: number
          category?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          is_published?: boolean
          logo_url?: string | null
          max_advance_days?: number
          min_notice_hours?: number
          name: string
          owner_id?: string | null
          phone?: string | null
          slot_interval_min?: number
          slug: string
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          accent_color?: string
          address?: string | null
          auto_confirm?: boolean
          buffer_min?: number
          cancellation_window_hours?: number
          category?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          is_published?: boolean
          logo_url?: string | null
          max_advance_days?: number
          min_notice_hours?: number
          name?: string
          owner_id?: string | null
          phone?: string | null
          slot_interval_min?: number
          slug?: string
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          duration_min: number
          id: string
          is_active: boolean
          name: string
          price: number | null
          sort_order: number
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          duration_min: number
          id?: string
          is_active?: boolean
          name: string
          price?: number | null
          sort_order?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          duration_min?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off: {
        Row: {
          business_id: string
          end_at: string
          id: string
          reason: string | null
          start_at: string
        }
        Insert: {
          business_id: string
          end_at: string
          id?: string
          reason?: string | null
          start_at: string
        }
        Update: {
          business_id?: string
          end_at?: string
          id?: string
          reason?: string | null
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _slot_in_hours: {
        Args: {
          _b: Database["public"]["Tables"]["businesses"]["Row"]
          _end: string
          _start: string
        }
        Returns: boolean
      }
      _slot_is_free: {
        Args: {
          _b: Database["public"]["Tables"]["businesses"]["Row"]
          _end: string
          _ignore?: string
          _start: string
        }
        Returns: boolean
      }
      cancel_booking: {
        Args: { booking_id: string }
        Returns: {
          business_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_notes: string | null
          customer_phone: string | null
          end_at: string
          id: string
          service_id: string | null
          service_name: string | null
          service_price: number | null
          start_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      choose_account_type: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      create_booking: {
        Args: {
          business_id: string
          customer_notes?: string
          customer_phone?: string
          service_id: string
          start_at: string
        }
        Returns: {
          business_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_notes: string | null
          customer_phone: string | null
          end_at: string
          id: string
          service_id: string | null
          service_name: string | null
          service_price: number | null
          start_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_manual_booking: {
        Args: {
          customer_email?: string
          customer_name: string
          customer_notes?: string
          customer_phone?: string
          service_id: string
          start_at: string
        }
        Returns: {
          business_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_notes: string | null
          customer_phone: string | null
          end_at: string
          id: string
          service_id: string | null
          service_name: string | null
          service_price: number | null
          start_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_available_slots: {
        Args: { business_slug: string; day: string; service_id: string }
        Returns: string[]
      }
      has_booking_with: { Args: { _bid: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_slug_available: { Args: { _slug: string }; Returns: boolean }
      owns_business: { Args: { _bid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "business_owner" | "customer"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["business_owner", "customer"],
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
    },
  },
} as const
