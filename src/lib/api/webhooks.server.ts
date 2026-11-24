// Onda 122 — despacho da fila de webhooks (service role). Chamado pelo cron assinado e por "Enviar agora".
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  assinarWebhook,
  HEADER_ASSINATURA,
  HEADER_ENTREGA,
  HEADER_EVENTO,
  montarCorpoWebhook,
  proximaTentativaEm,
  TIMEOUT_ENTREGA_MS,
} from "./webhooks";

type Admin = SupabaseClient<Database>;

export interface ResultadoDespacho {
  processadas: number;
  entregues: number;
  reagendadas: number;
  falhas: number;
}

export async function despacharPendentes(
  admin: Admin,
  limite = 50,
  fetchImpl: typeof fetch = fetch,
): Promise<ResultadoDespacho> {
  const agora = new Date().toISOString();
  const { data: fila, error } = await admin
    .from("webhook_deliveries")
    .select("id, subscription_id, event, payload, attempts, created_at")
    .eq("status", "pending")
    .lte("next_attempt_at", agora)
    .order("created_at", { ascending: true })
    .limit(limite);
  if (error) throw new Error(error.message);
  const r: ResultadoDespacho = { processadas: 0, entregues: 0, reagendadas: 0, falhas: 0 };
  if (!fila?.length) return r;

  const subIds = [...new Set(fila.map((d) => d.subscription_id))];
  const { data: subs } = await admin
    .from("webhook_subscriptions")
    .select("id, url, secret, active")
    .in("id", subIds);
  const porId = new Map((subs ?? []).map((s) => [s.id, s]));

  for (const d of fila) {
    r.processadas++;
    const sub = porId.get(d.subscription_id);
    if (!sub || !sub.active) {
      await admin
        .from("webhook_deliveries")
        .update({ status: "failed", last_error: "assinatura inativa ou removida" })
        .eq("id", d.id);
      r.falhas++;
      continue;
    }
    const corpo = montarCorpoWebhook({
      deliveryId: d.id,
      event: d.event,
      payload: d.payload,
      createdAt: d.created_at,
    });
    const tentativa = d.attempts + 1;
    let status: number | null = null;
    let erro: string | null = null;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_ENTREGA_MS);
      const resp = await fetchImpl(sub.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "USE-MODA-PLM-Webhooks/1",
          [HEADER_ASSINATURA]: assinarWebhook(corpo, sub.secret),
          [HEADER_EVENTO]: d.event,
          [HEADER_ENTREGA]: d.id,
        },
        body: corpo,
        signal: ctrl.signal,
        redirect: "manual",
      });
      clearTimeout(timer);
      status = resp.status;
      if (!(resp.status >= 200 && resp.status < 300)) erro = `HTTP ${resp.status}`;
    } catch (e) {
      erro =
        e instanceof Error ? (e.name === "AbortError" ? "timeout (10 s)" : e.message) : String(e);
    }

    if (!erro) {
      await admin
        .from("webhook_deliveries")
        .update({
          status: "delivered",
          attempts: tentativa,
          response_status: status,
          last_error: null,
          delivered_at: new Date().toISOString(),
        })
        .eq("id", d.id);
      r.entregues++;
    } else {
      const espera = proximaTentativaEm(tentativa);
      await admin
        .from("webhook_deliveries")
        .update({
          status: espera == null ? "failed" : "pending",
          attempts: tentativa,
          response_status: status,
          last_error: erro.slice(0, 300),
          next_attempt_at: new Date(Date.now() + (espera ?? 0)).toISOString(),
        })
        .eq("id", d.id);
      if (espera == null) r.falhas++;
      else r.reagendadas++;
    }
    await admin
      .from("webhook_subscriptions")
      .update({ last_delivery_at: new Date().toISOString(), last_status: status })
      .eq("id", sub.id);
  }
  return r;
}
