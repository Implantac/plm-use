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
          created_at: string
          created_by: string | null
          criada: string
          defeito: string
          fornecedor: string | null
          id: string
          lote: string | null
          prazo: string | null
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
          fornecedor?: string | null
          id?: string
          lote?: string | null
          prazo?: string | null
          ref?: string | null
          responsavel: string
          setor: string
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          criada?: string
          defeito?: string
          fornecedor?: string | null
          id?: string
          lote?: string | null
          prazo?: string | null
          ref?: string | null
          responsavel?: string
          setor?: string
          status?: string
          tipo?: string
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "operator" | "viewer"
      lot_priority: "baixa" | "media" | "alta" | "critica"
      lot_status:
        | "planejado"
        | "em_producao"
        | "pausado"
        | "concluido"
        | "cancelado"
      occurrence_severity: "info" | "warning" | "critical"
      occurrence_status: "aberta" | "em_tratativa" | "resolvida"
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
      app_role: ["admin", "manager", "operator", "viewer"],
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
    },
  },
} as const
