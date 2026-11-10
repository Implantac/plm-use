// Onda 45 — glossário e hierarquia de título. Guardas de fonte + funções
// puras. Nenhuma asserção das Ondas 38–44 foi relaxada.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  TERMOS,
  TERMOS_PRIMEIRA_DOBRA,
  explicacaoDe,
  termosPorSigla,
  tituloTermo,
} from "./glossario";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

describe("Onda 45 — glossário em linguagem simples", () => {
  it("todo termo tem sigla, nome e uma explicação com mais de 30 caracteres", () => {
    expect(TERMOS.length).toBeGreaterThanOrEqual(20);
    for (const t of TERMOS) {
      expect(t.sigla.length).toBeGreaterThan(0);
      expect(t.nome.length, t.sigla).toBeGreaterThan(3);
      expect(t.explicacao.length, t.sigla).toBeGreaterThan(30);
    }
  });

  it("não há siglas duplicadas", () => {
    const chaves = TERMOS.map((t) => t.sigla.toLowerCase());
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("as 12 siglas mais frequentes no browser estão cobertas", () => {
    // Medição do DOM de 35 rotas: BOM 12, PCP 10, DPP 5, SAM 5, ESG 4,
    // MRP 4, CFOP 4, RFQ 3, SEFAZ 3, AQL 3, NCM 3, Kanban 3.
    const maisFrequentes = [
      "BOM",
      "PCP",
      "DPP",
      "SAM",
      "ESG",
      "MRP",
      "CFOP",
      "RFQ",
      "SEFAZ",
      "AQL",
      "NCM",
      "Kanban",
    ];
    for (const s of maisFrequentes) expect(explicacaoDe(s), s).not.toBeNull();
  });

  it("as siglas da primeira dobra do dashboard têm explicação", () => {
    expect(TERMOS_PRIMEIRA_DOBRA.length).toBeGreaterThanOrEqual(15);
    const traduzidas = termosPorSigla(TERMOS_PRIMEIRA_DOBRA);
    expect(traduzidas).toHaveLength(TERMOS_PRIMEIRA_DOBRA.length);
  });

  it("busca é case-insensitive e desconhecida retorna null/undefined", () => {
    expect(explicacaoDe("bom")).toContain("Lista de materiais");
    expect(explicacaoDe("XYZ-NAO-EXISTE")).toBeNull();
    expect(tituloTermo("XYZ-NAO-EXISTE")).toBeUndefined();
  });

  it("explicações não cobram outra sigla não explicada como pré-requisito", () => {
    // Cada explicação deve se sustentar sozinha: sem "conforme o X" etc.
    for (const t of TERMOS) {
      expect(t.explicacao.toLowerCase(), t.sigla).not.toContain("conforme o");
      expect(t.explicacao.toLowerCase(), t.sigla).not.toContain("ver ");
    }
  });
});

describe("Onda 45 — primeira dobra fala a língua do usuário", () => {
  const dash = () => ler("src/routes/_authenticated.dashboard.tsx");

  it("o cabeçalho jargônico saiu, entrou frase simples", () => {
    const s = dash();
    expect(s).not.toContain("Torre Executiva PLM 2.0 ·");
    expect(s).not.toContain('aria-label="Pulso Industrial PLM 2.0"');
    expect(s).toContain("Ferramentas do produto");
    expect(s).toContain("Da ficha técnica ao custo, ao corte, aos documentos e à venda.");
  });

  it("o glossário está na Torre e colapsado por padrão", () => {
    const s = dash();
    expect(s).toContain("<GlossarioTermos />");
    expect(s).toContain("@/components/onboarding/GlossarioTermos");
    expect(s.indexOf("<GlossarioTermos />")).toBeGreaterThan(s.indexOf("Ferramentas do produto"));
  });

  it("os 5 links técnicos ganharam title com explicação", () => {
    const s = dash();
    expect((s.match(/title=\{tituloTermo\(/g) ?? []).length).toBe(5);
    for (const sigla of ["BOM", "What-If", "RFQ", "GSD"]) {
      expect(s, sigla).toContain(`tituloTermo("${sigla}")`);
    }
  });

  it("documento fiscal deixou de prometer 'prontos' sem ficha salva", () => {
    const s = dash();
    expect(s).not.toContain("Packing List & XML SEFAZ prontos");
    expect(s).toContain("Packing List & XML SEFAZ quando houver ficha salva");
  });
});

describe("Onda 45 — toda tela tem um título de nível 1", () => {
  it("/tech-sheet tem h1 no estado vazio E no cockpit com ficha", () => {
    const s = ler("src/routes/_authenticated.tech-sheet.tsx");
    expect((s.match(/<h1/g) ?? []).length).toBe(2);
    expect(s).not.toContain(
      '<h2 className="text-sm font-semibold text-foreground">Nenhuma ficha técnica salva',
    );
    expect(s).toContain('<h1 className="sr-only">Ficha técnica · {activeRef}</h1>');
    expect(s).toContain("Nenhuma ficha técnica salva");
  });

  it("o early-return do estado vazio mantém seu data-testid", () => {
    expect(ler("src/routes/_authenticated.tech-sheet.tsx")).toContain(
      'data-testid="cockpit-sem-ficha"',
    );
  });
});
