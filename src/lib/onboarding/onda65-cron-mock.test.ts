// Onda 65 — 59ª medição. Depois de validar a publicação da Onda 64 com
// cliques reais em produção (`/marketing` "Cadastrar Drop" sem DEV000006
// nem números inventados, 0 `pageerror`), a varredura de risco mediu o
// único `TODO` real da fonte: o mock de sell-through do cron
// `launch-performance.ts`.
//
// Medição: o cron já era honesto no dado — emite `sell_through_pct: null`
// com `fonte: "cron:mock"`, nunca um percentual inventado. Mas a tela que
// consome (`/launch` aba Performance) só descrevia os KPIs
// ("sell_through_D30", "o cron alimenta esta aba") sem mostrar dado nenhum
// e sem rotular o placeholder. O mapa `performance` do `useLaunch` era
// buscado e nunca renderizado.
//
// Correção: a aba Performance agora renderiza as waves com o dado real do
// evento — sell-through `—` (null) com aviso de que é placeholder
// (cron:mock) e que o PLM não é ERP. Nenhum percentual é inventado; o
// comentário do cron reflete o estado honesto atual. Nenhuma asserção
// antiga relaxada.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

describe("Onda 65 — cron mock rotulado na tela que consome", () => {
  it("o cron emite null com fonte cron:mock, nunca percentual inventado", () => {
    const cron = ler("src/routes/api/public/cron/launch-performance.ts");
    expect(cron).toContain("sell_through_pct: null");
    expect(cron).toContain('fonte: "cron:mock"');
    // nenhum número fixo de sell-through no payload
    expect(cron).not.toMatch(/sell_through_pct:\s*\d/);
  });

  it("a aba Performance rotula o placeholder e mostra — em vez de número", () => {
    const launch = ler("src/routes/_authenticated.launch.tsx");
    expect(launch).toContain('data-testid="performance-sellthrough-mock"');
    expect(launch).toContain("Sell-through ainda não apurável");
    expect(launch).toContain("cron:mock");
    expect(launch).toContain("O PLM não é ERP");
    // consome o mapa performance do hook
    expect(launch).toContain("performance, loading }");
    expect(launch).toContain("perf?.sell_through_pct == null");
  });

  it("o hook expõe o mapa performance com fonte e calculado_em", () => {
    const hook = ler("src/hooks/use-launch.ts");
    expect(hook).toContain("sell_through_pct?: number | null");
    expect(hook).toContain("fonte?: string | null");
    expect(hook).toContain("performance, loading }");
  });

  it("não restou TODO real na fonte (só falsos positivos de TODOS)", () => {
    const cron = ler("src/routes/api/public/cron/launch-performance.ts");
    expect(cron).not.toContain("TODO:");
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
