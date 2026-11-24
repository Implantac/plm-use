// Onda 122 — Webhooks: catálogo de eventos, assinatura HMAC e política de reenvio (puro, testável).
import { createHmac, timingSafeEqual } from "node:crypto";

export { EVENTOS_WEBHOOK, urlWebhookValida, type EventoWebhook } from "./webhooks-eventos";

export const HEADER_ASSINATURA = "x-plm-signature";
export const HEADER_EVENTO = "x-plm-event";
export const HEADER_ENTREGA = "x-plm-delivery";
export const MAX_TENTATIVAS = 6;
export const TIMEOUT_ENTREGA_MS = 10_000;

/** Assinatura no formato `t=<unix>,v1=<hmac-sha256-hex de "<t>.<corpo>">` (mesmo desenho do Stripe). */
export function assinarWebhook(
  corpo: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000),
) {
  const v1 = createHmac("sha256", secret).update(`${timestamp}.${corpo}`).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

/** Verificação do lado do receptor (documentada no OpenAPI; usada nos testes). */
export function verificarAssinaturaWebhook(
  corpo: string,
  header: string | null,
  secret: string,
  toleranciaSeg = 300,
  agora = Math.floor(Date.now() / 1000),
): boolean {
  if (!header) return false;
  const partes = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(partes.t);
  if (!Number.isFinite(t) || !partes.v1) return false;
  if (Math.abs(agora - t) > toleranciaSeg) return false;
  const esperado = createHmac("sha256", secret).update(`${t}.${corpo}`).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(String(partes.v1));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Backoff: 1 min, 5 min, 30 min, 2 h, 12 h; depois marca como falha definitiva. */
export function proximaTentativaEm(tentativasFeitas: number): number | null {
  const minutos = [1, 5, 30, 120, 720];
  if (tentativasFeitas >= MAX_TENTATIVAS) return null;
  return (minutos[tentativasFeitas - 1] ?? 720) * 60_000;
}

export function montarCorpoWebhook(p: {
  deliveryId: string;
  event: string;
  payload: unknown;
  createdAt: string;
}) {
  return JSON.stringify({
    id: p.deliveryId,
    event: p.event,
    created_at: p.createdAt,
    data: p.payload,
    api_version: "1",
  });
}
