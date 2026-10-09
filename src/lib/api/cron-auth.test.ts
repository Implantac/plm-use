import { describe, it, expect } from "vitest";
import {
  __resetCronRateLimits,
  checkCronRateLimit,
  signCronBody,
  verifyCronSignature,
} from "./cron-auth.server";

const SECRET = "segredo-de-teste-1234567890";
const HEADER = "x-abc-signature";
const BODY = '{"trigger":"cron"}';

function req(body: string, headers: Record<string, string> = {}) {
  return new Request("https://exemplo.test/api/public/cron/abc-classify", {
    method: "POST",
    headers,
    body,
  });
}

describe("verifyCronSignature", () => {
  it("aceita assinatura válida", async () => {
    const sig = signCronBody(BODY, SECRET);
    const result = await verifyCronSignature(req(BODY, { [HEADER]: sig }), SECRET, HEADER);
    expect(result).toEqual({ ok: true });
  });

  it("rejeita requisição sem o header de assinatura", async () => {
    const result = await verifyCronSignature(req(BODY), SECRET, HEADER);
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("rejeita assinatura inválida", async () => {
    const result = await verifyCronSignature(req(BODY, { [HEADER]: "deadbeef" }), SECRET, HEADER);
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("rejeita assinatura de tamanho diferente sem lançar", async () => {
    // timingSafeEqual lança quando os buffers diferem de tamanho; o guard deve
    // barrar antes disso para não transformar 401 em 500.
    const curta = signCronBody(BODY, SECRET).slice(0, 32);
    const result = await verifyCronSignature(req(BODY, { [HEADER]: curta }), SECRET, HEADER);
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("rejeita assinatura válida de outro segredo", async () => {
    const sig = signCronBody(BODY, "segredo-de-outro-modulo");
    const result = await verifyCronSignature(req(BODY, { [HEADER]: sig }), SECRET, HEADER);
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("rejeita assinatura válida de outro corpo (replay com payload alterado)", async () => {
    const sig = signCronBody(BODY, SECRET);
    const result = await verifyCronSignature(
      req('{"trigger":"adulterado"}', { [HEADER]: sig }),
      SECRET,
      HEADER,
    );
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("falha FECHADO quando o segredo não está configurado (503, não aberto)", async () => {
    const sig = signCronBody(BODY, SECRET);
    const result = await verifyCronSignature(req(BODY, { [HEADER]: sig }), undefined, HEADER);
    expect(result).toMatchObject({ ok: false, status: 503 });
  });

  it("não aceita a publishable key do Supabase como segredo", async () => {
    // Regressão do incidente de 2026-10-08: /api/public/cron/abc-classify
    // autenticava comparando o header `apikey` com SUPABASE_PUBLISHABLE_KEY.
    // A chave é pública (vai no bundle do navegador), então o endpoint estava
    // efetivamente aberto com escrita via service_role. Aqui simulamos o ataque:
    // quem tem a chave pública assina, mas o segredo real é outro.
    const chavePublicaNoBundle = "sb_publishable_hz_LSAvo_exemplo_publico";
    const sigFeitaComAChavePublica = signCronBody(BODY, chavePublicaNoBundle);

    const result = await verifyCronSignature(
      req(BODY, { [HEADER]: sigFeitaComAChavePublica }),
      SECRET,
      HEADER,
    );
    expect(result).toMatchObject({ ok: false, status: 401 });
  });
});

describe("checkCronRateLimit (bucket por escopo+IP)", () => {
  it("permite o burst configurado e bloqueia o excedente com retry-after", () => {
    __resetCronRateLimits();
    const now = 1_000_000;
    const r = req(BODY, {});
    for (let i = 0; i < 6; i++)
      expect(checkCronRateLimit(r, "abc", 6, 60_000, now)).toEqual({ ok: true });
    const blocked = checkCronRateLimit(r, "abc", 6, 60_000, now);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("janelas distintas por IP e por escopo", () => {
    __resetCronRateLimits();
    const now = 2_000_000;
    const mk = (ip: string) =>
      new Request("https://exemplo.test/cron", { headers: { "x-forwarded-for": ip } });
    for (let i = 0; i < 6; i++)
      expect(checkCronRateLimit(mk("1.1.1.1"), "abc", 6, 60_000, now).ok).toBe(true);
    expect(checkCronRateLimit(mk("1.1.1.1"), "abc", 6, 60_000, now).ok).toBe(false);
    // outro IP passa; mesmo IP em outro escopo passa
    expect(checkCronRateLimit(mk("2.2.2.2"), "abc", 6, 60_000, now).ok).toBe(true);
    expect(checkCronRateLimit(mk("1.1.1.1"), "launch", 6, 60_000, now).ok).toBe(true);
  });

  it("a janela expira e o bucket reinicia", () => {
    __resetCronRateLimits();
    const now = 3_000_000;
    const r = req(BODY, {});
    for (let i = 0; i < 6; i++) checkCronRateLimit(r, "abc", 6, 1000, now);
    expect(checkCronRateLimit(r, "abc", 6, 1000, now).ok).toBe(false);
    expect(checkCronRateLimit(r, "abc", 6, 1000, now + 1500).ok).toBe(true);
  });

  it("x-forwarded-for com proxy chain usa o primeiro IP", () => {
    __resetCronRateLimits();
    const now = 4_000_000;
    const a = new Request("https://x/c", { headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" } });
    const b = new Request("https://x/c", { headers: { "x-forwarded-for": "9.9.9.9" } });
    for (let i = 0; i < 6; i++) checkCronRateLimit(a, "abc", 6, 60_000, now);
    // mesmo IP de origem → bloqueado, independentemente do proxy extra na chain
    expect(checkCronRateLimit(b, "abc", 6, 60_000, now).ok).toBe(false);
  });
});
