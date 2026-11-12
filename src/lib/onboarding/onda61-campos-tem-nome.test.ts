// Onda 61 — 55ª medição. Depois de validar a publicação das Ondas 59 e 60
// com cliques reais em produção (entry novo `index-BQ5zgD_R.js`, 6 marcadores
// da 60 = 1, `/influencers` sem guias e diálogo 0/11), a varredura de risco
// **fechou o universo de campos sem nome** iniciado nas Ondas 49/52/60.
//
//   ANTES (fonte, Onda 60): **78 campos** sem `aria-label`/`id`+`htmlFor`/
//   `title` (critério 49/52). Descontados os falsos positivos de `<label>`
//   envolvente (`materials` 7, `OpWorkspace` 3, `planner` 3, `looks` 3,
//   `compare` 2), comentários e definições de componente, o universo real
//   era **48 campos em 18 arquivos**.
//
// Correção: `aria-label` derivado do `<Label>` visível (ou da coluna, com
// índice) em **18 arquivos** — `PassagemForm`, `OcorrenciaForm`,
// `route-engineering`, `ProductStudio`, `CuttingRoomPlanPanel`, `financial`,
// `measurements`, `MovementDialog`, `analytics`, `CommentsPanel`,
// `PreCostPanel`, `TechSheetVersions`, `CostQueueNominalPanel`,
// `collection-map`, `inventory`, `launch`, `prints`, `references`.
// Nenhum handler, validação ou store mudou.
//
//   DEPOIS (fonte): **30** no contador bruto, **0 reais** — todos os
//   restantes são `<label>` envolvente, comentário, definição de componente
//   ou `aria-label` após `=>` (falso positivo do contador estático).
//
// Nenhuma asserção antiga é relaxada (guardas 47–60 preservadas).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

const ARQUIVOS = [
  "src/components/pcp/PassagemForm.tsx",
  "src/components/pcp/OcorrenciaForm.tsx",
  "src/routes/_authenticated.route-engineering.tsx",
  "src/components/ai/ProductStudio.tsx",
  "src/components/pcp/CuttingRoomPlanPanel.tsx",
  "src/routes/_authenticated.financial.tsx",
  "src/routes/_authenticated.measurements.tsx",
  "src/components/inventory/MovementDialog.tsx",
  "src/routes/_authenticated.analytics.tsx",
  "src/components/comments/CommentsPanel.tsx",
  "src/components/techsheet/PreCostPanel.tsx",
  "src/components/techsheet/TechSheetVersions.tsx",
  "src/components/sales/CostQueueNominalPanel.tsx",
  "src/routes/_authenticated.collection-map.tsx",
  "src/routes/_authenticated.inventory.tsx",
  "src/routes/_authenticated.launch.tsx",
  "src/routes/_authenticated.prints.tsx",
  "src/routes/_authenticated.references.tsx",
];

describe("Onda 61 — campos restantes têm nome acessível", () => {
  it("os 18 arquivos medidos receberam aria-label", () => {
    expect(ARQUIVOS).toHaveLength(18);
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

  it("PCP: passagem e ocorrência nomeadas", () => {
    const passagem = ler("src/components/pcp/PassagemForm.tsx");
    for (const m of [
      'aria-label="Tipo"',
      'aria-label="Setor destino"',
      'aria-label="Tipo de defeito"',
      'aria-label="Quantidade"',
      'aria-label="Responsável"',
      'aria-label="Observação"',
    ]) {
      expect(passagem, m).toContain(m);
    }
    const ocorrencia = ler("src/components/pcp/OcorrenciaForm.tsx");
    for (const m of [
      'aria-label="Tipo"',
      'aria-label="Motivo"',
      'aria-label="Responsável"',
      'aria-label="Observação"',
    ]) {
      expect(ocorrencia, m).toContain(m);
    }
  });

  it("engenharia e corte: jornada, estúdio e enfesto nomeados", () => {
    const rota = ler("src/routes/_authenticated.route-engineering.tsx");
    for (const m of [
      'aria-label="Jornada (min/dia)"',
      'aria-label="Eficiência (%)"',
      'aria-label="Meta Diária (pçs)"',
      'aria-label="Custo Minuto (R$)"',
    ]) {
      expect(rota, m).toContain(m);
    }
    const studio = ler("src/components/ai/ProductStudio.tsx");
    for (const m of [
      'aria-label="Variações de cor"',
      'aria-label="Posição na peça"',
      'aria-label="Técnica"',
    ]) {
      expect(studio, m).toContain(m);
    }
    const corte = ler("src/components/pcp/CuttingRoomPlanPanel.tsx");
    for (const m of [
      'aria-label="Cor do Enfesto"',
      'aria-label="Folhas Totais"',
      'aria-label="Máx. Folhas/Mesa"',
      'aria-label="Pontas (cm)"',
    ]) {
      expect(corte, m).toContain(m);
    }
  });

  it("financeiro, medidas, estoque e analytics nomeados", () => {
    const fin = ler("src/routes/_authenticated.financial.tsx");
    for (const m of [
      'aria-label="Título / Categoria"',
      'aria-label="Fonte"',
      'aria-label="Valor"',
      'aria-label="Vencimento"',
    ]) {
      expect(fin, m).toContain(m);
    }
    const med = ler("src/routes/_authenticated.measurements.tsx");
    for (const m of [
      'aria-label="Código"',
      'aria-label="Nome"',
      'aria-label="Categoria"',
      'aria-label="Segmento"',
    ]) {
      expect(med, m).toContain(m);
    }
    const mov = ler("src/components/inventory/MovementDialog.tsx");
    for (const m of [
      'aria-label="Tipo"',
      'aria-label="Lote (opcional)"',
      'aria-label="Justificativa"',
    ]) {
      expect(mov, m).toContain(m);
    }
    const ana = ler("src/routes/_authenticated.analytics.tsx");
    for (const m of [
      'aria-label="Nome do Indicador"',
      'aria-label="Valor Atual"',
      'aria-label="Meta / Subtítulo"',
    ]) {
      expect(ana, m).toContain(m);
    }
  });

  it("comentários, pré-custo, versões, lista nominal e filtros nomeados", () => {
    const com = ler("src/components/comments/CommentsPanel.tsx");
    for (const m of ['aria-label="Editar comentário"', 'aria-label="Escreva um comentário"']) {
      expect(com, m).toContain(m);
    }
    const pre = ler("src/components/techsheet/PreCostPanel.tsx");
    for (const m of ['aria-label="Arquivo Molde CAD"', "aria-label={label}"]) {
      expect(pre, m).toContain(m);
    }
    const ver = ler("src/components/techsheet/TechSheetVersions.tsx");
    for (const m of [
      'aria-label="Resumo da alteração"',
      'aria-label="Alterações (separe por ; )"',
    ]) {
      expect(ver, m).toContain(m);
    }
    const lista = ler("src/components/sales/CostQueueNominalPanel.tsx");
    expect(lista).toContain('aria-label="Cole do Excel ou edite (1 peça por linha)"');
    const mapa = ler("src/routes/_authenticated.collection-map.tsx");
    expect(mapa).toContain('aria-label="Nome"');
    const inv = ler("src/routes/_authenticated.inventory.tsx");
    expect(inv).toContain("aria-label={label}");
    const lan = ler("src/routes/_authenticated.launch.tsx");
    expect(lan).toContain('aria-label="Wave destino"');
    const pri = ler("src/routes/_authenticated.prints.tsx");
    expect(pri).toContain('aria-label="Formato"');
    const ref = ler("src/routes/_authenticated.references.tsx");
    expect(ref).toContain('aria-label="Filtrar por status"');
  });

  it("o SQL aplicado em produção continua intocado", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
