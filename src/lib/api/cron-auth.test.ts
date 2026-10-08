import { describe, it, expect } from "vitest";
import { verifyCronSignature, signCronBody } from "./cron-auth.server";

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
