// Store de ciclo de vida das referências.
// Mock realista; futuro alvo de migração para Supabase sem refactor de UI.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  emptyLifecycle,
  STAGE_ORDER,
  type ReferenceLifecycle,
  type StageId,
  type StageStatus,
} from "@/types/reference";

const nowISO = () => new Date().toISOString();

function build(
  ref: string,
  nome: string,
  patch: Partial<ReferenceLifecycle>,
  done: StageId[],
  ativo?: StageId,
): ReferenceLifecycle {
  const base = emptyLifecycle(ref, nome);
  base.stages = base.stages.map((s) => {
    if (done.includes(s.id))
      return {
        ...s,
        status: "concluido" as StageStatus,
        responsavel: patch.designer ?? "Equipe",
        data: nowISO(),
      };
    if (ativo === s.id)
      return {
        ...s,
        status: "em_andamento" as StageStatus,
        responsavel: patch.designer ?? "Equipe",
        data: nowISO(),
      };
    return s;
  });
  return { ...base, ...patch };
}

const seed: ReferenceLifecycle[] = [
  build(
    "V24-001",
    "Blusa Linho Amalfi",
    {
      categoria: "Top",
      colecao: "Alto Verão 2026",
      designer: "Julia",
      prioridade: "Alta",
      prazo: "2026-07-10",
      imagem:
        "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=400",
    },
    ["pesquisa", "croqui", "modelagem", "piloto", "prova"],
    "ajustes",
  ),
  build(
    "CM704",
    "Camisa Linho Amalfi",
    {
      categoria: "Top",
      colecao: "Alto Verão 2026",
      designer: "Sandra",
      prioridade: "Alta",
      prazo: "2026-07-05",
    },
    [
      "pesquisa",
      "croqui",
      "modelagem",
      "piloto",
      "prova",
      "ajustes",
      "engenharia",
      "liberacao_pcp",
    ],
    "producao",
  ),
  build(
    "VT302",
    "Vestido Midi Toscana",
    {
      categoria: "Dress",
      colecao: "Alto Verão 2026",
      designer: "Renata",
      prioridade: "Urgente",
      prazo: "2026-06-25",
    },
    [
      "pesquisa",
      "croqui",
      "modelagem",
      "piloto",
      "prova",
      "ajustes",
      "engenharia",
      "liberacao_pcp",
      "producao",
    ],
    "marketing",
  ),
  build(
    "V24-005",
    "Saia Midi Seda",
    {
      categoria: "Bottom",
      colecao: "Alto Verão 2026",
      designer: "Julia",
      prioridade: "Média",
      prazo: "2026-08-01",
      imagem:
        "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=400",
    },
    ["pesquisa", "croqui"],
    "modelagem",
  ),
  build(
    "BL220",
    "Blusa Bordado Manual",
    {
      categoria: "Top",
      colecao: "Pré-Verão 2026",
      designer: "Carla",
      prioridade: "Baixa",
      prazo: "2026-06-30",
    },
    [
      "pesquisa",
      "croqui",
      "modelagem",
      "piloto",
      "prova",
      "ajustes",
      "engenharia",
      "liberacao_pcp",
    ],
    "producao",
  ),
  build(
    "V24-011",
    "Regata Drapeada Resort",
    {
      categoria: "Top",
      colecao: "Resort 2026",
      designer: "Livia",
      prioridade: "Média",
      prazo: "2026-09-01",
      imagem:
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=400",
    },
    ["pesquisa"],
    "croqui",
  ),
];

interface ReferenceState {
  lifecycles: ReferenceLifecycle[];
  upsert(lc: ReferenceLifecycle): void;
  setStageStatus(
    ref: string,
    stageId: StageId,
    status: StageStatus,
    extras?: { responsavel?: string; comentario?: string },
  ): void;
  getOrCreate(ref: string, nome: string): ReferenceLifecycle;
}

export const useReferenceStore = create<ReferenceState>()(persist((set, get) => ({
  lifecycles: seed,

  upsert(lc) {
    set((s) => {
      const idx = s.lifecycles.findIndex((x) => x.ref === lc.ref);
      const next = [...s.lifecycles];
      if (idx >= 0) next[idx] = lc;
      else next.push(lc);
      return { lifecycles: next };
    });
  },

  setStageStatus(ref, stageId, status, extras) {
    set((s) => ({
      lifecycles: s.lifecycles.map((lc) =>
        lc.ref !== ref
          ? lc
          : {
              ...lc,
              stages: lc.stages.map((st) =>
                st.id !== stageId
                  ? st
                  : {
                      ...st,
                      status,
                      data: nowISO(),
                      responsavel: extras?.responsavel ?? st.responsavel,
                      comentario: extras?.comentario ?? st.comentario,
                    },
              ),
            },
      ),
    }));
  },

  getOrCreate(ref, nome) {
    const existing = get().lifecycles.find((l) => l.ref === ref);
    if (existing) return existing;
    const novo = emptyLifecycle(ref, nome);
    set((s) => ({ lifecycles: [...s.lifecycles, novo] }));
    return novo;
  },
}), { name: "use-moda:reference" }));

// Selectors / filtros do Centro de Desenvolvimento ------------------------
export type DevFilter =
  | "todos"
  | "pilotos_pendentes"
  | "sem_ficha"
  | "aguardando_aprovacao"
  | "liberados_pcp"
  | "atrasados";

export function filtrarLifecycles(
  list: ReferenceLifecycle[],
  filter: DevFilter,
): ReferenceLifecycle[] {
  switch (filter) {
    case "pilotos_pendentes":
      return list.filter(
        (l) =>
          l.stages.find((s) => s.id === "piloto")?.status === "em_andamento" ||
          l.stages.find((s) => s.id === "piloto")?.status === "pendente",
      );
    case "sem_ficha":
      return list.filter(
        (l) => l.stages.find((s) => s.id === "engenharia")?.status === "pendente",
      );
    case "aguardando_aprovacao":
      return list.filter((l) =>
        l.stages.some(
          (s) => s.status === "em_andamento" && (s.id === "prova" || s.id === "piloto"),
        ),
      );
    case "liberados_pcp":
      return list.filter(
        (l) =>
          l.stages.find((s) => s.id === "liberacao_pcp")?.status === "concluido" ||
          l.stages.find((s) => s.id === "liberacao_pcp")?.status === "aprovado",
      );
    case "atrasados":
      return list.filter((l) => {
        if (!l.prazo) return false;
        const done = l.stages.filter(
          (s) => s.status === "concluido" || s.status === "aprovado",
        ).length;
        if (done >= STAGE_ORDER.length) return false;
        return new Date(l.prazo).getTime() < Date.now();
      });
    default:
      return list;
  }
}
