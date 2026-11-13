// Onda 76 — 70ª medição. O CI da Onda 75 falhou na primeira execução com
// `EnvironmentTeardownError: Cannot load '/node_modules/react/index.js'
// imported from src/lib/activity/log.ts after the environment was torn
// down` — os 848 testes passaram, mas a rejeição não tratada derrubou o exit
// code. A re-execução passou (flake), mas a causa raiz é real:
//
//   `pcp/store.ts` e `quality/store.ts` chamam
//   `void import("@/lib/activity/log")` (fire-and-forget) dentro de ações,
//   e `log.ts` importava `react` no nível do módulo (para o hook
//   `useActivityFeed`). Quando um teste terminava antes de a importação
//   dinâmica resolver, o Vitest desmontava o ambiente e a carga tardia do
//   React virava rejeição não tratada.
//
// Correção: o hook mora em `use-activity-feed.ts` e `log.ts` fica sem React;
// as duas importações dinâmicas ganham `.catch()` (o log de atividade é
// efeito colateral best-effort — se o módulo não carregar, não pode derrubar
// a suíte). Nenhuma asserção antiga relaxada.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

describe("Onda 76 — importação dinâmica não derruba mais o ambiente de teste", () => {
  it("log.ts não importa react", () => {
    const log = ler("src/lib/activity/log.ts");
    expect(log).not.toContain('from "react"');
    expect(log).toContain("export async function logActivity");
  });

  it("o hook mora no módulo próprio e o botão o usa", () => {
    const hook = ler("src/lib/activity/use-activity-feed.ts");
    expect(hook).toContain('from "react"');
    expect(hook).toContain("export function useActivityFeed");
    const botao = ler("src/components/activity/ActivityFeedButton.tsx");
    expect(botao).toContain('from "@/lib/activity/use-activity-feed"');
  });

  it("as importações dinâmicas dos stores têm catch", () => {
    const pcp = ler("src/lib/pcp/store.ts");
    const quality = ler("src/lib/quality/store.ts");
    expect(pcp).toContain('void import("@/lib/activity/log")');
    expect(pcp).toContain(".catch(() => {})");
    expect(quality).toContain('void import("@/lib/activity/log")');
    expect(quality).toContain(".catch(() => {})");
  });
});
