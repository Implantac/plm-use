// Onda 106 — 99ª medição. `useReferences().error` já carregava o motivo real,
// mas /dashboard, /flow, ReferenceJourney e ProductStudio o descartavam e
// escreviam "Verifique sua conexão e tente novamente mais tarde" — numa
// sessão expirada, diagnóstico falso (medido em produção). Agora mostram o
// motivo; blocos secundários da mesma página apontam para o aviso do topo
// (um motivo por causa, sem duplicar).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ler = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf-8");

describe("Onda 106 — inline mostra o motivo real", () => {
  it("nenhuma tela inventa 'verifique sua conexão' / 'tente mais tarde' no lugar do motivo", () => {
    for (const f of [
      "src/routes/_authenticated.dashboard.tsx",
      "src/routes/_authenticated.flow.tsx",
      "src/components/reference/ReferenceJourney.tsx",
      "src/components/ai/ProductStudio.tsx",
    ]) {
      const s = ler(f);
      expect(s, f).not.toMatch(/Verifique sua conexão/);
      expect(s, f).not.toMatch(/[Tt]ente novamente mais tarde/);
      expect(s, f).not.toMatch(/error=\{Boolean\(error\)\}/);
    }
  });

  it("motivo é renderizado e o bloco secundário aponta para o topo", () => {
    const dash = ler("src/routes/_authenticated.dashboard.tsx");
    expect(dash).toContain('<p className="font-medium text-white">{error}</p>');
    expect(dash).toContain("Referências indisponíveis — veja o aviso no topo da página.");
    const flow = ler("src/routes/_authenticated.flow.tsx");
    expect(flow).toMatch(/role="alert"[\s\S]{0,300}\{error\}/);
    expect(flow).toContain("Etapa sem dados — veja o aviso no topo da página.");
    const rj = ler("src/components/reference/ReferenceJourney.tsx");
    expect(rj).toContain("error?: string | boolean | null;");
    expect(rj).toContain('typeof error === "string" ? error :');
    expect(ler("src/routes/_authenticated.development.tsx")).toContain("error={error}");
    expect(ler("src/components/ai/ProductStudio.tsx")).toContain(
      "{referencesError} Sem essa lista, os códigos não podem ser validados antes de salvar.",
    );
  });
});
