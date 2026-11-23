// Onda 120 — Acesso do fornecedor ao portal.
// Até aqui `supplier_users` não tinha nenhuma tela que gravasse nela: "o fornecedor
// responde pelo portal" era impossível na prática. Estas funções (só servidor, com
// service role) convidam o e-mail do fornecedor, vinculam ao cadastro e permitem revogar.
// Quem chama precisa ser usuário interno com papel de gestão de fornecedores.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { descreverErroSupabase } from "@/lib/supabase/erro-humano";

const PAPEIS_GESTAO = ["admin", "manager", "pcp", "qualidade", "coordenador_produto"];

export interface AcessoFornecedor {
  id: string;
  user_id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

async function exigirGestor(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(descreverErroSupabase(error, "verificar sua permissão"));
  const ok = (data ?? []).some((r) => PAPEIS_GESTAO.includes(String(r.role)));
  if (!ok) throw new Error("Só gestão, compras/PCP ou qualidade podem dar acesso a fornecedores.");
  return supabaseAdmin;
}

async function emailDoUsuario(
  admin: Awaited<ReturnType<typeof exigirGestor>>,
  userId: string,
): Promise<string> {
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email ?? "(sem e-mail)";
}

/** Lista quem tem acesso ao portal por este fornecedor. */
export const listarAcessosFornecedor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ supplierId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<AcessoFornecedor[]> => {
    const admin = await exigirGestor(context.userId);
    const { data: rows, error } = await admin
      .from("supplier_users")
      .select("id, user_id, is_active, created_at")
      .eq("supplier_id", data.supplierId)
      .order("created_at");
    if (error) throw new Error(descreverErroSupabase(error, "listar os acessos"));
    return Promise.all(
      (rows ?? []).map(async (r) => ({ ...r, email: await emailDoUsuario(admin, r.user_id) })),
    );
  });

/**
 * Convida o e-mail (cria a conta se não existir e manda o link de acesso) e vincula ao
 * fornecedor. Se já tinha vínculo inativo, reativa.
 */
export const concederAcessoFornecedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        supplierId: z.string().uuid(),
        email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const admin = await exigirGestor(context.userId);

    // 1) conta: convida; se já existe, localiza.
    let userId: string | null = null;
    let convidado = false;
    const invite = await admin.auth.admin.inviteUserByEmail(data.email, {
      data: { origem: "portal_fornecedor", supplier_id: data.supplierId },
    });
    if (!invite.error && invite.data.user) {
      userId = invite.data.user.id;
      convidado = true;
    } else {
      // já cadastrado (ou convite falhou): procura pelo e-mail
      let page = 1;
      while (!userId && page <= 20) {
        const { data: lista, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw new Error(descreverErroSupabase(error, "localizar o usuário"));
        const u = lista.users.find((x) => (x.email ?? "").toLowerCase() === data.email);
        if (u) userId = u.id;
        if (lista.users.length < 200) break;
        page += 1;
      }
      if (!userId) {
        throw new Error(
          invite.error
            ? `Não foi possível convidar ${data.email}: ${invite.error.message}`
            : `Não foi possível localizar a conta de ${data.email}.`,
        );
      }
    }

    // 2) vínculo com o fornecedor (reativa se existir).
    const { error } = await admin.from("supplier_users").upsert(
      {
        supplier_id: data.supplierId,
        user_id: userId,
        is_active: true,
        created_by: context.userId,
      },
      { onConflict: "supplier_id,user_id" },
    );
    if (error) throw new Error(descreverErroSupabase(error, "vincular o acesso ao fornecedor"));

    return {
      ok: true as const,
      convidado,
      mensagem: convidado
        ? `Convite enviado para ${data.email}. Ao entrar, o fornecedor vê só as cotações e pedidos dele.`
        : `${data.email} já tinha conta — acesso ao portal liberado.`,
    };
  });

/** Revoga (inativa) o acesso; o histórico fica. */
export const revogarAcessoFornecedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ acessoId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const admin = await exigirGestor(context.userId);
    const { error } = await admin
      .from("supplier_users")
      .update({ is_active: false })
      .eq("id", data.acessoId);
    if (error) throw new Error(descreverErroSupabase(error, "revogar o acesso"));
    return { ok: true as const };
  });
