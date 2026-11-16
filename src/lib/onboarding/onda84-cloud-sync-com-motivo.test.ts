// Onda 84 — 78ª medição. Fecha a família "sync para a nuvem": `cloud-sync`
// (influencers, CAPA, fichas) e `creative-sync` (coleções, cores, paletas…)
// diziam só "Tente novamente"; agora dizem o motivo real, uma vez por
// minuto, e o push por diff de influencers nunca sobe vitrine.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ler = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf-8");

describe("Onda 84 — cloud-sync e creative-sync explicam o porquê", () => {
  it("nenhum motor de sync usa o genérico 'Tente novamente' sem motivo", () => {
    for (const f of ["src/lib/cloud-sync.ts", "src/lib/creative-sync.ts", "src/lib/pcp/sync.ts"]) {
      const s = ler(f);
      expect(s, f).not.toContain("na nuvem. Tente novamente.");
      expect(s, f).toContain("descreverErroSupabase(");
      expect(s, f).toContain("avisoUnico(");
    }
  });

  it("push por diff de influencers pula vitrine (demo: true)", () => {
    const s = ler("src/lib/cloud-sync.ts");
    expect(s).toMatch(
      /if \(i\.demo\) continue;\s*\n\s*if \(prevMap\.get\(i\.id\) !== i\) void pushInfluencer/,
    );
  });
});
