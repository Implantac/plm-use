// Onda 99 — 92ª medição. `update`/`transition` de `useReferences` devolviam
// `boolean` (`return !error`): uma falha de permissão/sessão ao "Avançar etapa"
// em /flow virava "Não foi possível avançar a referência." e, no drawer,
// "Transição não permitida" — regra de negócio no lugar do motivo real.
// Agora devolvem `{ ok } | { ok: false, reason }` e as telas mostram `reason`.
// `use-workflow.ts` perdeu o `validateRemote` morto (`if (error) return false`).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ler = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf-8");

describe("Onda 99 — transição de referência explica o porquê", () => {
  it("useReferences: update/transition devolvem motivo, nunca boolean cru", () => {
    const s = ler("src/hooks/use-references.ts");
    expect(s).toContain(
      "export type ResultadoGravacao = { ok: true } | { ok: false; reason: string };",
    );
    expect(s).not.toMatch(/return !error;/);
    expect(s).toContain('descreverErroSupabase(error, "salvar a referência")');
    expect(s).toContain("não é permitida pelo fluxo.");
    expect(s).toContain("Piloto aprovado, mas a engenharia não foi aberta automaticamente.");
  });

  it("/flow e EntityDrawer mostram o motivo; CAPA não repete toast genérico", () => {
    const flow = ler("src/routes/_authenticated.flow.tsx");
    expect(flow).not.toContain("Não foi possível avançar a referência.");
    expect(flow).toContain("toast.error(res.reason)");
    const drawer = ler("src/components/entity/EntityDrawer.tsx");
    expect(drawer).not.toContain('toast.error("Transição não permitida")');
    expect(drawer).toContain("toast.error(res.reason)");
    const capa = ler("src/components/quality/CapaDrawer.tsx");
    expect(capa).not.toContain('statusToast.error("Falha ao salvar")');
  });

  it("nenhum hook mantém `if (error) return false` (use-workflow incluído)", () => {
    for (const f of ["src/hooks/use-workflow.ts", "src/hooks/use-references.ts"]) {
      expect(ler(f), f).not.toMatch(/if \(error\) return (?:null|false);/);
    }
    expect(ler("src/hooks/use-workflow.ts")).not.toContain("validateRemote");
  });
});
