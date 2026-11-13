// Onda 74 — 68ª medição. Depois de validar a publicação da Onda 73 com
// cliques reais em produção (`/analytics` com os 3 avisos de ausência e
// `/commercial` com o aviso de canais, 0 `pageerror`; o "ATIVO" que sobra no
// DOM é o chip global "MULTIEMPRESA ATIVO", não conector), a varredura de
// risco mediu **afirmações de integração e status sem lastro** — a mesma
// classe da Onda 73, mas na forma de selo de homologação/conexão.
//
// Medição (local, Playwright):
//
//   /cad — o painel "Ecossistema CAD Homologado" listava 4 softwares com selo
//   verde: Audaces `.ADS`, Lectra `.DXF/.MDL` e Gerber `.DXF/.PLT` como
//   **Homologado**, e CLO3D/Browzwear como **Conectado**. Não existe nenhum
//   conector no código: o PLM só guarda o arquivo e o nome do sistema CAD do
//   molde (`CadFormat`, `sistemaCad`); não abre sessão com Audaces, Lectra,
//   Gerber nem CLO3D.
//
//   /marketing — "Integrações de Mídia & Atribuição" listava Meta Ads,
//   TikTok Shop/Creators e Google Analytics 4/ROAS com status **Ativo**. Não
//   há uma única chamada a Meta/TikTok/GA4 no repositório (nem `gtag`, nem
//   `measurement_id`, nem endpoint em `src/routes/api`).
//
//   /inventory — a métrica "Rastreabilidade **100%** · por lote" era literal,
//   mesmo com zero insumos cadastrados (a tela mede "Insumos ativos 0 · de 0
//   cadastrados").
//
// Correção: os selos passam a dizer o que existe de verdade — formato aceito,
// sem conector; conectores de mídia viram "Não conectado" e o aviso do painel
// CAD declara a ausência; a rastreabilidade vira `—` "sem insumo cadastrado"
// quando não há insumo. Nenhuma asserção antiga relaxada — as métricas de
// `/marketing` e `/cad` que já ignoravam a vitrine continuam iguais.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

describe("Onda 74 — selos de integração e status sem lastro", () => {
  it("o painel CAD não afirma homologação nem conexão", () => {
    const page = ler("src/routes/_authenticated.cad.tsx");
    expect(page).toContain('data-testid="cad-formatos-aviso"');
    expect(page).toContain("Sem conector CAD.");
    expect(page).toContain("Formato registrado · sem conector");
    expect(page).toContain("Formatos CAD registrados por molde");
    // nenhum selo pode continuar sendo afirmação de integração
    expect(page).not.toContain('status: "Homologado"');
    expect(page).not.toContain('status: "Conectado"');
    expect(page).not.toContain("Ecossistema CAD Homologado");
  });

  it("os conectores de mídia do marketing dizem que não estão conectados", () => {
    const page = ler("src/routes/_authenticated.marketing.tsx");
    expect(page).toContain('{ label: "Meta Ads & Catálogo Dinâmico", status: "Não conectado"');
    expect(page).toContain('{ label: "TikTok Shop & Creators", status: "Não conectado"');
    expect(page).toContain('{ label: "Google Analytics 4 / ROAS", status: "Não conectado"');
    expect(page).not.toContain('status: "Ativo"');
  });

  it("a rastreabilidade do inventário não é 100% fixo", () => {
    const page = ler("src/routes/_authenticated.inventory.tsx");
    expect(page).toContain('value: items.length > 0 ? "100%" : "—"');
    expect(page).toContain("sem insumo cadastrado");
    expect(page).toContain("demo: items.length === 0");
    expect(page).not.toContain('value: "100%", detail: "por lote"');
  });
});
