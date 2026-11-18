// Onda 102 — 95ª medição. Leitura que falha não pode virar lista vazia:
// "Seja o primeiro a comentar", "Sem reservas ativas", "Sem revisões
// anteriores" e "Nenhuma atividade ainda" apareciam quando a consulta tinha
// falhado (permissão, sessão, tabela ausente). Agora cada um guarda o motivo
// (`descreverErroSupabase`) e o mostra inline com `role="alert"`.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ler = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf-8");

describe("Onda 102 — leitura que falha não é vazio", () => {
  it("comentários, anexos e histórico distinguem erro de vazio", () => {
    const s = ler("src/components/comments/CommentsPanel.tsx");
    expect(s).toContain('descreverErroSupabase(erroRows, "carregar os comentários")');
    expect(s).toContain('descreverErroSupabase(erroAtts, "carregar os anexos dos comentários")');
    expect(s).toContain('descreverErroSupabase(error, "carregar o histórico do comentário")');
    expect(s).toContain("!loading && !erroLeitura && items.length === 0");
    expect(s).toContain("!loading && !erro && revisions && revisions.length === 0");
    expect(s).not.toMatch(/const \{ data: rows \} = await supabase/);
  });

  it("reservas e atividade distinguem erro de vazio", () => {
    const r = ler("src/components/inventory/ReservationsPanel.tsx");
    expect(r).toContain('descreverErroSupabase(error, "carregar as reservas")');
    expect(r).toContain("!erroLeitura && rows.length === 0");
    const a = ler("src/lib/activity/use-activity-feed.ts");
    expect(a).toContain('descreverErroSupabase(erro, "carregar a atividade recente")');
    expect(a).toContain("return { items, loading, error };");
    const b = ler("src/components/activity/ActivityFeedButton.tsx");
    expect(b).toContain("!loading && !error && items.length === 0");
    expect(b).toContain('role="alert"');
  });

  it("nenhuma leitura de lista em componentes descarta o erro (`const { data } = await supabase.from`)", () => {
    for (const f of [
      "src/components/comments/CommentsPanel.tsx",
      "src/components/inventory/ReservationsPanel.tsx",
      "src/lib/activity/use-activity-feed.ts",
    ]) {
      expect(ler(f), f).not.toMatch(/const \{ data \} = await supabase\s*\n?\s*\.from\(/);
    }
  });
});
