// Onda 87 — 80ª medição. Estende a Onda 86 às demais server functions:
// `/launch` (criar wave, promover decisões, mover wave ×2, handoff) chamava
// sem try/catch — lançamento virava `pageerror` sem feedback; `launch.functions`
// e `transition.functions` devolviam `reason` cru; `use-transition` capturava
// mas mostrava "Unauthorized: Invalid token" ao usuário.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ler = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf-8");

describe("Onda 87 — launch e workflow explicam o porquê e nunca travam a UI", () => {
  it("/launch envolve as 5 chamadas de server fn em chamarServidor", () => {
    const s = ler("src/routes/_authenticated.launch.tsx");
    expect((s.match(/chamarServidor\(/g) ?? []).length).toBe(5);
    expect(s).not.toMatch(/await (?:create|promote|transition|handoff)\(/);
  });

  it("launch.functions e transition.functions não devolvem mensagem crua", () => {
    for (const f of [
      "src/lib/launch/launch.functions.ts",
      "src/lib/workflow/transition.functions.ts",
    ]) {
      const s = ler(f);
      expect(s, f).not.toMatch(/reason: [a-zA-Z]+\??\.message/);
      expect(s, f).not.toMatch(/\$\{[a-zA-Z]+\.message\}/);
      expect(s, f).toContain("descreverErroSupabase(");
    }
  });

  it("use-transition traduz o lançamento em vez de expor a mensagem crua", () => {
    const s = ler("src/hooks/use-transition.ts");
    expect(s).toContain("chamarServidor(");
    expect(s).not.toContain("toast.error(`Falha na transição (${label}): ${msg}`)");
  });
});
