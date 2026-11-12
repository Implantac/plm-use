// Onda 67 — 61ª medição. Depois de validar a publicação da Onda 66 com
// cliques reais em produção (`/pieces-report` com as 4 métricas em `—`,
// `/development` com filtros em `—`, 0 `pageerror`), a varredura de risco
// mediu as outras referências de demonstração: `U25-014` (8 ocorrências) e
// `I25-088` (5) fora de testes.
//
// Medição: `U25-014`/`I25-088` já estavam cobertos nas camadas de cálculo
// (campanhas GTM `demo: true`, OS de outsourcing `demo: true`, `cfo-dre`
// MODELO_REFS fora dos acumuladores, `resolveReferenceTechSheet` sem ficha
// inventada desde a Onda 32). Mas a varredura de **formulários
// pré-preenchidos** — o mesmo padrão das Ondas 64 e 66 — achou três
// vazamentos restantes, provados por cliques antes de corrigir:
//
//   1. `/commercial` — `DEFAULT_CLIENTS` com 4 lojistas fictícios
//      ("Luxury Boutique SP" CNPJ 18.420.119/0001-44, 24 pedidos, "R$ 124k"
//      de faturamento) + `qtyByRef` pré-preenchido com
//      `DEV000006: 72, V24-001: 48, U25-014: 24` peças. Dava para exportar
//      romaneio e pré-XML NFe para cliente que não existe.
//   2. `/financial` — `DEFAULT_TRANSACTIONS` com 3 títulos fictícios
//      ("Contas a Receber (B2B) R$ 342k", "Contas a Pagar (Suppliers)
//      R$ 124k", "Impostos/Fiscal R$ 42k") lidos como fluxo de caixa real.
//   3. `/showroom` (aba B2B) — sacola com pack de `DEV000006` pré-preenchido
//      e comprador "Boutique Multimarcas Jardins" com CNPJ fictício no
//      formulário do espelho B2B.
//
// Correção (mesmo contrato das Ondas 64/66): carteira, títulos, sacola e
// comprador nascem vazios; sem lojista cadastrado, romaneio e pré-NFe não
// são emitidos; sem lojista digitado, o espelho B2B não é emitido. Nenhuma
// asserção antiga relaxada.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

describe("Onda 67 — carteira, fluxo e sacola nascem vazios", () => {
  it("a carteira B2B nasce vazia e sem lojista não emite romaneio nem pré-NFe", () => {
    const commercial = ler("src/routes/_authenticated.commercial.tsx");
    expect(commercial).toContain("const DEFAULT_CLIENTS: B2bClient[] = [];");
    expect(commercial).toContain('data-testid="commercial-carteira-vazia"');
    expect(commercial).toContain("Carteira B2B vazia");
    // nenhum lojista fictício restante como dado (só a menção no comentário
    // que declara a remoção — mesmo padrão da Onda 64)
    expect(commercial).not.toContain('name: "Luxury Boutique SP"');
    expect(commercial).not.toContain('name: "Moda Carioca Store"');
    expect(commercial).not.toContain('name: "Urban Concept Curitiba"');
    expect(commercial).not.toContain('name: "Style Hub BH"');
    expect(commercial).not.toContain('total: "R$ 124k"');
    // guardas de emissão sem cliente
    expect(commercial).toContain("Cadastre um lojista na carteira antes de exportar");
    expect(commercial).toContain("Cadastre um lojista na carteira antes de imprimir");
    // cliente ativo pode ser undefined sem quebrar
    expect(commercial).toContain("?? clients[0];");
  });

  it("as quantidades de expedição nascem zeradas (sem refs de demonstração)", () => {
    const commercial = ler("src/routes/_authenticated.commercial.tsx");
    expect(commercial).toContain(
      "const [qtyByRef, setQtyByRef] = useState<Record<string, number>>({});",
    );
    expect(commercial).not.toContain("DEV000006: 72");
    expect(commercial).not.toContain('"V24-001": 48');
    expect(commercial).not.toContain('"U25-014": 24');
    // o formulário de novo lojista nasce neutro
    expect(commercial).not.toContain("14.220.990/0001-55");
    expect(commercial).not.toContain('"R$ 18k"');
  });

  it("o fluxo de caixa nasce sem títulos de demonstração", () => {
    const financial = ler("src/routes/_authenticated.financial.tsx");
    expect(financial).toContain("const DEFAULT_TRANSACTIONS: FinancialTransaction[] = [];");
    expect(financial).toContain('data-testid="financial-fluxo-vazio"');
    expect(financial).toContain("Nenhum título lançado");
    // nenhum título fictício restante como dado (só a menção no comentário
    // que declara a remoção)
    expect(financial).not.toContain('label: "Contas a Receber (B2B)"');
    expect(financial).not.toContain('val: "R$ 342k"');
    expect(financial).not.toContain('val: "R$ 124k"');
    expect(financial).not.toContain('val: "R$ 42k"');
  });

  it("a sacola B2B e o comprador nascem vazios e sem lojista não emitem espelho", () => {
    const showroom = ler("src/routes/_authenticated.showroom.tsx");
    expect(showroom).toContain(
      "const [packsByKey, setPacksByKey] = useState<Record<string, number>>({});",
    );
    expect(showroom).toContain('const [buyerName, setBuyerName] = useState("");');
    expect(showroom).toContain('const [buyerCnpj, setBuyerCnpj] = useState("");');
    // nenhum comprador/pack fictício restante como dado (só a menção no
    // comentário que declara a remoção)
    expect(showroom).not.toContain('useState("Boutique Multimarcas Jardins")');
    expect(showroom).not.toContain('"DEV000006:0": 2');
    expect(showroom).toContain("Informe o lojista e o CNPJ antes de emitir o espelho B2B");
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
