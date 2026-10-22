import { describe, expect, it } from "vitest";
import { buildTechSheetPrintHtml, type PrintIdentity } from "./print";
import type { TechSheetData } from "./store";

const identity: PrintIdentity = {
  ref: "V24-001",
  name: "Blusa Linho Amalfi",
  category: "Feminino / Top",
  season: "Protótipo Aprovado",
};

const base: TechSheetData = {
  ref: "V24-001",
  bom: [
    {
      id: "b1",
      tipo: "Tecido",
      material: "Linho <script>alert(1)</script>",
      fornecedor: 'Têxtil & Cia "aspa"',
      consumo: "1.2",
      unidade: "m",
      custo: 42,
    },
  ],
  bop: [
    { id: "p2", seq: 2, etapa: "Costura", setor: "Costura", tempoMin: 45, custo: 18 },
    { id: "p1", seq: 1, etapa: "Corte", setor: "Corte", tempoMin: 12, custo: 4.5 },
  ],
  versoes: [
    {
      id: "v1",
      versao: "v4.2",
      data: "2026-06-12",
      autor: "Sandra",
      status: "Aprovada",
      resumo: "Ajuste de consumo",
      alteracoes: ["Linho 1.4→1.2"],
    },
  ],
  preCost: { targetCusto: 80, overheadPct: 10, markupPct: 200, targetPreco: 100 },
  aplicacoes: [],
};

describe("buildTechSheetPrintHtml", () => {
  // Intl pt-BR separa "R$" do número com NBSP (U+00A0) — normaliza p/ asserção.
  const html = buildTechSheetPrintHtml(identity, base, new Date("2026-10-15T12:00:00Z")).replace(
    /\u00a0/g,
    " ",
  );

  it("identifica a ficha no cabeçalho e no rodapé", () => {
    expect(html).toContain("Ficha técnica · Blusa Linho Amalfi");
    expect(html).toContain("V24-001");
    expect(html).toContain("versão v4.2");
  });

  it("escapa HTML injetável nos dados do usuário (é o doc que a fábrica recebe)", () => {
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("Têxtil &amp; Cia &quot;aspa&quot;");
  });

  it("ordena BOP por seq (2,1 → 1,2) e fecha totais", () => {
    const iCorte = html.indexOf(">1<");
    const iCostura = html.indexOf(">2<");
    expect(iCorte).toBeGreaterThan(-1);
    expect(iCostura).toBeGreaterThan(iCorte);
    expect(html).toMatch(/57 min/); // 12+45
  });

  it("calcula pré-custo com rateio e markup e avisa quando estoura o alvo", () => {
    // industrial = 42 + 22.5 = 64.5; +10% = 70.95; +200% = 212.85 > alvo 100
    expect(html).toContain("acima do alvo");
    expect(html).toContain("R$ 212,85");
    expect(html).toContain("R$ 70,95");
  });

  it("foto https entra no cabeçalho; URL de outro esquema é sumariamente ignorada", () => {
    const comFoto = buildTechSheetPrintHtml(
      { ...identity, foto: "https://cdn.exemplo.br/kar/walpaper.jpg" },
      base,
      new Date("2026-10-15T12:00:00Z"),
    );
    expect(comFoto).toContain('img class="foto"');
    expect(comFoto).toContain("cdn.exemplo.br/kar/walpaper.jpg");
    const maliciosa = buildTechSheetPrintHtml(
      { ...identity, foto: "javascript:alert(1)" },
      base,
      new Date("2026-10-15T12:00:00Z"),
    );
    expect(maliciosa).not.toContain("<img");
  });

  it("BOM/BOP vazios não quebram o documento", () => {
    const empty = buildTechSheetPrintHtml(
      identity,
      { ...base, bom: [], bop: [], versoes: [] },
      new Date("2026-10-15T12:00:00Z"),
    );
    expect(empty).toContain("sem itens");
    expect(empty).toContain("sem etapas");
    expect(empty).toContain("sem histórico");
  });
});
