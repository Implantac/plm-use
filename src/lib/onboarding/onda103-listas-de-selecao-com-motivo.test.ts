// Onda 103 — 96ª medição. Continuação da 102 para listas de seleção e
// leituras em `.then(({ data }) => …)`: fornecedores (diálogos de piloto e
// referência), transições do fluxo (menu de status), linha do tempo da
// entidade, armazéns/OPs/lotes dos diálogos de estoque e a resolução da
// referência no painel de pilotos — que afirmava "ainda não está cadastrada"
// quando a consulta tinha falhado. Medido em produção: "Movimentação" abre
// com armazém "Selecione" sem opção nem aviso.
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ler = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf-8");

describe("Onda 103 — listas de seleção com motivo", () => {
  it("hooks de leitura expõem `error` com motivo", () => {
    const casos: Array<[string, string, string]> = [
      [
        "src/hooks/use-suppliers.ts",
        "carregar os fornecedores",
        "return { items, loading, error };",
      ],
      [
        "src/hooks/use-workflow.ts",
        "carregar as transições do fluxo",
        "return { defs, loading, error, nextStatuses, canTransition, graph };",
      ],
      [
        "src/hooks/use-entity-events.ts",
        "carregar a linha do tempo",
        "return { items, loading, error };",
      ],
    ];
    for (const [f, acao, ret] of casos) {
      const s = ler(f);
      expect(s, f).toContain(`descreverErroSupabase(erro, "${acao}")`);
      expect(s, f).toContain(ret);
      expect(s, f).not.toMatch(/\.then\(\(\{ data \}\) =>/);
    }
  });

  it("consumidores mostram o motivo em vez de vazio/mentira", () => {
    expect(ler("src/components/entity/EntityTimeline.tsx")).toContain("if (error) {");
    const menu = ler("src/components/workflow/WorkflowStatusMenu.tsx");
    expect(menu).toContain("defsError ? (");
    expect(menu).toContain("(options.length === 0 && !defsError)");
    expect(ler("src/components/pcp/NovoPilotoDialog.tsx")).toContain("suppliersError ??");
    expect(ler("src/components/references/NovaReferenciaDialog.tsx")).toContain(
      "{suppliersError && (",
    );
    const pil = ler("src/components/pcp/PilotosPanel.tsx");
    expect(pil).toContain('descreverErroSupabase(error, "localizar a referência")');
    expect(pil).toContain("Não dá para afirmar se a referência");
    expect(pil).toMatch(/if \(resolveError\) \{[\s\S]*?\}\s*\n\s*if \(!referenceId\) \{/);
  });

  it("diálogos de estoque: um aviso inline por motivo, sem toast duplicado", () => {
    for (const f of [
      "src/components/inventory/MovementDialog.tsx",
      "src/components/inventory/ReservationDialog.tsx",
    ]) {
      const s = ler(f);
      expect(s, f).toContain('addLoadError(descreverErroSupabase(error, "carregar os armazéns"))');
      expect(s, f).toContain("prev.includes(msg) ? prev : [...prev, msg]");
      expect(s, f).toContain('role="alert"');
      expect(s, f).not.toMatch(/\.then\(\(\{ data \}\) =>/);
    }
  });

  it("nenhum componente/hook lê Supabase com `.then(({ data }) =>` descartando o erro", () => {
    const dirs = ["src/hooks", "src/components", "src/routes", "src/lib"];
    const walk = (d: string): string[] =>
      readdirSync(resolve(__dirname, "../../..", d), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`],
      );
    const permitidos = new Set(["src/hooks/use-auth.ts"]); // auth: `{ data: { session } }` não traz erro acionável
    for (const f of dirs.flatMap(walk)) {
      if (!/\.tsx?$/.test(f) || /\.test\.|\.e2e\./.test(f) || permitidos.has(f)) continue;
      expect(ler(f), f).not.toMatch(/\.then\(\(\{\s*data\s*\}\)\s*=>/);
    }
  });
});
