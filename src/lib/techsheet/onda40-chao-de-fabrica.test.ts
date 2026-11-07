// Onda 40 — as últimas vitrines de chão de fábrica não entram no número.
//
// Medição executada ANTES da correção:
//   INITIAL_SERVICE_ORDERS (3 OS de fábrica)
//   → computeLiveSopSnapshot(...).outsourcedPiecesInFlight = 656
//   → Book Executivo S&OP A4: "Costura Interna / Em Facção: 0% · 656 pçs"
//   usePCPStore.getState().lotes = 4 lotes de fábrica
//   → copiloto: "4 lotes monitorados · 0 peças pendentes" e, sem fila
//     crítica, "Nenhuma fila crítica pendente nos lotes atuais" (falsa).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { lotesSalvos, servicosSalvos } from "@/test/chao-de-fabrica-salvo";
import { campanhasSalvas } from "@/test/campanhas-salvas";
import { pedidosSalvos } from "@/test/pedidos-salvos";
import { buildExecutiveSopReportHtml, computeLiveSopSnapshot } from "@/lib/analytics/live-sop";
import { runDeterministicAgentAnalysis } from "@/lib/ai/deterministic-copilot";
import { lotesOperacionais, usePCPStore } from "@/lib/pcp/store";
import {
  INITIAL_SERVICE_ORDERS,
  SERVICO_DEMO_LABEL,
  servicosOperacionais,
  useOutsourcingStore,
  type ExternalServiceOrder,
} from "./outsourcing-os";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");
const codigo = (f: string) =>
  f
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");

const snapVitrine = () =>
  computeLiveSopSnapshot({
    orders: [],
    campaigns: [],
    serviceOrders: INITIAL_SERVICE_ORDERS,
  });

beforeEach(() => {
  useOutsourcingStore.setState({ serviceOrders: INITIAL_SERVICE_ORDERS });
});

describe("Onda 40 — OS e lotes de fábrica são vitrine", () => {
  it("as 3 OS iniciais estão marcadas e continuam visíveis", () => {
    expect(INITIAL_SERVICE_ORDERS).toHaveLength(3);
    expect(INITIAL_SERVICE_ORDERS.every((o) => o.demo === true)).toBe(true);
    expect(INITIAL_SERVICE_ORDERS[0]?.osNumber).toBe("OS-2026-041");
    expect(INITIAL_SERVICE_ORDERS[0]?.qtySent).toBe(600);
    expect(SERVICO_DEMO_LABEL).toContain("não entra em número operacional");
  });

  it("os 4 lotes iniciais estão marcados", () => {
    const lotes = usePCPStore.getState().lotes;
    expect(lotes).toHaveLength(4);
    expect(lotes.every((l) => l.demo === true)).toBe(true);
    expect(lotesOperacionais(lotes)).toEqual([]);
  });

  it("servicosOperacionais separa vitrine de produção real", () => {
    expect(servicosOperacionais(INITIAL_SERVICE_ORDERS)).toEqual([]);
    const mistura: ExternalServiceOrder[] = [
      ...INITIAL_SERVICE_ORDERS,
      { ...servicosSalvos()[0]!, id: "minha-os", osNumber: "OS-MINHA-1" },
    ];
    expect(servicosOperacionais(mistura).map((o) => o.id)).toEqual(["minha-os"]);
  });

  it("o S&OP não soma as 656 peças de papel", () => {
    const snap = snapVitrine();
    expect(snap.outsourcedPiecesInFlight).toBe(0);
    expect(snap.apuravelFaccao).toBe(false);
  });

  it("o Book A4 declara '—' em vez de imprimir 656 pçs", () => {
    const html = buildExecutiveSopReportHtml(snapVitrine());
    expect(html).toContain("Sem OS de facção salva");
    expect(html).not.toContain("656 pçs");
    expect(html).toContain('<div class="val">—</div>');
  });

  it("copiloto PCP declara ausência em vez de '4 lotes monitorados'", () => {
    const r = runDeterministicAgentAnalysis({
      agent: "pcp",
      question: "PCP",
      sheets: {},
      privateLabelOrders: [],
      lotesSummary: [],
      drops: [],
    });
    expect(r).toContain("sem lotes salvos · balanceamento não apurável");
    expect(r).not.toContain("4 lotes monitorados");
    expect(r).not.toContain("Nenhuma fila crítica pendente nos lotes atuais");
  });
});

describe("Onda 40 — com operação real tudo continua apurando", () => {
  it("S&OP e A4 mantêm as 656 peças (sem afrouxar)", () => {
    const snap = computeLiveSopSnapshot({
      orders: pedidosSalvos(),
      campaigns: campanhasSalvas(),
      serviceOrders: servicosSalvos(),
    });
    expect(snap.outsourcedPiecesInFlight).toBe(656);
    expect(snap.apuravelFaccao).toBe(true);
    expect(snap.apuravelB2b).toBe(true);
    expect(snap.apuravelGtm).toBe(true);
    const html = buildExecutiveSopReportHtml(snap);
    expect(html).toContain("656 pçs");
    expect(html).not.toContain("não apurável");
  });

  it("copiloto PCP mantém a contagem dos lotes salvos", () => {
    const lotes = lotesSalvos();
    const resumo = lotes.map((l) => ({
      numero: l.numero,
      grupo: l.grupo,
      prontoPct: 60,
      pendentePcs: 0,
    }));
    const r = runDeterministicAgentAnalysis({
      agent: "pcp",
      question: "PCP",
      sheets: {},
      privateLabelOrders: [],
      lotesSummary: resumo,
      drops: [],
    });
    expect(r).toContain("4 lotes monitorados");
  });
});

describe("Onda 40 — editar promove a vitrine a produção real", () => {
  it("updateOrderReturns remove o selo demo da OS", () => {
    useOutsourcingStore.getState().updateOrderReturns("os-101", {
      qtyReturnedFirst: 421,
      qtyReturnedSecond: 4,
      qtyLost: 0,
    });
    const o = useOutsourcingStore.getState().serviceOrders.find((x) => x.id === "os-101");
    expect(o?.demo).toBe(false);
    expect(servicosOperacionais(useOutsourcingStore.getState().serviceOrders)).toHaveLength(1);
  });

  it("addServiceOrder cria OS operacional", () => {
    useOutsourcingStore.getState().addServiceOrder({
      ...servicosSalvos()[0]!,
      id: "os-nova",
      demo: true,
    });
    const o = useOutsourcingStore.getState().serviceOrders.find((x) => x.id === "os-nova");
    expect(o?.demo).toBe(false);
  });

  it("registrarOcorrencia promove o lote", () => {
    const res = usePCPStore.getState().registrarOcorrencia({
      lote: "LOTE 2601",
      ref: "CM704",
      tipo: "positiva",
      qtd: 1,
      motivo: "teste de procedência",
      responsavel: "teste",
    });
    expect(res.ok).toBe(true);
    const l = usePCPStore.getState().lotes.find((x) => x.numero === "LOTE 2601");
    expect(l?.demo).toBe(false);
    expect(lotesOperacionais(usePCPStore.getState().lotes)).toHaveLength(1);
  });
});

describe("Onda 40 — guardas de fonte", () => {
  it("todos os consumidores filtram ou declaram a vitrine", () => {
    for (const rel of [
      "src/lib/analytics/live-sop.ts",
      "src/components/analytics/LiveSopBoard.tsx",
    ]) {
      expect(codigo(ler(rel)), rel).toContain("servicosOperacionais");
    }
    expect(codigo(ler("src/routes/_authenticated.ai-agents.tsx"))).toContain("lotesOperacionais");
    expect(codigo(ler("src/lib/analytics/live-sop.ts"))).toContain("apuravelFaccao");
    expect(codigo(ler("src/components/analytics/LiveSopBoard.tsx"))).toContain("sop-sem-faccao");
  });
});
