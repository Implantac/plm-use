import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  codigoOrdemCompra,
  convitesPendentes,
  quotesComparaveis,
  validarResposta,
  type RfqQuoteRow,
} from "./rfq-quotes";

// Onda 119 — cotação de verdade: nada inventado, persistida, fornecedor responde, adjudicar gera OC.
const base: RfqQuoteRow = {
  id: "q1",
  reference_code: "REF001",
  bom_item_id: "b1",
  material: "Malha PV",
  unidade: "kg",
  quantidade: 120,
  supplier_id: "s1",
  preco_unitario: 32.5,
  moq: 100,
  lead_time_dias: 12,
  otif_pct: 95,
  condicao_pagamento: "28 DDL",
  observacoes: null,
  origem: "fornecedor",
  status: "respondida",
  supplier_order_id: null,
  respondido_em: null,
};
const sups = [{ id: "s1", name: "Malharia Real", uf: "SC" }];

describe("onda119: rfq persistida", () => {
  it("só propostas com preço entram no comparativo; convites e perdidas ficam fora", () => {
    const rows: RfqQuoteRow[] = [
      base,
      { ...base, id: "q2", supplier_id: "s2", preco_unitario: null, status: "convidada" },
      { ...base, id: "q3", supplier_id: "s3", status: "perdida" },
    ];
    const cmp = quotesComparaveis(rows, sups);
    expect(cmp.map((q) => q.id)).toEqual(["q1"]);
    expect(cmp[0]).toMatchObject({ fornecedor: "Malharia Real", uf: "SC", precoUnitario: 32.5 });
    expect(convitesPendentes(rows).map((r) => r.id)).toEqual(["q2"]);
  });

  it("valida a resposta com mensagens que dizem o que falta", () => {
    expect(validarResposta({ precoUnitario: 0, moq: 1, leadTimeDias: 1 })).toMatch(/preço/i);
    expect(validarResposta({ precoUnitario: 1, moq: 0, leadTimeDias: 1 })).toMatch(/lote mínimo/i);
    expect(validarResposta({ precoUnitario: 1, moq: 1, leadTimeDias: 0 })).toMatch(/prazo/i);
    expect(validarResposta({ precoUnitario: 1, moq: 1, leadTimeDias: 1 })).toBeNull();
  });

  it("gera código legível de OC", () => {
    expect(codigoOrdemCompra("REF001", "Malha PV Ação", new Date(2026, 10, 21, 9, 5))).toBe(
      "OC-REF001-MALHAPVA-202611210905",
    );
  });

  it("não existe mais gerador de propostas inventadas nem estado em memória na aba", () => {
    const motor = readFileSync(new URL("../techsheet/sourcing-rfq.ts", import.meta.url), "utf8");
    expect(motor).not.toContain("buildDefaultQuotesForItem");
    expect(motor).not.toContain("Têxtil Santa Catarina");
    const aba = readFileSync(
      new URL("../../routes/_authenticated.supplier-portal.tsx", import.meta.url),
      "utf8",
    );
    expect(aba).not.toContain("quotesByKey");
    expect(aba).toContain('from("rfq_quotes")');
    expect(aba).toContain("MinhasCotacoesPanel");
  });

  it("migration: RLS por fornecedor e único por item+fornecedor", () => {
    const sql = readFileSync(
      new URL(
        "../../../supabase/migrations/20261121120000_rfq_quotes_persistidas.sql",
        import.meta.url,
      ),
      "utf8",
    );
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("user_belongs_to_supplier(auth.uid(), supplier_id)");
    expect(sql).toContain("UNIQUE (reference_code, bom_item_id, supplier_id)");
    expect(sql).toMatch(/status IN \('convidada', 'respondida', 'adjudicada', 'perdida'\)/);
  });
});
