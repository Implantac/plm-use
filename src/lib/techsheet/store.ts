// Store leve para Ficha Técnica: BOM, BOP e versionamento.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BomItem = {
  id: string;
  tipo: "Tecido" | "Aviamento" | "Linha" | "Embalagem" | "Bordado" | "Silk";
  material: string;
  fornecedor: string;
  consumo: string;
  unidade: string;
  custo: number;
  lote?: string;
};

export type BopStep = {
  id: string;
  seq: number;
  etapa: string;
  setor: string;
  tempoMin: number;
  custo: number;
  responsavel?: string;
};

export type TechSheetVersion = {
  id: string;
  versao: string; // "v4.2"
  data: string;
  autor: string;
  status: "Rascunho" | "Em revisão" | "Aprovada" | "Obsoleta";
  resumo: string;
  alteracoes: string[];
};

export type PreCost = {
  targetCusto: number; // meta de custo industrial
  overheadPct: number; // % de rateio (energia, adm, indireto)
  markupPct: number; // % de markup sobre custo final para preço sugerido
  targetPreco?: number; // preço-alvo de venda (opcional, alerta se sugerido > alvo)
};

export type TechSheetData = {
  ref: string;
  bom: BomItem[];
  bop: BopStep[];
  versoes: TechSheetVersion[];
  preCost: PreCost;
};

const seedFor = (ref: string): TechSheetData => ({
  ref,
  bom: [
    {
      id: "b1",
      tipo: "Tecido",
      material: "Linho Puro Off-White",
      fornecedor: "Têxtil Camargo",
      consumo: "1.2",
      unidade: "m",
      custo: 42,
      lote: "TC-220",
    },
    {
      id: "b2",
      tipo: "Aviamento",
      material: "Botão Madre Pérola",
      fornecedor: "Aviamentos Real",
      consumo: "4",
      unidade: "un",
      custo: 12,
    },
    {
      id: "b3",
      tipo: "Linha",
      material: "Linha Poliéster 120",
      fornecedor: "Coats Corrente",
      consumo: "200",
      unidade: "m",
      custo: 2.5,
    },
    {
      id: "b4",
      tipo: "Embalagem",
      material: "Tag Luxury + Polybag",
      fornecedor: "EmbalaPlus",
      consumo: "1",
      unidade: "un",
      custo: 4.5,
    },
  ],
  bop: [
    { id: "p1", seq: 1, etapa: "Corte Industrial", setor: "Corte", tempoMin: 12, custo: 4.5 },
    {
      id: "p2",
      seq: 2,
      etapa: "Silk",
      setor: "Silk",
      tempoMin: 7,
      custo: 2.4,
      responsavel: "Marcos",
    },
    {
      id: "p3",
      seq: 3,
      etapa: "Costura Reta/Overloque",
      setor: "Costura",
      tempoMin: 45,
      custo: 18,
    },
    {
      id: "p4",
      seq: 4,
      etapa: "Acabamento + Passadoria",
      setor: "Acabamento",
      tempoMin: 8,
      custo: 3.2,
    },
    { id: "p5", seq: 5, etapa: "QC + Expedição", setor: "Expedição", tempoMin: 5, custo: 2 },
  ],
  versoes: [
    {
      id: "v1",
      versao: "v4.2",
      data: "2026-06-12",
      autor: "Sandra Lima",
      status: "Aprovada",
      resumo: "Ajuste de consumo de linho e adição de tag premium.",
      alteracoes: ["Linho: 1.4m → 1.2m", "+ Tag Luxury", "Custo: R$ 87,40 → R$ 84,20"],
    },
    {
      id: "v2",
      versao: "v4.1",
      data: "2026-05-28",
      autor: "Sandra Lima",
      status: "Obsoleta",
      resumo: "Revisão de botão e fornecedor.",
      alteracoes: ["Botão plástico → Madre Pérola", "Fornecedor: Plastic Co → Aviamentos Real"],
    },
    {
      id: "v3",
      versao: "v4.0",
      data: "2026-05-10",
      autor: "Carla Mendes",
      status: "Obsoleta",
      resumo: "Versão inicial após aprovação do piloto.",
      alteracoes: ["Liberada para produção"],
    },
  ],
  preCost: { targetCusto: 80, overheadPct: 12, markupPct: 220, targetPreco: 349 },
});

interface State {
  data: Record<string, TechSheetData>;
  ensure(ref: string): TechSheetData;
  addBomItem(ref: string, item: Omit<BomItem, "id">): void;
  removeBomItem(ref: string, id: string): void;
  addBopStep(ref: string, step: Omit<BopStep, "id">): void;
  removeBopStep(ref: string, id: string): void;
  updatePreCost(ref: string, patch: Partial<PreCost>): void;
  createVersion(ref: string, autor: string, resumo: string, alteracoes: string[]): TechSheetVersion;
}

const uid = () => Math.random().toString(36).slice(2, 9);
const bumpVersion = (last: string) => {
  const m = last.match(/v(\d+)\.(\d+)/);
  if (!m) return "v1.0";
  return `v${m[1]}.${Number(m[2]) + 1}`;
};

export const useTechSheetStore = create<State>()(
  persist(
    (set, get) => ({
      data: {},
      ensure(ref) {
        const cur = get().data[ref];
        if (cur) return cur;
        const fresh = seedFor(ref);
        set((s) => ({ data: { ...s.data, [ref]: fresh } }));
        return fresh;
      },
      addBomItem(ref, item) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return {
            data: { ...s.data, [ref]: { ...cur, bom: [...cur.bom, { ...item, id: uid() }] } },
          };
        });
      },
      removeBomItem(ref, id) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return {
            data: { ...s.data, [ref]: { ...cur, bom: cur.bom.filter((b) => b.id !== id) } },
          };
        });
      },
      addBopStep(ref, step) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return {
            data: { ...s.data, [ref]: { ...cur, bop: [...cur.bop, { ...step, id: uid() }] } },
          };
        });
      },
      removeBopStep(ref, id) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return {
            data: { ...s.data, [ref]: { ...cur, bop: cur.bop.filter((b) => b.id !== id) } },
          };
        });
      },
      updatePreCost(ref, patch) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return { data: { ...s.data, [ref]: { ...cur, preCost: { ...cur.preCost, ...patch } } } };
        });
      },

      createVersion(ref, autor, resumo, alteracoes) {
        const cur = get().data[ref] ?? seedFor(ref);
        const last = cur.versoes[0]?.versao ?? "v1.0";
        const nova: TechSheetVersion = {
          id: uid(),
          versao: bumpVersion(last),
          data: new Date().toISOString().slice(0, 10),
          autor,
          status: "Em revisão",
          resumo,
          alteracoes,
        };
        set((s) => ({
          data: {
            ...s.data,
            [ref]: {
              ...cur,
              versoes: [
                nova,
                ...cur.versoes.map((v) =>
                  v.status === "Aprovada" ? { ...v, status: "Obsoleta" as const } : v,
                ),
              ],
            },
          },
        }));
        return nova;
      },
    }),
    { name: "use-moda:techsheet" },
  ),
);

export function custoTotalBOM(items: BomItem[]) {
  return items.reduce((acc, i) => acc + i.custo, 0);
}
export function tempoTotalBOP(steps: BopStep[]) {
  return steps.reduce((acc, s) => acc + s.tempoMin, 0);
}
export function custoTotalBOP(steps: BopStep[]) {
  return steps.reduce((acc, s) => acc + s.custo, 0);
}
