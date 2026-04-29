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
      admin_logs: {
        Row: {
          action: string | null
          created_at: string | null
          details: Json | null
          id: number
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          details?: Json | null
          id?: number
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          details?: Json | null
          id?: number
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bandes: {
        Row: {
          date_entree: string | null
          id: string
          nom: string
          statut: string | null
          troupeau_id: string | null
        }
        Insert: {
          date_entree?: string | null
          id?: string
          nom: string
          statut?: string | null
          troupeau_id?: string | null
        }
        Update: {
          date_entree?: string | null
          id?: string
          nom?: string
          statut?: string | null
          troupeau_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bandes_troupeau_id_fkey"
            columns: ["troupeau_id"]
            isOneToOne: false
            referencedRelation: "troupeaux"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          boar_id: string | null
          code_id: string
          date_mise_bas: string | null
          date_saillie: string | null
          date_sevrage: string | null
          farm_id: string
          id: string
          notes: string | null
          poids_moyen_sevrage_kg: number | null
          poids_portee_naissance_kg: number | null
          porcelets_nes_total: number
          porcelets_nes_vivants: number
          porcelets_sevrene_total: number
          sow_id: string | null
        }
        Insert: {
          boar_id?: string | null
          code_id: string
          date_mise_bas?: string | null
          date_saillie?: string | null
          date_sevrage?: string | null
          farm_id: string
          id?: string
          notes?: string | null
          poids_moyen_sevrage_kg?: number | null
          poids_portee_naissance_kg?: number | null
          porcelets_nes_total?: number
          porcelets_nes_vivants?: number
          porcelets_sevrene_total?: number
          sow_id?: string | null
        }
        Update: {
          boar_id?: string | null
          code_id?: string
          date_mise_bas?: string | null
          date_saillie?: string | null
          date_sevrage?: string | null
          farm_id?: string
          id?: string
          notes?: string | null
          poids_moyen_sevrage_kg?: number | null
          poids_portee_naissance_kg?: number | null
          porcelets_nes_total?: number
          porcelets_nes_vivants?: number
          porcelets_sevrene_total?: number
          sow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_boar_id_fkey"
            columns: ["boar_id"]
            isOneToOne: false
            referencedRelation: "boars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_sow_id_fkey"
            columns: ["sow_id"]
            isOneToOne: false
            referencedRelation: "sows"
            referencedColumns: ["id"]
          },
        ]
      }
      boars: {
        Row: {
          breed: string | null
          code_id: string
          created_on: string
          farm_id: string
          id: string
          name: string | null
        }
        Insert: {
          breed?: string | null
          code_id: string
          created_on?: string
          farm_id: string
          id?: string
          name?: string | null
        }
        Update: {
          breed?: string | null
          code_id?: string
          created_on?: string
          farm_id?: string
          id?: string
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boars_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_inventory: {
        Row: {
          code_id: string
          farm_id: string
          feed_name: string
          id: string
          movement_date: string
          movement_type: string
          notes: string | null
          quantity_kg: number
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          code_id: string
          farm_id: string
          feed_name: string
          id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          quantity_kg?: number
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          code_id?: string
          farm_id?: string
          feed_name?: string
          id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          quantity_kg?: number
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_inventory_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_logs: {
        Row: {
          affected_animals: number | null
          animal_code: string | null
          animal_reference: string | null
          animal_type: string
          batch_id: string | null
          code_id: string
          diagnosis: string | null
          dose_cost: number | null
          dose_count: number | null
          duration: string | null
          farm_id: string
          id: string
          log_date: string
          log_type: string
          logged_at: string
          notes: string | null
          operator: string | null
          result: string | null
          sow_id: string | null
          symptom: string | null
          symptoms: string | null
          treatment: string | null
          treatment_name: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          affected_animals?: number | null
          animal_code?: string | null
          animal_reference?: string | null
          animal_type?: string
          batch_id?: string | null
          code_id: string
          diagnosis?: string | null
          dose_cost?: number | null
          dose_count?: number | null
          duration?: string | null
          farm_id: string
          id?: string
          log_date?: string
          log_type: string
          logged_at?: string
          notes?: string | null
          operator?: string | null
          result?: string | null
          sow_id?: string | null
          symptom?: string | null
          symptoms?: string | null
          treatment?: string | null
          treatment_name?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          affected_animals?: number | null
          animal_code?: string | null
          animal_reference?: string | null
          animal_type?: string
          batch_id?: string | null
          code_id?: string
          diagnosis?: string | null
          dose_cost?: number | null
          dose_count?: number | null
          duration?: string | null
          farm_id?: string
          id?: string
          log_date?: string
          log_type?: string
          logged_at?: string
          notes?: string | null
          operator?: string | null
          result?: string | null
          sow_id?: string | null
          symptom?: string | null
          symptoms?: string | null
          treatment?: string | null
          treatment_name?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_logs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_logs_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_logs_sow_id_fkey"
            columns: ["sow_id"]
            isOneToOne: false
            referencedRelation: "sows"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          email: string | null
          full_name: string | null
          id: string
          role: string | null
        }
        Insert: {
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
        }
        Update: {
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      sows: {
        Row: {
          breed: string | null
          code_id: string
          created_on: string
          farm_id: string
          id: string
          name: string | null
        }
        Insert: {
          breed?: string | null
          code_id: string
          created_on?: string
          farm_id: string
          id?: string
          name?: string | null
        }
        Update: {
          breed?: string | null
          code_id?: string
          created_on?: string
          farm_id?: string
          id?: string
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sows_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      troupeaux: {
        Row: {
          created_at: string | null
          id: string
          nom: string
          secteur: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nom: string
          secteur?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nom?: string
          secteur?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      vet_inventory: {
        Row: {
          code_id: string
          dose_quantity: number
          farm_id: string
          id: string
          movement_date: string
          movement_type: string
          notes: string | null
          product_name: string
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          code_id: string
          dose_quantity?: number
          farm_id: string
          id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          product_name: string
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          code_id?: string
          dose_quantity?: number
          farm_id?: string
          id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          product_name?: string
          total_cost?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vet_inventory_farm_id_fkey"
            columns: ["farm_id"]
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
      get_user_role: { Args: { user_id: string }; Returns: string }
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
    Enums: {},
  },
} as const
