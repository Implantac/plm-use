// Onda 43 — "Comece por aqui".
//
// Diagnóstico medido com browser headless (19ª/20ª medição, sessão local):
//   42 rotas no registry, mas só 4 links visíveis na sidebar no primeiro uso;
//   ~100 ocorrências de "—" nas 17 telas percorridas (30 em /suppliers,
//   21 em /financial, 15 em /flow, 10 no /dashboard); formulário de
//   "Nova referência" com 7 campos e 2 obrigatórios sem aria-required.
//
// As Ondas 35–42 tornaram o app honesto: dado de fábrica não entra em número.
// O efeito colateral é que um usuário novo encontra um sistema aparentemente
// vazio, com dezenas de avisos espalhados e nenhuma resposta para a pergunta
// "o que eu faço agora?". Este módulo dá a resposta em UM lugar, derivada dos
// mesmos stores que alimentam os números — sem contador paralelo, sem dados
// inventados e sem esconder a vitrine.

import { useMemo } from "react";
import { pedidosOperacionais, usePrivateLabelQueueStore } from "@/lib/sales/private-label-queue";
import { campanhasOperacionais, useResearchGtmStore } from "@/lib/techsheet/research-gtm";
import { parceirosOperacionais, useOutsourcingStore } from "@/lib/techsheet/outsourcing-os";
import { useTechSheetStore } from "@/lib/techsheet/store";
import { operationalCodes } from "@/lib/techsheet/provenance";

export type PassoId = "ficha" | "pedido" | "fornecedor" | "campanha";

export type Passo = {
  id: PassoId;
  titulo: string;
  descricao: string;
  /** Onde o usuário executa o passo. */
  rota: string;
  /** O que clicar ao chegar lá — sem mágica de evento entre rotas. */
  acao: string;
  concluido: boolean;
};

/** Contagens de dados REAIS (salvos/editados pela empresa), nunca da vitrine. */
export type ContagensOnboarding = {
  fichas: number;
  pedidos: number;
  fornecedores: number;
  campanhas: number;
};

export type EstadoOnboarding = {
  passos: Passo[];
  concluidos: number;
  total: number;
  percentual: number;
  pronto: boolean;
  proximo: Passo | null;
};

const PASSOS: ReadonlyArray<Omit<Passo, "concluido">> = [
  {
    id: "ficha",
    titulo: "Crie sua primeira ficha técnica",
    descricao:
      "É a base de custo, BOM, SAM e de todos os relatórios. Sem ela os números ficam vazios.",
    rota: "/references",
    acao: "Em Referências, clique em “Nova referência”",
  },
  {
    id: "pedido",
    titulo: "Registre um pedido B2B",
    descricao: "A carteira real alimenta faturamento, margem, MRP e o Book S&OP.",
    rota: "/orders",
    acao: "Em Pedidos, clique em “Novo pedido”",
  },
  {
    id: "fornecedor",
    titulo: "Cadastre uma facção ou fornecedor",
    descricao: "Homologação, OTIF e documentos de remessa só são auditáveis com cadastro próprio.",
    rota: "/suppliers",
    acao: "Em Fornecedores, clique em “Novo parceiro”",
  },
  {
    id: "campanha",
    titulo: "Lance um drop ou campanha",
    descricao: "A receita atribuída e o ROAS de marketing passam a ser apurados.",
    rota: "/marketing",
    acao: "Em Marketing, clique em “Nova campanha”",
  },
];

/** Função pura — testável sem stores, sem browser e sem efeitos colaterais. */
export function computarPrimeirosPassos(c: ContagensOnboarding): EstadoOnboarding {
  const concluidosPorId: Record<PassoId, boolean> = {
    ficha: c.fichas > 0,
    pedido: c.pedidos > 0,
    fornecedor: c.fornecedores > 0,
    campanha: c.campanhas > 0,
  };
  const passos: Passo[] = PASSOS.map((p) => ({ ...p, concluido: concluidosPorId[p.id] }));
  const concluidos = passos.filter((p) => p.concluido).length;
  const total = passos.length;
  return {
    passos,
    concluidos,
    total,
    percentual: total === 0 ? 100 : Math.round((concluidos / total) * 100),
    pronto: concluidos === total,
    proximo: passos.find((p) => !p.concluido) ?? null,
  };
}

/** Lê os stores sem hook — útil em testes e em código não-React. */
export function contarDadosOperacionais(): ContagensOnboarding {
  const tech = useTechSheetStore.getState();
  return {
    fichas: operationalCodes(tech.data, [], tech.materializadas).length,
    pedidos: pedidosOperacionais(usePrivateLabelQueueStore.getState().orders).length,
    fornecedores: parceirosOperacionais(useOutsourcingStore.getState().partners).length,
    campanhas: campanhasOperacionais(useResearchGtmStore.getState().campaigns).length,
  };
}

/** Hook reativo: o card desaparece sozinho conforme o usuário cria dados. */
export function usePrimeirosPassos(): EstadoOnboarding {
  const data = useTechSheetStore((s) => s.data);
  const materializadas = useTechSheetStore((s) => s.materializadas);
  const orders = usePrivateLabelQueueStore((s) => s.orders);
  const partners = useOutsourcingStore((s) => s.partners);
  const campaigns = useResearchGtmStore((s) => s.campaigns);

  return useMemo(
    () =>
      computarPrimeirosPassos({
        fichas: operationalCodes(data, [], materializadas).length,
        pedidos: pedidosOperacionais(orders).length,
        fornecedores: parceirosOperacionais(partners).length,
        campanhas: campanhasOperacionais(campaigns).length,
      }),
    [data, materializadas, orders, partners, campaigns],
  );
}

/** Um passo específico, para os avisos de vitrine espalhados pelas telas. */
export function usePasso(id: PassoId): Passo {
  const estado = usePrimeirosPassos();
  return estado.passos.find((p) => p.id === id) ?? estado.passos[0]!;
}
