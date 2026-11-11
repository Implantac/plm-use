// Onda 55 — 44ª/45ª medições. O dono relatou "projeto publicado no lovable";
// a re-medição por camada mostrou que o ar **não mudou** (mesmo entry
// `index-CgpxQvgj.js` / `index-CyHoINKY.js`, 223 chunks / 3.188.203 bytes,
// mesmos 6 marcadores da Onda 54). O marco era redundante em relação à 43ª
// medição — não foi confirmado cegamente como nova publicação.
//
// Com `prossiga`, a varredura de risco abriu os **drawers** (a Onda 52 cobriu
// só diálogos de criação; a Onda 49, só campos da carga inicial). Medido em
// produção com cliques reais, o `CapaDrawer` de `/quality`:
//
//   Investigação  7 campos · 7 sem nome
//   Ações         5 campos · 5 sem nome
//   Evidências    3 campos · 3 sem nome
//   Timeline      1 campo  · 1 sem nome (nota de transição, presente em todas)
//
// Causa: `Field` renderiza `<label>` **irmão** do campo, sem `htmlFor`/`id`;
// `closest('label')` não encontra nada. Campos avulsos (porquê, evidências,
// nota de transição) também não tinham `aria-label`.
//
// Correção: 11 `aria-label` — um por ponto do código (o de `ActionField` usa
// `${label} da CAPA` e cobre as 3 instâncias). **Não** trocamos `<div>` por
// `<label>`: alguns `Field` envolvem `<div>` com botões, e um `<label>` com
// botão dentro é HTML problemático. Nenhuma estrutura, handler, validação,
// store ou guarda anterior mudou.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");
const CAPA = "src/components/quality/CapaDrawer.tsx";

describe("Onda 55 — todo campo do drawer CAPA tem nome acessível", () => {
  it("11 rótulos novos, um por ponto do código", () => {
    const fonte = ler(CAPA);
    expect((fonte.match(/aria-label=/g) ?? []).length).toBe(11);
  });

  it("os rótulos das 4 abas estão presentes", () => {
    const fonte = ler(CAPA);
    for (const nome of [
      "Causa-raiz da CAPA",
      "Novo porquê da CAPA",
      "Eficácia verificada da CAPA",
      "URL da evidência da CAPA",
      "Descrição da evidência da CAPA",
      "Nota da transição da CAPA",
      "Responsável pela CAPA",
      "Prazo da CAPA",
      "Severidade da CAPA",
      "Fornecedor da CAPA",
    ]) {
      expect(fonte, nome).toContain(`aria-label="${nome}"`);
    }
    expect(fonte).toContain("aria-label={`${label} da CAPA`}");
  });

  it("o Field não virou <label> wrapper (estrutura preservada)", () => {
    const fonte = ler(CAPA);
    expect(fonte).toContain("function Field({ label, children }");
    expect(fonte).toContain('<div className="space-y-1.5">');
    expect(fonte).toContain('<label className="text-2xs font-semibold uppercase tracking-wider');
  });

  it("as validações de /quality (Onda 49) não regrediram", () => {
    const rota = ler("src/routes/_authenticated.quality.tsx");
    expect(rota).toContain('aria-label="Defeito ou problema da CAPA"');
    expect(rota).toContain('aria-label="Responsável pela CAPA"');
    expect(rota).toContain("capaErrors.defeito");
    expect(rota).toContain("capaErrors.responsavel");
    expect(rota).toContain("aria-invalid={!!capaErrors");
  });

  it("as guardas das Ondas 47 a 54 permanecem intactas", () => {
    expect(ler("src/components/sales/CostQueueNominalPanel.tsx")).toContain(
      'data-testid="ficha-cega-bloqueada"',
    );
    expect(ler("src/routes/_authenticated.marketing.tsx")).toContain(
      'data-testid="media-kit-bloqueado"',
    );
    expect(ler("src/routes/_authenticated.collection-map.tsx")).toContain(
      'data-testid="line-sheet-bloqueado"',
    );
    expect(ler("src/components/inventory/MrpNetExplosionPanel.tsx")).toContain(
      'data-testid="mrp-sem-apuracao"',
    );
    expect(ler("src/routes/_authenticated.collections.tsx")).toContain(
      'data-testid="colecoes-so-vitrine"',
    );
    expect(ler("src/components/collections/CollectionROI.tsx")).toContain(
      'data-testid="roi-sem-lote"',
    );
    expect(ler("src/routes/_authenticated.looks.tsx")).toContain('aria-label="Nome do look"');
    expect(ler("src/routes/_authenticated.production.tsx")).toContain(
      'data-testid="producao-sem-op"',
    );
    expect(ler("src/components/sales/CostQueueNominalPanel.tsx")).toContain(
      'data-testid="cta-ficha-cega-clonar"',
    );
  });

  it("nenhum handler ou store foi alterado", () => {
    const fonte = ler(CAPA);
    expect(fonte).toContain("persistPatch");
    expect(fonte).toContain("setLocal");
    expect(fonte).toContain("onSave");
    expect(fonte).toContain('TabsContent value="timeline"');
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
