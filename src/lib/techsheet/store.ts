// Store da Ficha Técnica Fluida (PLM 2.0): BOM × Matriz de Cores, BOP,
// Aplicações, Medidas com Graduação Automática, Etiquetagem ABNT/INMETRO,
// Encaixe CAD e Precificação por Mark-up Divisor — 100% retrocompatível com v1/v2.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  bomItemCustoEfetivo,
  type CadMarkerSpec,
  type CareLabelSpec,
  type TechSheetColorway,
  type TechSheetMeasurementSpec,
} from "./textile";
import { DEFAULT_DIVISOR_PARAMS, type MarkupDivisorParams } from "./pricing";

export type BomItem = {
  id: string;
  tipo: "Tecido" | "Aviamento" | "Linha" | "Embalagem" | "Bordado" | "Silk";
  material: string;
  fornecedor: string;
  consumo: string;
  unidade: string;
  custo: number;
  lote?: string;
  /** Campos de engenharia têxtil v3 (opcionais para manter compatibilidade v1/v2). */
  perdaPct?: number;
  custoUnitario?: number;
  larguraM?: number;
  gramaturaGm2?: number;
  estoqueDisponivel?: number;
  skuErp?: string;
  /** Mapa colorwayId -> cor/código do insumo naquela variante da peça. */
  variantesCor?: Record<string, string>;
};

export type BopStep = {
  id: string;
  seq: number;
  etapa: string;
  setor: string;
  tempoMin: number;
  custo: number;
  responsavel?: string;
  maquina?: string;
  terceirizada?: boolean;
};

export type TechSheetVersion = {
  id: string;
  versao: string; // "v4.2"
  data: string;
  autor: string;
  status: "Rascunho" | "Em revisão" | "Aprovada" | "Obsoleta";
  resumo: string;
  alteracoes: string[];
  /**
   * Estado completo (BOM/BOP/pré-custo/aplicações) capturado no nascimento da versão.
   * Versões sem este campo (anteriores a 15/10) só suportam diff textual.
   */
  snapshot?: TechSheetSnapshot;
};

export type TechSheetSnapshot = {
  bom: BomItem[];
  bop: BopStep[];
  preCost: PreCost;
  aplicacoes?: import("./aplicacoes").Aplicacao[];
};

export type PreCost = {
  targetCusto: number; // meta de custo industrial
  overheadPct: number; // % de rateio (energia, adm, indireto)
  markupPct: number; // % de markup sobre custo final (modo legado)
  targetPreco?: number; // preço-alvo comercial
  pricingMode?: "markup" | "divisor";
  tiragemPlanejada?: number; // lote padrão p/ diluir setup na prévia
  divisor?: MarkupDivisorParams;
};

export type TechSheetLifecycleStage = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type TechSheetMeta = {
  name: string;
  category: string;
  collection: string;
  statusLabel: string;
  stage: TechSheetLifecycleStage;
};

export type TechSheetData = {
  ref: string;
  bom: BomItem[];
  bop: BopStep[];
  versoes: TechSheetVersion[];
  preCost: PreCost;
  /** Aplicações (bordado/silk/sublimação/transfer) por POSIÇÃO — ver aplicacoes.ts. */
  aplicacoes: import("./aplicacoes").Aplicacao[];
  /**
   * URL https da foto do produto (viagem no envelope do jsonb `bom`, sem
   * coluna nova). Ficha sem foto = fallback histórico da UI, não vazio falso.
   */
  image?: string;
  /** Extensões v3 do Cockpit Fluido (todas opcionais p/ round-trip v1/v2). */
  meta?: TechSheetMeta;
  colorways?: TechSheetColorway[];
  medidas?: TechSheetMeasurementSpec;
  etiquetagem?: CareLabelSpec;
  encaixeCad?: CadMarkerSpec;
};

export const LIFECYCLE_STAGES: Array<{
  stage: TechSheetLifecycleStage;
  label: string;
  short: string;
}> = [
  { stage: 1, label: "1. Proposta", short: "Proposta" },
  { stage: 2, label: "2. 1ª Reunião", short: "Reunião" },
  { stage: 3, label: "3. Ficha Técnica", short: "Ficha Técnica" },
  { stage: 4, label: "4. Modelagem", short: "Modelagem" },
  { stage: 5, label: "5. Corte", short: "Corte" },
  { stage: 6, label: "6. Piloto & Prova", short: "Piloto & Prova" },
  { stage: 7, label: "7. Custo & Preço", short: "Custo & Preço" },
];

export const defaultColorwaysFor = (): TechSheetColorway[] => [
  {
    id: "cw-1",
    code: "VD-OURO",
    name: "Verde Brasil / Ouro",
    hex: "#1D6B47",
    secondaryHex: "#EAB308",
    status: "Ativa",
    mixPct: 45,
  },
  {
    id: "cw-2",
    code: "AZ-BR",
    name: "Royal Marinho / Branco",
    hex: "#1E3A8A",
    secondaryHex: "#F8FAFC",
    status: "Ativa",
    mixPct: 35,
  },
  {
    id: "cw-3",
    code: "PT-GRAF",
    name: "Preto Carbono / Grafite",
    hex: "#18181B",
    secondaryHex: "#71717A",
    status: "Amostra",
    mixPct: 20,
  },
];

export const defaultMedidasFor = (): TechSheetMeasurementSpec => ({
  tamanhoBase: "M",
  tamanhos: ["PP", "P", "M", "G", "GG"],
  unidade: "cm",
  observacoesModelagem: "Medir peça descansada sobre mesa plana (malha Dry Fit com 4% elastano).",
  pontos: [
    {
      id: "pom-a",
      codigo: "A",
      nome: "Tórax / Peito",
      comoMedir: "2 cm abaixo da cava, de borda a borda",
      valorBase: 54,
      regraGraduacaoCm: 2.0,
      toleranciaCm: 1.0,
    },
    {
      id: "pom-b",
      codigo: "B",
      nome: "Comprimento Total",
      comoMedir: "Ponto mais alto do ombro (HPS) até a barra",
      valorBase: 70,
      regraGraduacaoCm: 1.5,
      toleranciaCm: 1.0,
    },
    {
      id: "pom-c",
      codigo: "C",
      nome: "Comprimento da Manga",
      comoMedir: "Costura do ombro até a bainha da manga",
      valorBase: 21,
      regraGraduacaoCm: 1.0,
      toleranciaCm: 0.5,
    },
    {
      id: "pom-d",
      codigo: "D",
      nome: "Abertura de Gola V",
      comoMedir: "Costura interna de ombro a ombro",
      valorBase: 18,
      regraGraduacaoCm: 0.5,
      toleranciaCm: 0.5,
    },
  ],
});

export const defaultEtiquetagemFor = (): CareLabelSpec => ({
  composicao: [
    { fibra: "Poliéster", pct: 96 },
    { fibra: "Elastano", pct: 4 },
  ],
  ncm: "6109.90.00",
  paisOrigem: "Feito no Brasil",
  cuidados: {
    lavagem: "30C_SUAVE",
    alvejamento: "NAO_ALVEJAR",
    secagem: "VARAL_SOMBRA",
    passadoria: "BAIXA_110",
    limpezaProfissional: "NAO_LIMPAR_SECO",
  },
  instrucoesExtras: "Lavar pelo avesso; não passar ferro sobre o transfer ou bordado.",
});

export const defaultEncaixeCadFor = (): CadMarkerSpec => ({
  eficienciaPct: 88.3,
  larguraEnfestoM: 1.8,
  comprimentoRiscoM: 4.65,
  encolhimentoUrdumePct: 2.0,
  encolhimentoTramaPct: 1.5,
  arquivoMolde: "DEV000006_CAMISETA_DRY_PRO_v4.ADS",
  sistemaCad: "Audaces",
});

export const seedFor = (ref: string): TechSheetData => ({
  ref,
  meta: {
    name: ref === "DEV000006" ? "Camiseta Esportiva Dry Pro" : `Produto Engenharia ${ref}`,
    category: "Esportivo / Malharia",
    collection: "Verão 2027",
    statusLabel: "Engenharia Ativa",
    stage: 3,
  },
  colorways: defaultColorwaysFor(),
  medidas: defaultMedidasFor(),
  etiquetagem: defaultEtiquetagemFor(),
  encaixeCad: defaultEncaixeCadFor(),
  bom: [
    {
      id: "b1",
      tipo: "Tecido",
      material: "Malha Dry Fit UV50+ Microperfurada",
      fornecedor: "Têxtil Camargo",
      consumo: "0.26",
      unidade: "kg",
      perdaPct: 7,
      custoUnitario: 39.8,
      custo: 11.07,
      larguraM: 1.8,
      gramaturaGm2: 135,
      estoqueDisponivel: 1420,
      lote: "TC-220",
      variantesCor: {
        "cw-1": "#1D6B47 · Verde Bandeira",
        "cw-2": "#1E3A8A · Azul Royal",
        "cw-3": "#18181B · Preto Carbono",
      },
    },
    {
      id: "b2",
      tipo: "Tecido",
      material: "Ribana Gola V Listrada Poliéster",
      fornecedor: "Malharia Sul",
      consumo: "0.045",
      unidade: "kg",
      perdaPct: 3,
      custoUnitario: 48.5,
      custo: 2.25,
      larguraM: 0.9,
      gramaturaGm2: 210,
      estoqueDisponivel: 350,
      variantesCor: {
        "cw-1": "#EAB308 · Ouro Listrado",
        "cw-2": "#F8FAFC · Branco Listrado",
        "cw-3": "#71717A · Grafite",
      },
    },
    {
      id: "b3",
      tipo: "Linha",
      material: "Linha Poliéster Texturizada 120",
      fornecedor: "Coats Corrente",
      consumo: "180",
      unidade: "m",
      perdaPct: 2,
      custoUnitario: 0.008,
      custo: 1.47,
      estoqueDisponivel: 8500,
      variantesCor: {
        "cw-1": "#1D6B47 · Verde",
        "cw-2": "#1E3A8A · Marinho",
        "cw-3": "#18181B · Preto",
      },
    },
    {
      id: "b4",
      tipo: "Embalagem",
      material: "Etiqueta CNPJ Transfer + Tag + Polybag",
      fornecedor: "EmbalaPlus",
      consumo: "1",
      unidade: "un",
      perdaPct: 2,
      custoUnitario: 1.95,
      custo: 1.99,
      estoqueDisponivel: 7300,
      variantesCor: {
        "cw-1": "#F8FAFC · Padrão",
        "cw-2": "#F8FAFC · Padrão",
        "cw-3": "#F8FAFC · Padrão",
      },
    },
  ],
  bop: [
    {
      id: "p1",
      seq: 1,
      etapa: "Enfesto + Corte Automático",
      setor: "Corte",
      maquina: "Mesa Corte CAD",
      tempoMin: 2.2,
      custo: 1.65,
    },
    {
      id: "p2",
      seq: 2,
      etapa: "Fechamento Ombros + Gola V Ribana",
      setor: "Costura",
      maquina: "Overloque Ponto Cadeia + Reta",
      tempoMin: 4.8,
      custo: 3.85,
      responsavel: "Célula 02",
    },
    {
      id: "p3",
      seq: 3,
      etapa: "Pregação de Mangas + Fechamento Lateral",
      setor: "Costura",
      maquina: "Overloque 4 Fios",
      tempoMin: 3.5,
      custo: 2.8,
    },
    {
      id: "p4",
      seq: 4,
      etapa: "Barra Galoneira + Limpeza + Revisão",
      setor: "Acabamento",
      maquina: "Galoneira Cilíndrica",
      tempoMin: 3.0,
      custo: 2.1,
    },
  ],
  versoes: [
    {
      id: "v1",
      versao: "v4.2",
      data: "2026-10-20",
      autor: "Engenharia Produto",
      status: "Aprovada",
      resumo: "Ajuste de encaixe CAD (88,3%) e ribana gola V listrada.",
      alteracoes: [
        "Malha Dry Fit UV50+: 0,260 kg (+7% perda)",
        "+ Matriz de 3 variantes de cor",
        "Mark-up Divisor calibrado p/ margem líquida 20%",
      ],
    },
  ],
  preCost: {
    targetCusto: 34,
    overheadPct: 12,
    markupPct: 185,
    targetPreco: 89.9,
    pricingMode: "divisor",
    tiragemPlanejada: 200,
    divisor: { ...DEFAULT_DIVISOR_PARAMS },
  },
  aplicacoes: [
    {
      id: "ap1",
      tipo: "Transfer",
      posicao: "Peito esquerdo",
      arte: "ESC-DRY-01",
      larguraCm: 8,
      alturaCm: 8,
      cores: 2,
      qtdPorPeca: 1,
      custoUnitario: 2.3,
      custoSetup: 90,
      obs: "Transfer silicone alto relevo (160°C · 12s)",
    },
  ],
});

interface State {
  data: Record<string, TechSheetData>;
  /** refs com edição local ainda não confirmada pelo servidor (push seletivo). */
  dirty: Record<string, true>;
  clearDirty(refs: string[]): void;
  ensure(ref: string): TechSheetData;
  updateMeta(ref: string, patch: Partial<TechSheetMeta>): void;
  setImage(ref: string, url: string | undefined): void;
  addBomItem(ref: string, item: Omit<BomItem, "id">): void;
  bulkAddBomItems(ref: string, items: Array<Omit<BomItem, "id">>): void;
  updateBomItem(ref: string, id: string, patch: Partial<BomItem>): void;
  removeBomItem(ref: string, id: string): void;
  addBopStep(ref: string, step: Omit<BopStep, "id">): void;
  updateBopStep(ref: string, id: string, patch: Partial<BopStep>): void;
  removeBopStep(ref: string, id: string): void;
  updatePreCost(ref: string, patch: Partial<PreCost>): void;
  addAplicacao(ref: string, item: Omit<import("./aplicacoes").Aplicacao, "id">): void;
  updateAplicacao(ref: string, id: string, patch: Partial<import("./aplicacoes").Aplicacao>): void;
  removeAplicacao(ref: string, id: string): void;
  setColorways(ref: string, colorways: TechSheetColorway[]): void;
  setMedidas(ref: string, medidas: TechSheetMeasurementSpec): void;
  setEtiquetagem(ref: string, etiquetagem: CareLabelSpec): void;
  setEncaixeCad(ref: string, encaixeCad: CadMarkerSpec): void;
  duplicateTechSheet(sourceRef: string, targetRef: string, targetName?: string): TechSheetData;
  createVersion(ref: string, autor: string, resumo: string, alteracoes: string[]): TechSheetVersion;
}

const uid = () => Math.random().toString(36).slice(2, 9);
const bumpVersion = (last: string) => {
  const m = last.match(/v(\d+)\.(\d+)/);
  if (!m) return "v1.0";
  return `v${m[1]}.${Number(m[2]) + 1}`;
};

function syncBomCusto(item: BomItem): BomItem {
  if (item.custoUnitario != null && Number.isFinite(item.custoUnitario)) {
    return { ...item, custo: bomItemCustoEfetivo(item) };
  }
  return item;
}

export const useTechSheetStore = create<State>()(
  persist(
    (set, get) => ({
      data: {},
      dirty: {},
      clearDirty(refs) {
        set((s) => {
          const next = { ...s.dirty };
          for (const r of refs) delete next[r];
          return { dirty: next };
        });
      },
      ensure(ref) {
        const cur = get().data[ref];
        if (cur) return cur;
        const fresh = seedFor(ref);
        set((s) => ({ data: { ...s.data, [ref]: fresh } }));
        return fresh;
      },
      updateMeta(ref, patch) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          const baseMeta: TechSheetMeta = cur.meta ?? {
            name: `Produto ${ref}`,
            category: "Confecção",
            collection: "Verão 2027",
            statusLabel: "Em engenharia",
            stage: 3,
          };
          return {
            data: { ...s.data, [ref]: { ...cur, meta: { ...baseMeta, ...patch } } },
            dirty: { ...s.dirty, [ref]: true },
          };
        });
      },
      setImage(ref, url) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          const clean = url && /^https:\/\//.test(url.trim()) ? url.trim() : undefined;
          return {
            data: { ...s.data, [ref]: { ...cur, image: clean } },
            dirty: { ...s.dirty, [ref]: true },
          };
        });
      },
      addBomItem(ref, item) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          const nextItem = syncBomCusto({ ...item, id: uid() });
          return {
            data: { ...s.data, [ref]: { ...cur, bom: [...cur.bom, nextItem] } },
            dirty: { ...s.dirty, [ref]: true },
          };
        });
      },
      bulkAddBomItems(ref, items) {
        if (!items.length) return;
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          const created = items.map((item) => syncBomCusto({ ...item, id: uid() }));
          return {
            data: { ...s.data, [ref]: { ...cur, bom: [...cur.bom, ...created] } },
            dirty: { ...s.dirty, [ref]: true },
          };
        });
      },
      updateBomItem(ref, id, patch) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return {
            data: {
              ...s.data,
              [ref]: {
                ...cur,
                bom: cur.bom.map((b) => (b.id === id ? syncBomCusto({ ...b, ...patch, id }) : b)),
              },
            },
            dirty: { ...s.dirty, [ref]: true },
          };
        });
      },
      removeBomItem(ref, id) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return {
            data: { ...s.data, [ref]: { ...cur, bom: cur.bom.filter((b) => b.id !== id) } },
            dirty: { ...s.dirty, [ref]: true },
          };
        });
      },
      addBopStep(ref, step) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return {
            data: { ...s.data, [ref]: { ...cur, bop: [...cur.bop, { ...step, id: uid() }] } },
            dirty: { ...s.dirty, [ref]: true },
          };
        });
      },
      updateBopStep(ref, id, patch) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return {
            data: {
              ...s.data,
              [ref]: {
                ...cur,
                bop: cur.bop.map((p) => (p.id === id ? { ...p, ...patch, id } : p)),
              },
            },
            dirty: { ...s.dirty, [ref]: true },
          };
        });
      },
      removeBopStep(ref, id) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return {
            data: { ...s.data, [ref]: { ...cur, bop: cur.bop.filter((b) => b.id !== id) } },
            dirty: { ...s.dirty, [ref]: true },
          };
        });
      },
      updatePreCost(ref, patch) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return {
            data: { ...s.data, [ref]: { ...cur, preCost: { ...cur.preCost, ...patch } } },
            dirty: { ...s.dirty, [ref]: true },
          };
        });
      },

      addAplicacao(ref, item) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return {
            data: {
              ...s.data,
              [ref]: { ...cur, aplicacoes: [...(cur.aplicacoes ?? []), { ...item, id: uid() }] },
            },
            dirty: { ...s.dirty, [ref]: true },
          };
        });
      },
      updateAplicacao(ref, id, patch) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return {
            data: {
              ...s.data,
              [ref]: {
                ...cur,
                aplicacoes: (cur.aplicacoes ?? []).map((a) =>
                  a.id === id ? { ...a, ...patch, id } : a,
                ),
              },
            },
            dirty: { ...s.dirty, [ref]: true },
          };
        });
      },
      removeAplicacao(ref, id) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return {
            data: {
              ...s.data,
              [ref]: { ...cur, aplicacoes: (cur.aplicacoes ?? []).filter((a) => a.id !== id) },
            },
            dirty: { ...s.dirty, [ref]: true },
          };
        });
      },

      setColorways(ref, colorways) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return {
            data: { ...s.data, [ref]: { ...cur, colorways } },
            dirty: { ...s.dirty, [ref]: true },
          };
        });
      },
      setMedidas(ref, medidas) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return {
            data: { ...s.data, [ref]: { ...cur, medidas } },
            dirty: { ...s.dirty, [ref]: true },
          };
        });
      },
      setEtiquetagem(ref, etiquetagem) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return {
            data: { ...s.data, [ref]: { ...cur, etiquetagem } },
            dirty: { ...s.dirty, [ref]: true },
          };
        });
      },
      setEncaixeCad(ref, encaixeCad) {
        set((s) => {
          const cur = s.data[ref] ?? seedFor(ref);
          return {
            data: { ...s.data, [ref]: { ...cur, encaixeCad } },
            dirty: { ...s.dirty, [ref]: true },
          };
        });
      },

      duplicateTechSheet(sourceRef, targetRef, targetName) {
        const cleanRef = targetRef.trim().toUpperCase();
        const src = get().data[sourceRef] ?? seedFor(sourceRef);
        const cloned: TechSheetData = {
          ...structuredClone(src),
          ref: cleanRef,
          meta: {
            name: targetName?.trim() || `${src.meta?.name ?? sourceRef} (Cópia)`,
            category: src.meta?.category ?? "Confecção",
            collection: src.meta?.collection ?? "Verão 2027",
            statusLabel: "Clonada de " + sourceRef,
            stage: 3,
          },
          versoes: [
            {
              id: uid(),
              versao: "v1.0",
              data: new Date().toISOString().slice(0, 10),
              autor: "Engenharia",
              status: "Rascunho",
              resumo: `Base duplicada a partir de ${sourceRef}`,
              alteracoes: [`Clonagem integral de BOM, roteiro, medidas e colorways (${sourceRef})`],
            },
          ],
        };
        set((s) => ({
          data: { ...s.data, [cleanRef]: cloned },
          dirty: { ...s.dirty, [cleanRef]: true },
        }));
        return cloned;
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
          // clone explícito: a versão congela o estado (incluindo aplicações!), não aponta para ele.
          snapshot: {
            bom: structuredClone(cur.bom),
            bop: structuredClone(cur.bop),
            preCost: structuredClone(cur.preCost),
            ...(cur.aplicacoes?.length ? { aplicacoes: structuredClone(cur.aplicacoes) } : {}),
          },
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
          dirty: { ...s.dirty, [ref]: true },
        }));
        return nova;
      },
    }),
    { name: "use-moda:techsheet" },
  ),
);

export function custoTotalBOM(items: BomItem[]) {
  return Math.round(items.reduce((acc, i) => acc + bomItemCustoEfetivo(i), 0) * 100) / 100;
}
export function tempoTotalBOP(steps: BopStep[]) {
  return Math.round(steps.reduce((acc, s) => acc + (Number(s.tempoMin) || 0), 0) * 100) / 100;
}
export function custoTotalBOP(steps: BopStep[]) {
  return Math.round(steps.reduce((acc, s) => acc + (Number(s.custo) || 0), 0) * 100) / 100;
}
