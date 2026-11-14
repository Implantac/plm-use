// Onda 82 — 76ª medição. Estende a Onda 81 a todas as gravações Supabase
// dos hooks que ainda engoliam o erro (`if (error) return null/false`):
// CAPA (mover/salvar/excluir), piloto, peça-mãe e feedback do showroom,
// upsert de referência. Achado real: no CAPA uma falha de permissão virava
// "Transição não permitida" — regra de negócio no lugar do motivo real.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ler = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf-8");

describe("Onda 82 — gravações Supabase dos hooks explicam o porquê", () => {
  it("nenhum hook grava e descarta o erro silenciosamente", () => {
    for (const f of [
      "src/hooks/use-capa.ts",
      "src/hooks/use-pilotos.ts",
      "src/hooks/use-showroom.ts",
      "src/hooks/use-references.ts",
    ]) {
      const s = ler(f);
      expect(s, f).not.toMatch(/if \(error(?: \|\| !data)?\) return (?:null|false);/);
      expect(s, f).toContain("descreverErroSupabase(");
    }
  });

  it("CAPA: regra de negócio e erro de banco têm mensagens distintas", () => {
    const hook = ler("src/hooks/use-capa.ts");
    expect(hook).toContain("Transição não permitida: ${capa.status} → ${to}.");
    expect(hook).toContain('descreverErroSupabase(error, "mover o CAPA")');
    const drawer = ler("src/components/quality/CapaDrawer.tsx");
    expect(drawer).not.toContain('statusToast.error("Transição não permitida")');
  });

  it("showroom não repete toast genérico por cima do motivo", () => {
    const s = ler("src/routes/_authenticated.showroom.tsx");
    expect(s).not.toContain("Falha ao solicitar peça-mãe");
    expect(s).not.toContain("Falha ao registrar feedback");
  });
});
