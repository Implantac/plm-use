// Store compartilhado de influencers — usado pela página /influencers e pelo Marketing AI.
// Onda 59: os 5 creators de fábrica são VITRINE (`demo: true`). Antes a tela
// somava 434 "vendas atribuídas", R$ de investimento, ROI 563%, ROAS/CAC e
// emitia uma Guia de Remessa Bonificação CFOP 5910/6910 A4 como se fossem
// apurações da empresa. A vitrine continua visível (com selo), mas só creator
// salvo por ação explícita entra em número ou documento operacional.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Envio = {
  id: string;
  ref: string;
  nome: string;
  data: string;
  status: "Enviado" | "Postou" | "Engajou" | "Pendente";
  engajamento?: number;
};

export type Influencer = {
  id: string;
  nome: string;
  handle: string;
  regiao: string;
  uf: string;
  seguidores: number;
  segmento: string;
  perfil: "Macro" | "Médio" | "Micro";
  custoMedio: number;
  vendasGeradas: number;
  envios: Envio[];
  /** `true` = exemplo de fábrica (vitrine); ausente/false = creator salvo. */
  demo?: boolean;
};

/** Dados do formulário "Registrar creator" (ação explícita de promoção). */
export type NovoCriador = {
  nome: string;
  handle: string;
  regiao: string;
  uf: string;
  seguidores: number;
  segmento: string;
  perfil: Influencer["perfil"];
  custoMedio: number;
  vendasGeradas: number;
  /** Primeira remessa real: sem ela não há guia de remessa a emitir. */
  primeiraRef: string;
  primeiraPeca: string;
};

export const CRIADOR_DEMO_LABEL =
  "Creator de demonstração — não entra em número operacional nem em guia de remessa.";

/**
 * Os seeds antigos já podem ter sido persistidos sem `demo` (localStorage ou
 * linha hidratada do banco, onde o id vira UUID). Reconhecê-los pelo handle
 * impede que um reload promova a vitrine silenciosamente — e não classifica
 * um creator real que por acaso tenha id `i1` (teste de round-trip antigo).
 */
const CRIADORES_VITRINE_HANDLES: readonly string[] = [
  "@marinacosta",
  "@juliapires",
  "@camireis",
  "@bealima",
  "@helenasouto",
];

export function influencerEhVitrine(i: Influencer): boolean {
  if (i.demo === true) return true;
  return CRIADORES_VITRINE_HANDLES.includes((i.handle ?? "").trim().toLowerCase());
}

/** Só creators salvos pela empresa. A vitrine fica de fora de toda apuração. */
export function influencersOperacionais(list: Influencer[]): Influencer[] {
  return list.filter((i) => !influencerEhVitrine(i));
}

const SEED: Influencer[] = [
  {
    id: "i1",
    demo: true,
    nome: "Marina Costa",
    handle: "@marinacosta",
    regiao: "Sudeste",
    uf: "SP",
    seguidores: 480000,
    segmento: "Lifestyle Premium",
    perfil: "Macro",
    custoMedio: 8500,
    vendasGeradas: 142,
    envios: [
      {
        id: "e1",
        ref: "VT302",
        nome: "Vestido Midi Toscana",
        data: "2026-06-02",
        status: "Engajou",
        engajamento: 8.4,
      },
      {
        id: "e2",
        ref: "CM704",
        nome: "Camisa Linho Amalfi",
        data: "2026-05-20",
        status: "Postou",
        engajamento: 6.2,
      },
    ],
  },
  {
    id: "i2",
    demo: true,
    nome: "Júlia Pires",
    handle: "@juliapires",
    regiao: "Sul",
    uf: "RS",
    seguidores: 120000,
    segmento: "Moda Urbana",
    perfil: "Médio",
    custoMedio: 2800,
    vendasGeradas: 68,
    envios: [
      {
        id: "e3",
        ref: "BL220",
        nome: "Blusa Bordado Manual",
        data: "2026-06-10",
        status: "Postou",
        engajamento: 9.1,
      },
    ],
  },
  {
    id: "i3",
    demo: true,
    nome: "Camila Reis",
    handle: "@camireis",
    regiao: "Nordeste",
    uf: "PE",
    seguidores: 62000,
    segmento: "Praia & Resort",
    perfil: "Micro",
    custoMedio: 1200,
    vendasGeradas: 95,
    envios: [
      {
        id: "e4",
        ref: "SA180",
        nome: "Saia Plissada Capri",
        data: "2026-06-05",
        status: "Engajou",
        engajamento: 11.8,
      },
    ],
  },
  {
    id: "i4",
    demo: true,
    nome: "Beatriz Lima",
    handle: "@bealima",
    regiao: "Sudeste",
    uf: "RJ",
    seguidores: 240000,
    segmento: "Festa & Casamentos",
    perfil: "Macro",
    custoMedio: 5200,
    vendasGeradas: 88,
    envios: [
      {
        id: "e5",
        ref: "VT305",
        nome: "Vestido Longuete Bali",
        data: "2026-06-12",
        status: "Pendente",
      },
    ],
  },
  {
    id: "i5",
    demo: true,
    nome: "Helena Souto",
    handle: "@helenasouto",
    regiao: "Centro-Oeste",
    uf: "GO",
    seguidores: 38000,
    segmento: "Country & Boho",
    perfil: "Micro",
    custoMedio: 800,
    vendasGeradas: 41,
    envios: [
      {
        id: "e6",
        ref: "CL110",
        nome: "Calça Alfaiataria",
        data: "2026-06-08",
        status: "Postou",
        engajamento: 7.5,
      },
    ],
  },
];

interface InfState {
  influencers: Influencer[];
  registrarEnvio(id: string, envio: Envio): void;
  registrarCreator(dados: NovoCriador): void;
}

export const useInfluencersStore = create<InfState>()(
  persist(
    (set) => ({
      influencers: SEED,
      registrarEnvio(id, envio) {
        set((s) => ({
          influencers: s.influencers.map((i) =>
            i.id === id ? { ...i, envios: [envio, ...i.envios] } : i,
          ),
        }));
      },
      registrarCreator(dados) {
        // Ação explícita: creator salvo (`demo: false`) + primeira remessa real.
        // Nenhum seed é plantado em formulário e nenhuma vitrine é promovida
        // por efeito colateral de leitura, reload ou sincronização.
        const stamp = Math.random().toString(36).slice(2, 10);
        const novo: Influencer = {
          id: `inf-${stamp}`,
          demo: false,
          nome: dados.nome.trim(),
          handle: dados.handle.trim(),
          regiao: dados.regiao,
          uf: dados.uf.trim().toUpperCase(),
          seguidores: dados.seguidores,
          segmento: dados.segmento.trim(),
          perfil: dados.perfil,
          custoMedio: dados.custoMedio,
          vendasGeradas: dados.vendasGeradas,
          envios: [
            {
              id: `env-${stamp}`,
              ref: dados.primeiraRef.trim().toUpperCase(),
              nome: dados.primeiraPeca.trim(),
              data: new Date().toISOString().slice(0, 10),
              status: "Enviado",
            },
          ],
        };
        set((s) => ({ influencers: [...s.influencers, novo] }));
      },
    }),
    { name: "use-moda:influencers" },
  ),
);

export const REGIOES_BR = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"] as const;

/** Contexto do copiloto: nunca descreve a vitrine como operação da empresa. */
export function resumoInfluencers(list: Influencer[]) {
  const operacionais = influencersOperacionais(list);
  if (operacionais.length === 0) {
    return "Sem creators salvos pela empresa: vendas atribuídas e mapa por região não apurados. Os creators visíveis na vitrine são demonstração e não entram em número operacional.";
  }
  const top = [...operacionais].sort((a, b) => b.vendasGeradas - a.vendasGeradas).slice(0, 5);
  const linhas = top.map(
    (i) =>
      `${i.nome} (${i.handle}, ${i.uf}/${i.regiao}, ${i.perfil}): ${i.vendasGeradas} vendas, ${i.envios.length} envios, R$ ${i.custoMedio} médio.`,
  );
  const regiaoTotal: Record<string, number> = {};
  for (const i of operacionais)
    regiaoTotal[i.regiao] = (regiaoTotal[i.regiao] ?? 0) + i.vendasGeradas;
  const regioes = Object.entries(regiaoTotal)
    .sort((a, b) => b[1] - a[1])
    .map(([r, v]) => `${r}: ${v}`)
    .join(" | ");
  return `Top influencers:\n${linhas.join("\n")}\n\nVendas por região: ${regioes}`;
}
