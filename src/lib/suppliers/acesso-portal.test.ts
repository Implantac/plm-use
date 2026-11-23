import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Onda 120 — acesso do fornecedor ao portal: convite/revogação só no servidor, com papel de
// gestão; fornecedor logado vê só o portal (menu, rotas, abas).
const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("onda120: acesso do fornecedor", () => {
  it("funções de acesso exigem papel de gestão e usam service role só no servidor", () => {
    const f = read("lib/suppliers/acesso-portal.functions.ts");
    expect(f).toContain("requireSupabaseAuth");
    expect(f).toContain("Só gestão, compras/PCP ou qualidade podem dar acesso");
    expect(f).toContain('await import("@/integrations/supabase/client.server")');
    expect(f).toContain("inviteUserByEmail");
    expect(f).toContain('onConflict: "supplier_id,user_id"');
    expect(f).toContain("is_active: false");
  });

  it("aba Fornecedores oferece 'Acesso ao portal' por fornecedor", () => {
    const aba = read("routes/_authenticated.supplier-portal.tsx");
    expect(aba).toContain("AcessoPortalDialog supplierId={s.id}");
    expect(aba).toContain("E-mail do fornecedor");
    expect(aba).toContain("Revogar");
  });

  it("modo fornecedor: menu só com o portal, redireciono e abas internas escondidas", () => {
    const layout = read("routes/_authenticated.tsx");
    expect(layout).toContain("useModoFornecedor(user?.id)");
    expect(layout).toContain('(!modoFornecedor || r.path === "/supplier-portal")');
    expect(layout).toContain('navigate({ to: "/supplier-portal", replace: true })');
    const aba = read("routes/_authenticated.supplier-portal.tsx");
    expect(aba).toContain('{!soFornecedor && <TabsTrigger value="rfq-bom">');
    expect(aba).toContain("<OrdersTab somenteLeitura={soFornecedor} />");
    const hook = read("hooks/use-auth.ts");
    expect(hook).toContain("roles.length === 0 && Boolean(supplierId)");
  });
});
