// Onda 41 — a trilha de auditoria LGPD não contém ficção.
//
// Medição executada ANTES da correção:
//   INITIAL_GOVERNANCE_EVENTS = 4 eventos de fábrica:
//     "Helena Prado" · engenharia_custo ·
//     "Aprovou matriz de setup e margem do pedido B2B PD-2026-802" ·
//     "Execução de Contrato" · 2026-11-03
//   buildLgpdAuditCsv(...)             → CSV com essas 4 linhas
//   buildRbacGovernanceHtmlReport(...) → A4 "Trilha Recente de Auditoria & LGPD"
//                                        com as mesmas 4 linhas
//   security.tsx                      → KPI "Trilha LGPD: 4 eventos"
//
// Eram atores, aprovações e bases legais INVENTADOS num documento de
// conformidade que pode ser baixado e apresentado a um auditor.
//
// Também medido: 4 briefings de fábrica (targetPriceBrl 229.9/289.9/169.9/
// 259.9, confidencePct 95/92/94/89) geravam avgConfidence 92.5 exibido como
// "Aderência Comercial · score tendência".

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { briefingsSalvos, eventosSalvos } from "@/test/governanca-e-briefings";
import { campanhasSalvas } from "@/test/campanhas-salvas";
import {
  INITIAL_GOVERNANCE_EVENTS,
  EVENTO_DEMO_LABEL,
  buildLgpdAuditCsv,
  buildRbacGovernanceHtmlReport,
  eventosAuditaveis,
  useSecurityGovernanceStore,
  type GovernanceAuditEntry,
} from "./rbac-governance";
import {
  BRIEFING_DEMO_LABEL,
  INITIAL_BRIEFINGS,
  briefingsOperacionais,
  useResearchGtmStore,
  type BriefingInsight,
} from "@/lib/techsheet/research-gtm";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");
const codigo = (f: string) =>
  f
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");

beforeEach(() => {
  useSecurityGovernanceStore.setState({ auditEntries: INITIAL_GOVERNANCE_EVENTS });
  useResearchGtmStore.setState({
    briefings: INITIAL_BRIEFINGS,
    campaigns: campanhasSalvas(),
  });
});

describe("Onda 41 — o CSV e o A4 de governança não exportam ficção", () => {
  it("os 4 eventos iniciais estão marcados e continuam visíveis", () => {
    expect(INITIAL_GOVERNANCE_EVENTS).toHaveLength(4);
    expect(INITIAL_GOVERNANCE_EVENTS.every((e) => e.demo === true)).toBe(true);
    expect(INITIAL_GOVERNANCE_EVENTS[0]?.actor).toBe("Helena Prado");
    expect(INITIAL_GOVERNANCE_EVENTS[0]?.action).toContain("PD-2026-802");
    expect(EVENTO_DEMO_LABEL).toContain("não entra na trilha de auditoria LGPD");
  });

  it("eventosAuditaveis separa vitrine de trilha real", () => {
    expect(eventosAuditaveis(INITIAL_GOVERNANCE_EVENTS)).toEqual([]);
    const mistura: GovernanceAuditEntry[] = [
      ...INITIAL_GOVERNANCE_EVENTS,
      { ...eventosSalvos()[0]!, id: "aud-real", actor: "Operador Real" },
    ];
    expect(eventosAuditaveis(mistura).map((e) => e.id)).toEqual(["aud-real"]);
  });

  it("CSV com só vitrine tem apenas o cabeçalho", () => {
    const csv = buildLgpdAuditCsv(INITIAL_GOVERNANCE_EVENTS);
    expect(csv.trim().split("\n")).toHaveLength(1);
    expect(csv).toContain("id;data_hora;ator;papel_rbac;acao_auditada;base_legal_lgpd");
    expect(csv).not.toContain("Helena Prado");
    expect(csv).not.toContain("PD-2026-802");
  });

  it("A4 com só vitrine declara ausência e não imprime os atores de papel", () => {
    const html = buildRbacGovernanceHtmlReport("admin", INITIAL_GOVERNANCE_EVENTS);
    expect(html).toContain("Trilha LGPD não auditável");
    expect(html).not.toContain("Helena Prado");
    expect(html).not.toContain("Aprovou matriz de setup");
    expect(html).not.toContain("<tbody></tbody>");
  });

  it("com eventos salvos, CSV e A4 continuam apurando (sem afrouxar)", () => {
    const csv = buildLgpdAuditCsv(eventosSalvos());
    expect(csv).toContain("engenharia_custo");
    expect(csv).toContain("Lista Nominal por Peça");
    const html = buildRbacGovernanceHtmlReport("admin", eventosSalvos());
    expect(html).toContain("Helena Prado");
    expect(html).not.toContain("Trilha LGPD não auditável");
  });

  it("registrar um evento real torna a trilha auditável", () => {
    useSecurityGovernanceStore.getState().recordAuditEvent({
      actor: "Auditoria Interna",
      role: "admin",
      action: "Revisou a matriz RBAC",
      lgpdBasis: "Obrigação Legal Fiscal",
    });
    const entries = useSecurityGovernanceStore.getState().auditEntries;
    expect(eventosAuditaveis(entries)).toHaveLength(1);
    expect(buildLgpdAuditCsv(entries)).toContain("Auditoria Interna");
  });
});

describe("Onda 41 — briefing de fábrica não gera score de tendência", () => {
  it("os 4 briefings iniciais estão marcados", () => {
    expect(INITIAL_BRIEFINGS).toHaveLength(4);
    expect(INITIAL_BRIEFINGS.every((b) => b.demo === true)).toBe(true);
    expect(INITIAL_BRIEFINGS.map((b) => b.targetPriceBrl)).toEqual([229.9, 289.9, 169.9, 259.9]);
    expect(Math.round(INITIAL_BRIEFINGS.reduce((a, b) => a + b.confidencePct, 0) / 4)).toBe(93);
    expect(BRIEFING_DEMO_LABEL).toContain("não são análise real");
  });

  it("briefingsOperacionais separa vitrine de pesquisa real", () => {
    expect(briefingsOperacionais(INITIAL_BRIEFINGS)).toEqual([]);
    const mistura: BriefingInsight[] = [
      ...INITIAL_BRIEFINGS,
      { ...briefingsSalvos()[0]!, id: "meu-brief", title: "Pesquisa da empresa" },
    ];
    expect(briefingsOperacionais(mistura).map((b) => b.id)).toEqual(["meu-brief"]);
  });

  it("editar briefing remove o selo demo", () => {
    const alvo = INITIAL_BRIEFINGS[0]!;
    useResearchGtmStore.getState().upsertBriefing({ ...alvo, title: "Editado pela empresa" });
    const b = useResearchGtmStore.getState().briefings.find((x) => x.id === alvo.id);
    expect(b?.demo).toBe(false);
    expect(briefingsOperacionais(useResearchGtmStore.getState().briefings)).toHaveLength(1);
  });

  it("editar campanha também remove o selo demo (Onda 38 antes era implícito)", () => {
    const camp = useResearchGtmStore.getState().campaigns[0]!;
    useResearchGtmStore.getState().upsertCampaign({ ...camp, demo: true, name: "Editada" });
    const c = useResearchGtmStore.getState().campaigns.find((x) => x.id === camp.id);
    expect(c?.demo).toBe(false);
  });
});

describe("Onda 41 — guardas de fonte", () => {
  it("os emissores de conformidade filtram a vitrine", () => {
    const rbac = codigo(ler("src/lib/security/rbac-governance.ts"));
    expect(rbac).toContain("eventosAuditaveis(entries)");
    expect(rbac).toContain("eventosAuditaveis(entries).map");
    expect(rbac).toContain("auditaveis.length === 0");
    const tela = codigo(ler("src/routes/_authenticated.security.tsx"));
    expect(tela).toContain("lgpd-so-vitrine");
    expect(tela).toContain('value: soVitrine ? "—"');
  });

  it("a tela de Research declara a vitrine de briefings", () => {
    const tela = codigo(ler("src/routes/_authenticated.research.tsx"));
    expect(tela).toContain("briefing-so-vitrine");
    expect(tela).toContain("briefingsOperacionais(briefings)");
    expect(tela).toContain('avgConfidence === null ? "—"');
  });
});
