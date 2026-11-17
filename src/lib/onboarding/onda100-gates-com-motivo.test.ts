// Onda 100 — 93ª medição. Gates do Fluxo do Produto: `openGate`/`decide`
// faziam `return !error` e /flow e /approvals diziam "Não foi possível abrir o
// gate." sem o porquê (permissão, sessão, regra do banco). Agora devolvem
// `ResultadoGravacao` e as telas mostram `reason`. Piloto: o hook já explicava
// e o diálogo empilhava "Falha ao criar piloto" (2 toasts, 1 causa); sem
// usuário, ficava mudo.

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ler = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf-8");

describe("Onda 100 — gates e piloto explicam o porquê", () => {
  it("use-reference-gates devolve motivo, nunca boolean cru", () => {
    const s = ler("src/hooks/use-reference-gates.ts");
    expect(s).not.toMatch(/return !error;/);
    expect(s).not.toMatch(/if \(!user\) return false;/);
    expect(s).toContain('descreverErroSupabase(error, "abrir o gate")');
    expect(s).toContain('descreverErroSupabase(error, "registrar a decisão do gate")');
  });

  it("/flow e /approvals mostram o motivo do gate", () => {
    for (const f of [
      "src/routes/_authenticated.flow.tsx",
      "src/routes/_authenticated.approvals.tsx",
    ]) {
      const s = ler(f);
      expect(s, f).not.toContain('toast.error("Não foi possível abrir o gate.")');
      expect(s, f).not.toContain('toast.error("Não foi possível registrar a decisão do gate.")');
      expect(s, f).toContain("toast.error(res.reason)");
    }
  });

  it("showroom: amostra e decisão com motivo; tela não inventa causa", () => {
    const hook = ler("src/hooks/use-showroom.ts");
    expect(hook).toContain('descreverErroSupabase(error, "mover a amostra")');
    expect(hook).toContain('descreverErroSupabase(error, "registrar a decisão")');
    const tela = ler("src/routes/_authenticated.showroom.tsx");
    expect(tela).not.toContain('statusToast.error("Transição bloqueada")');
    expect(tela).not.toContain("justificativa obrigatória");
    expect(tela).toContain("A decisão não foi registrada — veja o aviso acima e tente de novo.");
  });

  it("timeline e vínculos: falha avisa (não existe mais erro descartado)", () => {
    expect(ler("src/hooks/use-entity-events.ts")).toContain(
      'descreverErroSupabase(error, "registrar o evento na linha do tempo")',
    );
    const rel = ler("src/hooks/use-entity-relations.ts");
    expect(rel).toContain('descreverErroSupabase(error, "criar o vínculo")');
    expect(rel).toContain('descreverErroSupabase(error, "remover o vínculo")');
  });

  it("piloto: um toast por causa e nunca mudo sem sessão", () => {
    expect(ler("src/components/pcp/NovoPilotoDialog.tsx")).not.toContain("Falha ao criar piloto");
    const hook = ler("src/hooks/use-pilotos.ts");
    expect(hook).toContain("Não foi possível criar o piloto: você não está autenticado.");
    expect(hook).not.toMatch(/\): Promise<Piloto \| null> => \{\n\s+if \(!user\) return null;/);
  });

  it("nenhum hook em src/hooks mantém `return !error`", () => {
    const dir = resolve(__dirname, "../../..", "src/hooks");
    for (const f of readdirSync(dir)) {
      if (!/\.tsx?$/.test(f) || /\.test\./.test(f)) continue;
      expect(ler(`src/hooks/${f}`), f).not.toMatch(/return !error;/);
    }
  });
});
