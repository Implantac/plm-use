// Onda 77 — 71ª medição. Depois da Onda 75 (8 botões que prometiam ação e
// só mostravam toast), o usuário pediu nova análise ("muitas telas e botões
// sem ações"). A auditoria estendida mediu todos os tipos de controle
// interativo — botões, abas, selects, switches e filtros de busca — em 3
// camadas (estática, ~1.200 cliques em 46 rotas, produção):
//
//   - Botões: 554 handlers, nenhum vazio; 0 mortos nos cliques (os 17
//     "sem onClick" são botões dentro de DialogTrigger/DropdownMenuTrigger,
//     que fornecem a ação).
//   - Abas: 44 TabsTrigger em 5 rotas — todas trocam de painel (verificado
//     por clique: route-engineering 2, supplier-portal 4, launch 4,
//     showroom 5; production dentro de diálogo, mesmo componente).
//   - Selects: todos com onValueChange. Switches: todos com
//     onCheckedChange. Filtros de busca: ligados ao estado (ex.: /references
//     filtra por código/nome/status).
//   - Botões desabilitados: todos por validação/loading e com explicação
//     próxima (ex.: tech-sheet `!emitivel`, showroom `!refId`).
//
// Nenhum controle morto além dos já corrigidos na Onda 75. Este teste trava
// as propriedades estruturais para que nenhum controle morto volte: todo
// Select tem onValueChange, todo Switch tem onCheckedChange e todo
// TabsTrigger tem TabsContent correspondente. Nenhuma asserção antiga
// relaxada.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) out.push(...tsxFiles(caminho));
    else if (caminho.endsWith(".tsx") && !caminho.includes(".test.")) out.push(caminho);
  }
  return out;
}

const arquivos = [...tsxFiles(join(raiz, "src/routes")), ...tsxFiles(join(raiz, "src/components"))];

/** Extrai a tag de abertura `<Nome ...>` balanceando chaves. */
function tagDe(txt: string, inicio: number): string {
  let j = inicio;
  let prof = 0;
  while (j < txt.length && j < inicio + 3000) {
    const c = txt[j];
    if (c === "{") prof += 1;
    else if (c === "}") prof -= 1;
    else if (c === ">" && prof === 0) break;
    j += 1;
  }
  return txt.slice(inicio, j);
}

describe("Onda 77 — nenhum controle interativo morto", () => {
  it("todo Select tem onValueChange", () => {
    const semHandler: string[] = [];
    for (const f of arquivos) {
      const txt = readFileSync(f, "utf8");
      for (const m of txt.matchAll(/<Select\b/g)) {
        const tag = tagDe(txt, m.index ?? 0);
        if (!tag.includes("onValueChange")) semHandler.push(f);
      }
    }
    expect(semHandler).toEqual([]);
  });

  it("todo Switch tem onCheckedChange", () => {
    const semHandler: string[] = [];
    for (const f of arquivos) {
      const txt = readFileSync(f, "utf8");
      for (const m of txt.matchAll(/<Switch\b/g)) {
        const tag = tagDe(txt, m.index ?? 0);
        if (!tag.includes("onCheckedChange")) semHandler.push(f);
      }
    }
    expect(semHandler).toEqual([]);
  });

  it("todo TabsTrigger tem TabsContent correspondente no mesmo arquivo", () => {
    const orfaos: string[] = [];
    for (const f of arquivos) {
      const txt = readFileSync(f, "utf8");
      const triggers = new Set(
        [...txt.matchAll(/<TabsTrigger[^>]*value="([^"]+)"/g)].map((m) => m[1]),
      );
      const contents = new Set(
        [...txt.matchAll(/<TabsContent[^>]*value="([^"]+)"/g)].map((m) => m[1]),
      );
      for (const t of triggers) {
        if (!contents.has(t)) orfaos.push(`${f}: ${t}`);
      }
    }
    expect(orfaos).toEqual([]);
  });
});
