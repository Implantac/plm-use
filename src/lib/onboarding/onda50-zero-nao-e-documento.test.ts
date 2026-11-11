// Onda 50 — 33ª medição. Varredura de 44 rotas + cliques reais em produção
// (Chromium, sessão local, papel `admin` simulado) achou 4 emissores que ainda
// abriam A4. Dois já estavam protegidos:
//
//   /ai-agents  "Imprimir Parecer A4"  → "sem ficha salva · SAM médio —"
//   /analytics  "Book S&OP A4"         → 6 travessões + aviso explícito
//
// Dois NÃO estavam e apuravam zero como se fosse dado operacional:
//
//   /inventory "CSV Compras ERP"      → mrp-ressuprimento-liquido.csv SÓ com
//                                       o cabeçalho + toast de SUCESSO
//   /inventory "Requisição MRP A4"    → "ORÇAMENTO TOTAL R$ 0.00", tabela
//                                       vazia, nenhum aviso
//   /planner   "Mapa CRP A4"          → 4 setores "0 min / 0%" com a diretriz
//                                       "Folga operacional disponível..." e
//                                       fila EDD vazia
//
// Regra das Ondas 22/23/27–48: só pedido/ficha/OP salvos entram em número ou
// documento operacional; ausência vira `—` com aviso/CTA, não zero apurado.
//
// Correção: `podeEmitirMrp()` e `podeEmitirCrp()` decidem a emissão; gate nos
// handlers + botões `disabled` + aviso/CTA com `data-testid`; KPIs `—`.
// As funções puras de formatação NÃO foram alteradas (Onda 48): o formatador
// continua produzindo "R$ 0.00" se chamado sem gate — por isso o gate é
// obrigatório no chamador e está travado aqui. Nenhuma asserção antiga é
// relaxada.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { pedidosSalvos } from "@/test/pedidos-salvos";
import {
  MRP_SEM_APURACAO,
  buildMrpCsv,
  buildMrpPurchaseRequisitionHtml,
  computeMrpNetExplosion,
  podeEmitirMrp,
} from "@/lib/inventory/mrp-explosion";
import {
  CRP_SEM_APURACAO,
  buildFiniteCapacityScheduleHtml,
  evaluateFiniteSectorCapacity,
  podeEmitirCrp,
  sequenceOrdersEdd,
  type SchedulableOrderInput,
} from "@/lib/pcp/finite-capacity-planner";
import { seedFor } from "@/lib/techsheet/store";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

const fichasSalvas = {
  DEV000006: seedFor("DEV000006"),
  "V24-001": seedFor("V24-001"),
};

const opsSalvas: SchedulableOrderInput[] = [
  {
    id: "op-50-1",
    orderNumber: "OP-2026-102",
    refCode: "V24-001",
    productName: "Polo Piquet Pima",
    pieces: 1800,
    dueDate: "2026-11-18",
    priority: "media",
    hasCustomApplication: true,
  },
];

describe("Onda 50 — zero apurado não vira documento", () => {
  it("MRP vazio é ausência de apuração, não orçamento R$ 0,00", () => {
    const vazio = computeMrpNetExplosion({ orders: [], sheets: {} });
    expect(vazio.rows).toHaveLength(0);
    expect(vazio.totalPurchaseBudgetBrl).toBe(0);
    const decisao = podeEmitirMrp(vazio);
    expect(decisao.pode).toBe(false);
    expect(decisao.motivo).toContain("R$ 0,00");
    expect(decisao.motivo).toContain("não são apuráveis");
    expect(MRP_SEM_APURACAO).toBe(decisao.motivo);
  });

  it("MRP com pedido + ficha salvos continua emitindo CSV e A4", () => {
    const real = computeMrpNetExplosion({ orders: pedidosSalvos(), sheets: fichasSalvas });
    expect(real.rows.length).toBeGreaterThan(2);
    expect(podeEmitirMrp(real).pode).toBe(true);
    expect(podeEmitirMrp(real).motivo).toBe("");
    expect(buildMrpCsv(real)).toContain("Malha Piquet Pima");
    expect(buildMrpPurchaseRequisitionHtml(real)).toContain("Requisição Automática");
  });

  it("CRP sem OP/pedido é ausência de apuração, não ocupação 0%", () => {
    const decisao = podeEmitirCrp([]);
    expect(decisao.pode).toBe(false);
    expect(decisao.motivo).toContain("0%");
    expect(decisao.motivo).toContain("não são apuráveis");
    expect(CRP_SEM_APURACAO).toBe(decisao.motivo);
  });

  it("CRP com OP salva continua sequenciando e emitindo o Mapa A4", () => {
    const slots = sequenceOrdersEdd(opsSalvas, "2026-11-04", 12);
    const loads = evaluateFiniteSectorCapacity(opsSalvas);
    expect(slots).toHaveLength(1);
    expect(podeEmitirCrp(slots).pode).toBe(true);
    const html = buildFiniteCapacityScheduleHtml(loads, slots);
    expect(html).toContain("OP-2026-102");
    expect(html).toContain("Balanço Carga");
  });

  it("formatadores continuam puros: a decisão é do chamador", () => {
    const mrp = ler("src/lib/inventory/mrp-explosion.ts");
    const crp = ler("src/lib/pcp/finite-capacity-planner.ts");
    // Sem gate, o formatador ainda produziria zero apurado — documento disso:
    const vazio = computeMrpNetExplosion({ orders: [], sheets: {} });
    expect(buildMrpPurchaseRequisitionHtml(vazio)).toContain("R$ 0.00");
    expect(buildMrpCsv(vazio).split("\n")).toHaveLength(1);
    // ...e nenhum formatador chama o gate internamente (recorte pelo corpo
    // exato de cada função: os gates foram anexados DEPOIS dos formatadores).
    expect(mrp).toContain("export function podeEmitirMrp(");
    expect(crp).toContain("export function podeEmitirCrp(");
    const csvFmt = mrp.slice(
      mrp.indexOf("export function buildMrpCsv"),
      mrp.indexOf("export function buildMrpPurchaseRequisitionHtml"),
    );
    const htmlFmt = mrp.slice(
      mrp.indexOf("export function buildMrpPurchaseRequisitionHtml"),
      mrp.indexOf("export interface EmissaoMrp"),
    );
    const crpFmt = crp.slice(
      crp.indexOf("export function buildFiniteCapacityScheduleHtml"),
      crp.indexOf("export interface EmissaoCrp"),
    );
    expect(csvFmt).not.toContain("podeEmitirMrp");
    expect(htmlFmt).not.toContain("podeEmitirMrp");
    expect(crpFmt).not.toContain("podeEmitirCrp");
  });

  it("os 3 emissores têm gate, botão desabilitado, aviso e CTA", () => {
    const painelMrp = ler("src/components/inventory/MrpNetExplosionPanel.tsx");
    const painelCrp = ler("src/components/pcp/FiniteCapacityPanel.tsx");
    for (const fonte of [painelMrp, painelCrp]) {
      expect(fonte).toContain("toast.error(emissao.motivo)");
      expect(fonte).toContain("disabled={!emissao.pode}");
      expect(fonte).toContain("CtaProximoPasso");
      expect(fonte).toContain("—");
    }
    expect((painelMrp.match(/toast\.error\(emissao\.motivo\)/g) ?? []).length).toBe(2);
    expect((painelMrp.match(/disabled=\{!emissao\.pode\}/g) ?? []).length).toBe(2);
    expect(painelMrp).toContain('data-testid="mrp-sem-apuracao"');
    expect(painelMrp).toContain('testId="cta-mrp-sem-pedido"');
    expect(painelCrp).toContain('data-testid="crp-sem-op"');
    expect(painelCrp).toContain('testId="cta-crp-sem-op"');
  });

  it("as guardas das Ondas 47, 48 e 49 permanecem intactas", () => {
    expect(ler("src/components/sales/CostQueueNominalPanel.tsx")).toContain(
      'data-testid="ficha-cega-bloqueada"',
    );
    expect(ler("src/routes/_authenticated.marketing.tsx")).toContain(
      'data-testid="media-kit-bloqueado"',
    );
    expect(ler("src/routes/_authenticated.collection-map.tsx")).toContain(
      'data-testid="colecao-so-vitrine"',
    );
    expect(ler("src/routes/_authenticated.launch.tsx")).toContain('htmlFor="wave-codigo"');
    expect(ler("src/routes/_authenticated.quality.tsx")).toContain(
      'aria-label="Defeito ou problema da CAPA"',
    );
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
