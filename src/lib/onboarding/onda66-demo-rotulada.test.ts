// Onda 66 — 60ª medição. Depois de validar a publicação da Onda 65 com
// cliques reais em produção (`/launch` aba Performance com o aviso do mock
// de sell-through, 0 `pageerror`), a varredura de risco mediu as outras
// referências de demonstração: `V24-001` (18 ocorrências), `U25-014` (8) e
// `I25-088` (5) fora de testes.
//
// Medição: o seed de ciclo de vida (`src/lib/reference/store.ts`, 6
// referências de demonstração — `V24-001` "Blusa Linho Amalfi", `CM704`,
// `VT302`, `V24-005`, `BL220`, `V24-011`) alimentava três superfícies
// operacionais **sem nenhuma declaração de demonstração**:
//
//   1. `/pieces-report` — as 6 refs entravam nas 4 métricas do topo
//      ("Peças em desenvolvimento 6", "Atrasadas", "Em piloto",
//      "Repilotagens") como se fossem peças reais da coleção.
//   2. `/development` (Centro de Desenvolvimento) — as contagens dos filtros
//      ("todos", "atrasados", "pilotos pendentes"…) contavam as 6 refs de
//      demonstração como referências reais.
//   3. Kanban da esteira — a ref de demonstração podia ser promovida a
//      "ficha salva" se existisse documento com o mesmo código, e a
//      timeline do `ReferenciaDrawer` (PCP) mostrava o progresso da
//      demonstração sem rótulo.
//
// Correção (mesmo contrato das coleções `demo: true` da Onda 51 e dos
// creators da Onda 59): o seed marca `demo: true`; as métricas e contagens
// operacionais ignoram `demo`; a demonstração continua ilustrando a lista,
// mas com aviso visível; e a ref de demonstração nunca vira ficha nem
// avança de estágio. Nenhuma asserção antiga relaxada.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

describe("Onda 66 — referências de demonstração rotuladas e fora das métricas", () => {
  it("o seed marca as referências de demonstração com demo: true", () => {
    const store = ler("src/lib/reference/store.ts");
    expect(store).toContain("demo: true");
    // o construtor do seed marca tudo que ele constrói
    expect(store).toContain("return { ...base, ...patch, demo: true };");
    // o tipo declara o contrato
    const types = ler("src/types/reference.ts");
    expect(types).toContain("demo?: boolean;");
  });

  it("o relatório de peças não conta demonstração nas métricas operacionais", () => {
    const report = ler("src/routes/_authenticated.pieces-report.tsx");
    expect(report).toContain('data-testid="pieces-report-demo"');
    expect(report).toContain("Referências de demonstração na lista");
    expect(report).toContain("não entram nas métricas");
    // as 4 métricas usam só referências reais
    expect(report).toContain("value: String(reais.length)");
    expect(report).toContain('filtrarLifecycles(reais, "pilotos_pendentes")');
    expect(report).toContain("e.atrasada && !e.lc.demo");
    expect(report).toContain("O PLM não é ERP");
    // sem peça real, a métrica vira — (nunca zero apurado)
    expect(report).toContain("demo: reais.length === 0");
    expect(report).toContain("demo: metrics.atrasadas === 0");
    expect(report).toContain("demo: metrics.emPiloto === 0");
    expect(report).toContain("demo: metrics.totalRep === 0");
  });

  it("o Centro de Desenvolvimento não conta demonstração nos filtros", () => {
    const dev = ler("src/routes/_authenticated.development.tsx");
    expect(dev).toContain('data-testid="centro-desenvolvimento-demo"');
    expect(dev).toContain("Referências de demonstração no radar");
    expect(dev).toContain("todos: reais.length");
    expect(dev).toContain("filtrarLifecycles(reais, f.id)");
    expect(dev).toContain("filtrarLifecycles(reais, filter)");
    // sem referência real, o contador e os filtros viram — (nunca zero apurado)
    expect(dev).toContain("reais.length === 0");
    expect(dev).toContain('{count === 0 ? "—" : count}');
  });

  it("a ref de demonstração nunca vira ficha nem avança de estágio no kanban", () => {
    const kanban = ler("src/lib/techsheet/kanban-items.ts");
    expect(kanban).toContain("demo?: boolean;");
    expect(kanban).toContain("doc: lc.demo ? undefined : techDocs[code]");
    // a rota passa a marca do ciclo de vida para o kanban
    const dev = ler("src/routes/_authenticated.development.tsx");
    expect(dev).toContain("demo: lc.demo");
  });

  it("a timeline do drawer do PCP rotula a referência de demonstração", () => {
    const drawer = ler("src/components/pcp/ReferenciaDrawer.tsx");
    expect(drawer).toContain('data-testid="referencia-drawer-demo"');
    expect(drawer).toContain("Referência de demonstração");
    expect(drawer).toContain("O PLM não é ERP");
  });

  it("o ModuleLayout renderiza métrica de demonstração como —", () => {
    const layout = ler("src/components/modules/ModuleLayout.tsx");
    expect(layout).toContain("demo?: boolean;");
    expect(layout).toContain('{metric.demo ? "—" : metric.value}');
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
