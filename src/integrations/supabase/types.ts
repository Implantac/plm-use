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
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          message: string
          metadata: Json
          module: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          message: string
          metadata?: Json
          module: string
          user_id?: string | null
          user_name: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          message?: string
          metadata?: Json
          module?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
      }
      analytics_kpis: {
        Row: {
          created_at: string
          created_by: string | null
          external_key: string
          icon_name: string
          id: string
          label: string
          progress: number | null
          sub: string
          tone: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          external_key: string
          icon_name?: string
          id?: string
          label: string
          progress?: number | null
          sub?: string
          tone?: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          external_key?: string
          icon_name?: string
          id?: string
          label?: string
          progress?: number | null
          sub?: string
          tone?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      app_cron_config: {
        Row: {
          base_url: string
          enabled: boolean
          header: string
          job: string
          path: string
          secret: string
          updated_at: string
        }
        Insert: {
          base_url: string
          enabled?: boolean
          header: string
          job: string
          path: string
          secret: string
          updated_at?: string
        }
        Update: {
          base_url?: string
          enabled?: boolean
          header?: string
          job?: string
          path?: string
          secret?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_cron_runs: {
        Row: {
          detail: string | null
          id: number
          job: string
          ok: boolean
          started_at: string
          status: number
        }
        Insert: {
          detail?: string | null
          id?: never
          job: string
          ok: boolean
          started_at?: string
          status: number
        }
        Update: {
          detail?: string | null
          id?: never
          job?: string
          ok?: boolean
          started_at?: string
          status?: number
        }
        Relationships: []
      }
      capa_events: {
        Row: {
          actor: string | null
          actor_name: string | null
          capa_id: string
          created_at: string
          event: string
          from_status: string | null
          id: string
          note: string | null
          to_status: string | null
        }
        Insert: {
          actor?: string | null
          actor_name?: string | null
          capa_id: string
          created_at?: string
          event: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string | null
        }
        Update: {
          actor?: string | null
          actor_name?: string | null
          capa_id?: string
          created_at?: string
          event?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capa_events_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "quality_capa"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_option_groups: {
        Row: {
          code: string
          id: string
          name: string
          product_id: string
          required: boolean
          selection: string
          sort: number
        }
        Insert: {
          code: string
          id?: string
          name: string
          product_id: string
          required?: boolean
          selection?: string
          sort?: number
        }
        Update: {
          code?: string
          id?: string
          name?: string
          product_id?: string
          required?: boolean
          selection?: string
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalog_option_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_options: {
        Row: {
          active: boolean
          code: string
          driver: string
          group_id: string
          id: string
          material_consumption: Json
          minutes: number | null
          name: string
          operation_name: string | null
          outsourced: boolean
          price_delta: number
          requires_spec: string[]
          sector: string | null
          setup_cost: number
          unit_cost: number
        }
        Insert: {
          active?: boolean
          code: string
          driver?: string
          group_id: string
          id?: string
          material_consumption?: Json
          minutes?: number | null
          name: string
          operation_name?: string | null
          outsourced?: boolean
          price_delta?: number
          requires_spec?: string[]
          sector?: string | null
          setup_cost?: number
          unit_cost?: number
        }
        Update: {
          active?: boolean
          code?: string
          driver?: string
          group_id?: string
          id?: string
          material_consumption?: Json
          minutes?: number | null
          name?: string
          operation_name?: string | null
          outsourced?: boolean
          price_delta?: number
          requires_spec?: string[]
          sector?: string | null
          setup_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalog_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "catalog_option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_products: {
        Row: {
          active: boolean
          base_price: number
          code: string
          configuration_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          family: string | null
          grade: Json
          id: string
          min_qty: number
          name: string
          reference_code: string | null
          status: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          active?: boolean
          base_price?: number
          code: string
          configuration_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          family?: string | null
          grade?: Json
          id?: string
          min_qty?: number
          name: string
          reference_code?: string | null
          status?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          active?: boolean
          base_price?: number
          code?: string
          configuration_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          family?: string | null
          grade?: Json
          id?: string
          min_qty?: number
          name?: string
          reference_code?: string | null
          status?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_products_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "product_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_map_filters: {
        Row: {
          categories: Json
          colors: Json
          created_at: string
          created_by: string | null
          created_on: string | null
          external_key: string
          id: string
          name: string
          owner: string
          statuses: Json
          updated_at: string
        }
        Insert: {
          categories?: Json
          colors?: Json
          created_at?: string
          created_by?: string | null
          created_on?: string | null
          external_key: string
          id?: string
          name: string
          owner?: string
          statuses?: Json
          updated_at?: string
        }
        Update: {
          categories?: Json
          colors?: Json
          created_at?: string
          created_by?: string | null
          created_on?: string | null
          external_key?: string
          id?: string
          name?: string
          owner?: string
          statuses?: Json
          updated_at?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          abc: string
          avg_cost: number | null
          avg_price: number | null
          brand: string
          created_at: string
          created_by: string | null
          external_key: string
          id: string
          image: string
          lead_time_dias: number | null
          name: string
          planned_mix: number
          planned_qty: string
          progress: number
          realized_mix: number
          roi: string
          season: string
          sell_through: number | null
          showroom_approval: number | null
          status: string
          target_margin: string
          target_revenue: string
          target_sales: string
          updated_at: string
          year: number
        }
        Insert: {
          abc?: string
          avg_cost?: number | null
          avg_price?: number | null
          brand?: string
          created_at?: string
          created_by?: string | null
          external_key: string
          id?: string
          image?: string
          lead_time_dias?: number | null
          name: string
          planned_mix?: number
          planned_qty?: string
          progress?: number
          realized_mix?: number
          roi?: string
          season?: string
          sell_through?: number | null
          showroom_approval?: number | null
          status?: string
          target_margin?: string
          target_revenue?: string
          target_sales?: string
          updated_at?: string
          year?: number
        }
        Update: {
          abc?: string
          avg_cost?: number | null
          avg_price?: number | null
          brand?: string
          created_at?: string
          created_by?: string | null
          external_key?: string
          id?: string
          image?: string
          lead_time_dias?: number | null
          name?: string
          planned_mix?: number
          planned_qty?: string
          progress?: number
          realized_mix?: number
          roi?: string
          season?: string
          sell_through?: number | null
          showroom_approval?: number | null
          status?: string
          target_margin?: string
          target_revenue?: string
          target_sales?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      color_palettes: {
        Row: {
          brand: string
          colors: Json
          cover: string
          created_at: string
          created_by: string | null
          external_key: string
          id: string
          linked_refs: number
          mood: string
          name: string
          season: string
          status: string
          updated_at: string
          updated_on: string | null
        }
        Insert: {
          brand?: string
          colors?: Json
          cover?: string
          created_at?: string
          created_by?: string | null
          external_key: string
          id?: string
          linked_refs?: number
          mood?: string
          name: string
          season?: string
          status?: string
          updated_at?: string
          updated_on?: string | null
        }
        Update: {
          brand?: string
          colors?: Json
          cover?: string
          created_at?: string
          created_by?: string | null
          external_key?: string
          id?: string
          linked_refs?: number
          mood?: string
          name?: string
          season?: string
          status?: string
          updated_at?: string
          updated_on?: string | null
        }
        Relationships: []
      }
      comment_attachments: {
        Row: {
          comment_id: string
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          comment_id: string
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          comment_id?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_revisions: {
        Row: {
          comment_id: string
          edited_at: string
          edited_by: string | null
          id: string
          previous_attachments: Json
          previous_mentions: string[]
          previous_message: string
        }
        Insert: {
          comment_id: string
          edited_at?: string
          edited_by?: string | null
          id?: string
          previous_attachments?: Json
          previous_mentions?: string[]
          previous_message: string
        }
        Update: {
          comment_id?: string
          edited_at?: string
          edited_by?: string | null
          id?: string
          previous_attachments?: Json
          previous_mentions?: string[]
          previous_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_revisions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          created_at: string
          edited: boolean
          entity_id: string
          entity_type: string
          id: string
          mentions: string[]
          message: string
          updated_at: string
          user_avatar: string | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          created_at?: string
          edited?: boolean
          entity_id: string
          entity_type: string
          id?: string
          mentions?: string[]
          message: string
          updated_at?: string
          user_avatar?: string | null
          user_id?: string | null
          user_name: string
        }
        Update: {
          created_at?: string
          edited?: boolean
          entity_id?: string
          entity_type?: string
          id?: string
          mentions?: string[]
          message?: string
          updated_at?: string
          user_avatar?: string | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
      }
      configuration_routes: {
        Row: {
          configuration_id: string
          created_at: string
          id: string
          is_default: boolean
          route_id: string
        }
        Insert: {
          configuration_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          route_id: string
        }
        Update: {
          configuration_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          route_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuration_routes_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "product_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuration_routes_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "production_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_settings: {
        Row: {
          default_markup_pct: number
          default_overhead_pct: number
          id: boolean
          min_margin_pct: number
          updated_at: string
        }
        Insert: {
          default_markup_pct?: number
          default_overhead_pct?: number
          id?: boolean
          min_margin_pct?: number
          updated_at?: string
        }
        Update: {
          default_markup_pct?: number
          default_overhead_pct?: number
          id?: boolean
          min_margin_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          active: boolean
          city: string | null
          code: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          segment: string | null
          state: string | null
          tax_id: string | null
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          city?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          segment?: string | null
          state?: string | null
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          city?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          segment?: string | null
          state?: string | null
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      display_boards: {
        Row: {
          bg_color: string
          cover: string
          created_at: string
          created_by: string | null
          external_key: string
          id: string
          items: Json
          name: string
          season: string
          status: string
          target: string
          updated_at: string
          updated_on: string | null
        }
        Insert: {
          bg_color?: string
          cover?: string
          created_at?: string
          created_by?: string | null
          external_key: string
          id?: string
          items?: Json
          name: string
          season?: string
          status?: string
          target?: string
          updated_at?: string
          updated_on?: string | null
        }
        Update: {
          bg_color?: string
          cover?: string
          created_at?: string
          created_by?: string | null
          external_key?: string
          id?: string
          items?: Json
          name?: string
          season?: string
          status?: string
          target?: string
          updated_at?: string
          updated_on?: string | null
        }
        Relationships: []
      }
      entity_events: {
        Row: {
          actor: string | null
          actor_name: string | null
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          event_type: string
          from_status: string | null
          id: string
          note: string | null
          payload: Json
          to_status: string | null
        }
        Insert: {
          actor?: string | null
          actor_name?: string | null
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          event_type: string
          from_status?: string | null
          id?: string
          note?: string | null
          payload?: Json
          to_status?: string | null
        }
        Update: {
          actor?: string | null
          actor_name?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          event_type?: string
          from_status?: string | null
          id?: string
          note?: string | null
          payload?: Json
          to_status?: string | null
        }
        Relationships: []
      }
      entity_relations: {
        Row: {
          created_at: string
          created_by: string | null
          from_id: string
          from_type: Database["public"]["Enums"]["entity_type"]
          id: string
          metadata: Json
          relation: string
          to_external_id: string | null
          to_id: string | null
          to_type: Database["public"]["Enums"]["entity_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_id: string
          from_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          metadata?: Json
          relation: string
          to_external_id?: string | null
          to_id?: string | null
          to_type: Database["public"]["Enums"]["entity_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_id?: string
          from_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          metadata?: Json
          relation?: string
          to_external_id?: string | null
          to_id?: string | null
          to_type?: Database["public"]["Enums"]["entity_type"]
        }
        Relationships: []
      }
      influencers: {
        Row: {
          created_at: string
          created_by: string | null
          custo_medio: number
          envios: Json
          handle: string
          id: string
          nome: string
          perfil: string | null
          regiao: string | null
          segmento: string | null
          seguidores: number
          uf: string | null
          updated_at: string
          vendas_geradas: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custo_medio?: number
          envios?: Json
          handle: string
          id?: string
          nome: string
          perfil?: string | null
          regiao?: string | null
          segmento?: string | null
          seguidores?: number
          uf?: string | null
          updated_at?: string
          vendas_geradas?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custo_medio?: number
          envios?: Json
          handle?: string
          id?: string
          nome?: string
          perfil?: string | null
          regiao?: string | null
          segmento?: string | null
          seguidores?: number
          uf?: string | null
          updated_at?: string
          vendas_geradas?: number
        }
        Relationships: []
      }
      launch_channel_target: {
        Row: {
          canal: string
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          meta_unidades: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canal: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          meta_unidades?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canal?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          meta_unidades?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_channel_target_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "launch_item"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_handoff: {
        Row: {
          created_at: string
          created_by: string | null
          destino: string
          erp_id: string | null
          erp_source: string | null
          error: string | null
          id: string
          idempotency_key: string
          payload_hash: string
          synced_at: string | null
          updated_at: string
          updated_by: string | null
          wave_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destino: string
          erp_id?: string | null
          erp_source?: string | null
          error?: string | null
          id?: string
          idempotency_key: string
          payload_hash: string
          synced_at?: string | null
          updated_at?: string
          updated_by?: string | null
          wave_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destino?: string
          erp_id?: string | null
          erp_source?: string | null
          error?: string | null
          id?: string
          idempotency_key?: string
          payload_hash?: string
          synced_at?: string | null
          updated_at?: string
          updated_by?: string | null
          wave_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_handoff_wave_id_fkey"
            columns: ["wave_id"]
            isOneToOne: false
            referencedRelation: "launch_wave"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_item: {
        Row: {
          created_at: string
          created_by: string | null
          erp_sku_ref: string | null
          erp_source: string | null
          erp_synced_at: string | null
          id: string
          meta_unidades: number
          notas: string | null
          prioridade: number
          reference_id: string
          showroom_decision_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
          wave_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          erp_sku_ref?: string | null
          erp_source?: string | null
          erp_synced_at?: string | null
          id?: string
          meta_unidades?: number
          notas?: string | null
          prioridade?: number
          reference_id: string
          showroom_decision_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          wave_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          erp_sku_ref?: string | null
          erp_source?: string | null
          erp_synced_at?: string | null
          id?: string
          meta_unidades?: number
          notas?: string | null
          prioridade?: number
          reference_id?: string
          showroom_decision_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          wave_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_item_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_item_showroom_decision_id_fkey"
            columns: ["showroom_decision_id"]
            isOneToOne: false
            referencedRelation: "showroom_decision"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_item_wave_id_fkey"
            columns: ["wave_id"]
            isOneToOne: false
            referencedRelation: "launch_wave"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_item_grade: {
        Row: {
          cor: string
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          quantidade: number
          tamanho: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cor: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          quantidade?: number
          tamanho: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cor?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          quantidade?: number
          tamanho?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_item_grade_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "launch_item"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_wave: {
        Row: {
          codigo: string
          colecao: string
          created_at: string
          created_by: string | null
          id: string
          janela_fim: string
          janela_inicio: string
          notas: string | null
          responsavel_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          codigo: string
          colecao: string
          created_at?: string
          created_by?: string | null
          id?: string
          janela_fim: string
          janela_inicio: string
          notas?: string | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          codigo?: string
          colecao?: string
          created_at?: string
          created_by?: string | null
          id?: string
          janela_fim?: string
          janela_inicio?: string
          notas?: string | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      looks: {
        Row: {
          cover_color: string
          created_at: string
          created_by: string | null
          created_on: string | null
          external_key: string
          id: string
          items: Json
          name: string
          occasion: string
          season: string
          status: string
          styling_notes: string
          tags: Json
          updated_at: string
          updated_on: string | null
        }
        Insert: {
          cover_color?: string
          created_at?: string
          created_by?: string | null
          created_on?: string | null
          external_key: string
          id?: string
          items?: Json
          name: string
          occasion?: string
          season?: string
          status?: string
          styling_notes?: string
          tags?: Json
          updated_at?: string
          updated_on?: string | null
        }
        Update: {
          cover_color?: string
          created_at?: string
          created_by?: string | null
          created_on?: string | null
          external_key?: string
          id?: string
          items?: Json
          name?: string
          occasion?: string
          season?: string
          status?: string
          styling_notes?: string
          tags?: Json
          updated_at?: string
          updated_on?: string | null
        }
        Relationships: []
      }
      marketing_influencers: {
        Row: {
          created_at: string
          created_by: string | null
          custo_medio: number
          envios: Json
          external_key: string
          handle: string
          id: string
          nome: string
          perfil: string
          regiao: string
          segmento: string
          seguidores: number
          uf: string
          updated_at: string
          vendas_geradas: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custo_medio?: number
          envios?: Json
          external_key: string
          handle?: string
          id?: string
          nome: string
          perfil?: string
          regiao?: string
          segmento?: string
          seguidores?: number
          uf?: string
          updated_at?: string
          vendas_geradas?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custo_medio?: number
          envios?: Json
          external_key?: string
          handle?: string
          id?: string
          nome?: string
          perfil?: string
          regiao?: string
          segmento?: string
          seguidores?: number
          uf?: string
          updated_at?: string
          vendas_geradas?: number
        }
        Relationships: []
      }
      materials: {
        Row: {
          created_at: string
          created_by: string | null
          external_key: string
          id: string
          material_type: string
          name: string
          notes: string
          sku: string
          supplier: string
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          external_key: string
          id?: string
          material_type?: string
          name: string
          notes?: string
          sku?: string
          supplier?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          external_key?: string
          id?: string
          material_type?: string
          name?: string
          notes?: string
          sku?: string
          supplier?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      measurement_charts: {
        Row: {
          brand: string | null
          category: string
          code: string
          created_at: string
          created_by: string | null
          external_key: string
          fit: string | null
          grade: Json
          id: string
          linked_refs: number
          name: string
          notes: string | null
          points: Json
          segment: string
          status: string
          unit: string
          updated_at: string
          updated_by: string
          updated_on: string | null
        }
        Insert: {
          brand?: string | null
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          external_key: string
          fit?: string | null
          grade?: Json
          id?: string
          linked_refs?: number
          name: string
          notes?: string | null
          points?: Json
          segment?: string
          status?: string
          unit?: string
          updated_at?: string
          updated_by?: string
          updated_on?: string | null
        }
        Update: {
          brand?: string | null
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          external_key?: string
          fit?: string | null
          grade?: Json
          id?: string
          linked_refs?: number
          name?: string
          notes?: string | null
          points?: Json
          segment?: string
          status?: string
          unit?: string
          updated_at?: string
          updated_by?: string
          updated_on?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          detail: string | null
          external_id: string
          href: string | null
          id: string
          read_at: string | null
          severity: string
          source: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          external_id: string
          href?: string | null
          id?: string
          read_at?: string | null
          severity: string
          source?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          external_id?: string
          href?: string | null
          id?: string
          read_at?: string | null
          severity?: string
          source?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      official_models: {
        Row: {
          ativa: boolean
          categoria: string | null
          colecao: string | null
          created_at: string
          created_by: string | null
          detalhes: string | null
          id: string
          medidas: Json
          nome: string
          sketch_path: string | null
          tamanho_base: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          categoria?: string | null
          colecao?: string | null
          created_at?: string
          created_by?: string | null
          detalhes?: string | null
          id?: string
          medidas?: Json
          nome: string
          sketch_path?: string | null
          tamanho_base?: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          categoria?: string | null
          colecao?: string | null
          created_at?: string
          created_by?: string | null
          detalhes?: string | null
          id?: string
          medidas?: Json
          nome?: string
          sketch_path?: string | null
          tamanho_base?: string
          updated_at?: string
        }
        Relationships: []
      }
      pcp_lots: {
        Row: {
          code: string
          collection: string | null
          created_at: string
          created_by: string | null
          current_stage: string | null
          due_date: string | null
          id: string
          metadata: Json
          model: string
          priority: Database["public"]["Enums"]["lot_priority"]
          progress_percent: number
          quantity: number
          responsible_id: string | null
          status: Database["public"]["Enums"]["lot_status"]
          updated_at: string
        }
        Insert: {
          code: string
          collection?: string | null
          created_at?: string
          created_by?: string | null
          current_stage?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json
          model: string
          priority?: Database["public"]["Enums"]["lot_priority"]
          progress_percent?: number
          quantity?: number
          responsible_id?: string | null
          status?: Database["public"]["Enums"]["lot_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          collection?: string | null
          created_at?: string
          created_by?: string | null
          current_stage?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json
          model?: string
          priority?: Database["public"]["Enums"]["lot_priority"]
          progress_percent?: number
          quantity?: number
          responsible_id?: string | null
          status?: Database["public"]["Enums"]["lot_status"]
          updated_at?: string
        }
        Relationships: []
      }
      pcp_occurrences: {
        Row: {
          created_at: string
          description: string
          id: string
          lot_id: string | null
          reported_by: string | null
          resolved_at: string | null
          sector: string | null
          severity: Database["public"]["Enums"]["occurrence_severity"]
          status: Database["public"]["Enums"]["occurrence_status"]
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          lot_id?: string | null
          reported_by?: string | null
          resolved_at?: string | null
          sector?: string | null
          severity?: Database["public"]["Enums"]["occurrence_severity"]
          status?: Database["public"]["Enums"]["occurrence_status"]
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          lot_id?: string | null
          reported_by?: string | null
          resolved_at?: string | null
          sector?: string | null
          severity?: Database["public"]["Enums"]["occurrence_severity"]
          status?: Database["public"]["Enums"]["occurrence_status"]
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pcp_occurrences_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "pcp_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      pilotos: {
        Row: {
          created_at: string
          created_by: string | null
          foto_url: string | null
          id: string
          observacoes: string | null
          reference_id: string
          rodada: number
          status: string
          supplier_id: string | null
          tech_sheet_id: string | null
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          foto_url?: string | null
          id?: string
          observacoes?: string | null
          reference_id: string
          rodada?: number
          status?: string
          supplier_id?: string | null
          tech_sheet_id?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          foto_url?: string | null
          id?: string
          observacoes?: string | null
          reference_id?: string
          rodada?: number
          status?: string
          supplier_id?: string | null
          tech_sheet_id?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pilotos_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilotos_tech_sheet_id_fkey"
            columns: ["tech_sheet_id"]
            isOneToOne: false
            referencedRelation: "tech_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      print_assets: {
        Row: {
          brand: string | null
          code: string
          color_count: number
          colors: Json
          cover: string
          created_at: string
          created_by: string | null
          external_key: string
          file_format: string
          file_size_mb: number | null
          id: string
          linked_refs: number
          name: string
          repeat_cm: Json
          season: string | null
          status: string
          supplier: string | null
          tags: Json
          tecnica: string
          updated_at: string
          updated_on: string | null
          versions: Json
        }
        Insert: {
          brand?: string | null
          code?: string
          color_count?: number
          colors?: Json
          cover?: string
          created_at?: string
          created_by?: string | null
          external_key: string
          file_format?: string
          file_size_mb?: number | null
          id?: string
          linked_refs?: number
          name: string
          repeat_cm?: Json
          season?: string | null
          status?: string
          supplier?: string | null
          tags?: Json
          tecnica?: string
          updated_at?: string
          updated_on?: string | null
          versions?: Json
        }
        Update: {
          brand?: string | null
          code?: string
          color_count?: number
          colors?: Json
          cover?: string
          created_at?: string
          created_by?: string | null
          external_key?: string
          file_format?: string
          file_size_mb?: number | null
          id?: string
          linked_refs?: number
          name?: string
          repeat_cm?: Json
          season?: string | null
          status?: string
          supplier?: string | null
          tags?: Json
          tecnica?: string
          updated_at?: string
          updated_on?: string | null
          versions?: Json
        }
        Relationships: []
      }
      product_configurations: {
        Row: {
          active: boolean
          base_product: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          base_product: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          base_product?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      production_item_step_balance: {
        Row: {
          item_id: string
          quantity: number
          step_id: string
          updated_at: string
        }
        Insert: {
          item_id: string
          quantity?: number
          step_id: string
          updated_at?: string
        }
        Update: {
          item_id?: string
          quantity?: number
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_item_step_balance_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "production_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_item_step_balance_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "production_route_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      production_order_items: {
        Row: {
          color: string | null
          configuration_id: string | null
          created_at: string
          id: string
          production_order_id: string
          quantity_lost: number
          quantity_planned: number
          quantity_produced: number
          reference_code: string
          reference_name: string | null
          route_id: string
          route_override_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          configuration_id?: string | null
          created_at?: string
          id?: string
          production_order_id: string
          quantity_lost?: number
          quantity_planned: number
          quantity_produced?: number
          reference_code: string
          reference_name?: string | null
          route_id: string
          route_override_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          configuration_id?: string | null
          created_at?: string
          id?: string
          production_order_id?: string
          quantity_lost?: number
          quantity_planned?: number
          quantity_produced?: number
          reference_code?: string
          reference_name?: string | null
          route_id?: string
          route_override_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_order_items_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "product_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_items_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_items_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "production_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      production_orders: {
        Row: {
          created_at: string
          created_by: string | null
          erp_op_id: string | null
          id: string
          notes: string | null
          number: string
          planned_end: string | null
          planned_start: string | null
          priority: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          erp_op_id?: string | null
          id?: string
          notes?: string | null
          number: string
          planned_end?: string | null
          planned_start?: string | null
          priority?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          erp_op_id?: string | null
          id?: string
          notes?: string | null
          number?: string
          planned_end?: string | null
          planned_start?: string | null
          priority?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      production_passages: {
        Row: {
          batch_id: string
          created_at: string
          destination_step_id: string | null
          id: string
          observation: string | null
          origin_step_id: string | null
          production_order_id: string
          production_order_item_id: string
          quantity: number
          responsible_id: string | null
          responsible_name: string | null
          route_id: string
          type: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          destination_step_id?: string | null
          id?: string
          observation?: string | null
          origin_step_id?: string | null
          production_order_id: string
          production_order_item_id: string
          quantity: number
          responsible_id?: string | null
          responsible_name?: string | null
          route_id: string
          type: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          destination_step_id?: string | null
          id?: string
          observation?: string | null
          origin_step_id?: string | null
          production_order_id?: string
          production_order_item_id?: string
          quantity?: number
          responsible_id?: string | null
          responsible_name?: string | null
          route_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_passages_destination_step_id_fkey"
            columns: ["destination_step_id"]
            isOneToOne: false
            referencedRelation: "production_route_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_passages_origin_step_id_fkey"
            columns: ["origin_step_id"]
            isOneToOne: false
            referencedRelation: "production_route_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_passages_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_passages_production_order_item_id_fkey"
            columns: ["production_order_item_id"]
            isOneToOne: false
            referencedRelation: "production_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_passages_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "production_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      production_route_steps: {
        Row: {
          created_at: string
          id: string
          mandatory: boolean
          operation: string
          outsourced: boolean
          route_id: string
          sector: string
          sequence: number
        }
        Insert: {
          created_at?: string
          id?: string
          mandatory?: boolean
          operation: string
          outsourced?: boolean
          route_id: string
          sector: string
          sequence: number
        }
        Update: {
          created_at?: string
          id?: string
          mandatory?: boolean
          operation?: string
          outsourced?: boolean
          route_id?: string
          sector?: string
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_route_steps_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "production_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      production_routes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          job_title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          job_title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quality_capa: {
        Row: {
          acao_corretiva: string | null
          acao_imediata: string | null
          acao_preventiva: string | null
          causa_raiz: string | null
          cinco_porques: Json
          created_at: string
          created_by: string | null
          criada: string
          defeito: string
          eficacia: string | null
          evidencias: Json
          fornecedor: string | null
          id: string
          lote: string | null
          prazo: string | null
          ref: string | null
          reincidencia_de: string | null
          responsavel: string
          setor: string
          severidade: string
          status: string
          tipo: string
          updated_at: string
          verificado_em: string | null
          verificado_por: string | null
        }
        Insert: {
          acao_corretiva?: string | null
          acao_imediata?: string | null
          acao_preventiva?: string | null
          causa_raiz?: string | null
          cinco_porques?: Json
          created_at?: string
          created_by?: string | null
          criada?: string
          defeito: string
          eficacia?: string | null
          evidencias?: Json
          fornecedor?: string | null
          id?: string
          lote?: string | null
          prazo?: string | null
          ref?: string | null
          reincidencia_de?: string | null
          responsavel: string
          setor: string
          severidade?: string
          status?: string
          tipo: string
          updated_at?: string
          verificado_em?: string | null
          verificado_por?: string | null
        }
        Update: {
          acao_corretiva?: string | null
          acao_imediata?: string | null
          acao_preventiva?: string | null
          causa_raiz?: string | null
          cinco_porques?: Json
          created_at?: string
          created_by?: string | null
          criada?: string
          defeito?: string
          eficacia?: string | null
          evidencias?: Json
          fornecedor?: string | null
          id?: string
          lote?: string | null
          prazo?: string | null
          ref?: string | null
          reincidencia_de?: string | null
          responsavel?: string
          setor?: string
          severidade?: string
          status?: string
          tipo?: string
          updated_at?: string
          verificado_em?: string | null
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_capa_reincidencia_de_fkey"
            columns: ["reincidencia_de"]
            isOneToOne: false
            referencedRelation: "quality_capa"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_capa_actions: {
        Row: {
          created_at: string
          created_by: string | null
          criada: string
          defeito: string
          external_key: string
          fornecedor: string | null
          id: string
          lote: string | null
          prazo: string
          ref: string | null
          responsavel: string
          setor: string
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          criada?: string
          defeito: string
          external_key: string
          fornecedor?: string | null
          id?: string
          lote?: string | null
          prazo?: string
          ref?: string | null
          responsavel?: string
          setor?: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          criada?: string
          defeito?: string
          external_key?: string
          fornecedor?: string | null
          id?: string
          lote?: string | null
          prazo?: string
          ref?: string | null
          responsavel?: string
          setor?: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      reference_gate: {
        Row: {
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          due_date: string | null
          gate: string
          id: string
          parecer: string | null
          reference_id: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          due_date?: string | null
          gate: string
          id?: string
          parecer?: string | null
          reference_id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          due_date?: string | null
          gate?: string
          id?: string
          parecer?: string | null
          reference_id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_gate_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_transitions: {
        Row: {
          created_at: string
          from_status: Database["public"]["Enums"]["reference_status"]
          id: string
          is_active: boolean
          requires_checklist: Json
          requires_role: string | null
          to_status: Database["public"]["Enums"]["reference_status"]
        }
        Insert: {
          created_at?: string
          from_status: Database["public"]["Enums"]["reference_status"]
          id?: string
          is_active?: boolean
          requires_checklist?: Json
          requires_role?: string | null
          to_status: Database["public"]["Enums"]["reference_status"]
        }
        Update: {
          created_at?: string
          from_status?: Database["public"]["Enums"]["reference_status"]
          id?: string
          is_active?: boolean
          requires_checklist?: Json
          requires_role?: string | null
          to_status?: Database["public"]["Enums"]["reference_status"]
        }
        Relationships: []
      }
      references: {
        Row: {
          code: string
          collection_id: string | null
          created_at: string
          created_by: string | null
          designer_id: string | null
          erp_product_id: string | null
          id: string
          image_url: string | null
          line: string | null
          metadata: Json
          modelista_id: string | null
          name: string
          priority: Database["public"]["Enums"]["reference_priority"]
          season: string | null
          status: Database["public"]["Enums"]["reference_status"]
          target_cost: number | null
          target_price: number | null
          theme: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          collection_id?: string | null
          created_at?: string
          created_by?: string | null
          designer_id?: string | null
          erp_product_id?: string | null
          id?: string
          image_url?: string | null
          line?: string | null
          metadata?: Json
          modelista_id?: string | null
          name: string
          priority?: Database["public"]["Enums"]["reference_priority"]
          season?: string | null
          status?: Database["public"]["Enums"]["reference_status"]
          target_cost?: number | null
          target_price?: number | null
          theme?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          collection_id?: string | null
          created_at?: string
          created_by?: string | null
          designer_id?: string | null
          erp_product_id?: string | null
          id?: string
          image_url?: string | null
          line?: string | null
          metadata?: Json
          modelista_id?: string | null
          name?: string
          priority?: Database["public"]["Enums"]["reference_priority"]
          season?: string | null
          status?: Database["public"]["Enums"]["reference_status"]
          target_cost?: number | null
          target_price?: number | null
          theme?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sales_order_item_costs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          detailed_at: string | null
          detailed_by: string | null
          industrial_cost: number
          item_id: string
          margin_pct: number | null
          materials_total: number
          notes: string | null
          operations_total: number
          overhead_pct: number
          setup_total: number
          status: string
          suggested_price: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          detailed_at?: string | null
          detailed_by?: string | null
          industrial_cost?: number
          item_id: string
          margin_pct?: number | null
          materials_total?: number
          notes?: string | null
          operations_total?: number
          overhead_pct?: number
          setup_total?: number
          status?: string
          suggested_price?: number
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          detailed_at?: string | null
          detailed_by?: string | null
          industrial_cost?: number
          item_id?: string
          margin_pct?: number | null
          materials_total?: number
          notes?: string | null
          operations_total?: number
          overhead_pct?: number
          setup_total?: number
          status?: string
          suggested_price?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_item_costs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "sales_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_item_materials: {
        Row: {
          consumption: number
          created_at: string
          id: string
          item_id: string
          kind: string
          material: string
          material_id: string | null
          notes: string | null
          source: string
          total_cost: number | null
          unit: string
          unit_cost: number
          waste_pct: number
        }
        Insert: {
          consumption?: number
          created_at?: string
          id?: string
          item_id: string
          kind?: string
          material: string
          material_id?: string | null
          notes?: string | null
          source?: string
          total_cost?: number | null
          unit?: string
          unit_cost?: number
          waste_pct?: number
        }
        Update: {
          consumption?: number
          created_at?: string
          id?: string
          item_id?: string
          kind?: string
          material?: string
          material_id?: string | null
          notes?: string | null
          source?: string
          total_cost?: number | null
          unit?: string
          unit_cost?: number
          waste_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_item_materials_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sales_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_item_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_item_operations: {
        Row: {
          created_at: string
          created_by: string | null
          driver: string
          driver_qty: number
          id: string
          item_id: string
          notes: string | null
          operation: string
          option_id: string | null
          outsourced: boolean
          sector: string
          seq: number
          setup_cost: number
          source: string
          supplier_id: string | null
          total_cost: number | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          driver?: string
          driver_qty?: number
          id?: string
          item_id: string
          notes?: string | null
          operation: string
          option_id?: string | null
          outsourced?: boolean
          sector: string
          seq?: number
          setup_cost?: number
          source?: string
          supplier_id?: string | null
          total_cost?: number | null
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          driver?: string
          driver_qty?: number
          id?: string
          item_id?: string
          notes?: string | null
          operation?: string
          option_id?: string | null
          outsourced?: boolean
          sector?: string
          seq?: number
          setup_cost?: number
          source?: string
          supplier_id?: string | null
          total_cost?: number | null
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_item_operations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sales_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_item_operations_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "catalog_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_item_operations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_item_options: {
        Row: {
          id: string
          item_id: string
          notes: string | null
          option_id: string
          quantity: number
          spec: Json
        }
        Insert: {
          id?: string
          item_id: string
          notes?: string | null
          option_id: string
          quantity?: number
          spec?: Json
        }
        Update: {
          id?: string
          item_id?: string
          notes?: string | null
          option_id?: string
          quantity?: number
          spec?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_item_options_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sales_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_item_options_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "catalog_options"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_item_sizes: {
        Row: {
          item_id: string
          quantity: number
          size: string
        }
        Insert: {
          item_id: string
          quantity?: number
          size: string
        }
        Update: {
          item_id?: string
          quantity?: number
          size?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_item_sizes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "sales_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          catalog_product_id: string
          color: string | null
          cost_status: string
          created_at: string
          description: string
          id: string
          line_no: number
          notes: string | null
          order_id: string
          price_locked: boolean
          production_order_item_id: string | null
          quantity: number
          reference_code: string | null
          tech_status: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          catalog_product_id: string
          color?: string | null
          cost_status?: string
          created_at?: string
          description: string
          id?: string
          line_no?: number
          notes?: string | null
          order_id: string
          price_locked?: boolean
          production_order_item_id?: string | null
          quantity: number
          reference_code?: string | null
          tech_status?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          catalog_product_id?: string
          color?: string | null
          cost_status?: string
          created_at?: string
          description?: string
          id?: string
          line_no?: number
          notes?: string | null
          order_id?: string
          price_locked?: boolean
          production_order_item_id?: string | null
          quantity?: number
          reference_code?: string | null
          tech_status?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_catalog_product_id_fkey"
            columns: ["catalog_product_id"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          approved_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          due_date: string | null
          id: string
          is_quote: boolean
          notes: string | null
          number: string
          payment_terms: string | null
          quote_valid_until: string | null
          released_at: string | null
          seller_id: string | null
          status: string
          submitted_at: string | null
          total_value: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          due_date?: string | null
          id?: string
          is_quote?: boolean
          notes?: string | null
          number: string
          payment_terms?: string | null
          quote_valid_until?: string | null
          released_at?: string | null
          seller_id?: string | null
          status?: string
          submitted_at?: string | null
          total_value?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          due_date?: string | null
          id?: string
          is_quote?: boolean
          notes?: string | null
          number?: string
          payment_terms?: string | null
          quote_valid_until?: string | null
          released_at?: string | null
          seller_id?: string | null
          status?: string
          submitted_at?: string | null
          total_value?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      showroom_decision: {
        Row: {
          created_at: string
          created_by: string | null
          decidido_em: string | null
          decidido_por: string | null
          decision: string
          id: string
          justificativa: string | null
          publication_id: string | null
          reference_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decidido_em?: string | null
          decidido_por?: string | null
          decision?: string
          id?: string
          justificativa?: string | null
          publication_id?: string | null
          reference_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decidido_em?: string | null
          decidido_por?: string | null
          decision?: string
          id?: string
          justificativa?: string | null
          publication_id?: string | null
          reference_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "showroom_decision_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "showroom_publication"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showroom_decision_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references"
            referencedColumns: ["id"]
          },
        ]
      }
      showroom_feedback: {
        Row: {
          autor_id: string | null
          autor_nome: string | null
          autor_tipo: string
          comentario: string | null
          created_at: string
          dimensao: string
          id: string
          kit_id: string | null
          metadata: Json
          nota: number
          publication_id: string | null
          reference_id: string
          rota: string | null
        }
        Insert: {
          autor_id?: string | null
          autor_nome?: string | null
          autor_tipo?: string
          comentario?: string | null
          created_at?: string
          dimensao: string
          id?: string
          kit_id?: string | null
          metadata?: Json
          nota: number
          publication_id?: string | null
          reference_id: string
          rota?: string | null
        }
        Update: {
          autor_id?: string | null
          autor_nome?: string | null
          autor_tipo?: string
          comentario?: string | null
          created_at?: string
          dimensao?: string
          id?: string
          kit_id?: string | null
          metadata?: Json
          nota?: number
          publication_id?: string | null
          reference_id?: string
          rota?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "showroom_feedback_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "showroom_kit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showroom_feedback_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "showroom_publication"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showroom_feedback_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references"
            referencedColumns: ["id"]
          },
        ]
      }
      showroom_kit: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          nome: string
          periodo_fim: string | null
          periodo_inicio: string | null
          responsavel_id: string | null
          rota: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          nome: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          responsavel_id?: string | null
          rota: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          nome?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          responsavel_id?: string | null
          rota?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      showroom_kit_item: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kit_id: string
          observacao: string | null
          posicao: number | null
          sample_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kit_id: string
          observacao?: string | null
          posicao?: number | null
          sample_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kit_id?: string
          observacao?: string | null
          posicao?: number | null
          sample_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "showroom_kit_item_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "showroom_kit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showroom_kit_item_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "showroom_sample"
            referencedColumns: ["id"]
          },
        ]
      }
      showroom_publication: {
        Row: {
          colecao: string | null
          created_at: string
          created_by: string | null
          frozen_at: string | null
          id: string
          metadata: Json
          published_at: string | null
          published_by: string | null
          reference_ids: string[]
          status: string
          storytelling: string | null
          titulo: string
          updated_at: string
          updated_by: string | null
          versao: number
        }
        Insert: {
          colecao?: string | null
          created_at?: string
          created_by?: string | null
          frozen_at?: string | null
          id?: string
          metadata?: Json
          published_at?: string | null
          published_by?: string | null
          reference_ids?: string[]
          status?: string
          storytelling?: string | null
          titulo: string
          updated_at?: string
          updated_by?: string | null
          versao?: number
        }
        Update: {
          colecao?: string | null
          created_at?: string
          created_by?: string | null
          frozen_at?: string | null
          id?: string
          metadata?: Json
          published_at?: string | null
          published_by?: string | null
          reference_ids?: string[]
          status?: string
          storytelling?: string | null
          titulo?: string
          updated_at?: string
          updated_by?: string | null
          versao?: number
        }
        Relationships: []
      }
      showroom_sample: {
        Row: {
          cor: string | null
          created_at: string
          created_by: string | null
          evidencias: Json
          grade: string | null
          id: string
          metadata: Json
          motivo: string | null
          piloto_id: string | null
          posse_logica: string | null
          quantidade: number
          reference_id: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cor?: string | null
          created_at?: string
          created_by?: string | null
          evidencias?: Json
          grade?: string | null
          id?: string
          metadata?: Json
          motivo?: string | null
          piloto_id?: string | null
          posse_logica?: string | null
          quantidade?: number
          reference_id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cor?: string | null
          created_at?: string
          created_by?: string | null
          evidencias?: Json
          grade?: string | null
          id?: string
          metadata?: Json
          motivo?: string | null
          piloto_id?: string | null
          posse_logica?: string | null
          quantidade?: number
          reference_id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "showroom_sample_piloto_id_fkey"
            columns: ["piloto_id"]
            isOneToOne: false
            referencedRelation: "pilotos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showroom_sample_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_item: {
        Row: {
          abc_class: Database["public"]["Enums"]["abc_class"] | null
          annual_qty: number
          annual_revenue: number
          category: Database["public"]["Enums"]["stock_item_category"]
          code: string
          coverage_days_min: number
          created_at: string
          created_by: string
          demand_avg_daily: number
          demand_stddev: number
          eoq: number
          holding_cost_unit: number
          id: string
          is_active: boolean
          lead_time_days: number
          max_qty: number
          min_qty: number
          name: string
          notes: string | null
          order_cost: number
          reorder_point: number
          safety_stock: number
          service_factor: number
          supplier_default: string | null
          unit: string
          unit_price: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          abc_class?: Database["public"]["Enums"]["abc_class"] | null
          annual_qty?: number
          annual_revenue?: number
          category?: Database["public"]["Enums"]["stock_item_category"]
          code: string
          coverage_days_min?: number
          created_at?: string
          created_by?: string
          demand_avg_daily?: number
          demand_stddev?: number
          eoq?: number
          holding_cost_unit?: number
          id?: string
          is_active?: boolean
          lead_time_days?: number
          max_qty?: number
          min_qty?: number
          name: string
          notes?: string | null
          order_cost?: number
          reorder_point?: number
          safety_stock?: number
          service_factor?: number
          supplier_default?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          abc_class?: Database["public"]["Enums"]["abc_class"] | null
          annual_qty?: number
          annual_revenue?: number
          category?: Database["public"]["Enums"]["stock_item_category"]
          code?: string
          coverage_days_min?: number
          created_at?: string
          created_by?: string
          demand_avg_daily?: number
          demand_stddev?: number
          eoq?: number
          holding_cost_unit?: number
          id?: string
          is_active?: boolean
          lead_time_days?: number
          max_qty?: number
          min_qty?: number
          name?: string
          notes?: string | null
          order_cost?: number
          reorder_point?: number
          safety_stock?: number
          service_factor?: number
          supplier_default?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      stock_movement: {
        Row: {
          created_at: string
          created_by: string
          id: string
          item_id: string
          justification: string | null
          kind: Database["public"]["Enums"]["stock_movement_kind"]
          lot_code: string | null
          qty: number
          ref_id: string | null
          ref_type: string | null
          transfer_pair_id: string | null
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          item_id: string
          justification?: string | null
          kind: Database["public"]["Enums"]["stock_movement_kind"]
          lot_code?: string | null
          qty: number
          ref_id?: string | null
          ref_type?: string | null
          transfer_pair_id?: string | null
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          item_id?: string
          justification?: string | null
          kind?: Database["public"]["Enums"]["stock_movement_kind"]
          lot_code?: string | null
          qty?: number
          ref_id?: string | null
          ref_type?: string | null
          transfer_pair_id?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movement_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_balance"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_movement_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movement_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_balance"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "stock_movement_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_reservation: {
        Row: {
          cancelled_at: string | null
          consumed_at: string | null
          created_at: string
          created_by: string
          id: string
          item_id: string
          notes: string | null
          qty: number
          ref_id: string
          ref_type: string
          status: Database["public"]["Enums"]["stock_reservation_status"]
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          cancelled_at?: string | null
          consumed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          item_id: string
          notes?: string | null
          qty: number
          ref_id: string
          ref_type: string
          status?: Database["public"]["Enums"]["stock_reservation_status"]
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          cancelled_at?: string | null
          consumed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          item_id?: string
          notes?: string | null
          qty?: number
          ref_id?: string
          ref_type?: string
          status?: Database["public"]["Enums"]["stock_reservation_status"]
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_reservation_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_balance"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_reservation_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservation_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_balance"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "stock_reservation_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_orders: {
        Row: {
          codigo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          observacoes: string | null
          prazo: string | null
          quantidade: number
          reference_id: string | null
          status: string
          supplier_id: string
          supplier_responded_at: string | null
          supplier_response: string | null
          unidade: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          codigo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          prazo?: string | null
          quantidade?: number
          reference_id?: string | null
          status?: string
          supplier_id: string
          supplier_responded_at?: string | null
          supplier_response?: string | null
          unidade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          prazo?: string | null
          quantidade?: number
          reference_id?: string | null
          status?: string
          supplier_id?: string
          supplier_responded_at?: string | null
          supplier_response?: string | null
          unidade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_orders_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_sample_submissions: {
        Row: {
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          decision: string
          decision_note: string | null
          fotos: Json
          id: string
          observacoes: string | null
          supplier_id: string
          supplier_order_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          decision_note?: string | null
          fotos?: Json
          id?: string
          observacoes?: string | null
          supplier_id: string
          supplier_order_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          decision_note?: string | null
          fotos?: Json
          id?: string
          observacoes?: string | null
          supplier_id?: string
          supplier_order_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_sample_submissions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_sample_submissions_supplier_order_id_fkey"
            columns: ["supplier_order_id"]
            isOneToOne: false
            referencedRelation: "supplier_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_users: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          supplier_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          supplier_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          supplier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_users_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          cidade: string | null
          cnpj: string | null
          code: string
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          status: string
          tipo: string
          uf: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cidade?: string | null
          cnpj?: string | null
          code: string
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: string
          tipo?: string
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cidade?: string | null
          cnpj?: string | null
          code?: string
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: string
          tipo?: string
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tech_sheets: {
        Row: {
          bom: Json
          bop: Json
          created_at: string
          created_by: string | null
          id: string
          ref: string
          updated_at: string
          versoes: Json
        }
        Insert: {
          bom?: Json
          bop?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          ref: string
          updated_at?: string
          versoes?: Json
        }
        Update: {
          bom?: Json
          bop?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          ref?: string
          updated_at?: string
          versoes?: Json
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
      warehouse: {
        Row: {
          code: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          type: Database["public"]["Enums"]["warehouse_type"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          type?: Database["public"]["Enums"]["warehouse_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          type?: Database["public"]["Enums"]["warehouse_type"]
          updated_at?: string
        }
        Relationships: []
      }
      workflow_definitions: {
        Row: {
          created_at: string
          entity_type: string
          from_status: string
          id: string
          is_active: boolean
          requires_checklist: Json
          requires_role: string | null
          sla_hours: number | null
          to_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          from_status: string
          id?: string
          is_active?: boolean
          requires_checklist?: Json
          requires_role?: string | null
          sla_hours?: number | null
          to_status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          from_status?: string
          id?: string
          is_active?: boolean
          requires_checklist?: Json
          requires_role?: string | null
          sla_hours?: number | null
          to_status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      stock_balance: {
        Row: {
          item_code: string | null
          item_id: string | null
          item_name: string | null
          qty_on_hand: number | null
          qty_reserved: number | null
          warehouse_code: string | null
          warehouse_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_sales_order_item: {
        Args: { _item_id: string; _note?: string }
        Returns: undefined
      }
      calc_stock_params_row: {
        Args: { _row: Database["public"]["Tables"]["stock_item"]["Row"] }
        Returns: {
          abc_class: Database["public"]["Enums"]["abc_class"] | null
          annual_qty: number
          annual_revenue: number
          category: Database["public"]["Enums"]["stock_item_category"]
          code: string
          coverage_days_min: number
          created_at: string
          created_by: string
          demand_avg_daily: number
          demand_stddev: number
          eoq: number
          holding_cost_unit: number
          id: string
          is_active: boolean
          lead_time_days: number
          max_qty: number
          min_qty: number
          name: string
          notes: string | null
          order_cost: number
          reorder_point: number
          safety_stock: number
          service_factor: number
          supplier_default: string | null
          unit: string
          unit_price: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "stock_item"
          to: "stock_item"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_access_entity_topic: {
        Args: { _entity_id: string }
        Returns: boolean
      }
      can_access_module_topic: { Args: { _topic: string }; Returns: boolean }
      can_cost: { Args: { _uid: string }; Returns: boolean }
      can_edit_sales_order: { Args: { _order_id: string }; Returns: boolean }
      can_plan_pcp: { Args: { _uid: string }; Returns: boolean }
      can_sell: { Args: { _uid: string }; Returns: boolean }
      can_transition: {
        Args: { _entity_type: string; _from: string; _to: string }
        Returns: boolean
      }
      can_transition_reference: {
        Args: {
          _from: Database["public"]["Enums"]["reference_status"]
          _to: Database["public"]["Enums"]["reference_status"]
        }
        Returns: boolean
      }
      can_write_pcp: { Args: { _uid: string }; Returns: boolean }
      change_item_route: {
        Args: { _item_id: string; _reason: string; _route_id: string }
        Returns: undefined
      }
      classify_abc: {
        Args: { _a_threshold?: number; _b_threshold?: number }
        Returns: {
          cumulative_pct: number
          item_id: string
          new_class: Database["public"]["Enums"]["abc_class"]
          old_class: Database["public"]["Enums"]["abc_class"]
        }[]
      }
      has_any_launch_role: { Args: { _uid: string }; Returns: boolean }
      has_any_showroom_role: { Args: { _uid: string }; Returns: boolean }
      has_any_stock_role: { Args: { _uid: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_stock_write_role: { Args: { _uid: string }; Returns: boolean }
      has_supplier_mgmt_role: { Args: { _uid: string }; Returns: boolean }
      is_member: { Args: { _uid: string }; Returns: boolean }
      is_user_mentioned: {
        Args: { _mentions: string[]; _uid: string }
        Returns: boolean
      }
      next_sales_order_number: { Args: never; Returns: string }
      order_item_technical_sheet: { Args: { _order_id: string }; Returns: Json }
      recalc_sales_order_item: { Args: { _item_id: string }; Returns: number }
      register_passages: {
        Args: { _moves: Json; _observation?: string }
        Returns: string
      }
      release_sales_order_to_pcp: {
        Args: { _order_id: string }
        Returns: string
      }
      run_cloud_cron: { Args: { p_job: string }; Returns: undefined }
      submit_sales_order: { Args: { _order_id: string }; Returns: undefined }
      user_belongs_to_supplier: {
        Args: { _supplier_id: string; _uid: string }
        Returns: boolean
      }
      user_has_role_name: {
        Args: { _name: string; _uid: string }
        Returns: boolean
      }
    }
    Enums: {
      abc_class: "A" | "B" | "C"
      app_role:
        | "admin"
        | "manager"
        | "operator"
        | "viewer"
        | "coordenador_produto"
        | "merchandising"
        | "comercial"
        | "showroom"
        | "diretor_produto"
        | "fornecedor_externo"
        | "pcp"
        | "qualidade"
        | "estilista"
        | "modelagem"
        | "almoxarifado"
        | "engenharia_custo"
      entity_type:
        | "reference"
        | "lote"
        | "tech_sheet"
        | "piloto"
        | "capa"
        | "engenharia"
        | "facao_order"
        | "showroom_sample"
        | "showroom_publication"
        | "showroom_feedback"
        | "showroom_decision"
        | "launch_wave"
        | "launch_item"
        | "launch_handoff"
        | "stock_item"
        | "stock_movement"
        | "stock_reservation"
        | "supplier"
        | "production_order"
        | "production_order_item"
        | "production_route"
        | "color_palette"
        | "print_design"
        | "look"
        | "display_board"
        | "collection_map"
        | "measurement_chart"
        | "collection"
        | "analytics_kpi"
        | "quality_capa"
        | "influencer"
        | "sales_order"
        | "sales_order_item"
      lot_priority: "baixa" | "media" | "alta" | "critica"
      lot_status:
        | "planejado"
        | "em_producao"
        | "pausado"
        | "concluido"
        | "cancelado"
      occurrence_severity: "info" | "warning" | "critical"
      occurrence_status: "aberta" | "em_tratativa" | "resolvida"
      reference_priority: "BAIXA" | "MEDIA" | "ALTA" | "URGENTE"
      reference_status:
        | "IDEIA"
        | "CROQUI"
        | "MODELAGEM"
        | "PILOTO"
        | "AJUSTE"
        | "APROVACAO"
        | "ENGENHARIA"
        | "PRODUCAO"
        | "FINALIZADA"
        | "ARQUIVADA"
      stock_item_category:
        | "tecido"
        | "aviamento"
        | "embalagem"
        | "acabado"
        | "insumo"
        | "etiqueta"
      stock_movement_kind:
        | "in"
        | "out"
        | "transfer_in"
        | "transfer_out"
        | "adjust"
        | "count"
      stock_reservation_status: "ativa" | "consumida" | "cancelada"
      warehouse_type: "central" | "celula" | "expedicao" | "quarentena"
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
      abc_class: ["A", "B", "C"],
      app_role: [
        "admin",
        "manager",
        "operator",
        "viewer",
        "coordenador_produto",
        "merchandising",
        "comercial",
        "showroom",
        "diretor_produto",
        "fornecedor_externo",
        "pcp",
        "qualidade",
        "estilista",
        "modelagem",
        "almoxarifado",
        "engenharia_custo",
      ],
      entity_type: [
        "reference",
        "lote",
        "tech_sheet",
        "piloto",
        "capa",
        "engenharia",
        "facao_order",
        "showroom_sample",
        "showroom_publication",
        "showroom_feedback",
        "showroom_decision",
        "launch_wave",
        "launch_item",
        "launch_handoff",
        "stock_item",
        "stock_movement",
        "stock_reservation",
        "supplier",
        "production_order",
        "production_order_item",
        "production_route",
        "color_palette",
        "print_design",
        "look",
        "display_board",
        "collection_map",
        "measurement_chart",
        "collection",
        "analytics_kpi",
        "quality_capa",
        "influencer",
        "sales_order",
        "sales_order_item",
      ],
      lot_priority: ["baixa", "media", "alta", "critica"],
      lot_status: [
        "planejado",
        "em_producao",
        "pausado",
        "concluido",
        "cancelado",
      ],
      occurrence_severity: ["info", "warning", "critical"],
      occurrence_status: ["aberta", "em_tratativa", "resolvida"],
      reference_priority: ["BAIXA", "MEDIA", "ALTA", "URGENTE"],
      reference_status: [
        "IDEIA",
        "CROQUI",
        "MODELAGEM",
        "PILOTO",
        "AJUSTE",
        "APROVACAO",
        "ENGENHARIA",
        "PRODUCAO",
        "FINALIZADA",
        "ARQUIVADA",
      ],
      stock_item_category: [
        "tecido",
        "aviamento",
        "embalagem",
        "acabado",
        "insumo",
        "etiqueta",
      ],
      stock_movement_kind: [
        "in",
        "out",
        "transfer_in",
        "transfer_out",
        "adjust",
        "count",
      ],
      stock_reservation_status: ["ativa", "consumida", "cancelada"],
      warehouse_type: ["central", "celula", "expedicao", "quarentena"],
    },
  },
} as const
