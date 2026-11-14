// Onda 80 — 74ª medição. Dívida aberta desde a Onda 77: `dias_ativa` na
// view `stock_reservation_aging` e na função `op_reserved_materials` usa
// `date_part('day', now() - r.created_at)`. A dúvida era se o componente
// "day" subcontaria reservas com mais de um mês (como acontece com `age()`,
// que produz "1 mon 15 days").
//
// Resolvido pela documentação oficial do PostgreSQL (9.9, operadores de
// data/hora): `timestamp - timestamp` produz um intervalo **justificado em
// dias** ("converting 24-hour intervals into days, similarly to
// justify_hours()"), ex.: '2001-09-29 03:00' - '2001-07-27 12:00' →
// `63 days 15:00:00`. Nunca gera meses; só `age()` gera. Logo
// `date_part('day', …)` é o total de dias e o aviso `>= 30` do
// `OpMaterialsTab` está correto.
//
// Este teste trava o SQL aplicado (SHA 382f0f19…) contra uma regressão
// para `age()`, que **subcontaria** o envelhecimento das reservas.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(
  resolve(__dirname, "../../../docs/producao/APLICAR-ONDA-21-24.sql"),
  "utf-8",
);

describe("Onda 80 — semântica de dias_ativa (total de dias, nunca componente de age())", () => {
  it("dias_ativa é calculado por subtração de timestamps (intervalo justificado em dias)", () => {
    const ocorrencias = SQL.match(/date_part\('day',\s*now\(\)\s*-\s*r\.created_at\)/g) ?? [];
    expect(ocorrencias.length).toBeGreaterThanOrEqual(2); // view + função
  });

  it("nenhum cálculo de dias_ativa usa age(), que produziria meses e subcontaria", () => {
    const linhasDiasAtiva = SQL.split("\n").filter((l) => /dias_ativa|date_part\('day'/.test(l));
    expect(linhasDiasAtiva.length).toBeGreaterThan(0);
    for (const l of linhasDiasAtiva) expect(l).not.toMatch(/\bage\s*\(/);
  });

  it("o painel de materiais da OP usa o limiar de 30 dias sobre dias_ativa", () => {
    const tab = readFileSync(
      resolve(__dirname, "../../components/pcp/op/OpMaterialsTab.tsx"),
      "utf-8",
    );
    expect(tab).toMatch(/Number\(r\.dias_ativa\)\s*>=\s*30/);
  });
});
