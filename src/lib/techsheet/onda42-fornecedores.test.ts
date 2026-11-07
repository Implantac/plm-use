// Onda 42 — fornecedor de papel não homologa nem assina documento.
//
// Medição executada ANTES da correção:
//   INITIAL_PARTNERS = 4 facções de fábrica com CNPJs e "Certificado ABVTEX"
//   inventados (Facção Costura Fina Vale 19.840.220/0001-31, etc.).
//   computePartnerMetrics: overallScore 93/A+, 92/A+, 90/A+, 88/A
//   → SupplierScoreboard ordenava "93/A+ > 92/A+ > 90/A+ > 88/A"
//   → suppliers.tsx: "Parceiros Ativos: 4 · homologados", "OTIF Médio: 90%"
//   → buildRemessaNfeXml400 / buildBlindServiceOrderHtml podiam sair com CNPJ
//     de um fornecedor que não existe.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { parceirosSalvos } from "@/test/parceiros-salvos";
import { useTechSheetStore } from "./store";
import {
  INITIAL_PARTNERS,
  INITIAL_SERVICE_ORDERS,
  PARCEIRO_DEMO_LABEL,
  computePartnerMetrics,
  computePartnerScore,
  parceirosOperacionais,
  useOutsourcingStore,
  type IndustrialPartner,
} from "./outsourcing-os";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");
const codigo = (f: string) =>
  f
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");

beforeEach(() => {
  useOutsourcingStore.setState({ partners: INITIAL_PARTNERS });
});

describe("Onda 42 — o ranking de homologação não é de papel", () => {
  it("os 4 parceiros iniciais estão marcados e continuam visíveis", () => {
    expect(INITIAL_PARTNERS).toHaveLength(4);
    expect(INITIAL_PARTNERS.every((p) => p.demo === true)).toBe(true);
    expect(INITIAL_PARTNERS[0]?.name).toBe("Facção Costura Fina Vale");
    expect(INITIAL_PARTNERS[0]?.cnpj).toBe("19.840.220/0001-31");
    expect(INITIAL_PARTNERS[0]?.compliance).toBe("Certificado ABVTEX");
    expect(PARCEIRO_DEMO_LABEL).toContain("não são reais");
  });

  it("os scores de fábrica que geravam o ranking continuam no modelo", () => {
    const scores = INITIAL_PARTNERS.map((p) => computePartnerScore(p).overallScore);
    expect(scores).toEqual([93, 90, 88, 92]);
    expect([...scores].sort((a, b) => b - a).join(" > ")).toBe("93 > 92 > 90 > 88");
  });

  it("parceirosOperacionais separa vitrine de cadastro real", () => {
    expect(parceirosOperacionais(INITIAL_PARTNERS)).toEqual([]);
    const mistura: IndustrialPartner[] = [
      ...INITIAL_PARTNERS,
      { ...parceirosSalvos()[0]!, id: "meu-fornecedor", name: "Minha Facção" },
    ];
    expect(parceirosOperacionais(mistura).map((p) => p.id)).toEqual(["meu-fornecedor"]);
  });

  it("computePartnerMetrics recusa apurar um parceiro de demonstração", () => {
    const m = computePartnerMetrics(
      INITIAL_PARTNERS[0]!,
      INITIAL_SERVICE_ORDERS,
      useTechSheetStore.getState().data,
    );
    expect(m.apuravel).toBe(false);
    expect(m.overallScore).toBe(0);
    expect(m.piecesInPossession).toBe(0);
  });

  it("com cadastro salvo, o score e o tier continuam apurando (sem afrouxar)", () => {
    const m = computePartnerMetrics(
      parceirosSalvos()[0]!,
      INITIAL_SERVICE_ORDERS,
      useTechSheetStore.getState().data,
    );
    expect(m.apuravel).toBe(true);
    expect(m.overallScore).toBeGreaterThanOrEqual(90);
    expect(m.tier).toBe("A+");
  });

  it("editar parceiro promove a vitrine a cadastro real", () => {
    const alvo = INITIAL_PARTNERS[0]!;
    useOutsourcingStore.getState().upsertPartner({ ...alvo, name: "Facção Real Ltda" });
    const p = useOutsourcingStore.getState().partners.find((x) => x.id === alvo.id);
    expect(p?.demo).toBe(false);
    expect(parceirosOperacionais(useOutsourcingStore.getState().partners)).toHaveLength(1);
  });
});

describe("Onda 42 — telas e documentos declaram a vitrine", () => {
  it("suppliers.tsx não chama 4 parceiros de papel de 'homologados'", () => {
    const tela = codigo(ler("src/routes/_authenticated.suppliers.tsx"));
    expect(tela).toContain("supplier-so-vitrine");
    expect(tela).toContain("parceirosOperacionais(partners)");
    expect(tela).toContain('avgOtif === null ? "—"');
    expect(tela).toContain('value: soVitrine ? "—"');
  });

  it("Scoreboard não imprime scores AQL/OTIF de fábrica", () => {
    const tela = codigo(ler("src/components/suppliers/SupplierScoreboard.tsx"));
    expect(tela).toContain("scoreboard-so-vitrine");
    expect(tela).toContain("m.apuravel");
    expect(tela).toContain("parceirosOperacionais(partners)");
  });

  it("XML de remessa e Guia A4 são bloqueados com parceiro demo", () => {
    const painel = codigo(ler("src/components/pcp/OutsourcingServiceOrderPanel.tsx"));
    expect(painel).toContain("row.partner.demo === true");
    expect(painel).toContain("CNPJ e certificação não são reais");
    expect(painel.indexOf("bloqueiaDocumento(row)")).toBeLessThan(
      painel.indexOf("buildRemessaNfeXml400(row.os"),
    );
  });

  it("o motor de métricas tem a guarda apuravel", () => {
    const motor = codigo(ler("src/lib/techsheet/outsourcing-os.ts"));
    expect(motor).toContain("if (partner.demo === true)");
    expect(motor).toContain("apuravel: false");
    expect(motor).toContain("promoverParceiro(partner)");
  });

  it("a fixture de cadastro salvo preserva CNPJ e scores", () => {
    const salvos = parceirosSalvos();
    expect(salvos).toHaveLength(4);
    expect(salvos.every((p) => p.demo === false)).toBe(true);
    expect(salvos[0]?.cnpj).toBe(INITIAL_PARTNERS[0]?.cnpj);
    expect(salvos[0]?.qualityScore).toBe(95);
  });

  it("nenhuma tela exibe overallScore sem checar apuravel", () => {
    const tela = ler("src/routes/_authenticated.suppliers.tsx");
    expect(tela).toContain('m.apuravel ? `${m.overallScore} (${m.tier})` : "—"');
  });
});
