// Autenticação compartilhada dos endpoints públicos de cron (/api/public/cron/*).
//
// Por que este arquivo existe
// ---------------------------
// Crons são chamados por `pg_cron` via `net.http_post`, ou seja: sem sessão de
// usuário. Isso não significa "sem autenticação" — significa que o chamador
// precisa provar identidade com um segredo compartilhado. O padrão do projeto é
// HMAC-SHA256 sobre o corpo da requisição, comparado em tempo constante.
//
// O erro que este helper torna difícil de repetir: usar a publishable key do
// Supabase (`SUPABASE_PUBLISHABLE_KEY`) como se fosse segredo. Ela é pública por
// definição — o `supabase-js` a embute no bundle do navegador via
// `VITE_SUPABASE_PUBLISHABLE_KEY` e qualquer visitante a lê no DevTools. Um
// endpoint que a aceita como credencial é um endpoint aberto que escreve com
// `service_role`. Foi exatamente o que aconteceu em `/api/public/cron/abc-classify`
// até 2026-10-08.
//
// Regras ao adicionar um cron novo:
//   1. Gere um segredo próprio: `openssl rand -hex 32`.
//   2. Registre-o em .env (e em .env.example, sem valor) e no pg_cron.
//   3. Use um header próprio (`x-<modulo>-signature`) para que segredos de
//      módulos diferentes não se cruzem.
//   4. Nunca reaproveite chaves do Supabase como segredo.

import { createHmac, timingSafeEqual } from "node:crypto";

export type CronAuthResult = { ok: true } | { ok: false; status: 401 | 503; message: string };

/**
 * Verifica a assinatura HMAC-SHA256 de uma requisição de cron.
 *
 * @param request    A Request recebida pelo handler.
 * @param secret     O segredo do módulo (`process.env.X_CRON_SECRET`).
 * @param headerName Header que carrega a assinatura em hex (ex.: `x-abc-signature`).
 *
 * Retorna 503 quando o segredo não está configurado — falha fechada, nunca
 * aberta: um cron sem segredo configurado rejeita, não executa.
 */
export async function verifyCronSignature(
  request: Request,
  secret: string | undefined,
  headerName: string,
): Promise<CronAuthResult> {
  if (!secret) {
    return { ok: false, status: 503, message: "Cron secret not configured" };
  }

  const signature = request.headers.get(headerName) ?? "";
  const body = await request.text();
  const expected = createHmac("sha256", secret).update(body).digest("hex");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);

  // timingSafeEqual lança se os buffers tiverem tamanhos diferentes — daí a
  // comparação de tamanho antes. Comparar com `!==` vazaria tempo de execução.
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { ok: false, status: 401, message: "Invalid signature" };
  }

  return { ok: true };
}

/**
 * Assina um corpo de requisição. Usado pelos testes e por scripts de smoke test
 * que precisam chamar um cron local sem depender do pg_cron.
 */
export function signCronBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

// ---------------------------------------------------------------------------
// Rate limit dos caminhos privilegiados (service_role, fetchs ao ERP).
// Token bucket em memória por escopo+IP. Honestidade sobre o alcance: com
// preset cloudflare-module isto é por ISOLATE — não é proteção anti-DDoS
// (a borda já faz isso); é proteção contra laço de agendamento mal configurado
// e contra martelar o endpoint com assinaturas válidas vazadas (o custo por
// requisição aceita é ordens de grandeza maior que o de rejeitar um HMAC).
// ---------------------------------------------------------------------------
const buckets = new Map<string, { hits: number; resetAt: number }>();

export type CronRateResult = { ok: true } | { ok: false; retryAfterSec: number };

export function checkCronRateLimit(
  request: Request,
  scope: string,
  limit = 6,
  windowMs = 60_000,
  now = Date.now(),
): CronRateResult {
  const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const key = scope + ":" + ip;
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { hits: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (b.hits >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.hits += 1;
  return { ok: true };
}

/** Somente para testes. */
export function __resetCronRateLimits() {
  buckets.clear();
}
