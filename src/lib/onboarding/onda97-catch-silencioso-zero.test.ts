import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { motivoArmazenamentoLocal } from "@/lib/supabase/erro-humano";

// Onda 97 — nenhum `catch {}` silencioso em gravação/sincronização. Os únicos
// vazios permitidos são fallbacks de parse de corpo HTTP (streamImage,
// generate-image), onde a mensagem por status já está preservada.
function listar(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) listar(p, acc);
    else if (/\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome)) acc.push(p);
  }
  return acc;
}
const raiz = join(__dirname, "..", "..");
const PERMITIDOS = new Set(["lib/streamImage.ts", "routes/api/generate-image.ts"]);

describe("Onda 97 — catch silencioso zero", () => {
  it("só os 2 fallbacks de parse HTTP têm catch vazio", () => {
    const re = /catch(?: \(\w+\))? \{\s*(?:\/\/[^\n]*\s*)*\}/g;
    const achados: string[] = [];
    for (const p of listar(raiz)) {
      const rel = p.slice(raiz.length + 1);
      const src = readFileSync(p, "utf8");
      if (re.test(src) && !PERMITIDOS.has(rel)) achados.push(rel);
      re.lastIndex = 0;
    }
    expect(achados).toEqual([]);
  });

  it("localStorage: leitura corrompida e gravação falha avisam (uma vez) com motivo", () => {
    for (const p of [
      "routes/_authenticated.financial.tsx",
      "routes/_authenticated.commercial.tsx",
      "components/inventory/FabricRollsShadePanel.tsx",
    ]) {
      const src = readFileSync(join(raiz, p), "utf8");
      expect({ p, ler: /motivoArmazenamentoLocal\("[^"]+", "ler", e\)/.test(src) }).toEqual({
        p,
        ler: true,
      });
      expect({ p, gravar: /motivoArmazenamentoLocal\("[^"]+", "gravar", e\)/.test(src) }).toEqual({
        p,
        gravar: true,
      });
      expect((src.match(/avisoUnico\(msg\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
    }
    const cad = readFileSync(join(raiz, "lib/cad/store.ts"), "utf8");
    expect(cad).toMatch(/motivoDe\(e, "sincronizar o molde na nuvem"\)/);
    expect(cad).toMatch(/O molde continua salvo neste navegador/);
  });

  it("motivoArmazenamentoLocal distingue cota, bloqueio e leitura", () => {
    const quota = new DOMException("x", "QuotaExceededError");
    expect(motivoArmazenamentoLocal("o painel", "gravar", quota)).toMatch(
      /está cheio.*perdidos ao recarregar/,
    );
    expect(motivoArmazenamentoLocal("o painel", "gravar", new Error("SecurityError"))).toMatch(
      /bloqueou/,
    );
    expect(motivoArmazenamentoLocal("o painel", "ler", new SyntaxError("json"))).toMatch(
      /corrompidos e foram ignorados/,
    );
  });
});
