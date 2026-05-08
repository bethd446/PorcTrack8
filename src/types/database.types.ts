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
      adoptions: {
        Row: {
          created_at: string | null
          created_by: string
          date_adoption: string
          farm_id: string
          from_batch_id: string
          id: string
          motif: string | null
          nb_porcelets: number
          notes: string | null
          to_batch_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          date_adoption: string
          farm_id: string
          from_batch_id: string
          id?: string
          motif?: string | null
          nb_porcelets: number
          notes?: string | null
          to_batch_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          date_adoption?: string
          farm_id?: string
          from_batch_id?: string
          id?: string
          motif?: string | null
          nb_porcelets?: number
          notes?: string | null
          to_batch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adoptions_from_batch_id_fkey"
            columns: ["from_batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoptions_to_batch_id_fkey"
            columns: ["to_batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_dismissals: {
        Row: {
          alert_id: string
          dismissed_at: string
          dismissed_by: string
          expires_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          alert_id: string
          dismissed_at?: string
          dismissed_by: string
          expires_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          alert_id?: string
          dismissed_at?: string
          dismissed_by?: string
          expires_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      batch_sows: {
        Row: {
          batch_id: string
          created_at: string | null
          date_ajout: string
          farm_id: string
          id: string
          nb_porcelets_apportes: number
          notes: string | null
          sow_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          date_ajout?: string
          farm_id: string
          id?: string
          nb_porcelets_apportes: number
          notes?: string | null
          sow_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          date_ajout?: string
          farm_id?: string
          id?: string
          nb_porcelets_apportes?: number
          notes?: string | null
          sow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_sows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_sows_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_sows_sow_id_fkey"
            columns: ["sow_id"]
            isOneToOne: false
            referencedRelation: "sows"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          abattoir_nom: string | null
          age_jours_estime: number | null
          aliment_actuel: string | null
          boar_id: string | null
          canal_vente: string | null
          code_id: string
          date_mise_bas: string | null
          date_prochain_event: string | null
          date_saillie: string | null
          date_sevrage: string | null
          date_sevrage_prevue: string | null
          farm_id: string
          id: string
          loge: string | null
          loge_id: string | null
          nb_femelles_naissance: number | null
          nb_males_naissance: number | null
          nb_mort_nes: number | null
          notes: string | null
          phase: string | null
          photo_url: string | null
          poids_carcasse_kg: number | null
          poids_initial_kg: number
          poids_moyen_kg: number | null
          poids_moyen_sevrage_kg: number | null
          poids_portee_naissance_kg: number | null
          poids_vif_kg: number | null
          porcelets_nes_total: number
          porcelets_nes_vivants: number
          porcelets_sevrene_total: number
          prix_carcasse_fcfa_kg: number | null
          prochain_event: string | null
          rendement_carcasse_pct: number | null
          sow_id: string | null
          statut: string | null
          validated_at: string | null
          validated_by: string | null
          validation_status: string | null
        }
        Insert: {
          abattoir_nom?: string | null
          age_jours_estime?: number | null
          aliment_actuel?: string | null
          boar_id?: string | null
          canal_vente?: string | null
          code_id: string
          date_mise_bas?: string | null
          date_prochain_event?: string | null
          date_saillie?: string | null
          date_sevrage?: string | null
          date_sevrage_prevue?: string | null
          farm_id: string
          id?: string
          loge?: string | null
          loge_id?: string | null
          nb_femelles_naissance?: number | null
          nb_males_naissance?: number | null
          nb_mort_nes?: number | null
          notes?: string | null
          phase?: string | null
          photo_url?: string | null
          poids_carcasse_kg?: number | null
          poids_initial_kg: number
          poids_moyen_kg?: number | null
          poids_moyen_sevrage_kg?: number | null
          poids_portee_naissance_kg?: number | null
          poids_vif_kg?: number | null
          porcelets_nes_total?: number
          porcelets_nes_vivants?: number
          porcelets_sevrene_total?: number
          prix_carcasse_fcfa_kg?: number | null
          prochain_event?: string | null
          rendement_carcasse_pct?: number | null
          sow_id?: string | null
          statut?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string | null
        }
        Update: {
          abattoir_nom?: string | null
          age_jours_estime?: number | null
          aliment_actuel?: string | null
          boar_id?: string | null
          canal_vente?: string | null
          code_id?: string
          date_mise_bas?: string | null
          date_prochain_event?: string | null
          date_saillie?: string | null
          date_sevrage?: string | null
          date_sevrage_prevue?: string | null
          farm_id?: string
          id?: string
          loge?: string | null
          loge_id?: string | null
          nb_femelles_naissance?: number | null
          nb_males_naissance?: number | null
          nb_mort_nes?: number | null
          notes?: string | null
          phase?: string | null
          photo_url?: string | null
          poids_carcasse_kg?: number | null
          poids_initial_kg?: number
          poids_moyen_kg?: number | null
          poids_moyen_sevrage_kg?: number | null
          poids_portee_naissance_kg?: number | null
          poids_vif_kg?: number | null
          porcelets_nes_total?: number
          porcelets_nes_vivants?: number
          porcelets_sevrene_total?: number
          prix_carcasse_fcfa_kg?: number | null
          prochain_event?: string | null
          rendement_carcasse_pct?: number | null
          sow_id?: string | null
          statut?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string | null
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
            foreignKeyName: "batches_loge_id_fkey"
            columns: ["loge_id"]
            isOneToOne: false
            referencedRelation: "loges"
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
          loge_id: string | null
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
          loge_id?: string | null
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
          loge_id?: string | null
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
          {
            foreignKeyName: "boars_loge_id_fkey"
            columns: ["loge_id"]
            isOneToOne: false
            referencedRelation: "loges"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checks_mb: {
        Row: {
          batch_id: string
          comportement: string | null
          created_at: string
          date_check: string
          diarrhee: string | null
          eau_ok: boolean | null
          farm_id: string
          id: string
          lampe_ok: boolean | null
          mamelles_utilisees: boolean | null
          morts_jour: number
          notes: string | null
          photo_url: string | null
          respiration_ok: boolean | null
          truie_alimentation: string | null
          updated_at: string
        }
        Insert: {
          batch_id: string
          comportement?: string | null
          created_at?: string
          date_check?: string
          diarrhee?: string | null
          eau_ok?: boolean | null
          farm_id: string
          id?: string
          lampe_ok?: boolean | null
          mamelles_utilisees?: boolean | null
          morts_jour?: number
          notes?: string | null
          photo_url?: string | null
          respiration_ok?: boolean | null
          truie_alimentation?: string | null
          updated_at?: string
        }
        Update: {
          batch_id?: string
          comportement?: string | null
          created_at?: string
          date_check?: string
          diarrhee?: string | null
          eau_ok?: boolean | null
          farm_id?: string
          id?: string
          lampe_ok?: boolean | null
          mamelles_utilisees?: boolean | null
          morts_jour?: number
          notes?: string | null
          photo_url?: string | null
          respiration_ok?: boolean | null
          truie_alimentation?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_checks_mb_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_checks_mb_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_members: {
        Row: {
          created_at: string
          farm_id: string
          invited_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          invited_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          invited_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_members_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          pays: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          pays?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          pays?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      feed_consumption_logs: {
        Row: {
          batch_id: string | null
          created_at: string | null
          created_by: string
          date_conso: string
          farm_id: string
          id: string
          notes: string | null
          produit_aliment_id: string | null
          qty_kg: number
          sow_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          created_by: string
          date_conso: string
          farm_id: string
          id?: string
          notes?: string | null
          produit_aliment_id?: string | null
          qty_kg: number
          sow_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          created_by?: string
          date_conso?: string
          farm_id?: string
          id?: string
          notes?: string | null
          produit_aliment_id?: string | null
          qty_kg?: number
          sow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_consumption_logs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_consumption_logs_produit_aliment_id_fkey"
            columns: ["produit_aliment_id"]
            isOneToOne: false
            referencedRelation: "produits_aliments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_consumption_logs_sow_id_fkey"
            columns: ["sow_id"]
            isOneToOne: false
            referencedRelation: "sows"
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
          validated_at: string | null
          validated_by: string | null
          validation_status: string | null
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
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string | null
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
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string | null
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
      fournisseurs: {
        Row: {
          created_at: string | null
          email: string | null
          farm_id: string
          id: string
          is_default: boolean | null
          nom: string
          notes: string | null
          type: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          farm_id: string
          id?: string
          is_default?: boolean | null
          nom: string
          notes?: string | null
          type?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          farm_id?: string
          id?: string
          is_default?: boolean | null
          nom?: string
          notes?: string | null
          type?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
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
          dose_or_quantity: string | null
          duration: string | null
          farm_id: string
          id: string
          log_date: string
          log_type: string
          logged_at: string
          notes: string | null
          operator: string | null
          porcelet_id: string | null
          produit_id: string | null
          result: string | null
          sow_id: string | null
          symptom: string | null
          symptoms: string | null
          treatment: string | null
          treatment_name: string | null
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validation_status: string | null
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
          dose_or_quantity?: string | null
          duration?: string | null
          farm_id: string
          id?: string
          log_date?: string
          log_type: string
          logged_at?: string
          notes?: string | null
          operator?: string | null
          porcelet_id?: string | null
          produit_id?: string | null
          result?: string | null
          sow_id?: string | null
          symptom?: string | null
          symptoms?: string | null
          treatment?: string | null
          treatment_name?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string | null
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
          dose_or_quantity?: string | null
          duration?: string | null
          farm_id?: string
          id?: string
          log_date?: string
          log_type?: string
          logged_at?: string
          notes?: string | null
          operator?: string | null
          porcelet_id?: string | null
          produit_id?: string | null
          result?: string | null
          sow_id?: string | null
          symptom?: string | null
          symptoms?: string | null
          treatment?: string | null
          treatment_name?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string | null
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
            foreignKeyName: "health_logs_porcelet_id_fkey"
            columns: ["porcelet_id"]
            isOneToOne: false
            referencedRelation: "porcelets_individuels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_logs_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits_veto"
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
      loge_movements: {
        Row: {
          created_at: string | null
          date_mvt: string
          farm_id: string
          from_loge_id: string | null
          id: string
          reason: string | null
          subject_id: string
          subject_type: string
          to_loge_id: string | null
        }
        Insert: {
          created_at?: string | null
          date_mvt?: string
          farm_id: string
          from_loge_id?: string | null
          id?: string
          reason?: string | null
          subject_id: string
          subject_type: string
          to_loge_id?: string | null
        }
        Update: {
          created_at?: string | null
          date_mvt?: string
          farm_id?: string
          from_loge_id?: string | null
          id?: string
          reason?: string | null
          subject_id?: string
          subject_type?: string
          to_loge_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loge_movements_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loge_movements_from_loge_id_fkey"
            columns: ["from_loge_id"]
            isOneToOne: false
            referencedRelation: "loges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loge_movements_to_loge_id_fkey"
            columns: ["to_loge_id"]
            isOneToOne: false
            referencedRelation: "loges"
            referencedColumns: ["id"]
          },
        ]
      }
      loges: {
        Row: {
          active: boolean
          batiment: string | null
          capacite_max: number | null
          created_at: string | null
          farm_id: string
          id: string
          notes: string | null
          numero: string
          type: string
        }
        Insert: {
          active?: boolean
          batiment?: string | null
          capacite_max?: number | null
          created_at?: string | null
          farm_id: string
          id?: string
          notes?: string | null
          numero: string
          type: string
        }
        Update: {
          active?: boolean
          batiment?: string | null
          capacite_max?: number | null
          created_at?: string | null
          farm_id?: string
          id?: string
          notes?: string | null
          numero?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loges_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          audio_url: string | null
          author_id: string | null
          category: string | null
          content: string
          created_at: string
          embedding: string | null
          farm_id: string
          id: string
          photo_url: string | null
          tags: string[] | null
        }
        Insert: {
          audio_url?: string | null
          author_id?: string | null
          category?: string | null
          content: string
          created_at?: string
          embedding?: string | null
          farm_id: string
          id?: string
          photo_url?: string | null
          tags?: string[] | null
        }
        Update: {
          audio_url?: string | null
          author_id?: string | null
          category?: string | null
          content?: string
          created_at?: string
          embedding?: string | null
          farm_id?: string
          id?: string
          photo_url?: string | null
          tags?: string[] | null
        }
        Relationships: []
      }
      pesee_planifiees: {
        Row: {
          batch_id: string | null
          created_at: string | null
          date_effectuee: string | null
          date_prevue: string
          effectuee: boolean
          farm_id: string
          id: string
          porcelet_id: string | null
          rappel_j1: boolean
          rappel_j3: boolean
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          date_effectuee?: string | null
          date_prevue: string
          effectuee?: boolean
          farm_id: string
          id?: string
          porcelet_id?: string | null
          rappel_j1?: boolean
          rappel_j3?: boolean
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          date_effectuee?: string | null
          date_prevue?: string
          effectuee?: boolean
          farm_id?: string
          id?: string
          porcelet_id?: string | null
          rappel_j1?: boolean
          rappel_j3?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pesee_planifiees_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesee_planifiees_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesee_planifiees_porcelet_id_fkey"
            columns: ["porcelet_id"]
            isOneToOne: false
            referencedRelation: "porcelets_individuels"
            referencedColumns: ["id"]
          },
        ]
      }
      pesees: {
        Row: {
          created_at: string | null
          date_pesee: string
          farm_id: string
          id: string
          notes: string | null
          operateur: string | null
          poids_kg: number
          porcelet_id: string
          session_id: string | null
        }
        Insert: {
          created_at?: string | null
          date_pesee: string
          farm_id: string
          id?: string
          notes?: string | null
          operateur?: string | null
          poids_kg: number
          porcelet_id: string
          session_id?: string | null
        }
        Update: {
          created_at?: string | null
          date_pesee?: string
          farm_id?: string
          id?: string
          notes?: string | null
          operateur?: string | null
          poids_kg?: number
          porcelet_id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pesees_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesees_porcelet_id_fkey"
            columns: ["porcelet_id"]
            isOneToOne: false
            referencedRelation: "porcelets_individuels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesees_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions_pesee"
            referencedColumns: ["id"]
          },
        ]
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
      porcelets_individuels: {
        Row: {
          batch_id: string
          boucle: string
          couleur_boucle: string | null
          created_at: string | null
          farm_id: string
          id: string
          notes: string | null
          photo_url: string | null
          poids_courant_kg: number | null
          sexe: string | null
          statut: string
          updated_at: string | null
        }
        Insert: {
          batch_id: string
          boucle: string
          couleur_boucle?: string | null
          created_at?: string | null
          farm_id: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          poids_courant_kg?: number | null
          sexe?: string | null
          statut?: string
          updated_at?: string | null
        }
        Update: {
          batch_id?: string
          boucle?: string
          couleur_boucle?: string | null
          created_at?: string | null
          farm_id?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          poids_courant_kg?: number | null
          sexe?: string | null
          statut?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "porcelets_individuels_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "porcelets_individuels_farm_id_fkey"
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
          fournisseur_id: string | null
          id: string
          libelle: string
          notes: string | null
          seuil_alerte: number | null
          short_code: string | null
          stock_actuel: number | null
          unite: string | null
          updated_at: string | null
        }
        Insert: {
          code_id: string
          created_at?: string | null
          en_alerte?: boolean | null
          farm_id: string
          fournisseur_id?: string | null
          id?: string
          libelle: string
          notes?: string | null
          seuil_alerte?: number | null
          short_code?: string | null
          stock_actuel?: number | null
          unite?: string | null
          updated_at?: string | null
        }
        Update: {
          code_id?: string
          created_at?: string | null
          en_alerte?: boolean | null
          farm_id?: string
          fournisseur_id?: string | null
          id?: string
          libelle?: string
          notes?: string | null
          seuil_alerte?: number | null
          short_code?: string | null
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
          {
            foreignKeyName: "produits_aliments_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
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
          fournisseur_id: string | null
          id: string
          libelle: string
          notes: string | null
          short_code: string | null
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
          fournisseur_id?: string | null
          id?: string
          libelle: string
          notes?: string | null
          short_code?: string | null
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
          fournisseur_id?: string | null
          id?: string
          libelle?: string
          notes?: string | null
          short_code?: string | null
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
          {
            foreignKeyName: "produits_veto_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
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
          date_echo: string | null
          date_mb_prevue: string | null
          date_saillie: string | null
          farm_id: string
          id: string
          notes: string | null
          notes_echo: string | null
          sow_code_id: string | null
          sow_id: string | null
          statut: string | null
          statut_echo: string | null
          updated_at: string | null
        }
        Insert: {
          boar_code_id?: string | null
          boar_id?: string | null
          created_at?: string | null
          date_echo?: string | null
          date_mb_prevue?: string | null
          date_saillie?: string | null
          farm_id: string
          id?: string
          notes?: string | null
          notes_echo?: string | null
          sow_code_id?: string | null
          sow_id?: string | null
          statut?: string | null
          statut_echo?: string | null
          updated_at?: string | null
        }
        Update: {
          boar_code_id?: string | null
          boar_id?: string | null
          created_at?: string | null
          date_echo?: string | null
          date_mb_prevue?: string | null
          date_saillie?: string | null
          farm_id?: string
          id?: string
          notes?: string | null
          notes_echo?: string | null
          sow_code_id?: string | null
          sow_id?: string | null
          statut?: string | null
          statut_echo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saillies_boar_id_fkey"
            columns: ["boar_id"]
            isOneToOne: false
            referencedRelation: "boars"
            referencedColumns: ["id"]
          },
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
        ]
      }
      sessions_pesee: {
        Row: {
          created_at: string | null
          date_session: string
          farm_id: string
          id: string
          notes: string | null
          operateur: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          date_session: string
          farm_id: string
          id?: string
          notes?: string | null
          operateur?: string | null
          type?: string
        }
        Update: {
          created_at?: string | null
          date_session?: string
          farm_id?: string
          id?: string
          notes?: string | null
          operateur?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_pesee_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          loge_id: string | null
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
          loge_id?: string | null
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
          loge_id?: string | null
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
          {
            foreignKeyName: "sows_loge_id_fkey"
            columns: ["loge_id"]
            isOneToOne: false
            referencedRelation: "loges"
            referencedColumns: ["id"]
          },
        ]
      }
      troupeaux: {
        Row: {
          created_at: string | null
          effectif_truies_initial: number | null
          effectif_verrats_initial: number | null
          id: string
          nom: string
          nom_ferme: string | null
          notes_demarrage: string | null
          objectif_porcelets_an: number | null
          onboarding_completed_at: string | null
          pays: string | null
          races: Json | null
          secteur: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          effectif_truies_initial?: number | null
          effectif_verrats_initial?: number | null
          id?: string
          nom: string
          nom_ferme?: string | null
          notes_demarrage?: string | null
          objectif_porcelets_an?: number | null
          onboarding_completed_at?: string | null
          pays?: string | null
          races?: Json | null
          secteur?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          effectif_truies_initial?: number | null
          effectif_verrats_initial?: number | null
          id?: string
          nom?: string
          nom_ferme?: string | null
          notes_demarrage?: string | null
          objectif_porcelets_an?: number | null
          onboarding_completed_at?: string | null
          pays?: string | null
          races?: Json | null
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
      weight_distributions: {
        Row: {
          batch_id: string
          created_at: string | null
          created_by: string
          date_pesee: string
          farm_id: string
          id: string
          nb_100_to_110kg: number | null
          nb_90_to_100kg: number | null
          nb_above_110kg: number | null
          nb_under_90kg: number | null
          notes: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          created_by: string
          date_pesee: string
          farm_id: string
          id?: string
          nb_100_to_110kg?: number | null
          nb_90_to_100kg?: number | null
          nb_above_110kg?: number | null
          nb_under_90kg?: number | null
          notes?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          created_by?: string
          date_pesee?: string
          farm_id?: string
          id?: string
          nb_100_to_110kg?: number | null
          nb_90_to_100kg?: number | null
          nb_above_110kg?: number | null
          nb_under_90kg?: number | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weight_distributions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_farms: { Args: never; Returns: string[] }
      get_user_role: { Args: { user_id: string }; Returns: string }
      is_member_with_role: {
        Args: { p_farm_id: string; p_roles: string[] }
        Returns: boolean
      }
      is_owner_or_admin: { Args: never; Returns: boolean }
      match_notes: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          similarity: number
        }[]
      }
      user_farms: { Args: { uid: string }; Returns: string[] }
    }
    Enums: {
      health_log_type:
        | "FER_J3"
        | "VERMIFUGE"
        | "VACCIN_PESTE"
        | "VACCIN_MYCOPLASME"
        | "VACCIN_AUTRE"
        | "CASTRATION"
        | "COUPE_QUEUE"
        | "BOITERIE"
        | "TOUX"
        | "DIARRHEE"
        | "FIEVRE"
        | "ECRASEMENT"
        | "PARASITOSE"
        | "AUTRE"
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
      health_log_type: [
        "FER_J3",
        "VERMIFUGE",
        "VACCIN_PESTE",
        "VACCIN_MYCOPLASME",
        "VACCIN_AUTRE",
        "CASTRATION",
        "COUPE_QUEUE",
        "BOITERIE",
        "TOUX",
        "DIARRHEE",
        "FIEVRE",
        "ECRASEMENT",
        "PARASITOSE",
        "AUTRE",
      ],
    },
  },
} as const
