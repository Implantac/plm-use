import { describe, expect, it } from "vitest";
import { formatSheetSummary, summarizeSheet } from "./sheet-summary";
import type { TechSheetData } from "@/lib/techsheet/store";

const doc = (over: Partial<TechSheetData> = {}): TechSheetData => ({
  ref: "V24-001",
  bom: [],
  bop: [],
  preCost: { targetCusto: 80, overheadPct: 10, markupPct: 200 },
  versoes: [],
  ...over,
});
const v = (versao: string, status: string, snapshot = false) => ({
  id: versao,
  versao,
  data: "2026-10-15",
  autor: "QA",
  status: status as "Rascunho" | "Em revisão" | "Aprovada" | "Obsoleta",
  resumo: "",
  alteracoes: [],
  ...(snapshot ? { snapshot: { bom: [], bop: [], preCost: doc().preCost } } : {}),
});

describe("summarizeSheet", () => {
  it("sem doc ou sem versões → exists:false (a UI vira aviso, não tabela vazia mentirosa)", () => {
    expect(summarizeSheet(undefined)).toEqual({
      exists: false,
      diffDisponivel: false,
      totalVersoes: 0,
    });
    expect(summarizeSheet(doc()).exists).toBe(false);
  });

  it("topo aprovado → sem pendência; fábrica segue a própria versão", () => {
    const s = summarizeSheet(doc({ versoes: [v("v4.2", "Aprovada")] }));
    expect(s).toMatchObject({ exists: true, ultima: "v4.2", ativa: "v4.2", pendente: undefined });
    expect(formatSheetSummary(s)).toContain("aprovada");
  });

  it("topo em revisão com aprovada antiga → diz qual a fábrica segue", () => {
    const s = summarizeSheet(
      doc({ versoes: [v("v4.3", "Em revisão"), v("v4.2", "Aprovada", true)] }),
    );
    expect(s.pendente).toBe("v4.3");
    expect(s.ativa).toBe("v4.2");
    const t = formatSheetSummary(s);
    expect(t).toContain("Ficha v4.3");
    expect(t).toContain("fábrica segue v4.2");
    expect(t).toContain("em revisão");
  });

  it("diff estrutural só existe se o topo tem instantâneo", () => {
    expect(summarizeSheet(doc({ versoes: [v("v1.1", "Em revisão")] })).diffDisponivel).toBe(false);
    expect(summarizeSheet(doc({ versoes: [v("v1.1", "Em revisão", true)] })).diffDisponivel).toBe(
      true,
    );
    expect(
      formatSheetSummary(summarizeSheet(doc({ versoes: [v("v1.1", "Em revisão")] }))),
    ).toContain("diff só textual");
  });
});
