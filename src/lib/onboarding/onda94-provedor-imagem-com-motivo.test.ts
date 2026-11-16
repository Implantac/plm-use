import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { motivoDoProvedor } from "@/lib/ai/motivo-provedor-imagem";

// Onda 94 — `/api/generate-image` repassava ao usuário o texto cru do provedor
// (inglês/técnico). Agora o texto vai ao log e o usuário recebe o porquê.
describe("Onda 94 — provedor de imagens com motivo", () => {
  it("traduz por classe e nunca vaza o texto do provedor", () => {
    const cru =
      "Your request was rejected as a result of our safety system. Invalid API key sk-abc";
    const casos: Array<[number, RegExp]> = [
      [402, /Créditos de IA esgotados/],
      [429, /Limite temporário/],
      [401, /chave do provedor.*recusada/],
      [403, /chave do provedor.*recusada/],
      [400, /política de conteúdo/],
      [422, /não aceitou o pedido/],
      [500, /instável \(HTTP 500\)/],
      [503, /instável \(HTTP 503\)/],
      [418, /HTTP 418/],
    ];
    for (const [status, re] of casos) {
      const m = motivoDoProvedor(status, cru);
      expect({ status, m }).toEqual({ status, m: expect.stringMatching(re) });
      expect(m).not.toMatch(/safety system|sk-abc|Invalid API key/);
    }
    expect(motivoDoProvedor(400, "bad size")).toMatch(/não aceitou o pedido/);
  });

  it("a rota não repassa providerBody.error/message ao cliente", () => {
    const src = readFileSync(
      join(__dirname, "..", "..", "routes", "api", "generate-image.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/providerBody/);
    expect(src).toMatch(/motivoDoProvedor\(upstream\.status, detalhe\)/);
    expect(src).toMatch(/console\.warn\("\[generate-image\] provedor"/);
  });

  it("o handler POST tem try/catch externo: exceção vira JSON 500 em português, não HTML", () => {
    const src = readFileSync(
      join(__dirname, "..", "..", "routes", "api", "generate-image.ts"),
      "utf8",
    );
    expect(src).toMatch(/return await gerarImagem\(request\);/);
    expect(src).toMatch(/erro interno do servidor/);
    expect(src).toMatch(/async function gerarImagem\(request: Request\): Promise<Response>/);
  });
});
