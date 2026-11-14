// Persistência real para CAD & Modelagem: armazena moldes (.ADS, .DXF, .PLT, .AI)
// localmente com Zustand persist e sincroniza oportunisticamente com `public.cad_markers`
// quando a migration opcional estiver aplicada no banco (degrada sem erro em bancos pré-migration).
import { create } from "zustand";
import { toast } from "sonner";
import { isMissingTable } from "@/lib/sales/api";
import { avisoUnico, descreverErroSupabase } from "@/lib/supabase/erro-humano";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";

export type CadFormat = "ADS" | "DXF" | "PLT" | "AI" | "CLO3D" | "PDF" | "SVG";
export type CadStatus = "Rascunho" | "Revisão" | "Aprovado" | "Produção";

export type CadMarkerItem = {
  id: string;
  /** Onda 46: molde de exemplo. Nunca entra em número, média ou sincronização. */
  demo?: boolean;
  refCode: string;
  fileName: string;
  format: CadFormat;
  sistemaCad: "Audaces" | "Lectra" | "Gerber" | "Optitex" | "CLO3D" | "Outro";
  version: string;
  eficienciaPct: number;
  larguraEnfestoM: number;
  comprimentoRiscoM: number;
  pecasNoRisco?: number;
  gramaturaGm2?: number;
  encolhimentoUrdumePct: number;
  encolhimentoTramaPct: number;
  status: CadStatus;
  updatedAt: string;
  notes?: string;
};

export const initialCadMarkers: CadMarkerItem[] = [
  {
    id: "cad-1",
    demo: true,
    refCode: "DEV000006",
    fileName: "DEV000006_CAMISETA_DRY_PRO_v4.ADS",
    format: "ADS",
    sistemaCad: "Audaces",
    version: "v4.2",
    eficienciaPct: 88.3,
    larguraEnfestoM: 1.8,
    comprimentoRiscoM: 5.35,
    pecasNoRisco: 5,
    gramaturaGm2: 135,
    encolhimentoUrdumePct: 2.0,
    encolhimentoTramaPct: 1.5,
    status: "Aprovado",
    updatedAt: "2026-10-30",
    notes: "Grade PP ao GG (5 peças no risco) casada para malha 1,80 m · 135 g/m².",
  },
  {
    id: "cad-2",
    demo: true,
    refCode: "V24-001",
    fileName: "Blusa_Linho_Amalfi_v4.DXF",
    format: "DXF",
    sistemaCad: "Lectra",
    version: "v4.0",
    eficienciaPct: 84.5,
    larguraEnfestoM: 1.48,
    comprimentoRiscoM: 5.1,
    pecasNoRisco: 4,
    gramaturaGm2: 185,
    encolhimentoUrdumePct: 3.5,
    encolhimentoTramaPct: 2.0,
    status: "Produção",
    updatedAt: "2026-10-22",
    notes: "Respeitar sentido do fio de urdume no linho puro.",
  },
];

interface CadState {
  markers: CadMarkerItem[];
  addMarker: (input: Omit<CadMarkerItem, "id" | "updatedAt">) => CadMarkerItem;
  updateMarker: (id: string, patch: Partial<CadMarkerItem>) => void;
  removeMarker: (id: string) => void;
}

const uid = () => `cad-${Math.random().toString(36).slice(2, 9)}`;

async function tryUpsertDb(item: CadMarkerItem) {
  try {
    const db = supabase as unknown as {
      from(t: string): {
        upsert(
          r: unknown,
          o?: { onConflict?: string },
        ): Promise<{ error: { code?: string; message?: string } | null }>;
      };
    };
    const { error } = await db.from("cad_markers").upsert(
      {
        external_key: item.id,
        ref_code: item.refCode,
        file_name: item.fileName,
        format: item.format,
        sistema_cad: item.sistemaCad,
        version: item.version,
        eficiencia_pct: item.eficienciaPct,
        largura_enfesto_m: item.larguraEnfestoM,
        comprimento_risco_m: item.comprimentoRiscoM,
        encolhimento_urdume_pct: item.encolhimentoUrdumePct,
        encolhimento_trama_pct: item.encolhimentoTramaPct,
        status: item.status,
        notes: item.notes ?? null,
      },
      { onConflict: "external_key" },
    );
    // Onda 83: silencioso só quando a tabela opcional cad_markers ainda não
    // existe; qualquer outro motivo (permissão, sessão) é dito ao usuário.
    if (error && !isMissingTable(error as Parameters<typeof isMissingTable>[0])) {
      const msg = descreverErroSupabase(error, "sincronizar o molde na nuvem");
      if (avisoUnico(msg)) toast.error(msg);
    }
  } catch {
    // Rede indisponível: o molde continua salvo localmente (persist).
  }
}

export const useCadStore = create<CadState>()(
  persist(
    (set) => ({
      markers: initialCadMarkers,
      addMarker(input) {
        const created: CadMarkerItem = {
          ...input,
          // Onda 46: tudo que o usuário cadastra é operacional; só a lista
          // inicial é vitrine. Sem `demo: true` aqui o molde novo seria
          // ignorado para sempre pelos números da tela.
          demo: false,
          id: uid(),
          refCode: input.refCode.trim().toUpperCase(),
          updatedAt: new Date().toISOString().slice(0, 10),
        };
        set((s) => ({ markers: [created, ...s.markers] }));
        void tryUpsertDb(created);
        return created;
      },
      updateMarker(id, patch) {
        set((s) => {
          const next = s.markers.map((m) =>
            m.id === id
              ? { ...m, ...patch, id, updatedAt: new Date().toISOString().slice(0, 10) }
              : m,
          );
          const found = next.find((m) => m.id === id);
          if (found) void tryUpsertDb(found);
          return { markers: next };
        });
      },
      removeMarker(id) {
        set((s) => ({ markers: s.markers.filter((m) => m.id !== id) }));
      },
    }),
    { name: "use-moda:cad-markers" },
  ),
);

// ---------------------------------------------------------------------------
// Onda 46 — a vitrine de CAD não apura número.
//
// Medido com browser em 06/11: `/cad` abria com "Moldes ativos 2",
// "Eficiência média 86.4%" e "Aprovados 2" usando DOIS estudos de fábrica,
// e o botão "Sync + BOM" gravava 88,3% / 1,8 m / 135 g/m² numa ficha que
// ninguém criou. Agora esses objetos continuam visíveis, mas declarados.
// ---------------------------------------------------------------------------
export const MOLDE_DEMO_LABEL =
  "Molde de demonstração — eficiência, consumo e aprovação não entram nos números";

/** Só moldes salvos/editados pela empresa. Nunca `undefined` vira apurado. */
export function moldesOperacionais(markers: CadMarkerItem[]): CadMarkerItem[] {
  return markers.filter((m) => m.demo !== true);
}

/** Promoção explícita: o usuário assume o exemplo como cadastro próprio. */
export function promoverMolde(m: CadMarkerItem): CadMarkerItem {
  return { ...m, demo: false };
}
