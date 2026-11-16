// Onda 88 — 81ª medição. O Vite avisava a cada subida: "TanStack Start server
// functions are not protected by the CSRF middleware". As server functions
// gravam como o usuário autenticado (insumo, movimentação, reserva, wave,
// transição) — sem a trava, um site de terceiros poderia disparar gravações
// com a sessão da vítima. Agora `createCsrfMiddleware` cobre `serverFn`.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const start = readFileSync(resolve(__dirname, "../../start.ts"), "utf-8");

describe("Onda 88 — CSRF nas server functions", () => {
  it("start.ts registra createCsrfMiddleware filtrando serverFn antes do errorMiddleware", () => {
    expect(start).toContain("createCsrfMiddleware({");
    expect(start).toMatch(/filter: \(ctx\) => ctx\.handlerType === "serverFn"/);
    expect(start).toMatch(/requestMiddleware: \[csrfMiddleware, errorMiddleware\]/);
  });

  it("a recusa explica o porquê em linguagem do usuário (403 JSON, não 'Forbidden' cru)", () => {
    expect(start).toMatch(/status: 403/);
    expect(start).toContain("origem não reconhecida");
  });

  it("o aviso não foi silenciado por configuração", () => {
    const vite = readFileSync(resolve(__dirname, "../../../vite.config.ts"), "utf-8");
    expect(vite).not.toContain("disableCsrfMiddlewareWarning");
  });
});
