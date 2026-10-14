// Guardas de sintaxe dos .sql versionados no repo. A CI atual não executa DDL,
// e o Postgres é literalista: uma linha de comentário iniciada com `//` (vício
// de JS) derruba a migration inteira — foi exatamente isso que enterrou o bloco
// 8 (analytics_kpis) na aplicação via Lovable Cloud em 14/10/2026. Este teste
// transforma essa classe de bug em falha de CI antes de chegar ao banco.
import { describe, expect, it } from "vitest";

const sources = import.meta.glob("/supabase/migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const files = Object.keys(sources).sort();

describe("migrations SQL", () => {
  it("o glob resolve as migrations do repo (sanity)", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("nenhuma migration usa `//` como comentário", () => {
    const offenders: string[] = [];
    for (const [file, sql] of Object.entries(sources)) {
      sql.split("\n").forEach((line, i) => {
        if (/^\s*\/\//.test(line)) offenders.push(`${file}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
