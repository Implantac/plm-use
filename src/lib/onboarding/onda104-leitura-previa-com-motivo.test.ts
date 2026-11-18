// Onda 104 — 97ª medição. Leituras prévias a uma decisão que descartavam o
// erro e decidiam com dado inventado:
//  - registerMovement: saldo ilegível → "Saldo insuficiente (0 disponível)";
//  - createLaunchHandoff: itens ilegíveis → handoff vazio com hash/dedupe
//    errados; `existing` ilegível → ignorado;
//  - useCreatePiloto: última rodada ilegível → "rodada 1" por cima das reais;
//  - TechSketchPanel: desenho oficial não baixado → IA gera "a partir do
//    oficial" sem ele, em silêncio; /official-models: prévia some sem motivo.
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ler = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf-8");

describe("Onda 104 — leitura prévia com motivo", () => {
  it("server fns não decidem com leitura falha", () => {
    const inv = ler("src/lib/inventory/inventory.functions.ts");
    expect(inv).toContain('descreverErroSupabase(balErr, "consultar o saldo")');
    expect(inv).toMatch(
      /if \(balErr\)[\s\S]{0,200}const onHand = Number\(bal\?\.qty_on_hand \?\? 0\);/,
    );
    const launch = ler("src/lib/launch/launch.functions.ts");
    expect(launch).toContain('descreverErroSupabase(itErr, "ler os itens da wave")');
    expect(launch).toContain('descreverErroSupabase(exErr, "verificar se o handoff já existia")');
  });

  it("piloto não inventa rodada; desenho oficial ausente é declarado", () => {
    expect(ler("src/hooks/use-pilotos.ts")).toContain(
      'descreverErroSupabase(lastErr, "descobrir a próxima rodada do piloto")',
    );
    const om = ler("src/lib/official-models.ts");
    expect(om).toContain('descreverErroSupabase(error, "carregar o desenho oficial")');
    expect(om).toContain('descreverErroSupabase(error, "baixar o desenho oficial")');
    expect(om).not.toMatch(/return data\?\.signedUrl \?\? null;/);
    expect(ler("src/components/ai/TechSketchPanel.tsx")).toContain(
      "O desenho será gerado sem o desenho oficial como base.",
    );
    expect(ler("src/routes/_authenticated.official-models.tsx")).toContain(
      "if (reason) toast.error(reason);",
    );
  });

  it("varredura: nenhuma leitura `const { data: x } = await supabase.from(` sem `error` em src/lib e src/hooks", () => {
    const walk = (d: string): string[] =>
      readdirSync(resolve(__dirname, "../../..", d), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`],
      );
    for (const f of [...walk("src/lib"), ...walk("src/hooks")]) {
      if (!/\.tsx?$/.test(f) || /\.test\.|\.e2e\./.test(f)) continue;
      const s = ler(f);
      expect(s, f).not.toMatch(
        /const \{\s*data(?::\s*\w+)?\s*\} = await (?:supabase|db|supabaseAdmin)\s*\n?\s*\.from\(/,
      );
    }
  });
});
