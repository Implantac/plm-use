// Persistência real para CAD & Modelagem: armazena moldes (.ADS, .DXF, .PLT, .AI)
// localmente com Zustand persist e sincroniza oportunisticamente com `public.cad_markers`
// quando a migration opcional estiver aplicada no banco (degrada sem erro em bancos pré-migration).
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";

export type CadFormat = "ADS" | "DXF" | "PLT" | "AI" | "CLO3D" | "PDF" | "SVG";
export type CadStatus = "Rascunho" | "Revisão" | "Aprovado" | "Produção";

export type CadMarkerItem = {
  id: string;
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
        upsert(r: unknown, o?: { onConflict?: string }): Promise<{ error: unknown }>;
      };
    };
    await db.from("cad_markers").upsert(
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
  } catch {
    // Silencioso se a tabela opcional cad_markers ainda não foi aplicada em produção.
  }
}

export const useCadStore = create<CadState>()(
  persist(
    (set) => ({
      markers: initialCadMarkers,
      addMarker(input) {
        const created: CadMarkerItem = {
          ...input,
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
