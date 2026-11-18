// Onda 105 — 98ª medição. Stores de módulo em localStorage (eventos locais,
// filtros salvos do mapa, rotas recentes/favoritas) liam com
// `catch { return [] }` e gravavam sem try. Agora usam `lerLocal`/`gravarLocal`
// (`src/lib/armazenamento-local.ts`): corrompido avisa, gravação bloqueada
// avisa e não derruba a UI. Bônus: ReservationsPanel explica OPs sem número.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ler = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf-8");

describe("Onda 105 — stores locais com motivo", () => {
  it("stores usam o helper e não acessam localStorage cru", () => {
    for (const f of [
      "src/lib/local-events/store.ts",
      "src/lib/collection-map/store.ts",
      "src/hooks/use-recent-routes.ts",
    ]) {
      const s = ler(f);
      expect(s, f).toContain('from "@/lib/armazenamento-local"');
      expect(s, f).not.toMatch(/localStorage\.(getItem|setItem)\(/);
      expect(s, f).not.toMatch(/catch\s*\{\s*(?:\/\*[^*]*\*\/\s*)?return \[\];\s*\}/);
    }
  });

  it("helper avisa com motivoArmazenamentoLocal e avisoUnico", () => {
    const h = ler("src/lib/armazenamento-local.ts");
    expect(h).toContain('motivoArmazenamentoLocal(oQue, "ler", e)');
    expect(h).toContain('motivoArmazenamentoLocal(oQue, "gravar", e)');
    expect(h).toContain("avisoUnico(msg)");
  });

  it("ReservationsPanel explica OPs sem número", () => {
    expect(ler("src/components/inventory/ReservationsPanel.tsx")).toContain(
      'descreverErroSupabase(posErr, "resolver os números das OPs")',
    );
  });
});
