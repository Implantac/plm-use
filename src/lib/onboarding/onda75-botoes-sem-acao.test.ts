// Onda 75 — 69ª medição. O usuário relatou "muitas telas e botões sem
// ações". A auditoria (estática + ~1.200 cliques reais em 46 rotas, local e
// produção) encontrou **zero botões mortos** — todos os handlers produzem
// mudança observável — mas 4 locais onde o botão **promete uma ação e só
// mostra toast**:
//
//   /analytics — 5 botões "Adicionar" (Tráfego pago, Influenciadores,
//   Modelos, Produções fotográficas, Campanhas) chamavam
//   `toast.info("Registrar: X")` sem registrar nada; e o "Visualizar" do menu
//   do KPI só mostrava o nome do KPI em toast.
//
//   /collections — "Visualizar" só mostrava `toast.info("Abrindo X")`.
//
//   /financial — "Visualizar" só mostrava os dados do item em toast.
//
// Correção: os "Adicionar" navegam para `/marketing`, onde o investimento é
// de fato registrado como campanha (mediaSpendBrl/productionCostBrl); os
// "Visualizar" saem do menu — o card já exibe a informação, e o menu fica com
// Editar/Excluir, que são reais. Nenhuma asserção antiga relaxada.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

describe("Onda 75 — botões que prometem ação e só mostram toast", () => {
  it("os 'Adicionar' do analytics navegam para onde o investimento é registrado", () => {
    const page = ler("src/routes/_authenticated.analytics.tsx");
    expect(page).toContain('onClick={() => navigate({ to: "/marketing" })}');
    expect(page).not.toContain("toast.info(`Registrar:");
  });

  it("nenhum 'Visualizar' de menu é só toast", () => {
    const analytics = ler("src/routes/_authenticated.analytics.tsx");
    const collections = ler("src/routes/_authenticated.collections.tsx");
    const financial = ler("src/routes/_authenticated.financial.tsx");
    expect(analytics).not.toContain("onView={() => toast.info(");
    expect(collections).not.toContain("onView={() => toast.info(");
    expect(financial).not.toContain("onView={() => toast.info(");
  });
});
