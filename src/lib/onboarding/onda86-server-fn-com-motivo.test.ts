// Onda 86 — 79ª medição. Server functions do almoxarifado (`createServerFn`):
// (1) devolviam `reason: error.message` cru e até o literal "forbidden", que a
// UI exibia; (2) quando a função **lançava** (middleware `Unauthorized: …`
// em sessão inválida, rede, 500) o `await` sem try/catch virava rejeição não
// tratada (`pageerror`) e deixava `busy = true` — botão travado para sempre.
// Agora: motivo traduzido no servidor e `chamarServidor` nos 5 chamadores.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { chamarServidor } from "@/lib/supabase/erro-humano";

const ler = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf-8");

describe("Onda 86 — server functions explicam o porquê e nunca travam a UI", () => {
  it("chamarServidor converte lançamento em { ok: false, reason } legível", async () => {
    const r1 = await chamarServidor("salvar o insumo", async () => {
      throw new Error("Unauthorized: Invalid token");
    });
    expect(r1.ok).toBe(false);
    expect((r1 as { reason: string }).reason).toMatch(/sessão expirou ou é inválida/);
    const r2 = await chamarServidor("salvar o insumo", async () => {
      throw new Error("TypeError: Failed to fetch");
    });
    expect((r2 as { reason: string }).reason).toMatch(/sem conexão/);
    const r3 = await chamarServidor("x", async () => ({ ok: true as const, id: 1 }));
    expect(r3).toEqual({ ok: true, id: 1 });
  });

  it("inventory.functions não devolve mensagem crua nem 'forbidden'", () => {
    const s = ler("src/lib/inventory/inventory.functions.ts");
    expect(s).not.toMatch(/reason: (?:error|roleError)\.message/);
    expect(s).not.toContain('reason: "forbidden"');
    expect(s).toMatch(/requer papel de admin, gestor ou almoxarifado/);
  });

  it("os 5 chamadores passam por chamarServidor", () => {
    for (const [f, fn] of [
      ["src/routes/_authenticated.inventory.tsx", "upsertStockItem"],
      ["src/routes/_authenticated.inventory.tsx", "runAbcClassification"],
      ["src/components/inventory/MovementDialog.tsx", "registerMovement"],
      ["src/components/inventory/ReservationDialog.tsx", "createReservation"],
      ["src/components/inventory/ReservationsPanel.tsx", "updateReservationStatus"],
    ] as const) {
      const s = ler(f);
      expect(s, `${f}:${fn}`).toMatch(
        new RegExp(`chamarServidor\\("[^"]+", \\(\\) =>\\s*${fn}\\(`),
      );
      expect(s, `${f}:${fn}`).not.toMatch(new RegExp(`await ${fn}\\(`));
    }
  });
});
