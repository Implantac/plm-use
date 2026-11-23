// Onda 119 — Cotação (RFQ) persistida: helpers puros entre a tabela `rfq_quotes`
// e o motor de comparação TCO (`scoreRfqProposals`).
import type { RfqSupplierQuote } from "@/lib/techsheet/sourcing-rfq";

export type RfqStatus = "convidada" | "respondida" | "adjudicada" | "perdida";

export interface RfqQuoteRow {
  id: string;
  reference_code: string;
  bom_item_id: string;
  material: string;
  unidade: string;
  quantidade: number;
  supplier_id: string;
  preco_unitario: number | null;
  moq: number;
  lead_time_dias: number;
  otif_pct: number;
  condicao_pagamento: string | null;
  observacoes: string | null;
  origem: string;
  status: string;
  supplier_order_id: string | null;
  respondido_em: string | null;
}

export interface SupplierLite {
  id: string;
  name: string;
  uf: string | null;
}

/** Só propostas com preço entram no comparativo; convites sem resposta ficam de fora. */
export function quotesComparaveis(
  rows: RfqQuoteRow[],
  suppliers: SupplierLite[],
): RfqSupplierQuote[] {
  const byId = new Map(suppliers.map((s) => [s.id, s]));
  return rows
    .filter((r) => r.preco_unitario != null && r.preco_unitario > 0 && r.status !== "perdida")
    .map((r) => ({
      id: r.id,
      fornecedor: byId.get(r.supplier_id)?.name ?? "Fornecedor",
      uf: byId.get(r.supplier_id)?.uf ?? "",
      precoUnitario: Number(r.preco_unitario),
      moq: Number(r.moq),
      leadTimeDias: Number(r.lead_time_dias),
      otifPct: Number(r.otif_pct),
      condicaoPagamento: r.condicao_pagamento ?? "",
    }));
}

/** Convites ainda sem resposta — o comprador vê quem falta; o fornecedor vê o que deve responder. */
export function convitesPendentes(rows: RfqQuoteRow[]): RfqQuoteRow[] {
  return rows.filter((r) => r.status === "convidada");
}

/** Validação do formulário de resposta (comprador digitando ou fornecedor no portal). */
export function validarResposta(input: {
  precoUnitario: number;
  moq: number;
  leadTimeDias: number;
}): string | null {
  if (!(input.precoUnitario > 0)) return "Informe o preço unitário.";
  if (!(input.moq > 0)) return "O lote mínimo precisa ser maior que zero.";
  if (!(input.leadTimeDias > 0)) return "O prazo de entrega precisa ser de pelo menos 1 dia.";
  return null;
}

/** Código legível da ordem de compra gerada na adjudicação. */
export function codigoOrdemCompra(referenceCode: string, material: string, when = new Date()) {
  const slug = material
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "")
    .slice(0, 8)
    .toUpperCase();
  const stamp = `${when.getFullYear()}${String(when.getMonth() + 1).padStart(2, "0")}${String(when.getDate()).padStart(2, "0")}${String(when.getHours()).padStart(2, "0")}${String(when.getMinutes()).padStart(2, "0")}`;
  return `OC-${referenceCode}-${slug || "ITEM"}-${stamp}`;
}
