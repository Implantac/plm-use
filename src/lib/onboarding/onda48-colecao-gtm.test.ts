// Onda 48 — 28ª medição. Medido com cliques reais CONTRA PRODUÇÃO depois da
// publicação da Onda 47:
//
//   /marketing       3 campanhas `demo: true` com badge "Demonstração", mas
//                    "Media Kit A4" ativo (e "Visualizar" no menu). O A4 saía
//                    com R$ 42.000 de mídia, R$ 18.500 de produção, R$ 218.400
//                    de receita atribuída, 38.400 cliques e ROAS 5,20x inventados.
//   /collection-map  6 modelos / 2.985 peças / R$ 1.233.665 de PVP vindos do
//                    mock de fábrica apareciam nos KPIs E no Line Sheet A4 e
//                    no CSV B2B baixado (`line-sheet-verão-25.csv`).
//
// Correção: gate de emissão no chamador de UI + KPIs `—` com aviso/CTA.
// As funções puras (`buildDropMediaKitHtml`, `buildLineSheetPrintableHtml`,
// `buildLineSheetCsvPtBr`) NÃO foram alteradas: nenhuma asserção das Ondas
// 27/30/33/36/38/47 foi relaxada.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  buildDropMediaKitHtml,
  campanhasOperacionais,
  GTM_DEMO_LABEL,
  INITIAL_GTM_CAMPAIGNS,
  MEDIA_KIT_DEMO_BLOQUEIO,
  podeEmitirMediaKit,
  useResearchGtmStore,
} from "@/lib/techsheet/research-gtm";
import {
  COLECAO_DEMO_LABEL,
  LINE_SHEET_DEMO_BLOQUEIO,
  collectionMap,
  linhasApuraveis,
  podeEmitirLineSheet,
} from "@/lib/collection-map/store";
import { buildLineSheetPrintableHtml, techSheetToMatrixRow } from "@/lib/techsheet/linesheet";
import { seedFor } from "@/lib/techsheet/store";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

beforeEach(() => {
  useResearchGtmStore.setState({ campaigns: INITIAL_GTM_CAMPAIGNS });
});

describe("Onda 48 — Media Kit não nasce da campanha de vitrine", () => {
  it("as campanhas de fábrica são demo e não podem emitir", () => {
    expect(INITIAL_GTM_CAMPAIGNS.length).toBeGreaterThanOrEqual(3);
    for (const c of INITIAL_GTM_CAMPAIGNS) {
      expect(c.demo, c.id).toBe(true);
      expect(podeEmitirMediaKit(c), c.id).toBe(false);
    }
    expect(campanhasOperacionais(INITIAL_GTM_CAMPAIGNS)).toHaveLength(0);
    expect(GTM_DEMO_LABEL).toContain("não entra em número operacional");
    expect(MEDIA_KIT_DEMO_BLOQUEIO).toContain("edite ou cadastre");
  });

  it("editar a campanha promove e libera a emissão (Onda 38 preservada)", () => {
    const demo = INITIAL_GTM_CAMPAIGNS[0]!;
    useResearchGtmStore.getState().upsertCampaign({ ...demo, name: "Drop Real 48" });
    const promovida = useResearchGtmStore.getState().campaigns.find((c) => c.id === demo.id)!;
    expect(promovida.demo).toBe(false);
    expect(podeEmitirMediaKit(promovida)).toBe(true);
    expect(campanhasOperacionais(useResearchGtmStore.getState().campaigns)).toHaveLength(1);
  });

  it("a função pura do media kit continua com o contrato das Ondas 27/33", () => {
    const html = buildDropMediaKitHtml(INITIAL_GTM_CAMPAIGNS[0]!, {});
    expect(html).toContain("Release GTM & Media Kit");
    expect(html).toContain("Nenhuma referência da campanha tem passaporte apurável");
    expect(html).not.toContain("DEV000006");
  });

  it("o gate cobre os DOIS caminhos de UI, antes de imprimir", () => {
    const fonte = ler("src/routes/_authenticated.marketing.tsx");
    expect(fonte).toContain("function printMediaKit(camp: GtmDropCampaign) {");
    expect(fonte).toContain("if (!podeEmitirMediaKit(camp)) {");
    expect(fonte.indexOf("if (!podeEmitirMediaKit(camp))")).toBeLessThan(
      fonte.indexOf("buildDropMediaKitHtml(camp, sheetsMap)"),
    );
    expect(fonte).toContain('data-testid="media-kit-bloqueado"');
    expect(fonte).toContain("Editar para emitir");
    expect(fonte).toContain("podeEmitirMediaKit(camp) ? (");
    expect(fonte).toContain(
      "onView={podeEmitirMediaKit(camp) ? () => printMediaKit(camp) : undefined}",
    );
    // Regressão Onda 38: o aviso/CTA de vitrine permanece.
    expect(fonte).toContain('data-testid="gtm-so-vitrine"');
    expect(fonte).toContain('testId="cta-gtm-so-vitrine"');
  });
});

describe("Onda 48 — Line Sheet e KPIs não apuram a coleção de fábrica", () => {
  it("o mapa de coleção é vitrine e não tem nenhuma linha apurável sem ficha", () => {
    expect(collectionMap.rows.length).toBeGreaterThanOrEqual(6);
    expect(linhasApuraveis(collectionMap.rows, {})).toHaveLength(0);
    expect(podeEmitirLineSheet(collectionMap.rows, {})).toBe(false);
    expect(COLECAO_DEMO_LABEL).toContain("não entra em número nem documento");
    expect(LINE_SHEET_DEMO_BLOQUEIO).toContain("ficha técnica salva");
  });

  it("ficha salva é a promoção explícita: só ela entra no número e no A4", () => {
    const sheet = seedFor("MINHA-REF-48");
    const row = techSheetToMatrixRow("MINHA-REF-48", sheet);
    const misturadas = [...collectionMap.rows, row];
    const apuraveis = linhasApuraveis(misturadas, { "MINHA-REF-48": sheet });
    expect(apuraveis).toHaveLength(1);
    expect(apuraveis[0]!.refCode).toBe("MINHA-REF-48");
    expect(podeEmitirLineSheet(misturadas, { "MINHA-REF-48": sheet })).toBe(true);
    const html = buildLineSheetPrintableHtml("Coleção 48", "Verão 48", apuraveis, {
      "MINHA-REF-48": sheet,
    });
    expect(html).toContain("LINE SHEET COMERCIAL B2B");
    expect(html).toContain("MINHA-REF-48");
    // A vitrine não vazou para o documento.
    expect(html).not.toContain("Blusa Linho Amalfi");
  });

  it("a tela mostra `—`, aviso com CTA e bloqueia os dois emissores", () => {
    const fonte = ler("src/routes/_authenticated.collection-map.tsx");
    expect(fonte).toContain("const apuraveis = useMemo(");
    expect(fonte).toContain("const soVitrine = filteredRows.length > 0 && apuraveis.length === 0");
    expect((fonte.match(/value: "—"/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(fonte).toContain('data-testid="colecao-so-vitrine"');
    expect(fonte).toContain('testId="cta-colecao-sem-ficha"');
    expect(fonte).toContain('data-testid="line-sheet-bloqueado"');
    expect(fonte).toContain("podeEmitirLineSheet(filteredRows, sheetsMap) ? (");
    // Gate nos DOIS emissores, antes de gerar CSV/HTML.
    expect((fonte.match(/if \(rows.length === 0\)/g) ?? []).length).toBe(2);
    expect(fonte).toContain("buildLineSheetCsvPtBr(rows, sheetsMap)");
    expect(fonte.indexOf("if (rows.length === 0)")).toBeLessThan(
      fonte.indexOf("buildLineSheetCsvPtBr(rows, sheetsMap)"),
    );
    expect(fonte).toContain("{apuraveis.length} apuráveis");
    // O nome/season da coleção de fábrica também não vazam para o documento.
    expect(fonte).toContain('const tituloColecao = nomeColecao.trim() || "Coleção em cadastro"');
    expect(fonte).toContain('aria-label="Nome da coleção para o Line Sheet A4 e o CSV B2B"');
    expect(fonte).toContain("tituloColecao,");
    expect(fonte).not.toContain("collectionMap.name,\n      collectionMap.season,");
    // Acessibilidade: os campos desta tela também ganharam nome.
    expect(fonte).toContain('aria-label="Buscar referência ou nome no mapa de coleção"');
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
