// Onda 36 — a DRE não apura o vazio.
//
// Medição executada antes da correção (com o overhead fixo DEFAULT da tela):
//   computeCollectionDreSummary({ "NOVA-001": blankFor("NOVA-001") })
//   → { apuravel: true, ebitdaBrl: -85000, grossRevenue: 0,
//       totalPieces: 50, skus: 1, fixedOverheadBrl: 85000 }
//   → buildDrePrintableHtml: "-R$ 85.000,00" impresso SEM NENHUM AVISO.
//
// `blankFor()` (Onda 35) passou a criar fichas "salvas" sem engenharia, e a
// Onda 30 só checava `keys.length > 0`. `Math.max(50, tiragem ?? 600)`
// inventava 50 peças e o overhead fixo virava prejuízo — exatamente o que a
// própria Onda 30 quisera eliminar.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { fichaDeclarada } from "@/test/ficha-declarada";
import {
  buildDrePrintableHtml,
  computeCollectionDreSummary,
  pendenciasEngenhariaDre,
} from "./cfo-dre";
import { blankFor, type TechSheetData } from "./store";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");
const codigo = (f: string) =>
  f
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");

const semTiragem = (): TechSheetData => {
  const d = fichaDeclarada();
  return { ...d, preCost: { ...d.preCost, tiragemPlanejada: 0 } };
};

const semBom = (): TechSheetData => ({ ...fichaDeclarada(), bom: [] });

describe("Onda 36 — ficha sem engenharia não é apurável", () => {
  it("pendenciasEngenhariaDre lista as três ausências de uma ficha vazia", () => {
    expect(pendenciasEngenhariaDre(blankFor("NOVA-001"))).toEqual([
      "sem-bom-custeada",
      "sem-preco",
      "sem-tiragem",
    ]);
  });

  it("ficha vazia gera DRE não apurável, sem peças e sem prejuízo inventado", () => {
    const dre = computeCollectionDreSummary({ "NOVA-001": blankFor("NOVA-001") });
    expect(dre.apuravel).toBe(false);
    expect(dre.ebitdaBrl).toBe(0);
    expect(dre.grossRevenue).toBe(0);
    expect(dre.totalPieces).toBe(0);
    expect(dre.breakEvenPieces).toBe(0);
    expect(dre.skus).toEqual([]);
    expect(dre.origem.salvas).toEqual([]);
    expect(dre.origem.semEngenharia).toEqual(["NOVA-001"]);
    expect(dre.origem.apenasReferencia).toBe(true);
  });

  it("o A4 de ficha vazia avisa e NÃO imprime -R$ 85.000", () => {
    const dre = computeCollectionDreSummary({ "NOVA-001": blankFor("NOVA-001") });
    const html = buildDrePrintableHtml(dre);
    expect(html).toContain("DRE não apurável");
    expect(html).toContain("nenhuma ficha tem engenharia custeada");
    expect(html).toContain("NOVA-001");
    expect(html).not.toContain("85.000,00");
    expect(html).not.toContain("-R$");
  });

  it("ficha com BOM custeada, preço e tiragem declarados é apurável", () => {
    const doc = fichaDeclarada();
    expect(pendenciasEngenhariaDre(doc)).toEqual([]);
    const dre = computeCollectionDreSummary({ DEV000006: doc });
    expect(dre.apuravel).toBe(true);
    expect(dre.skus).toHaveLength(1);
    expect(dre.totalPieces).toBe(doc.preCost.tiragemPlanejada);
    expect(dre.grossRevenue).toBeGreaterThan(0);
    expect(dre.origem.semEngenharia).toEqual([]);
  });

  it("mistura: apura só a ficha com engenharia e declara a outra no A4", () => {
    const dre = computeCollectionDreSummary({
      DEV000006: fichaDeclarada(),
      "NOVA-001": blankFor("NOVA-001"),
    });
    expect(dre.apuravel).toBe(true);
    expect(dre.skus.map((s) => s.refCode)).toEqual(["DEV000006"]);
    expect(dre.origem.semEngenharia).toEqual(["NOVA-001"]);
    const html = buildDrePrintableHtml(dre);
    expect(html).toContain("Fichas sem engenharia custeada excluídas");
    expect(html).toContain("NOVA-001");
  });

  it("sem tiragem declarada a ficha fica de fora (morreu o '?? 600')", () => {
    const dre = computeCollectionDreSummary({ DEV000006: semTiragem() });
    expect(dre.apuravel).toBe(false);
    expect(dre.totalPieces).toBe(0);
    expect(pendenciasEngenhariaDre(semTiragem())).toContain("sem-tiragem");
  });

  it("sem BOM custeada a ficha fica de fora", () => {
    const dre = computeCollectionDreSummary({ DEV000006: semBom() });
    expect(dre.apuravel).toBe(false);
    expect(dre.skus).toEqual([]);
    expect(pendenciasEngenhariaDre(semBom())).toContain("sem-bom-custeada");
  });

  it("tiragem pequena é respeitada: não há piso de 50 peças", () => {
    const doc = fichaDeclarada();
    doc.preCost = { ...doc.preCost, tiragemPlanejada: 1 };
    const dre = computeCollectionDreSummary({ DEV000006: doc });
    expect(dre.totalPieces).toBe(1);
  });
});

describe("Onda 36 — guardas de fonte", () => {
  it("o motor da DRE não tem mais números de papel", () => {
    const s = codigo(ler("src/lib/techsheet/cfo-dre.ts"));
    expect(s).not.toContain("Math.max(50,");
    expect(s).not.toContain("?? 600");
    expect(s).toContain("pendenciasEngenhariaDre");
    expect(s).toContain("semEngenharia");
  });

  it("as telas nomeiam as fichas sem engenharia", () => {
    for (const rel of [
      "src/routes/_authenticated.financial.tsx",
      "src/routes/_authenticated.dashboard.tsx",
    ]) {
      expect(codigo(ler(rel)), rel).toContain("origem.semEngenharia");
    }
  });

  it("o A4 continua recusando apurar sem ficha salva (Onda 30)", () => {
    const dre = computeCollectionDreSummary({});
    expect(dre.apuravel).toBe(false);
    expect(buildDrePrintableHtml(dre)).toContain("nenhuma ficha técnica salva");
  });
});
