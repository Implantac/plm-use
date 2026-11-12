// Onda 60 — 54ª medição. Depois de validar a publicação da Onda 59, a
// varredura de risco **reabriu os diálogos/painéis de sequência** das rotas
// (a Onda 52 havia medido 19 diálogos; os painéis de ficha técnica, portal
// do fornecedor e showroom ficaram de fora).
//
//   ANTES (browser local, Onda 59): **43 campos sem nome acessível** na carga
//   inicial de 4 rotas — `tech-sheet` 23/29, `supplier-portal` 16/17,
//   `looks` 3/9, `references` 1/2 — e **180 campos** na fonte (critério das
//   Ondas 49/52: sem `aria-label`, sem `id`+`htmlFor`, sem `title`).
//
// Correção: `aria-label` derivado do `<Label>` visível (ou da coluna da
// tabela, com índice da linha) em **8 arquivos** — `supplier-portal`,
// `BomBopPanel`, `GarmentSketchStudio`, `showroom`,
// `OutsourcingServiceOrderPanel`, `OrderDetail`, `ReservationDialog` e
// `GradedMeasurementsPanel`. Nenhum handler, validação ou store mudou.
//
//   DEPOIS (fonte): **78** campos restantes, todos em outros arquivos
//   (`materials` 7 são falso positivo: o `<label>` envolve o campo e já é
//   nome acessível). Os 8 arquivos desta onda zeraram.
//
// Nenhuma asserção antiga é relaxada (guardas 47–59 preservadas).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

const ARQUIVOS = [
  "src/routes/_authenticated.supplier-portal.tsx",
  "src/components/techsheet/BomBopPanel.tsx",
  "src/components/techsheet/GarmentSketchStudio.tsx",
  "src/routes/_authenticated.showroom.tsx",
  "src/components/pcp/OutsourcingServiceOrderPanel.tsx",
  "src/components/sales/OrderDetail.tsx",
  "src/components/inventory/ReservationDialog.tsx",
  "src/components/techsheet/GradedMeasurementsPanel.tsx",
];

describe("Onda 60 — campos de diálogo/painel têm nome acessível", () => {
  it("os 8 arquivos medidos receberam aria-label", () => {
    expect(ARQUIVOS).toHaveLength(8);
    for (const arq of ARQUIVOS) {
      expect(ler(arq), arq).toContain("aria-label=");
    }
  });

  it("nenhum rótulo genérico ou de exemplo foi usado", () => {
    const tudo = ARQUIVOS.map(ler).join("\n");
    expect(tudo).not.toContain('aria-label="Campo do formulário"');
    expect(tudo).not.toContain('aria-label="opcional"');
    expect(tudo).not.toContain('aria-label="Campo"');
  });

  it("supplier-portal: diálogos de fornecedor/OP e cotações nomeados", () => {
    const f = ler("src/routes/_authenticated.supplier-portal.tsx");
    for (const m of [
      'aria-label="Código"',
      'aria-label="Fornecedor"',
      'aria-label="Código OP"',
      'aria-label="Tiragem Planejada (peças)"',
      "Fornecedor da cotação",
      "MOQ da cotação",
      "OTIF (%) da cotação",
      "qIdx",
    ]) {
      expect(f, m).toContain(m);
    }
  });

  it("BomBopPanel: linhas da tabela BOM/BOP identificadas por índice", () => {
    const f = ler("src/components/techsheet/BomBopPanel.tsx");
    for (const m of [
      "data.bom.map((b, idx)",
      "Tipo do item BOM",
      "Material do item BOM",
      "Perda (%) do item BOM",
      "Custo unitário do item BOM",
      ".map((s: BopStep, sIdx)",
      "Etapa BOP",
      "Tempo (min) da etapa BOP",
      'aria-label="Buscar material por nome, SKU ou fornecedor"',
      'aria-label="Colar linhas do Excel (BOM)"',
    ]) {
      expect(f, m).toContain(m);
    }
  });

  it("GarmentSketchStudio: divisor, cores, callouts e etiquetagem nomeados", () => {
    const f = ler("src/components/techsheet/GarmentSketchStudio.tsx");
    for (const m of [
      'aria-label="Impostos %"',
      'aria-label="Comissão %"',
      'aria-label="Lucro Alvo %"',
      'aria-label="Código Cor"',
      'aria-label="Cor Principal (Corpo)"',
      "Nº do callout",
      "Vista do callout",
      'aria-label="Classificação Fiscal (NCM)"',
      "Fibra ${idx + 1} da composição têxtil",
      'aria-label="URL da imagem (piloto fotografado ou render)"',
      "pinIdx",
    ]) {
      expect(f, m).toContain(m);
    }
  });

  it("showroom, OS, pedido, reserva e medidas nomeados", () => {
    const showroom = ler("src/routes/_authenticated.showroom.tsx");
    for (const m of [
      'aria-label="Referência da peça-mãe"',
      'aria-label="Referência avaliada"',
      'aria-label="Dimensão"',
      'aria-label="Autor"',
      'aria-label="Justificativa"',
    ]) {
      expect(showroom, m).toContain(m);
    }
    const os = ler("src/components/pcp/OutsourcingServiceOrderPanel.tsx");
    for (const m of [
      'aria-label="Referência SKU"',
      'aria-label="Terceiro Homologado"',
      'aria-label="M.O. R$/pç"',
      'aria-label="Franquia %"',
    ]) {
      expect(os, m).toContain(m);
    }
    const pedido = ler("src/components/sales/OrderDetail.tsx");
    for (const m of [
      'aria-label="Produto validado"',
      'aria-label="Descrição no pedido"',
      'aria-label="Quantidade da opção no item"',
    ]) {
      expect(pedido, m).toContain(m);
    }
    const reserva = ler("src/components/inventory/ReservationDialog.tsx");
    for (const m of [
      'aria-label="Insumo"',
      'aria-label="Armazém"',
      'aria-label="Tipo"',
      'aria-label="Observações"',
    ]) {
      expect(reserva, m).toContain(m);
    }
    const medidas = ler("src/components/techsheet/GradedMeasurementsPanel.tsx");
    for (const m of [
      "Código do ponto",
      "Regra de graduação (cm) do ponto",
      "Medida ${tam} do ponto",
      'aria-label="Tamanhos separados por vírgula"',
      'aria-label="Colar medidas do Excel / Audaces"',
    ]) {
      expect(medidas, m).toContain(m);
    }
  });

  it("o SQL aplicado em produção continua intocado", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
