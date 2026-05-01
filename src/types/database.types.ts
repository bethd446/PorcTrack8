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
      alert_dismissals: {
        Row: {
          alert_id: string
          dismissed_at: string
          dismissed_by: string
          expires_at: string
          farm_id: string
          id: string
          reason: string | null
        }
        Insert: {
          alert_id: string
          dismissed_at?: string
          dismissed_by: string
          expires_at?: string
          farm_id: string
          id?: string
          reason?: string | null
        }
        Update: {
          alert_id?: string
          dismissed_at?: string
          dismissed_by?: string
          expires_at?: string
          farm_id?: string
          id?: string
          reason?: string | null
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
          aliment_actuel: string | null
          boar_id: string | null
          code_id: string
          date_mise_bas: string | null
          date_prochain_event: string | null
          date_saillie: string | null
          date_sevrage: string | null
          date_sevrage_prevue: string | null
          farm_id: string
          id: string
          loge: string | null
          nb_mort_nes: number | null
          notes: string | null
          phase: string | null
          photo_url: string | null
          poids_moyen_kg: number | null
          poids_moyen_sevrage_kg: number | null
          poids_portee_naissance_kg: number | null
          porcelets_nes_total: number
          porcelets_nes_vivants: number
          porcelets_sevrene_total: number
          prochain_event: string | null
          sow_id: string | null
          statut: string | null
        }
        Insert: {
          aliment_actuel?: string | null
          boar_id?: string | null
          code_id: string
          date_mise_bas?: string | null
          date_prochain_event?: string | null
          date_saillie?: string | null
          date_sevrage?: string | null
          date_sevrage_prevue?: string | null
          farm_id: string
          id?: string
          loge?: string | null
          nb_mort_nes?: number | null
          notes?: string | null
          phase?: string | null
          photo_url?: string | null
          poids_moyen_kg?: number | null
          poids_moyen_sevrage_kg?: number | null
          poids_portee_naissance_kg?: number | null
          porcelets_nes_total?: number
          porcelets_nes_vivants?: number
          porcelets_sevrene_total?: number
          prochain_event?: string | null
          sow_id?: string | null
          statut?: string | null
        }
        Update: {
          aliment_actuel?: string | null
          boar_id?: string | null
          code_id?: string
          date_mise_bas?: string | null
          date_prochain_event?: string | null
          date_saillie?: string | null
          date_sevrage?: string | null
          date_sevrage_prevue?: string | null
          farm_id?: string
          id?: string
          loge?: string | null
          nb_mort_nes?: number | null
          notes?: string | null
          phase?: string | null
          photo_url?: string | null
          poids_moyen_kg?: number | null
          poids_moyen_sevrage_kg?: number | null
          poids_portee_naissance_kg?: number | null
          porcelets_nes_total?: number
          porcelets_nes_vivants?: number
          porcelets_sevrene_total?: number
          prochain_event?: string | null
          sow_id?: string | null
          statut?: string | null
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
          alimentation: string | null
          boucle: string | null
          breed: string | null
          code_id: string
          created_on: string
          date_naissance: string | null
          farm_id: string
          id: string
          lignee_parentale: string | null
          localisation: string | null
          name: string | null
          notes: string | null
          origine: string | null
          photo_url: string | null
          ration_kg_j: number | null
          statut: string | null
        }
        Insert: {
          alimentation?: string | null
          boucle?: string | null
          breed?: string | null
          code_id: string
          created_on?: string
          date_naissance?: string | null
          farm_id: string
          id?: string
          lignee_parentale?: string | null
          localisation?: string | null
          name?: string | null
          notes?: string | null
          origine?: string | null
          photo_url?: string | null
          ration_kg_j?: number | null
          statut?: string | null
        }
        Update: {
          alimentation?: string | null
          boucle?: string | null
          breed?: string | null
          code_id?: string
          created_on?: string
          date_naissance?: string | null
          farm_id?: string
          id?: string
          lignee_parentale?: string | null
          localisation?: string | null
          name?: string | null
          notes?: string | null
          origine?: string | null
          photo_url?: string | null
          ration_kg_j?: number | null
          statut?: string | null
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
      finances: {
        Row: {
          annuel_fcfa: number | null
          created_at: string | null
          farm_id: string
          id: string
          mensuel_fcfa: number | null
          notes: string | null
          pct_total: number | null
          poste: string
          type: string | null
        }
        Insert: {
          annuel_fcfa?: number | null
          created_at?: string | null
          farm_id: string
          id?: string
          mensuel_fcfa?: number | null
          notes?: string | null
          pct_total?: number | null
          poste: string
          type?: string | null
        }
        Update: {
          annuel_fcfa?: number | null
          created_at?: string | null
          farm_id?: string
          id?: string
          mensuel_fcfa?: number | null
          notes?: string | null
          pct_total?: number | null
          poste?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finances_farm_id_fkey"
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
      notes: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          created_at: string
          farm_id: string
          id: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content: string
          created_at?: string
          farm_id: string
          id?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          created_at?: string
          farm_id?: string
          id?: string
        }
        Relationships: []
      }
      plan_alimentation: {
        Row: {
          aliment: string | null
          categorie: string
          cout_kg_fcfa: number | null
          cout_mois_fcfa: number | null
          created_at: string | null
          effectif: number | null
          farm_id: string
          id: string
          phase: string | null
          ration_j_kg: number | null
          total_j_kg: number | null
        }
        Insert: {
          aliment?: string | null
          categorie: string
          cout_kg_fcfa?: number | null
          cout_mois_fcfa?: number | null
          created_at?: string | null
          effectif?: number | null
          farm_id: string
          id?: string
          phase?: string | null
          ration_j_kg?: number | null
          total_j_kg?: number | null
        }
        Update: {
          aliment?: string | null
          categorie?: string
          cout_kg_fcfa?: number | null
          cout_mois_fcfa?: number | null
          created_at?: string | null
          effectif?: number | null
          farm_id?: string
          id?: string
          phase?: string | null
          ration_j_kg?: number | null
          total_j_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_alimentation_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      produits_aliments: {
        Row: {
          code_id: string
          created_at: string | null
          en_alerte: boolean | null
          farm_id: string
          id: string
          libelle: string
          notes: string | null
          seuil_alerte: number | null
          stock_actuel: number | null
          unite: string | null
          updated_at: string | null
        }
        Insert: {
          code_id: string
          created_at?: string | null
          en_alerte?: boolean | null
          farm_id: string
          id?: string
          libelle: string
          notes?: string | null
          seuil_alerte?: number | null
          stock_actuel?: number | null
          unite?: string | null
          updated_at?: string | null
        }
        Update: {
          code_id?: string
          created_at?: string | null
          en_alerte?: boolean | null
          farm_id?: string
          id?: string
          libelle?: string
          notes?: string | null
          seuil_alerte?: number | null
          stock_actuel?: number | null
          unite?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produits_aliments_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      produits_veto: {
        Row: {
          alerte_stock_bas: boolean | null
          code_id: string
          created_at: string | null
          dlc: string | null
          farm_id: string
          id: string
          libelle: string
          notes: string | null
          stock_actuel: number | null
          stock_min: number | null
          type: string | null
          unite: string | null
          updated_at: string | null
          usage: string | null
        }
        Insert: {
          alerte_stock_bas?: boolean | null
          code_id: string
          created_at?: string | null
          dlc?: string | null
          farm_id: string
          id?: string
          libelle: string
          notes?: string | null
          stock_actuel?: number | null
          stock_min?: number | null
          type?: string | null
          unite?: string | null
          updated_at?: string | null
          usage?: string | null
        }
        Update: {
          alerte_stock_bas?: boolean | null
          code_id?: string
          created_at?: string | null
          dlc?: string | null
          farm_id?: string
          id?: string
          libelle?: string
          notes?: string | null
          stock_actuel?: number | null
          stock_min?: number | null
          type?: string | null
          unite?: string | null
          updated_at?: string | null
          usage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produits_veto_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      saillies: {
        Row: {
          boar_code_id: string | null
          boar_id: string | null
          created_at: string | null
          date_mb_prevue: string | null
          date_saillie: string | null
          farm_id: string
          id: string
          notes: string | null
          sow_code_id: string | null
          sow_id: string | null
          statut: string | null
          updated_at: string | null
        }
        Insert: {
          boar_code_id?: string | null
          boar_id?: string | null
          created_at?: string | null
          date_mb_prevue?: string | null
          date_saillie?: string | null
          farm_id: string
          id?: string
          notes?: string | null
          sow_code_id?: string | null
          sow_id?: string | null
          statut?: string | null
          updated_at?: string | null
        }
        Update: {
          boar_code_id?: string | null
          boar_id?: string | null
          created_at?: string | null
          date_mb_prevue?: string | null
          date_saillie?: string | null
          farm_id?: string
          id?: string
          notes?: string | null
          sow_code_id?: string | null
          sow_id?: string | null
          statut?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saillies_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saillies_sow_id_fkey"
            columns: ["sow_id"]
            isOneToOne: false
            referencedRelation: "sows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saillies_boar_id_fkey"
            columns: ["boar_id"]
            isOneToOne: false
            referencedRelation: "boars"
            referencedColumns: ["id"]
          },
        ]
      }
      sows: {
        Row: {
          alimentation: string | null
          boucle: string | null
          breed: string | null
          code_id: string
          created_on: string
          date_mb_prevue: string | null
          date_naissance: string | null
          farm_id: string
          id: string
          localisation: string | null
          name: string | null
          nb_portees: number | null
          notes: string | null
          origine: string | null
          photo_url: string | null
          ration_kg_j: number | null
          statut: string | null
          statut_repro: string | null
        }
        Insert: {
          alimentation?: string | null
          boucle?: string | null
          breed?: string | null
          code_id: string
          created_on?: string
          date_mb_prevue?: string | null
          date_naissance?: string | null
          farm_id: string
          id?: string
          localisation?: string | null
          name?: string | null
          nb_portees?: number | null
          notes?: string | null
          origine?: string | null
          photo_url?: string | null
          ration_kg_j?: number | null
          statut?: string | null
          statut_repro?: string | null
        }
        Update: {
          alimentation?: string | null
          boucle?: string | null
          breed?: string | null
          code_id?: string
          created_on?: string
          date_mb_prevue?: string | null
          date_naissance?: string | null
          farm_id?: string
          id?: string
          localisation?: string | null
          name?: string | null
          nb_portees?: number | null
          notes?: string | null
          origine?: string | null
          photo_url?: string | null
          ration_kg_j?: number | null
          statut?: string | null
          statut_repro?: string | null
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
