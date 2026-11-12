// Montagem da esteira de Desenvolvimento (Kanban de 7 estágios).
//
// Extraído da rota na Onda 30 porque aqui morava o **gerador** de ficha falsa:
// para cada referência vinda do Ciclo de Vida ou do Supabase que ainda não
// tivesse ficha, a rota fazia `doc: seedFor(code)` — e o ato de arrastar o
// cartão chamava `ensure(ref)` + `updateMeta(ref)`, o que gravava o modelo de
// demonstração no store e promovia a ref a "ficha salva". A partir daí RFQ,
// explosão MRP e showroom (Onda 29) passavam a operar sobre números inventados.
//
// Regra: referência sem ficha é um cartão **sem números**, com `doc === undefined`.
// Só o formulário de criação da esteira, preenchido pelo usuário, cria ficha.

import { computeFullTechSheetPricing } from "./pricing";
import type { TechSheetData, TechSheetLifecycleStage } from "./store";

export interface KanbanRefItem {
  ref: string;
  name: string;
  category: string;
  collection: string;
  stage: TechSheetLifecycleStage;
  /** `undefined` → a referência existe, mas ainda não tem engenharia salva. */
  doc?: TechSheetData;
}

export interface KanbanLifecycleRef {
  ref: string;
  nome: string;
  colecao?: string | null;
  pct: number;
  /** `true` = referência de demonstração (seed): ilustra, mas não avança. */
  demo?: boolean;
}

export interface KanbanDbRef {
  code: string;
  name: string;
  collection_id?: string | null;
}

export function mapPercentToStage(pct: number): TechSheetLifecycleStage {
  if (pct <= 15) return 1;
  if (pct <= 30) return 2;
  if (pct <= 50) return 3;
  if (pct <= 65) return 4;
  if (pct <= 80) return 5;
  if (pct < 100) return 6;
  return 7;
}

export function buildKanbanRefItems(input: {
  techDocs: Record<string, TechSheetData>;
  lifecycles: KanbanLifecycleRef[];
  dbRefs: KanbanDbRef[];
}): KanbanRefItem[] {
  const { techDocs, lifecycles, dbRefs } = input;
  const map = new Map<string, KanbanRefItem>();

  // 1) Fichas salvas no store persistente — as únicas com números.
  for (const [key, doc] of Object.entries(techDocs)) {
    const code = key.toUpperCase();
    map.set(code, {
      ref: code,
      name: doc.meta?.name ?? `Produto ${code}`,
      category: doc.meta?.category ?? "Confecção",
      collection: doc.meta?.collection ?? "Verão 2027",
      stage: doc.meta?.stage ?? 3,
      doc,
    });
  }

  // 2) Referências do Ciclo de Vida ainda não abertas no store.
  for (const lc of lifecycles) {
    const code = lc.ref.toUpperCase();
    if (map.has(code)) continue;
    map.set(code, {
      ref: code,
      name: lc.nome,
      category: "Coleção",
      collection: lc.colecao ?? "Verão 2027",
      stage: mapPercentToStage(lc.pct),
      // Demonstração nunca vira ficha: sem `doc`, o cartão não é arrastável
      // nem avança de estágio (`canAdvanceStage` exige `doc`).
      doc: lc.demo ? undefined : techDocs[code],
    });
  }

  // 3) Referências vindas do banco.
  for (const r of dbRefs) {
    const code = r.code.toUpperCase();
    const existing = map.get(code);
    if (existing) {
      map.set(code, { ...existing, name: r.name || existing.name });
    } else {
      map.set(code, {
        ref: code,
        name: r.name,
        category: "Confecção",
        collection: r.collection_id ?? "Verão 2027",
        stage: 3,
        doc: techDocs[code],
      });
    }
  }

  return Array.from(map.values());
}

/** Referência sem ficha não avança de etapa: o stage é da engenharia, não do cartão. */
export function canAdvanceStage(items: KanbanRefItem[], refCode: string): boolean {
  return !!items.find((i) => i.ref === refCode)?.doc;
}

/** Margem média só das fichas salvas; `null` quando não há nenhuma (vira `—`). */
export function averageKanbanMargin(items: KanbanRefItem[]): number | null {
  const comFicha = items.filter((i): i is KanbanRefItem & { doc: TechSheetData } => !!i.doc);
  if (!comFicha.length) return null;
  const soma = comFicha.reduce(
    (acc, it) => acc + computeFullTechSheetPricing(it.doc).margemLiquidaRealPct,
    0,
  );
  return Math.round((soma / comFicha.length) * 10) / 10;
}
