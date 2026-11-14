// Onda 83 — 77ª medição. Sincronizações para a nuvem (lotes de produção,
// moldes CAD) não podem falhar em silêncio: o registro fica salvo só no
// navegador e o usuário acha que está no banco (mesmo sintoma da coleção que
// "sumia" na Onda 79). Agora o motivo real é dito, uma vez por minuto
// (push debounced), e tabela ausente é distinguida de permissão/sessão.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { avisoUnico, descreverErroSupabase } from "@/lib/supabase/erro-humano";

const ler = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf-8");

describe("Onda 83 — sync para a nuvem explica o porquê, sem enxurrada", () => {
  it("avisoUnico: mesma mensagem só passa uma vez por janela", () => {
    const m = "msg-teste-" + Math.random();
    expect(avisoUnico(m, 1000, 0)).toBe(true);
    expect(avisoUnico(m, 1000, 500)).toBe(false);
    expect(avisoUnico(m, 1000, 1500)).toBe(true);
    expect(avisoUnico(m + "-outra", 1000, 1600)).toBe(true);
  });

  it("tabela ausente (42P01/PGRST205) é dita como migration pendente, não como permissão", () => {
    expect(descreverErroSupabase({ code: "42P01" }, "x")).toMatch(/migration pendente/);
    expect(descreverErroSupabase({ code: "PGRST205" }, "x")).toMatch(/migration pendente/);
    expect(descreverErroSupabase({ code: "PGRST205" }, "x")).not.toMatch(/permissão/);
  });

  it("pcp/sync e cad/store não descartam o erro do upsert", () => {
    const pcp = ler("src/lib/pcp/sync.ts");
    expect(pcp).not.toMatch(/^\s*await supabase\.from\("pcp_lots"\)\.upsert/m);
    expect(pcp).toContain(
      'descreverErroSupabase(error, "sincronizar os lotes de produção na nuvem")',
    );
    const cad = ler("src/lib/cad/store.ts");
    expect(cad).toContain("isMissingTable(");
    expect(cad).toContain('descreverErroSupabase(error, "sincronizar o molde na nuvem")');
  });

  it("pushAllLotes só envia lotes operacionais (vitrine nunca vira linha em pcp_lots)", () => {
    const pcp = ler("src/lib/pcp/sync.ts");
    expect(pcp).toContain("lotesOperacionais(usePCPStore.getState().lotes)");
    expect(pcp).not.toMatch(/const lotes = usePCPStore\.getState\(\)\.lotes;/);
  });
});
