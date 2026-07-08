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
      [_ in never]: never
    }
    Functions: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: { Args: { _uid: string }; Returns: boolean }
    }
    Enums: {
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
      entity_type:
        | "reference"
        | "lote"
        | "tech_sheet"
        | "piloto"
        | "capa"
        | "engenharia"
        | "facao_order"
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
      ],
      entity_type: [
        "reference",
        "lote",
        "tech_sheet",
        "piloto",
        "capa",
        "engenharia",
        "facao_order",
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
    },
  },
} as const
