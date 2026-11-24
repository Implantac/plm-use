// Onda 122 — gestão de webhooks (Segurança). Só admin/manager (RLS reforça).
import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { descreverErroSupabase } from "@/lib/supabase/erro-humano";
import { EVENTOS_WEBHOOK, urlWebhookValida } from "./webhooks-eventos";

const idsEventos = EVENTOS_WEBHOOK.map((e) => e.id) as [string, ...string[]];

export const listarWebhooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("webhook_subscriptions")
      .select("id, name, url, events, active, last_delivery_at, last_status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(descreverErroSupabase(error, "listar os webhooks"));
    return data ?? [];
  });

export const criarWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        name: z.string().trim().min(2, "Dê um nome (ex.: ERP TOTVS).").max(80),
        url: z.string().trim().url("URL inválida."),
        events: z
          .array(z.enum(idsEventos))
          .min(1, "Escolha ao menos um evento.")
          .or(z.literal("*")),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const problema = urlWebhookValida(data.url);
    if (problema) throw new Error(problema);
    const secret = `whsec_${randomBytes(24).toString("base64url")}`;
    const { data: row, error } = await context.supabase
      .from("webhook_subscriptions")
      .insert({
        name: data.name,
        url: data.url,
        secret,
        events: data.events === "*" ? ["*"] : data.events,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(descreverErroSupabase(error, "criar o webhook"));
    // O segredo só existe nesta resposta.
    return { id: row.id, secret };
  });

export const alternarWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("webhook_subscriptions")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(descreverErroSupabase(error, "alterar o webhook"));
    return { ok: true as const };
  });

export const excluirWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("webhook_subscriptions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(descreverErroSupabase(error, "excluir o webhook"));
    return { ok: true as const };
  });

/** Enfileira um `ping` só para esta assinatura e despacha a fila na hora. */
export const testarWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    // RLS: só admin/manager enxergam a assinatura; a fila é escrita com service role.
    const { data: sub, error } = await context.supabase
      .from("webhook_subscriptions")
      .select("id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(descreverErroSupabase(error, "testar o webhook"));
    if (!sub) throw new Error("Webhook não encontrado ou sem permissão.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: e2 } = await supabaseAdmin.from("webhook_deliveries").insert({
      subscription_id: data.id,
      event: "ping",
      payload: { mensagem: "Teste enviado de Segurança → Webhooks", em: new Date().toISOString() },
    });
    if (e2) throw new Error(descreverErroSupabase(e2, "enfileirar o teste"));
    return despacharAgoraInterno();
  });

async function despacharAgoraInterno() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { despacharPendentes } = await import("./webhooks.server");
  return despacharPendentes(supabaseAdmin, 100);
}

export const despacharWebhooksAgora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Só quem enxerga a tabela (admin/manager) chega aqui com dados; confirma via RLS.
    const { error } = await context.supabase.from("webhook_subscriptions").select("id").limit(1);
    if (error) throw new Error(descreverErroSupabase(error, "despachar webhooks"));
    return despacharAgoraInterno();
  });

export const entregasRecentes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("webhook_deliveries")
      .select(
        "id, subscription_id, event, status, attempts, response_status, last_error, created_at, delivered_at",
      )
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(descreverErroSupabase(error, "listar as entregas"));
    return data ?? [];
  });
