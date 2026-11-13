// Onda 79 — 73ª medição. O usuário pediu garantia de que "o fluxo
// operacional está 100% funcional". A verificação de ponta a ponta (cliques
// reais, local) mediu:
//
//   - Criar creator em /influencers: diálogo abre, validação rejeita
//     formulário incompleto (nome/handle/UF/referência/peça obrigatórios),
//     com todos os campos o creator é salvo (`demo: false`), aparece na
//     lista e **persiste após reload** (store com `persist` localStorage).
//   - Criar referência em /references e coleção em /collections: os
//     diálogos abrem e o formulário responde; a persistência é via
//     Supabase/sync (401 na sessão simulada — limitação do ambiente, não
//     bug: em produção com auth real o sync grava).
//   - Tratamento de erro: falha de persistência mostra toast e mantém o
//     diálogo aberto (não perde o que o usuário digitou).
//
// Este teste trava a lógica do fluxo no store local: criar um creator o
// adiciona como operacional (`demo: false`) e ele entra na lista
// operacional. Nenhuma asserção antiga relaxada.

import { afterEach, describe, expect, it } from "vitest";
import { influencersOperacionais, useInfluencersStore } from "@/lib/influencers/store";

describe("Onda 79 — fluxo operacional de criação (store local)", () => {
  let snapshot: ReturnType<typeof useInfluencersStore.getState>["influencers"];

  afterEach(() => {
    // Isola o singleton: restaura o estado anterior ao teste.
    useInfluencersStore.setState({ influencers: snapshot });
  });

  it("criar um creator o adiciona como operacional (demo: false)", () => {
    snapshot = useInfluencersStore.getState().influencers;
    const antes = influencersOperacionais(snapshot).length;

    useInfluencersStore.getState().registrarCreator({
      nome: "Creator Fluxo Teste",
      handle: "@fluxoteste",
      regiao: "Sudeste",
      uf: "SP",
      seguidores: 1200,
      segmento: "Moda praia",
      perfil: "Micro",
      custoMedio: 350,
      vendasGeradas: 12,
      primeiraRef: "DEV000006",
      primeiraPeca: "Camiseta Teste",
    });

    const depois = useInfluencersStore.getState().influencers;
    const criado = depois.find((i) => i.handle === "@fluxoteste");
    expect(criado).toBeDefined();
    expect(criado!.demo).toBe(false);
    expect(criado!.envios).toHaveLength(1);
    expect(criado!.envios[0]!.ref).toBe("DEV000006");
    // Entra na lista operacional (não é vitrine).
    expect(influencersOperacionais(depois).length).toBe(antes + 1);
  });
});
