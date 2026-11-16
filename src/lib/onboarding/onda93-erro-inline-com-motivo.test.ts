import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Onda 93 — a mesma regra dos toasts vale para o erro inline (setError /
// setFatal / setHint): nunca `res.error.message` cru; sempre
// `descreverErroSupabase(erro, ação)` / `motivoDe`. `isMissingTable` →
// MIGRATION_HINT continua como único atalho permitido.
function listar(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) listar(p, acc);
    else if (/\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome)) acc.push(p);
  }
  return acc;
}
const raiz = join(__dirname, "..", "..");

describe("Onda 93 — erro inline com motivo", () => {
  it("nenhum setError/setFatal/setHint com .message cru em src", () => {
    const ofensores: string[] = [];
    for (const p of listar(raiz)) {
      const src = readFileSync(p, "utf8");
      const re = /set(Error|Fatal|Hint)\(([^;]*?)\)\s*;/gs;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const arg = m[2]!;
        if (/\.message\b/.test(arg) && !/descreverErroSupabase\(|motivoDe\(/.test(arg)) {
          ofensores.push(`${p.slice(raiz.length + 1)}: ${arg.slice(0, 80)}`);
        }
      }
    }
    expect(ofensores).toEqual([]);
  });

  it("os 20 pontos citam a ação e preservam MIGRATION_HINT", () => {
    const esperados: Array<[string, string[]]> = [
      [
        "components/sales/ItemTechnicalDetailsDialog.tsx",
        ["carregar os detalhes", "salvar", "criar o grupo", "remover o grupo"],
      ],
      [
        "components/sales/ItemConsumptionEditor.tsx",
        [
          "carregar os materiais do item",
          "salvar o consumo",
          "adicionar o material",
          "remover o material",
        ],
      ],
      ["components/sales/TechnicalSheetDialog.tsx", ["carregar a ficha técnica"]],
      ["components/sales/OrderProductionDetails.tsx", ["carregar os detalhes de produção"]],
      [
        "components/sales/OrderDetail.tsx",
        ["carregar o pedido", "carregar os itens", "MIGRATION_HINT"],
      ],
      ["routes/_authenticated.catalog.tsx", ["carregar o catálogo", "MIGRATION_HINT"]],
      ["routes/_authenticated.orders.tsx", ["carregar os pedidos", "MIGRATION_HINT"]],
      ["components/comments/CommentsPanel.tsx", ["gerar o link de download", "carregar a prévia"]],
      ["hooks/use-references.ts", ["carregar as referências"]],
      ["hooks/use-stock.ts", ["carregar o saldo de estoque"]],
    ];
    for (const [p, acoes] of esperados) {
      const src = readFileSync(join(raiz, p), "utf8");
      for (const a of acoes) expect({ p, a, ok: src.includes(a) }).toEqual({ p, a, ok: true });
    }
  });
});
