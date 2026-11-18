// Onda 107 — 100ª medição. Sete remoções locais bem-sucedidas eram anunciadas
// com `toast.error` (vermelho): "Lançamento removido", "Coleção removida",
// "Parceiro removido da base homologada"… O usuário lia "falhou". Medido em
// produção (`/financial` → Ações do item → Excluir → toast `data-type=error`).
// Agora: sucesso é `toast.success`; `toast.error` fica para falha real.
// Bônus: o gatilho do ModuleActionMenu ganhou `aria-label="Ações do item"`.
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (p: string) => readFileSync(resolve(raiz, p), "utf-8");
const walk = (d: string): string[] =>
  readdirSync(resolve(raiz, d), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`],
  );

describe("Onda 107 — remoção bem-sucedida não é erro", () => {
  it("nenhum toast.error anuncia remoção/exclusão concluída", () => {
    for (const f of [...walk("src/routes"), ...walk("src/components")]) {
      if (!/\.tsx?$/.test(f) || /\.test\.|\.e2e\./.test(f)) continue;
      expect(ler(f), f).not.toMatch(
        /toast\.error\(\s*["'`][^"'`]*\b(removid[oa]s?|excluíd[oa]s?|apagad[oa]s?)\b[^"'`]*["'`]\s*\)/i,
      );
    }
  });

  it("as sete telas anunciam com success", () => {
    const casos: Array<[string, string]> = [
      ["src/routes/_authenticated.analytics.tsx", 'toast.success("Indicador removido do BI.")'],
      ["src/routes/_authenticated.financial.tsx", 'toast.success("Lançamento removido.")'],
      ["src/routes/_authenticated.collections.tsx", 'toast.success("Coleção removida.")'],
      [
        "src/routes/_authenticated.commercial.tsx",
        'toast.success("Cliente removido da carteira.")',
      ],
      ["src/routes/_authenticated.marketing.tsx", 'toast.success("Campanha removida.")'],
      [
        "src/routes/_authenticated.suppliers.tsx",
        'toast.success("Parceiro removido da base homologada.")',
      ],
      ["src/routes/_authenticated.measurements.tsx", 'toast.success("Tabela removida.")'],
    ];
    for (const [f, esperado] of casos) expect(ler(f), f).toContain(esperado);
  });

  it("menu de ações do item tem rótulo acessível", () => {
    expect(ler("src/components/modules/ModuleLayout.tsx")).toContain('aria-label="Ações do item"');
  });
});
