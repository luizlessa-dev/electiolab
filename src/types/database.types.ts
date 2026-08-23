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
      agent_alert_rules: {
        Row: {
          agent_name: string
          created_at: string | null
          enabled: boolean | null
          id: string
          rule_type: string
          threshold: string
          updated_at: string | null
        }
        Insert: {
          agent_name: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          rule_type: string
          threshold: string
          updated_at?: string | null
        }
        Update: {
          agent_name?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          rule_type?: string
          threshold?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          agent_name: string
          completed_count: number | null
          created_at: string | null
          duration_ms: number | null
          error: string | null
          failed_count: number | null
          id: string
          output: Json | null
          poll_count: number | null
          row_count: number | null
          run_at: string | null
          success: boolean | null
          upserted_count: number | null
        }
        Insert: {
          agent_name: string
          completed_count?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          failed_count?: number | null
          id?: string
          output?: Json | null
          poll_count?: number | null
          row_count?: number | null
          run_at?: string | null
          success?: boolean | null
          upserted_count?: number | null
        }
        Update: {
          agent_name?: string
          completed_count?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          failed_count?: number | null
          id?: string
          output?: Json | null
          poll_count?: number | null
          row_count?: number | null
          run_at?: string | null
          success?: boolean | null
          upserted_count?: number | null
        }
        Relationships: []
      }
      aggregation_history: {
        Row: {
          candidates_data: Json
          created_at: string
          id: string
          position: string
          quality_metrics: Json
          sample_size: number | null
          snapshot_date: string
          source: string | null
          state: string
          updated_at: string
        }
        Insert: {
          candidates_data: Json
          created_at?: string
          id?: string
          position: string
          quality_metrics: Json
          sample_size?: number | null
          snapshot_date: string
          source?: string | null
          state: string
          updated_at?: string
        }
        Update: {
          candidates_data?: Json
          created_at?: string
          id?: string
          position?: string
          quality_metrics?: Json
          sample_size?: number | null
          snapshot_date?: string
          source?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          last_used_at: string | null
          name: string | null
          period_start: string
          rate_limit: number | null
          requests_used: number | null
          tier: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          last_used_at?: string | null
          name?: string | null
          period_start?: string
          rate_limit?: number | null
          requests_used?: number | null
          tier?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          last_used_at?: string | null
          name?: string | null
          period_start?: string
          rate_limit?: number | null
          requests_used?: number | null
          tier?: string | null
          user_id?: string
        }
        Relationships: []
      }
      approval_polls: {
        Row: {
          created_at: string
          fieldwork_end: string | null
          fieldwork_start: string | null
          id: string
          institute_id: string | null
          institute_name: string
          margin_of_error: number | null
          methodology: string | null
          metric: string
          office: string
          pct_aprova: number | null
          pct_bom: number | null
          pct_desaprova: number | null
          pct_nsnr: number | null
          pct_otimo: number | null
          pct_pessimo: number | null
          pct_regular: number | null
          pct_rejeita: number | null
          pct_ruim: number | null
          publication_date: string
          sample_size: number | null
          scope: string
          source_url: string | null
          subject_label: string
          subject_slug: string | null
          tse_registration: string | null
        }
        Insert: {
          created_at?: string
          fieldwork_end?: string | null
          fieldwork_start?: string | null
          id?: string
          institute_id?: string | null
          institute_name: string
          margin_of_error?: number | null
          methodology?: string | null
          metric: string
          office?: string
          pct_aprova?: number | null
          pct_bom?: number | null
          pct_desaprova?: number | null
          pct_nsnr?: number | null
          pct_otimo?: number | null
          pct_pessimo?: number | null
          pct_regular?: number | null
          pct_rejeita?: number | null
          pct_ruim?: number | null
          publication_date: string
          sample_size?: number | null
          scope?: string
          source_url?: string | null
          subject_label: string
          subject_slug?: string | null
          tse_registration?: string | null
        }
        Update: {
          created_at?: string
          fieldwork_end?: string | null
          fieldwork_start?: string | null
          id?: string
          institute_id?: string | null
          institute_name?: string
          margin_of_error?: number | null
          methodology?: string | null
          metric?: string
          office?: string
          pct_aprova?: number | null
          pct_bom?: number | null
          pct_desaprova?: number | null
          pct_nsnr?: number | null
          pct_otimo?: number | null
          pct_pessimo?: number | null
          pct_regular?: number | null
          pct_rejeita?: number | null
          pct_ruim?: number | null
          publication_date?: string
          sample_size?: number | null
          scope?: string
          source_url?: string | null
          subject_label?: string
          subject_slug?: string | null
          tse_registration?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_polls_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institute_accuracy_summary"
            referencedColumns: ["institute_id"]
          },
          {
            foreignKeyName: "approval_polls_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_finances: {
        Row: {
          candidate_id: string | null
          cnpj_campanha: string | null
          election_id: string | null
          fetched_at: string | null
          fund_especial: number | null
          fund_partidario: number | null
          id: string
          receita_pf: number | null
          receita_pj: number | null
          source: string | null
          spending_limit: number | null
          total_received: number | null
          total_spent: number | null
        }
        Insert: {
          candidate_id?: string | null
          cnpj_campanha?: string | null
          election_id?: string | null
          fetched_at?: string | null
          fund_especial?: number | null
          fund_partidario?: number | null
          id?: string
          receita_pf?: number | null
          receita_pj?: number | null
          source?: string | null
          spending_limit?: number | null
          total_received?: number | null
          total_spent?: number | null
        }
        Update: {
          candidate_id?: string | null
          cnpj_campanha?: string | null
          election_id?: string | null
          fetched_at?: string | null
          fund_especial?: number | null
          fund_partidario?: number | null
          id?: string
          receita_pf?: number | null
          receita_pj?: number | null
          source?: string | null
          spending_limit?: number | null
          total_received?: number | null
          total_spent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_finances_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_finances_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_assets: {
        Row: {
          asset_order: number | null
          asset_type_code: string | null
          asset_type_name: string | null
          candidate_id: string | null
          cpf: string | null
          description: string | null
          election_year: number
          fetched_at: string | null
          id: string
          source: string | null
          source_url: string | null
          value_brl: number | null
        }
        Insert: {
          asset_order?: number | null
          asset_type_code?: string | null
          asset_type_name?: string | null
          candidate_id?: string | null
          cpf?: string | null
          description?: string | null
          election_year: number
          fetched_at?: string | null
          id?: string
          source?: string | null
          source_url?: string | null
          value_brl?: number | null
        }
        Update: {
          asset_order?: number | null
          asset_type_code?: string | null
          asset_type_name?: string | null
          candidate_id?: string | null
          cpf?: string | null
          description?: string | null
          election_year?: number
          fetched_at?: string | null
          id?: string
          source?: string | null
          source_url?: string | null
          value_brl?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_assets_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_expense_contracted: {
        Row: {
          candidate_id: string | null
          cargo: string | null
          cpf: string | null
          description: string | null
          despesa_date: string | null
          document_number: string | null
          document_type: string | null
          election_year: number
          fetched_at: string | null
          id: string
          origem_despesa: string | null
          party_acronym: string | null
          raw: Json | null
          source: string | null
          sq_candidato: string | null
          sq_despesa: string
          sq_prestador_contas: string | null
          supplier_city: string | null
          supplier_cnae: string | null
          supplier_cpf_cnpj: string | null
          supplier_name: string | null
          supplier_name_rfb: string | null
          supplier_state: string | null
          supplier_type: string | null
          uf: string | null
          value_brl: number | null
        }
        Insert: {
          candidate_id?: string | null
          cargo?: string | null
          cpf?: string | null
          description?: string | null
          despesa_date?: string | null
          document_number?: string | null
          document_type?: string | null
          election_year: number
          fetched_at?: string | null
          id?: string
          origem_despesa?: string | null
          party_acronym?: string | null
          raw?: Json | null
          source?: string | null
          sq_candidato?: string | null
          sq_despesa: string
          sq_prestador_contas?: string | null
          supplier_city?: string | null
          supplier_cnae?: string | null
          supplier_cpf_cnpj?: string | null
          supplier_name?: string | null
          supplier_name_rfb?: string | null
          supplier_state?: string | null
          supplier_type?: string | null
          uf?: string | null
          value_brl?: number | null
        }
        Update: {
          candidate_id?: string | null
          cargo?: string | null
          cpf?: string | null
          description?: string | null
          despesa_date?: string | null
          document_number?: string | null
          document_type?: string | null
          election_year?: number
          fetched_at?: string | null
          id?: string
          origem_despesa?: string | null
          party_acronym?: string | null
          raw?: Json | null
          source?: string | null
          sq_candidato?: string | null
          sq_despesa?: string
          sq_prestador_contas?: string | null
          supplier_city?: string | null
          supplier_cnae?: string | null
          supplier_cpf_cnpj?: string | null
          supplier_name?: string | null
          supplier_name_rfb?: string | null
          supplier_state?: string | null
          supplier_type?: string | null
          uf?: string | null
          value_brl?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_expense_contracted_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_expense_paid: {
        Row: {
          candidate_id: string | null
          description: string | null
          document_number: string | null
          document_type: string | null
          election_year: number
          especie_recurso: string | null
          fetched_at: string | null
          fonte_despesa: string | null
          id: string
          natureza_despesa: string | null
          origem_despesa: string | null
          payment_date: string | null
          raw: Json | null
          source: string | null
          sq_despesa: string
          sq_parcelamento_despesa: string | null
          sq_prestador_contas: string
          uf: string | null
          value_brl: number | null
        }
        Insert: {
          candidate_id?: string | null
          description?: string | null
          document_number?: string | null
          document_type?: string | null
          election_year: number
          especie_recurso?: string | null
          fetched_at?: string | null
          fonte_despesa?: string | null
          id?: string
          natureza_despesa?: string | null
          origem_despesa?: string | null
          payment_date?: string | null
          raw?: Json | null
          source?: string | null
          sq_despesa: string
          sq_parcelamento_despesa?: string | null
          sq_prestador_contas: string
          uf?: string | null
          value_brl?: number | null
        }
        Update: {
          candidate_id?: string | null
          description?: string | null
          document_number?: string | null
          document_type?: string | null
          election_year?: number
          especie_recurso?: string | null
          fetched_at?: string | null
          fonte_despesa?: string | null
          id?: string
          natureza_despesa?: string | null
          origem_despesa?: string | null
          payment_date?: string | null
          raw?: Json | null
          source?: string | null
          sq_despesa?: string
          sq_parcelamento_despesa?: string | null
          sq_prestador_contas?: string
          uf?: string | null
          value_brl?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_expense_paid_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_fefc: {
        Row: {
          amount_received: number | null
          amount_spent: number | null
          candidate_id: string | null
          cpf: string | null
          election_year: number
          fetched_at: string | null
          id: string
          party_acronym: string | null
          source: string | null
          source_url: string | null
        }
        Insert: {
          amount_received?: number | null
          amount_spent?: number | null
          candidate_id?: string | null
          cpf?: string | null
          election_year: number
          fetched_at?: string | null
          id?: string
          party_acronym?: string | null
          source?: string | null
          source_url?: string | null
        }
        Update: {
          amount_received?: number | null
          amount_spent?: number | null
          candidate_id?: string | null
          cpf?: string | null
          election_year?: number
          fetched_at?: string | null
          id?: string
          party_acronym?: string | null
          source?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_fefc_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_revenue: {
        Row: {
          candidate_id: string | null
          cargo: string | null
          cpf: string | null
          description: string | null
          donor_city: string | null
          donor_cpf_cnpj: string | null
          donor_name: string | null
          donor_name_rfb: string | null
          donor_party: string | null
          donor_state: string | null
          election_year: number
          especie_receita: string | null
          fetched_at: string | null
          fonte_receita: string | null
          id: string
          natureza_receita: string | null
          origem_receita: string | null
          party_acronym: string | null
          raw: Json | null
          receipt_number: string | null
          receita_date: string | null
          source: string | null
          source_url: string | null
          sq_candidato: string | null
          sq_prestador_contas: string | null
          sq_receita: string
          turno: number | null
          uf: string | null
          value_brl: number | null
        }
        Insert: {
          candidate_id?: string | null
          cargo?: string | null
          cpf?: string | null
          description?: string | null
          donor_city?: string | null
          donor_cpf_cnpj?: string | null
          donor_name?: string | null
          donor_name_rfb?: string | null
          donor_party?: string | null
          donor_state?: string | null
          election_year: number
          especie_receita?: string | null
          fetched_at?: string | null
          fonte_receita?: string | null
          id?: string
          natureza_receita?: string | null
          origem_receita?: string | null
          party_acronym?: string | null
          raw?: Json | null
          receipt_number?: string | null
          receita_date?: string | null
          source?: string | null
          source_url?: string | null
          sq_candidato?: string | null
          sq_prestador_contas?: string | null
          sq_receita: string
          turno?: number | null
          uf?: string | null
          value_brl?: number | null
        }
        Update: {
          candidate_id?: string | null
          cargo?: string | null
          cpf?: string | null
          description?: string | null
          donor_city?: string | null
          donor_cpf_cnpj?: string | null
          donor_name?: string | null
          donor_name_rfb?: string | null
          donor_party?: string | null
          donor_state?: string | null
          election_year?: number
          especie_receita?: string | null
          fetched_at?: string | null
          fonte_receita?: string | null
          id?: string
          natureza_receita?: string | null
          origem_receita?: string | null
          party_acronym?: string | null
          raw?: Json | null
          receipt_number?: string | null
          receita_date?: string | null
          source?: string | null
          source_url?: string | null
          sq_candidato?: string | null
          sq_prestador_contas?: string | null
          sq_receita?: string
          turno?: number | null
          uf?: string | null
          value_brl?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_revenue_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_revenue_original_donor: {
        Row: {
          description: string | null
          donor_original_cpf_cnpj: string | null
          donor_original_name: string | null
          donor_original_name_rfb: string | null
          donor_original_type: string | null
          election_year: number
          fetched_at: string | null
          id: string
          raw: Json | null
          receita_date: string | null
          source: string | null
          sq_prestador_contas: string | null
          sq_receita: string
          uf: string | null
          value_brl: number | null
        }
        Insert: {
          description?: string | null
          donor_original_cpf_cnpj?: string | null
          donor_original_name?: string | null
          donor_original_name_rfb?: string | null
          donor_original_type?: string | null
          election_year: number
          fetched_at?: string | null
          id?: string
          raw?: Json | null
          receita_date?: string | null
          source?: string | null
          sq_prestador_contas?: string | null
          sq_receita: string
          uf?: string | null
          value_brl?: number | null
        }
        Update: {
          description?: string | null
          donor_original_cpf_cnpj?: string | null
          donor_original_name?: string | null
          donor_original_name_rfb?: string | null
          donor_original_type?: string | null
          election_year?: number
          fetched_at?: string | null
          id?: string
          raw?: Json | null
          receita_date?: string | null
          source?: string | null
          sq_prestador_contas?: string | null
          sq_receita?: string
          uf?: string | null
          value_brl?: number | null
        }
        Relationships: []
      }
      candidate_social_media: {
        Row: {
          candidate_id: string | null
          cpf: string | null
          election_year: number
          fetched_at: string | null
          handle: string | null
          id: string
          platform: string
          source: string | null
          url: string
        }
        Insert: {
          candidate_id?: string | null
          cpf?: string | null
          election_year: number
          fetched_at?: string | null
          handle?: string | null
          id?: string
          platform: string
          source?: string | null
          url: string
        }
        Update: {
          candidate_id?: string | null
          cpf?: string | null
          election_year?: number
          fetched_at?: string | null
          handle?: string | null
          id?: string
          platform?: string
          source?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_social_media_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          bio: string | null
          birth_date: string | null
          coalition: string | null
          color: string | null
          cpf: string | null
          created_at: string | null
          current_position: string | null
          current_term_end: string | null
          current_term_start: string | null
          datajud_searched_at: string | null
          editorial_bio: string | null
          editorial_published_at: string | null
          editorial_summary: string | null
          education: string | null
          election_id: string | null
          full_name: string | null
          id: string
          instagram_handle: string | null
          is_active: boolean | null
          name: string
          net_worth: number | null
          number: number | null
          official_photo_url: string | null
          party: string | null
          photo_url: string | null
          profession: string | null
          slug: string | null
          tse_id: string | null
          tse_last_situation: string | null
          tse_last_situation_detail: string | null
          tse_last_situation_year: number | null
          twitter_handle: string | null
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          birth_date?: string | null
          coalition?: string | null
          color?: string | null
          cpf?: string | null
          created_at?: string | null
          current_position?: string | null
          current_term_end?: string | null
          current_term_start?: string | null
          datajud_searched_at?: string | null
          editorial_bio?: string | null
          editorial_published_at?: string | null
          editorial_summary?: string | null
          education?: string | null
          election_id?: string | null
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean | null
          name: string
          net_worth?: number | null
          number?: number | null
          official_photo_url?: string | null
          party?: string | null
          photo_url?: string | null
          profession?: string | null
          slug?: string | null
          tse_id?: string | null
          tse_last_situation?: string | null
          tse_last_situation_detail?: string | null
          tse_last_situation_year?: number | null
          twitter_handle?: string | null
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          birth_date?: string | null
          coalition?: string | null
          color?: string | null
          cpf?: string | null
          created_at?: string | null
          current_position?: string | null
          current_term_end?: string | null
          current_term_start?: string | null
          datajud_searched_at?: string | null
          editorial_bio?: string | null
          editorial_published_at?: string | null
          editorial_summary?: string | null
          education?: string | null
          election_id?: string | null
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean | null
          name?: string
          net_worth?: number | null
          number?: number | null
          official_photo_url?: string | null
          party?: string | null
          photo_url?: string | null
          profession?: string | null
          slug?: string | null
          tse_id?: string | null
          tse_last_situation?: string | null
          tse_last_situation_detail?: string | null
          tse_last_situation_year?: number | null
          twitter_handle?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      data_source_audit: {
        Row: {
          ano: number | null
          cargo: string | null
          created_at: string
          credibility_score: number | null
          error_count: number | null
          errors: string | null
          estado: string | null
          id: string
          inserted_count: number | null
          next_sync_at: string | null
          refresh_interval_hours: number | null
          source_type: string
          synced_at: string
          total_records: number | null
          updated_count: number | null
        }
        Insert: {
          ano?: number | null
          cargo?: string | null
          created_at?: string
          credibility_score?: number | null
          error_count?: number | null
          errors?: string | null
          estado?: string | null
          id?: string
          inserted_count?: number | null
          next_sync_at?: string | null
          refresh_interval_hours?: number | null
          source_type: string
          synced_at?: string
          total_records?: number | null
          updated_count?: number | null
        }
        Update: {
          ano?: number | null
          cargo?: string | null
          created_at?: string
          credibility_score?: number | null
          error_count?: number | null
          errors?: string | null
          estado?: string | null
          id?: string
          inserted_count?: number | null
          next_sync_at?: string | null
          refresh_interval_hours?: number | null
          source_type?: string
          synced_at?: string
          total_records?: number | null
          updated_count?: number | null
        }
        Relationships: []
      }
      digest_runs: {
        Row: {
          failures: number
          id: string
          notes: string | null
          payload: Json | null
          recipients: number
          sent_at: string
          successes: number
        }
        Insert: {
          failures?: number
          id?: string
          notes?: string | null
          payload?: Json | null
          recipients?: number
          sent_at?: string
          successes?: number
        }
        Update: {
          failures?: number
          id?: string
          notes?: string | null
          payload?: Json | null
          recipients?: number
          sent_at?: string
          successes?: number
        }
        Relationships: []
      }
      digital_ads: {
        Row: {
          ad_id: string | null
          candidate_id: string | null
          creative_text: string | null
          delivery_end: string | null
          delivery_start: string | null
          demographic_data: Json | null
          election_id: string | null
          fetched_at: string | null
          id: string
          impressions_lower: number | null
          impressions_upper: number | null
          page_name: string | null
          platform: string | null
          reach_br: number | null
          region_data: Json | null
          spend_lower: number | null
          spend_upper: number | null
        }
        Insert: {
          ad_id?: string | null
          candidate_id?: string | null
          creative_text?: string | null
          delivery_end?: string | null
          delivery_start?: string | null
          demographic_data?: Json | null
          election_id?: string | null
          fetched_at?: string | null
          id?: string
          impressions_lower?: number | null
          impressions_upper?: number | null
          page_name?: string | null
          platform?: string | null
          reach_br?: number | null
          region_data?: Json | null
          spend_lower?: number | null
          spend_upper?: number | null
        }
        Update: {
          ad_id?: string | null
          candidate_id?: string | null
          creative_text?: string | null
          delivery_end?: string | null
          delivery_start?: string | null
          demographic_data?: Json | null
          election_id?: string | null
          fetched_at?: string | null
          id?: string
          impressions_lower?: number | null
          impressions_upper?: number | null
          page_name?: string | null
          platform?: string | null
          reach_br?: number | null
          region_data?: Json | null
          spend_lower?: number | null
          spend_upper?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_ads_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_ads_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      discrepancies: {
        Row: {
          candidate_name: string
          created_at: string
          details: string
          id: string
          notes: string | null
          position: string
          research_data: Json | null
          resolution: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          state: string
          tse_data: Json | null
          type: string
          updated_at: string
        }
        Insert: {
          candidate_name: string
          created_at?: string
          details: string
          id?: string
          notes?: string | null
          position: string
          research_data?: Json | null
          resolution?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          state: string
          tse_data?: Json | null
          type: string
          updated_at?: string
        }
        Update: {
          candidate_name?: string
          created_at?: string
          details?: string
          id?: string
          notes?: string | null
          position?: string
          research_data?: Json | null
          resolution?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          state?: string
          tse_data?: Json | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      economic_indicators: {
        Row: {
          fetched_at: string | null
          id: string
          indicator_type: string
          reference_date: string
          source: string | null
          value: number | null
        }
        Insert: {
          fetched_at?: string | null
          id?: string
          indicator_type: string
          reference_date: string
          source?: string | null
          value?: number | null
        }
        Update: {
          fetched_at?: string | null
          id?: string
          indicator_type?: string
          reference_date?: string
          source?: string | null
          value?: number | null
        }
        Relationships: []
      }
      election_results: {
        Row: {
          candidate_id: string
          created_at: string | null
          election_id: string
          id: string
          is_elected: boolean | null
          percentage: number | null
          result_description: string | null
          total_votes: number | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          election_id: string
          id?: string
          is_elected?: boolean | null
          percentage?: number | null
          result_description?: string | null
          total_votes?: number | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          election_id?: string
          id?: string
          is_elected?: boolean | null
          percentage?: number | null
          result_description?: string | null
          total_votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "election_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_results_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      elections: {
        Row: {
          city: string | null
          created_at: string | null
          election_date: string | null
          id: string
          is_active: boolean | null
          name: string
          round: number | null
          state: string | null
          tse_id: string | null
          type: string
          year: number
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          election_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          round?: number | null
          state?: string | null
          tse_id?: string | null
          type: string
          year: number
        }
        Update: {
          city?: string | null
          created_at?: string | null
          election_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          round?: number | null
          state?: string | null
          tse_id?: string | null
          type?: string
          year?: number
        }
        Relationships: []
      }
      institute_accuracy: {
        Row: {
          actual_winner: string | null
          calculated_at: string | null
          election_id: string
          id: string
          institute_id: string
          mean_absolute_error: number | null
          predicted_winner: string | null
        }
        Insert: {
          actual_winner?: string | null
          calculated_at?: string | null
          election_id: string
          id?: string
          institute_id: string
          mean_absolute_error?: number | null
          predicted_winner?: string | null
        }
        Update: {
          actual_winner?: string | null
          calculated_at?: string | null
          election_id?: string
          id?: string
          institute_id?: string
          mean_absolute_error?: number | null
          predicted_winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institute_accuracy_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institute_accuracy_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institute_accuracy_summary"
            referencedColumns: ["institute_id"]
          },
          {
            foreignKeyName: "institute_accuracy_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      institute_accuracy_observations: {
        Row: {
          abs_error_pct: number | null
          actual_pct: number
          candidate_id: string
          election_id: string
          fieldwork_end_days_before: number
          id: string
          institute_id: string
          notes: string | null
          observed_at: string
          observed_via: string
          poll_id: string | null
          poll_published_pct: number
          round: number
        }
        Insert: {
          abs_error_pct?: number | null
          actual_pct: number
          candidate_id: string
          election_id: string
          fieldwork_end_days_before: number
          id?: string
          institute_id: string
          notes?: string | null
          observed_at?: string
          observed_via?: string
          poll_id?: string | null
          poll_published_pct: number
          round?: number
        }
        Update: {
          abs_error_pct?: number | null
          actual_pct?: number
          candidate_id?: string
          election_id?: string
          fieldwork_end_days_before?: number
          id?: string
          institute_id?: string
          notes?: string | null
          observed_at?: string
          observed_via?: string
          poll_id?: string | null
          poll_published_pct?: number
          round?: number
        }
        Relationships: [
          {
            foreignKeyName: "institute_accuracy_observations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institute_accuracy_observations_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institute_accuracy_observations_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institute_accuracy_summary"
            referencedColumns: ["institute_id"]
          },
          {
            foreignKeyName: "institute_accuracy_observations_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institute_accuracy_observations_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      institutes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          methodology_default: string | null
          name: string
          reliability_score: number | null
          reliability_score_basis: string | null
          slug: string | null
          tier: number | null
          total_polls: number | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          methodology_default?: string | null
          name: string
          reliability_score?: number | null
          reliability_score_basis?: string | null
          slug?: string | null
          tier?: number | null
          total_polls?: number | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          methodology_default?: string | null
          name?: string
          reliability_score?: number | null
          reliability_score_basis?: string | null
          slug?: string | null
          tier?: number | null
          total_polls?: number | null
          website?: string | null
        }
        Relationships: []
      }
      ip_rate_limits: {
        Row: {
          count: number
          ip_hash: string
          reset_at: string
          scope: string
          window_start: string
        }
        Insert: {
          count?: number
          ip_hash: string
          reset_at?: string
          scope: string
          window_start?: string
        }
        Update: {
          count?: number
          ip_hash?: string
          reset_at?: string
          scope?: string
          window_start?: string
        }
        Relationships: []
      }
      judicial_proceedings: {
        Row: {
          candidate_id: string | null
          court: string | null
          current_status: string | null
          fetched_at: string | null
          filed_date: string | null
          id: string
          is_relevant: boolean | null
          process_class: string | null
          process_number: string | null
          process_subject: string | null
          source_url: string | null
        }
        Insert: {
          candidate_id?: string | null
          court?: string | null
          current_status?: string | null
          fetched_at?: string | null
          filed_date?: string | null
          id?: string
          is_relevant?: boolean | null
          process_class?: string | null
          process_number?: string | null
          process_subject?: string | null
          source_url?: string | null
        }
        Update: {
          candidate_id?: string | null
          court?: string | null
          current_status?: string | null
          fetched_at?: string | null
          filed_date?: string | null
          id?: string
          is_relevant?: boolean | null
          process_class?: string | null
          process_number?: string | null
          process_subject?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "judicial_proceedings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      legislative_activity: {
        Row: {
          activity_type: string | null
          candidate_id: string | null
          date: string | null
          description: string | null
          external_id: string | null
          fetched_at: string | null
          id: string
          source: string | null
          title: string | null
          value: number | null
        }
        Insert: {
          activity_type?: string | null
          candidate_id?: string | null
          date?: string | null
          description?: string | null
          external_id?: string | null
          fetched_at?: string | null
          id?: string
          source?: string | null
          title?: string | null
          value?: number | null
        }
        Update: {
          activity_type?: string | null
          candidate_id?: string | null
          date?: string | null
          description?: string | null
          external_id?: string | null
          fetched_at?: string | null
          id?: string
          source?: string | null
          title?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "legislative_activity_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      legislative_votes: {
        Row: {
          bill_id: string | null
          bill_title: string
          candidate_id: string | null
          fetched_at: string | null
          id: string
          importance: number | null
          source: string | null
          topic: string | null
          vote: string | null
          vote_date: string
        }
        Insert: {
          bill_id?: string | null
          bill_title: string
          candidate_id?: string | null
          fetched_at?: string | null
          id?: string
          importance?: number | null
          source?: string | null
          topic?: string | null
          vote?: string | null
          vote_date: string
        }
        Update: {
          bill_id?: string | null
          bill_title?: string
          candidate_id?: string | null
          fetched_at?: string | null
          id?: string
          importance?: number | null
          source?: string | null
          topic?: string | null
          vote?: string | null
          vote_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "legislative_votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          beehiiv_id: string | null
          confirmation_sent_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          email: string
          id: string
          is_active: boolean | null
          source: string | null
          subscribed_at: string | null
          tags: string[] | null
          unsubscribed_at: string | null
        }
        Insert: {
          beehiiv_id?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          source?: string | null
          subscribed_at?: string | null
          tags?: string[] | null
          unsubscribed_at?: string | null
        }
        Update: {
          beehiiv_id?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          source?: string | null
          subscribed_at?: string | null
          tags?: string[] | null
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      parliamentary_amendments: {
        Row: {
          author_name: string | null
          beneficiary_city: string | null
          beneficiary_state: string | null
          candidate_id: string | null
          fetched_at: string | null
          id: string
          purpose: string | null
          source: string | null
          value: number | null
          year: number | null
        }
        Insert: {
          author_name?: string | null
          beneficiary_city?: string | null
          beneficiary_state?: string | null
          candidate_id?: string | null
          fetched_at?: string | null
          id?: string
          purpose?: string | null
          source?: string | null
          value?: number | null
          year?: number | null
        }
        Update: {
          author_name?: string | null
          beneficiary_city?: string | null
          beneficiary_state?: string | null
          candidate_id?: string | null
          fetched_at?: string | null
          id?: string
          purpose?: string | null
          source?: string | null
          value?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parliamentary_amendments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      party_expense: {
        Row: {
          aidf_number: string | null
          aidf_year: number | null
          cnpj_prestador_conta: string | null
          description: string | null
          document_number: string | null
          document_type: string | null
          document_type_code: number | null
          election_year: number
          esfera_partidaria: string | null
          esfera_partidaria_code: number | null
          exercicio: number | null
          expense_type: string | null
          fetched_at: string | null
          fonte_despesa: string | null
          fonte_despesa_code: number | null
          id: string
          municipio: string | null
          municipio_code: string | null
          party_acronym: string | null
          party_name: string | null
          payment_date: string | null
          raw: Json | null
          source: string | null
          source_url: string | null
          sq_despesa: string
          supplier_cpf_cnpj: string | null
          supplier_name: string | null
          supplier_type: string | null
          supplier_type_code: number | null
          uf: string | null
          value_document: number | null
          value_expense: number | null
          value_paid: number | null
          zona: string | null
        }
        Insert: {
          aidf_number?: string | null
          aidf_year?: number | null
          cnpj_prestador_conta?: string | null
          description?: string | null
          document_number?: string | null
          document_type?: string | null
          document_type_code?: number | null
          election_year: number
          esfera_partidaria?: string | null
          esfera_partidaria_code?: number | null
          exercicio?: number | null
          expense_type?: string | null
          fetched_at?: string | null
          fonte_despesa?: string | null
          fonte_despesa_code?: number | null
          id?: string
          municipio?: string | null
          municipio_code?: string | null
          party_acronym?: string | null
          party_name?: string | null
          payment_date?: string | null
          raw?: Json | null
          source?: string | null
          source_url?: string | null
          sq_despesa: string
          supplier_cpf_cnpj?: string | null
          supplier_name?: string | null
          supplier_type?: string | null
          supplier_type_code?: number | null
          uf?: string | null
          value_document?: number | null
          value_expense?: number | null
          value_paid?: number | null
          zona?: string | null
        }
        Update: {
          aidf_number?: string | null
          aidf_year?: number | null
          cnpj_prestador_conta?: string | null
          description?: string | null
          document_number?: string | null
          document_type?: string | null
          document_type_code?: number | null
          election_year?: number
          esfera_partidaria?: string | null
          esfera_partidaria_code?: number | null
          exercicio?: number | null
          expense_type?: string | null
          fetched_at?: string | null
          fonte_despesa?: string | null
          fonte_despesa_code?: number | null
          id?: string
          municipio?: string | null
          municipio_code?: string | null
          party_acronym?: string | null
          party_name?: string | null
          payment_date?: string | null
          raw?: Json | null
          source?: string | null
          source_url?: string | null
          sq_despesa?: string
          supplier_cpf_cnpj?: string | null
          supplier_name?: string | null
          supplier_type?: string | null
          supplier_type_code?: number | null
          uf?: string | null
          value_document?: number | null
          value_expense?: number | null
          value_paid?: number | null
          zona?: string | null
        }
        Relationships: []
      }
      party_fund_transfers: {
        Row: {
          amount: number
          fetched_at: string | null
          fund_type: string
          id: string
          notes: string | null
          party_acronym: string
          party_name: string | null
          pct_of_total: number | null
          reference_year: number
          source: string
          source_url: string | null
        }
        Insert: {
          amount: number
          fetched_at?: string | null
          fund_type: string
          id?: string
          notes?: string | null
          party_acronym: string
          party_name?: string | null
          pct_of_total?: number | null
          reference_year: number
          source: string
          source_url?: string | null
        }
        Update: {
          amount?: number
          fetched_at?: string | null
          fund_type?: string
          id?: string
          notes?: string | null
          party_acronym?: string
          party_name?: string | null
          pct_of_total?: number | null
          reference_year?: number
          source?: string
          source_url?: string | null
        }
        Relationships: []
      }
      party_revenue: {
        Row: {
          cnpj_prestador_conta: string | null
          description: string | null
          document_number: string | null
          donor_candidate_cargo: string | null
          donor_candidate_cargo_code: number | null
          donor_candidate_number: string | null
          donor_candidate_sq: string | null
          donor_cpf_cnpj: string | null
          donor_esfera_partidaria: string | null
          donor_esfera_partidaria_code: number | null
          donor_municipio: string | null
          donor_municipio_code: string | null
          donor_name: string | null
          donor_uf: string | null
          donor_zona: string | null
          election_year: number
          esfera_partidaria: string | null
          esfera_partidaria_code: number | null
          especie_recurso: string | null
          especie_recurso_code: number | null
          fetched_at: string | null
          fonte_recurso: string | null
          fonte_recurso_code: number | null
          id: string
          municipio: string | null
          municipio_code: string | null
          natural_key: string
          natureza_recurso: string | null
          natureza_recurso_code: number | null
          origem_doacao: string | null
          origem_doacao_code: number | null
          party_acronym: string | null
          party_name: string | null
          raw: Json | null
          receipt_number: string | null
          receita_date: string | null
          source: string | null
          source_url: string | null
          uf: string | null
          value_brl: number | null
          zona: string | null
        }
        Insert: {
          cnpj_prestador_conta?: string | null
          description?: string | null
          document_number?: string | null
          donor_candidate_cargo?: string | null
          donor_candidate_cargo_code?: number | null
          donor_candidate_number?: string | null
          donor_candidate_sq?: string | null
          donor_cpf_cnpj?: string | null
          donor_esfera_partidaria?: string | null
          donor_esfera_partidaria_code?: number | null
          donor_municipio?: string | null
          donor_municipio_code?: string | null
          donor_name?: string | null
          donor_uf?: string | null
          donor_zona?: string | null
          election_year: number
          esfera_partidaria?: string | null
          esfera_partidaria_code?: number | null
          especie_recurso?: string | null
          especie_recurso_code?: number | null
          fetched_at?: string | null
          fonte_recurso?: string | null
          fonte_recurso_code?: number | null
          id?: string
          municipio?: string | null
          municipio_code?: string | null
          natural_key: string
          natureza_recurso?: string | null
          natureza_recurso_code?: number | null
          origem_doacao?: string | null
          origem_doacao_code?: number | null
          party_acronym?: string | null
          party_name?: string | null
          raw?: Json | null
          receipt_number?: string | null
          receita_date?: string | null
          source?: string | null
          source_url?: string | null
          uf?: string | null
          value_brl?: number | null
          zona?: string | null
        }
        Update: {
          cnpj_prestador_conta?: string | null
          description?: string | null
          document_number?: string | null
          donor_candidate_cargo?: string | null
          donor_candidate_cargo_code?: number | null
          donor_candidate_number?: string | null
          donor_candidate_sq?: string | null
          donor_cpf_cnpj?: string | null
          donor_esfera_partidaria?: string | null
          donor_esfera_partidaria_code?: number | null
          donor_municipio?: string | null
          donor_municipio_code?: string | null
          donor_name?: string | null
          donor_uf?: string | null
          donor_zona?: string | null
          election_year?: number
          esfera_partidaria?: string | null
          esfera_partidaria_code?: number | null
          especie_recurso?: string | null
          especie_recurso_code?: number | null
          fetched_at?: string | null
          fonte_recurso?: string | null
          fonte_recurso_code?: number | null
          id?: string
          municipio?: string | null
          municipio_code?: string | null
          natural_key?: string
          natureza_recurso?: string | null
          natureza_recurso_code?: number | null
          origem_doacao?: string | null
          origem_doacao_code?: number | null
          party_acronym?: string | null
          party_name?: string | null
          raw?: Json | null
          receipt_number?: string | null
          receita_date?: string | null
          source?: string | null
          source_url?: string | null
          uf?: string | null
          value_brl?: number | null
          zona?: string | null
        }
        Relationships: []
      }
      pesqele_registry: {
        Row: {
          ano: number
          cargos: string
          cd_conre: string | null
          cnpj_empresa: string | null
          ds_metodologia: string | null
          ds_plano_amostral: string | null
          dt_divulgacao: string | null
          dt_fim: string | null
          dt_inicio: string | null
          dt_registro: string | null
          ingested_at: string
          municipio: string | null
          nm_estatistico: string | null
          nome_empresa: string
          nome_fantasia: string | null
          pesquisa_propria: boolean | null
          protocolo: string
          qt_entrevistados: number | null
          raw: Json | null
          uf: string
          vr_pesquisa: number | null
        }
        Insert: {
          ano: number
          cargos: string
          cd_conre?: string | null
          cnpj_empresa?: string | null
          ds_metodologia?: string | null
          ds_plano_amostral?: string | null
          dt_divulgacao?: string | null
          dt_fim?: string | null
          dt_inicio?: string | null
          dt_registro?: string | null
          ingested_at?: string
          municipio?: string | null
          nm_estatistico?: string | null
          nome_empresa: string
          nome_fantasia?: string | null
          pesquisa_propria?: boolean | null
          protocolo: string
          qt_entrevistados?: number | null
          raw?: Json | null
          uf: string
          vr_pesquisa?: number | null
        }
        Update: {
          ano?: number
          cargos?: string
          cd_conre?: string | null
          cnpj_empresa?: string | null
          ds_metodologia?: string | null
          ds_plano_amostral?: string | null
          dt_divulgacao?: string | null
          dt_fim?: string | null
          dt_inicio?: string | null
          dt_registro?: string | null
          ingested_at?: string
          municipio?: string | null
          nm_estatistico?: string | null
          nome_empresa?: string
          nome_fantasia?: string | null
          pesquisa_propria?: boolean | null
          protocolo?: string
          qt_entrevistados?: number | null
          raw?: Json | null
          uf?: string
          vr_pesquisa?: number | null
        }
        Relationships: []
      }
      plano_governo: {
        Row: {
          ano: number
          caminho_arquivo: string | null
          candidato_id: string
          data_download: string
          hash: string
          id: string
          num_paginas: number | null
          pdf_url_publico: string | null
          url_origem: string
        }
        Insert: {
          ano: number
          caminho_arquivo?: string | null
          candidato_id: string
          data_download?: string
          hash: string
          id?: string
          num_paginas?: number | null
          pdf_url_publico?: string | null
          url_origem: string
        }
        Update: {
          ano?: number
          caminho_arquivo?: string | null
          candidato_id?: string
          data_download?: string
          hash?: string
          id?: string
          num_paginas?: number | null
          pdf_url_publico?: string | null
          url_origem?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_governo_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_pagina: {
        Row: {
          id: string
          metodo: string
          numero: number
          plano_id: string
          texto: string
        }
        Insert: {
          id?: string
          metodo?: string
          numero: number
          plano_id: string
          texto: string
        }
        Update: {
          id?: string
          metodo?: string
          numero?: number
          plano_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_pagina_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "plano_governo"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_sintese: {
        Row: {
          gerado_em: string
          id: string
          paginas_referencia: number[]
          plano_id: string
          revisado_em: string | null
          revisado_por: string | null
          status: string
          tema_id: string
          texto: string
        }
        Insert: {
          gerado_em?: string
          id?: string
          paginas_referencia?: number[]
          plano_id: string
          revisado_em?: string | null
          revisado_por?: string | null
          status?: string
          tema_id: string
          texto: string
        }
        Update: {
          gerado_em?: string
          id?: string
          paginas_referencia?: number[]
          plano_id?: string
          revisado_em?: string | null
          revisado_por?: string | null
          status?: string
          tema_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_sintese_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "plano_governo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_sintese_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "tema"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_trecho: {
        Row: {
          criado_em: string
          id: string
          pagina: number
          plano_id: string
          revisado_em: string | null
          revisado_por: string | null
          status: string
          tema_id: string
          texto: string
        }
        Insert: {
          criado_em?: string
          id?: string
          pagina: number
          plano_id: string
          revisado_em?: string | null
          revisado_por?: string | null
          status?: string
          tema_id: string
          texto: string
        }
        Update: {
          criado_em?: string
          id?: string
          pagina?: number
          plano_id?: string
          revisado_em?: string | null
          revisado_por?: string | null
          status?: string
          tema_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_trecho_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "plano_governo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_trecho_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "tema"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_drafts: {
        Row: {
          election_id: string | null
          fieldwork_end: string | null
          fieldwork_start: string | null
          id: string
          imported_at: string
          institute_id: string | null
          institute_name: string
          margin_of_error: number | null
          methodology: string | null
          notes: string | null
          promoted_poll_id: string | null
          publication_date: string | null
          raw_row: Json | null
          results: Json
          reviewed_at: string | null
          reviewed_by: string | null
          round: number | null
          sample_size: number | null
          scenario_label: string | null
          scope: string | null
          source_kind: string
          source_url: string
          status: Database["public"]["Enums"]["poll_draft_status"]
          tse_protocolo: string | null
        }
        Insert: {
          election_id?: string | null
          fieldwork_end?: string | null
          fieldwork_start?: string | null
          id?: string
          imported_at?: string
          institute_id?: string | null
          institute_name: string
          margin_of_error?: number | null
          methodology?: string | null
          notes?: string | null
          promoted_poll_id?: string | null
          publication_date?: string | null
          raw_row?: Json | null
          results: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          round?: number | null
          sample_size?: number | null
          scenario_label?: string | null
          scope?: string | null
          source_kind: string
          source_url: string
          status?: Database["public"]["Enums"]["poll_draft_status"]
          tse_protocolo?: string | null
        }
        Update: {
          election_id?: string | null
          fieldwork_end?: string | null
          fieldwork_start?: string | null
          id?: string
          imported_at?: string
          institute_id?: string | null
          institute_name?: string
          margin_of_error?: number | null
          methodology?: string | null
          notes?: string | null
          promoted_poll_id?: string | null
          publication_date?: string | null
          raw_row?: Json | null
          results?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          round?: number | null
          sample_size?: number | null
          scenario_label?: string | null
          scope?: string | null
          source_kind?: string
          source_url?: string
          status?: Database["public"]["Enums"]["poll_draft_status"]
          tse_protocolo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_drafts_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_drafts_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institute_accuracy_summary"
            referencedColumns: ["institute_id"]
          },
          {
            foreignKeyName: "poll_drafts_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_drafts_promoted_poll_id_fkey"
            columns: ["promoted_poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_drafts_tse_protocolo_fkey"
            columns: ["tse_protocolo"]
            isOneToOne: false
            referencedRelation: "pesqele_missing"
            referencedColumns: ["protocolo"]
          },
          {
            foreignKeyName: "poll_drafts_tse_protocolo_fkey"
            columns: ["tse_protocolo"]
            isOneToOne: false
            referencedRelation: "pesqele_registry"
            referencedColumns: ["protocolo"]
          },
        ]
      }
      poll_results: {
        Row: {
          absolute_votes: number | null
          candidate_id: string
          created_at: string | null
          id: string
          percentage: number
          poll_id: string
        }
        Insert: {
          absolute_votes?: number | null
          candidate_id: string
          created_at?: string | null
          id?: string
          percentage: number
          poll_id: string
        }
        Update: {
          absolute_votes?: number | null
          candidate_id?: string
          created_at?: string | null
          id?: string
          percentage?: number
          poll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_results_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          confidence_level: number | null
          created_at: string | null
          election_id: string
          fieldwork_end: string
          fieldwork_start: string | null
          id: string
          institute_id: string
          is_verified: boolean | null
          margin_of_error: number | null
          methodology: string | null
          poll_type: string | null
          publication_date: string
          raw_data: Json | null
          round: number
          sample_size: number
          scenario_label: string | null
          scope: string | null
          source_kind: string | null
          source_url: string | null
          tse_registration: string | null
          updated_at: string | null
        }
        Insert: {
          confidence_level?: number | null
          created_at?: string | null
          election_id: string
          fieldwork_end: string
          fieldwork_start?: string | null
          id?: string
          institute_id: string
          is_verified?: boolean | null
          margin_of_error?: number | null
          methodology?: string | null
          poll_type?: string | null
          publication_date: string
          raw_data?: Json | null
          round?: number
          sample_size: number
          scenario_label?: string | null
          scope?: string | null
          source_kind?: string | null
          source_url?: string | null
          tse_registration?: string | null
          updated_at?: string | null
        }
        Update: {
          confidence_level?: number | null
          created_at?: string | null
          election_id?: string
          fieldwork_end?: string
          fieldwork_start?: string | null
          id?: string
          institute_id?: string
          is_verified?: boolean | null
          margin_of_error?: number | null
          methodology?: string | null
          poll_type?: string | null
          publication_date?: string
          raw_data?: Json | null
          round?: number
          sample_size?: number
          scenario_label?: string | null
          scope?: string | null
          source_kind?: string | null
          source_url?: string | null
          tse_registration?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "polls_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institute_accuracy_summary"
            referencedColumns: ["institute_id"]
          },
          {
            foreignKeyName: "polls_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      prior_election_results: {
        Row: {
          candidate_id: string | null
          city: string | null
          cpf_clean: string | null
          election_type: string
          fetched_at: string | null
          id: string
          party: string | null
          result_status: string | null
          round: number | null
          source: string | null
          state: string | null
          total_votes: number | null
          year: number
        }
        Insert: {
          candidate_id?: string | null
          city?: string | null
          cpf_clean?: string | null
          election_type: string
          fetched_at?: string | null
          id?: string
          party?: string | null
          result_status?: string | null
          round?: number | null
          source?: string | null
          state?: string | null
          total_votes?: number | null
          year: number
        }
        Update: {
          candidate_id?: string | null
          city?: string | null
          cpf_clean?: string | null
          election_type?: string
          fetched_at?: string | null
          id?: string
          party?: string | null
          result_status?: string | null
          round?: number | null
          source?: string | null
          state?: string | null
          total_votes?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "prior_election_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctioned_entities: {
        Row: {
          abrangencia: string | null
          cnpj: string | null
          cnpj_clean: string | null
          data_fim: string | null
          data_inicio: string | null
          data_publicacao: string | null
          fetched_at: string | null
          fonte_sancao: string | null
          fundamentacao: string | null
          id: number
          link_publicacao: string | null
          nome: string | null
          nome_fantasia: string | null
          numero_processo: string | null
          orgao_esfera: string | null
          orgao_sancionador: string | null
          orgao_uf: string | null
          raw_data: Json | null
          razao_social: string | null
          tipo_sancao: string | null
        }
        Insert: {
          abrangencia?: string | null
          cnpj?: string | null
          cnpj_clean?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          data_publicacao?: string | null
          fetched_at?: string | null
          fonte_sancao?: string | null
          fundamentacao?: string | null
          id: number
          link_publicacao?: string | null
          nome?: string | null
          nome_fantasia?: string | null
          numero_processo?: string | null
          orgao_esfera?: string | null
          orgao_sancionador?: string | null
          orgao_uf?: string | null
          raw_data?: Json | null
          razao_social?: string | null
          tipo_sancao?: string | null
        }
        Update: {
          abrangencia?: string | null
          cnpj?: string | null
          cnpj_clean?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          data_publicacao?: string | null
          fetched_at?: string | null
          fonte_sancao?: string | null
          fundamentacao?: string | null
          id?: number
          link_publicacao?: string | null
          nome?: string | null
          nome_fantasia?: string | null
          numero_processo?: string | null
          orgao_esfera?: string | null
          orgao_sancionador?: string | null
          orgao_uf?: string | null
          raw_data?: Json | null
          razao_social?: string | null
          tipo_sancao?: string | null
        }
        Relationships: []
      }
      sanctioned_persons: {
        Row: {
          cargo: string | null
          cpf: string | null
          cpf_clean: string | null
          data_inicio: string | null
          data_publicacao: string | null
          fetched_at: string | null
          fundamentacao: string | null
          id: number
          nome: string | null
          numero_processo: string | null
          orgao: string | null
          raw_data: Json | null
          tipo_sancao: string | null
        }
        Insert: {
          cargo?: string | null
          cpf?: string | null
          cpf_clean?: string | null
          data_inicio?: string | null
          data_publicacao?: string | null
          fetched_at?: string | null
          fundamentacao?: string | null
          id: number
          nome?: string | null
          numero_processo?: string | null
          orgao?: string | null
          raw_data?: Json | null
          tipo_sancao?: string | null
        }
        Update: {
          cargo?: string | null
          cpf?: string | null
          cpf_clean?: string | null
          data_inicio?: string | null
          data_publicacao?: string | null
          fetched_at?: string | null
          fundamentacao?: string | null
          id?: number
          nome?: string | null
          numero_processo?: string | null
          orgao?: string | null
          raw_data?: Json | null
          tipo_sancao?: string | null
        }
        Relationships: []
      }
      stale_poll_alerts: {
        Row: {
          http_request_id: number | null
          id: string
          payload: Json
          sent_at: string
          stale_count: number
          threshold_days: number
        }
        Insert: {
          http_request_id?: number | null
          id?: string
          payload: Json
          sent_at?: string
          stale_count: number
          threshold_days: number
        }
        Update: {
          http_request_id?: number | null
          id?: string
          payload?: Json
          sent_at?: string
          stale_count?: number
          threshold_days?: number
        }
        Relationships: []
      }
      sub_imob_alertas: {
        Row: {
          categoria: string
          created_at: string | null
          descricao: string | null
          fonte: string
          id: string
          matricula: string
          payload: Json | null
          severidade: string | null
          titulo: string
        }
        Insert: {
          categoria: string
          created_at?: string | null
          descricao?: string | null
          fonte: string
          id?: string
          matricula: string
          payload?: Json | null
          severidade?: string | null
          titulo: string
        }
        Update: {
          categoria?: string
          created_at?: string | null
          descricao?: string | null
          fonte?: string
          id?: string
          matricula?: string
          payload?: Json | null
          severidade?: string | null
          titulo?: string
        }
        Relationships: []
      }
      sub_imob_consultas: {
        Row: {
          cartorio_id: string | null
          created_at: string | null
          email_cliente: string | null
          endereco_completo: string | null
          id: string
          matricula: string
          processed: boolean | null
          processed_at: string | null
          updated_at: string | null
        }
        Insert: {
          cartorio_id?: string | null
          created_at?: string | null
          email_cliente?: string | null
          endereco_completo?: string | null
          id?: string
          matricula: string
          processed?: boolean | null
          processed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          cartorio_id?: string | null
          created_at?: string | null
          email_cliente?: string | null
          endereco_completo?: string | null
          id?: string
          matricula?: string
          processed?: boolean | null
          processed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sub_imob_dados: {
        Row: {
          categoria: string
          created_at: string | null
          detalhes: Json | null
          fonte: string
          id: string
          matricula: string
          resumo: string | null
          status: string | null
          titulo_secao: string | null
          updated_at: string | null
        }
        Insert: {
          categoria: string
          created_at?: string | null
          detalhes?: Json | null
          fonte: string
          id?: string
          matricula: string
          resumo?: string | null
          status?: string | null
          titulo_secao?: string | null
          updated_at?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string | null
          detalhes?: Json | null
          fonte?: string
          id?: string
          matricula?: string
          resumo?: string | null
          status?: string | null
          titulo_secao?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sub_imob_dossies: {
        Row: {
          consulta_id: string
          created_at: string | null
          id: string
          matricula: string
          pdf_url: string | null
          tipo_dossie: string
          updated_at: string | null
        }
        Insert: {
          consulta_id: string
          created_at?: string | null
          id?: string
          matricula: string
          pdf_url?: string | null
          tipo_dossie: string
          updated_at?: string | null
        }
        Update: {
          consulta_id?: string
          created_at?: string | null
          id?: string
          matricula?: string
          pdf_url?: string | null
          tipo_dossie?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_imob_dossies_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "sub_imob_consultas"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_imob_pacotes: {
        Row: {
          activated_at: string | null
          created_at: string | null
          creditos_restantes: number | null
          email_cliente: string
          expires_at: string | null
          id: string
          status: string | null
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string | null
          creditos_restantes?: number | null
          email_cliente: string
          expires_at?: string | null
          id?: string
          status?: string | null
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string | null
          creditos_restantes?: number | null
          email_cliente?: string
          expires_at?: string | null
          id?: string
          status?: string | null
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sub_imob_pessoas: {
        Row: {
          cpf_cnpj: string | null
          created_at: string | null
          endereco: string | null
          id: string
          matricula: string
          nome: string | null
          tipo_pessoa: string
        }
        Insert: {
          cpf_cnpj?: string | null
          created_at?: string | null
          endereco?: string | null
          id?: string
          matricula: string
          nome?: string | null
          tipo_pessoa: string
        }
        Update: {
          cpf_cnpj?: string | null
          created_at?: string | null
          endereco?: string | null
          id?: string
          matricula?: string
          nome?: string | null
          tipo_pessoa?: string
        }
        Relationships: []
      }
      sub_imob_resultados: {
        Row: {
          created_at: string | null
          faixa_risco: string | null
          id: string
          matricula: string
          score_risco: number | null
          total_alertas: number | null
          total_criticos: number | null
          total_dados: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          faixa_risco?: string | null
          id?: string
          matricula: string
          score_risco?: number | null
          total_alertas?: number | null
          total_criticos?: number | null
          total_dados?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          faixa_risco?: string | null
          id?: string
          matricula?: string
          score_risco?: number | null
          total_alertas?: number | null
          total_criticos?: number | null
          total_dados?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tema: {
        Row: {
          descricao_escopo: string
          id: string
          nome: string
          ordem: number
          slug: string
        }
        Insert: {
          descricao_escopo: string
          id?: string
          nome: string
          ordem: number
          slug: string
        }
        Update: {
          descricao_escopo?: string
          id?: string
          nome?: string
          ordem?: number
          slug?: string
        }
        Relationships: []
      }
      tse_apuracao: {
        Row: {
          cargo: string
          created_at: string | null
          data_apuracao: string
          election_id: string
          estado: string | null
          id: string
          percentual_apuracao: number | null
          secoes_apuradas: number | null
          secoes_totais: number | null
          turno: number | null
          updated_at: string | null
        }
        Insert: {
          cargo: string
          created_at?: string | null
          data_apuracao: string
          election_id: string
          estado?: string | null
          id?: string
          percentual_apuracao?: number | null
          secoes_apuradas?: number | null
          secoes_totais?: number | null
          turno?: number | null
          updated_at?: string | null
        }
        Update: {
          cargo?: string
          created_at?: string | null
          data_apuracao?: string
          election_id?: string
          estado?: string | null
          id?: string
          percentual_apuracao?: number | null
          secoes_apuradas?: number | null
          secoes_totais?: number | null
          turno?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tse_apuracao_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      tse_apuracao_candidatos: {
        Row: {
          apuracao_id: string
          candidate_id: string | null
          created_at: string | null
          id: string
          nome_candidato: string
          numero_candidato: string | null
          percentual: number | null
          sigla_partido: string
          votos_legenda: number | null
          votos_nominais: number | null
        }
        Insert: {
          apuracao_id: string
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          nome_candidato: string
          numero_candidato?: string | null
          percentual?: number | null
          sigla_partido: string
          votos_legenda?: number | null
          votos_nominais?: number | null
        }
        Update: {
          apuracao_id?: string
          candidate_id?: string | null
          created_at?: string | null
          id?: string
          nome_candidato?: string
          numero_candidato?: string | null
          percentual?: number | null
          sigla_partido?: string
          votos_legenda?: number | null
          votos_nominais?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tse_apuracao_candidatos_apuracao_id_fkey"
            columns: ["apuracao_id"]
            isOneToOne: false
            referencedRelation: "tse_apuracao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tse_apuracao_candidatos_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_alert_deliveries: {
        Row: {
          alert_id: string
          http_request_id: number | null
          id: string
          payload: Json
          triggered_at: string
        }
        Insert: {
          alert_id: string
          http_request_id?: number | null
          id?: string
          payload: Json
          triggered_at?: string
        }
        Update: {
          alert_id?: string
          http_request_id?: number | null
          id?: string
          payload?: Json
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_alert_deliveries_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "user_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_alerts: {
        Row: {
          alert_type: string
          candidate_id: string | null
          created_at: string
          election_id: string | null
          id: string
          is_active: boolean
          last_checked_at: string | null
          last_triggered_at: string | null
          last_value: number | null
          threshold_pp: number | null
          user_id: string
        }
        Insert: {
          alert_type: string
          candidate_id?: string | null
          created_at?: string
          election_id?: string | null
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          last_triggered_at?: string | null
          last_value?: number | null
          threshold_pp?: number | null
          user_id: string
        }
        Update: {
          alert_type?: string
          candidate_id?: string | null
          created_at?: string
          election_id?: string | null
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          last_triggered_at?: string | null
          last_value?: number | null
          threshold_pp?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_alerts_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_alerts_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          agent: string | null
          attempts: number | null
          created_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          ok: boolean | null
          status_code: number | null
          url: string
        }
        Insert: {
          agent?: string | null
          attempts?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          ok?: boolean | null
          status_code?: number | null
          url: string
        }
        Update: {
          agent?: string | null
          attempts?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          ok?: boolean | null
          status_code?: number | null
          url?: string
        }
        Relationships: []
      }
      webhook_queue: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string | null
          error: string | null
          id: string
          last_error_at: string | null
          max_attempts: number | null
          next_retry_at: string | null
          payload: Json
          status: string | null
          url: string
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          last_error_at?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          payload: Json
          status?: string | null
          url: string
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          last_error_at?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          payload?: Json
          status?: string | null
          url?: string
        }
        Relationships: []
      }
      weighted_averages: {
        Row: {
          calculated_at: string
          calculation_params: Json | null
          candidate_id: string
          confidence_interval_high: number | null
          confidence_interval_low: number | null
          election_id: string
          id: string
          polls_included: number | null
          scenario_label: string | null
          total_sample_size: number | null
          weighted_average: number
        }
        Insert: {
          calculated_at?: string
          calculation_params?: Json | null
          candidate_id: string
          confidence_interval_high?: number | null
          confidence_interval_low?: number | null
          election_id: string
          id?: string
          polls_included?: number | null
          scenario_label?: string | null
          total_sample_size?: number | null
          weighted_average: number
        }
        Update: {
          calculated_at?: string
          calculation_params?: Json | null
          candidate_id?: string
          confidence_interval_high?: number | null
          confidence_interval_low?: number | null
          election_id?: string
          id?: string
          polls_included?: number | null
          scenario_label?: string | null
          total_sample_size?: number | null
          weighted_average?: number
        }
        Relationships: [
          {
            foreignKeyName: "weighted_averages_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighted_averages_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      candidate_net_worth: {
        Row: {
          asset_count: number | null
          asset_types: string[] | null
          candidate_id: string | null
          election_year: number | null
          total_brl: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_assets_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      institute_accuracy_summary: {
        Row: {
          elections_observed: number | null
          institute_id: string | null
          institute_name: string | null
          institute_slug: string | null
          last_observed_at: string | null
          mae_14d: number | null
          mae_7d: number | null
          mae_overall: number | null
          obs_within_7d: number | null
          observations_total: number | null
          suggested_reliability_score: number | null
        }
        Relationships: []
      }
      pesqele_coverage: {
        Row: {
          cargo: string | null
          com_fonte_primaria: number | null
          coverage_pct: number | null
          on_electiolab: number | null
          total_tse: number | null
          uf: string | null
        }
        Relationships: []
      }
      pesqele_missing: {
        Row: {
          ano: number | null
          cargos: string | null
          days_since_fieldwork: number | null
          fieldwork_end: string | null
          instituto: string | null
          protocolo: string | null
          publication_date: string | null
          sample_size: number | null
          uf: string | null
        }
        Insert: {
          ano?: number | null
          cargos?: string | null
          days_since_fieldwork?: never
          fieldwork_end?: string | null
          instituto?: string | null
          protocolo?: string | null
          publication_date?: string | null
          sample_size?: number | null
          uf?: string | null
        }
        Update: {
          ano?: number | null
          cargos?: string | null
          days_since_fieldwork?: never
          fieldwork_end?: string | null
          instituto?: string | null
          protocolo?: string | null
          publication_date?: string | null
          sample_size?: number | null
          uf?: string | null
        }
        Relationships: []
      }
      poll_drafts_summary: {
        Row: {
          approved: number | null
          cargo: string | null
          election_name: string | null
          imported: number | null
          last_fieldwork_end: string | null
          pending: number | null
          rejected: number | null
          state: string | null
          with_tse_match: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_recalc_cron_status: { Args: never; Returns: Json }
      admin_recalc_run_history: { Args: never; Returns: Json }
      build_digest_html: {
        Args: { p_payload: Json; p_unsub_url: string }
        Returns: string
      }
      check_ip_rate: {
        Args: {
          p_ip_hash: string
          p_limit?: number
          p_scope: string
          p_window_seconds?: number
        }
        Returns: {
          allowed: boolean
          count: number
          remaining: number
          reset_at: string
        }[]
      }
      cleanup_expired_ip_rate_limits: { Args: never; Returns: number }
      cron_check_stale_polls: {
        Args: { p_force?: boolean; p_threshold_days?: number }
        Returns: Json
      }
      cron_check_user_alerts: { Args: never; Returns: Json }
      cron_recalculate_averages: { Args: never; Returns: number }
      cron_send_weekly_digest: {
        Args: { p_dry_run?: boolean; p_test_recipient?: string }
        Returns: Json
      }
      get_active_parties: {
        Args: { p_year: number }
        Returns: {
          party: string
        }[]
      }
      get_candidate_drift: {
        Args: { p_candidate_id: string; p_days?: number }
        Returns: {
          date: string
          polls_included: number
          total_sample_size: number
          weighted_average: number
        }[]
      }
      get_candidate_type_counts: {
        Args: { p_year: number }
        Returns: {
          election_type: string
          total: number
        }[]
      }
      get_plano_trecho_status_counts: {
        Args: { p_status?: string }
        Returns: {
          tema_id: string
          total: number
        }[]
      }
      increment_api_key_usage: {
        Args: { p_key_hash: string }
        Returns: {
          is_over_limit: boolean
          is_valid: boolean
          period_resets_at: string
          rate_limit: number
          requests_remaining: number
          requests_used: number
          tier: string
          user_id: string
        }[]
      }
      refresh_candidate_fefc: { Args: { p_year: number }; Returns: number }
      tse_protocolo_base: { Args: { reg: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
      update_pesqele_missing: { Args: { year?: number }; Returns: Json }
    }
    Enums: {
      poll_draft_status: "pending" | "approved" | "rejected" | "imported"
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
      poll_draft_status: ["pending", "approved", "rejected", "imported"],
    },
  },
} as const
