// Onda 125 — Conector Bling (Segurança → Integrações). Só admin/manager (sonda RLS em api_keys).
import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { descreverErroSupabase } from "@/lib/supabase/erro-humano";
import { urlAutorizacaoBling, type ResumoSyncBling } from "./bling";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function exigirAdmin(supabase: SupabaseClient<Database>) {
  const { error } = await supabase.from("api_keys").select("id").limit(1);
  if (error) throw new Error(descreverErroSupabase(error, "acessar as integrações"));
}

export type StatusBling = {
  configurado: boolean; // BLING_CLIENT_ID/SECRET presentes no servidor
  conectado: boolean;
  account_label: string | null;
  connected_at: string | null;
  expires_at: string | null;
  last_sync_at: string | null;
  last_sync_summary: ResumoSyncBling | null;
  migration_pendente: boolean;
};

export const statusBling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StatusBling> => {
    await exigirAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { credenciaisBling } = await import("./bling.server");
    const configurado = credenciaisBling() != null;
    const { data, error } = await supabaseAdmin
      .from("integration_connections")
      .select(
        "account_label, connected_at, expires_at, last_sync_at, last_sync_summary, refresh_token",
      )
      .eq("provider", "bling")
      .maybeSingle();
    if (error) {
      if (error.code === "42P01")
        return {
          configurado,
          conectado: false,
          account_label: null,
          connected_at: null,
          expires_at: null,
          last_sync_at: null,
          last_sync_summary: null,
          migration_pendente: true,
        };
      throw new Error(descreverErroSupabase(error, "ler a conexão com o Bling"));
    }
    return {
      configurado,
      conectado: !!data?.refresh_token,
      account_label: data?.account_label ?? null,
      connected_at: data?.connected_at ?? null,
      expires_at: data?.expires_at ?? null,
      last_sync_at: data?.last_sync_at ?? null,
      last_sync_summary: (data?.last_sync_summary as ResumoSyncBling | null) ?? null,
      migration_pendente: false,
    };
  });

/** Gera o state anti-CSRF, guarda por 10 min e devolve a URL de autorização do Bling. */
export const iniciarConexaoBling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { credenciaisBling } = await import("./bling.server");
    const cred = credenciaisBling();
    if (!cred)
      throw new Error(
        "Defina BLING_CLIENT_ID e BLING_CLIENT_SECRET nos segredos do servidor (Lovable Cloud) e publique de novo.",
      );
    const state = randomBytes(18).toString("base64url");
    const { error } = await supabaseAdmin.from("integration_connections").upsert(
      {
        provider: "bling",
        oauth_state: state,
        oauth_state_expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
        connected_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider" },
    );
    if (error) throw new Error(descreverErroSupabase(error, "iniciar a conexão com o Bling"));
    return { url: urlAutorizacaoBling(cred.id, state) };
  });

export const sincronizarBling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ dias: z.number().int().min(1).max(365).optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { credenciaisBling, sincronizarPedidosBling } = await import("./bling.server");
    const cred = credenciaisBling();
    if (!cred) throw new Error("BLING_CLIENT_ID/BLING_CLIENT_SECRET não configurados no servidor.");
    return sincronizarPedidosBling(supabaseAdmin, cred, { dias: data.dias });
  });

export const desconectarBling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("integration_connections")
      .delete()
      .eq("provider", "bling");
    if (error) throw new Error(descreverErroSupabase(error, "desconectar o Bling"));
    return { ok: true };
  });
