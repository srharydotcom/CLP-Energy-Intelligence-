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
      ai_analyses: {
        Row: {
          created_at: string
          id: string
          input: Json
          module: string
          output: Json
          subject_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          input: Json
          module: string
          output: Json
          subject_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          input?: Json
          module?: string
          output?: Json
          subject_id?: string | null
        }
        Relationships: []
      }
      business_sites: {
        Row: {
          current_option_id: string | null
          id: string
          monthly_mwh: Json
          name: string
          peak_kw: number
          peak_share: number
          sector: string
        }
        Insert: {
          current_option_id?: string | null
          id: string
          monthly_mwh: Json
          name: string
          peak_kw: number
          peak_share: number
          sector: string
        }
        Update: {
          current_option_id?: string | null
          id?: string
          monthly_mwh?: Json
          name?: string
          peak_kw?: number
          peak_share?: number
          sector?: string
        }
        Relationships: []
      }
      homes: {
        Row: {
          district: string
          end_use_share: Json
          floor_area_m2: number
          id: string
          monthly_kwh: Json
          name: string
          occupants: number
          peer_median_kwh: number
          tariff_id: string | null
        }
        Insert: {
          district: string
          end_use_share: Json
          floor_area_m2: number
          id: string
          monthly_kwh: Json
          name: string
          occupants: number
          peer_median_kwh: number
          tariff_id?: string | null
        }
        Update: {
          district?: string
          end_use_share?: Json
          floor_area_m2?: number
          id?: string
          monthly_kwh?: Json
          name?: string
          occupants?: number
          peer_median_kwh?: number
          tariff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homes_tariff_id_fkey"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "tariffs"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_options: {
        Row: {
          fixed_fee_month: number
          id: string
          name: string
          peak_premium: number
          renewable_share: number
          structure: string
          term_years: number
          unit_price: number
          volatility: number
        }
        Insert: {
          fixed_fee_month?: number
          id: string
          name: string
          peak_premium?: number
          renewable_share: number
          structure: string
          term_years: number
          unit_price: number
          volatility: number
        }
        Update: {
          fixed_fee_month?: number
          id?: string
          name?: string
          peak_premium?: number
          renewable_share?: number
          structure?: string
          term_years?: number
          unit_price?: number
          volatility?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          annual_kwh: number
          brand: string
          category: string
          energy_label: number
          id: string
          lifetime_years: number
          maintenance_per_year: number
          model: string
          price: number
        }
        Insert: {
          annual_kwh: number
          brand: string
          category: string
          energy_label: number
          id: string
          lifetime_years: number
          maintenance_per_year?: number
          model: string
          price: number
        }
        Update: {
          annual_kwh?: number
          brand?: string
          category?: string
          energy_label?: number
          id?: string
          lifetime_years?: number
          maintenance_per_year?: number
          model?: string
          price?: number
        }
        Relationships: []
      }
      tariffs: {
        Row: {
          carbon_kg_per_kwh: number
          demand_charge_kw: number | null
          energy_rate: number
          fuel_adj: number
          id: string
          name: string
          offpeak_rate: number | null
          peak_rate: number | null
          segment: string
        }
        Insert: {
          carbon_kg_per_kwh?: number
          demand_charge_kw?: number | null
          energy_rate: number
          fuel_adj?: number
          id: string
          name: string
          offpeak_rate?: number | null
          peak_rate?: number | null
          segment: string
        }
        Update: {
          carbon_kg_per_kwh?: number
          demand_charge_kw?: number | null
          energy_rate?: number
          fuel_adj?: number
          id?: string
          name?: string
          offpeak_rate?: number | null
          peak_rate?: number | null
          segment?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
