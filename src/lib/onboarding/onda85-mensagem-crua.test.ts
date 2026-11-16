// Onda 85 — 78ª medição. Pedidos, catálogo, OP, estoque, papéis, comentários
// e rotas mostravam a mensagem crua do Postgres/PostgREST ao usuário
// (`toast.error(error.message)` → "new row violates row-level security
// policy for table orders"). Agora todas passam por `descreverErroSupabase`
// com a ação em linguagem do usuário; mensagem desconhecida continua sendo
// repassada (nunca escondida).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { descreverErroSupabase } from "@/lib/supabase/erro-humano";

const ler = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf-8");

const ARQUIVOS = [
  "src/routes/_authenticated.catalog.tsx",
  "src/routes/_authenticated.orders.tsx",
  "src/components/sales/OrderDetail.tsx",
  "src/routes/_authenticated.inventory.tsx",
  "src/components/pcp/op/OpMaterialsTab.tsx",
  "src/components/pcp/op/NovaOpDialog.tsx",
  "src/routes/_authenticated.official-models.tsx",
  "src/routes/_authenticated.admin.users.tsx",
  "src/components/comments/CommentsPanel.tsx",
  "src/routes/_authenticated.route-engineering.tsx",
];

describe("Onda 85 — nenhuma mensagem crua do banco chega ao usuário", () => {
  it("nenhum toast.error(<erro>.message) direto nos pontos operacionais", () => {
    for (const f of ARQUIVOS) {
      const s = ler(f);
      expect(s, f).not.toMatch(/toast\.error\((?:res\.error|error|e2|err)\.message\)/);
      expect(s, f).toContain("descreverErroSupabase(");
    }
  });

  it("RLS de pedido vira motivo em português com a ação", () => {
    const msg = descreverErroSupabase(
      { code: "42501", message: 'new row violates row-level security policy for table "orders"' },
      "criar o pedido",
    );
    expect(msg).toMatch(/^Não foi possível criar o pedido: /);
    expect(msg).toMatch(/permissão/);
    expect(msg).not.toMatch(/row-level/);
  });
});
