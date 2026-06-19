// Store compartilhado de influencers — usado pela página /influencers e pelo Marketing AI.
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
};

const SEED: Influencer[] = [
  { id: "i1", nome: "Marina Costa", handle: "@marinacosta", regiao: "Sudeste", uf: "SP", seguidores: 480000, segmento: "Lifestyle Premium", perfil: "Macro", custoMedio: 8500, vendasGeradas: 142,
    envios: [
      { id: "e1", ref: "VT302", nome: "Vestido Midi Toscana", data: "2026-06-02", status: "Engajou", engajamento: 8.4 },
      { id: "e2", ref: "CM704", nome: "Camisa Linho Amalfi", data: "2026-05-20", status: "Postou", engajamento: 6.2 },
    ]},
  { id: "i2", nome: "Júlia Pires", handle: "@juliapires", regiao: "Sul", uf: "RS", seguidores: 120000, segmento: "Moda Urbana", perfil: "Médio", custoMedio: 2800, vendasGeradas: 68,
    envios: [{ id: "e3", ref: "BL220", nome: "Blusa Bordado Manual", data: "2026-06-10", status: "Postou", engajamento: 9.1 }]},
  { id: "i3", nome: "Camila Reis", handle: "@camireis", regiao: "Nordeste", uf: "PE", seguidores: 62000, segmento: "Praia & Resort", perfil: "Micro", custoMedio: 1200, vendasGeradas: 95,
    envios: [{ id: "e4", ref: "SA180", nome: "Saia Plissada Capri", data: "2026-06-05", status: "Engajou", engajamento: 11.8 }]},
  { id: "i4", nome: "Beatriz Lima", handle: "@bealima", regiao: "Sudeste", uf: "RJ", seguidores: 240000, segmento: "Festa & Casamentos", perfil: "Macro", custoMedio: 5200, vendasGeradas: 88,
    envios: [{ id: "e5", ref: "VT305", nome: "Vestido Longuete Bali", data: "2026-06-12", status: "Pendente" }]},
  { id: "i5", nome: "Helena Souto", handle: "@helenasouto", regiao: "Centro-Oeste", uf: "GO", seguidores: 38000, segmento: "Country & Boho", perfil: "Micro", custoMedio: 800, vendasGeradas: 41,
    envios: [{ id: "e6", ref: "CL110", nome: "Calça Alfaiataria", data: "2026-06-08", status: "Postou", engajamento: 7.5 }]},
];

interface InfState {
  influencers: Influencer[];
  registrarEnvio(id: string, envio: Envio): void;
}

export const useInfluencersStore = create<InfState>()(persist((set) => ({
  influencers: SEED,
  registrarEnvio(id, envio) {
    set((s) => ({
      influencers: s.influencers.map((i) =>
        i.id === id ? { ...i, envios: [envio, ...i.envios] } : i,
      ),
    }));
  },
}), { name: "use-moda:influencers" }));

export const REGIOES_BR = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"] as const;

export function resumoInfluencers(list: Influencer[]) {
  const top = [...list].sort((a, b) => b.vendasGeradas - a.vendasGeradas).slice(0, 5);
  const linhas = top.map(
    (i) =>
      `${i.nome} (${i.handle}, ${i.uf}/${i.regiao}, ${i.perfil}): ${i.vendasGeradas} vendas, ${i.envios.length} envios, R$ ${i.custoMedio} médio.`,
  );
  const regiaoTotal: Record<string, number> = {};
  for (const i of list) regiaoTotal[i.regiao] = (regiaoTotal[i.regiao] ?? 0) + i.vendasGeradas;
  const regioes = Object.entries(regiaoTotal)
    .sort((a, b) => b[1] - a[1])
    .map(([r, v]) => `${r}: ${v}`)
    .join(" | ");
  return `Top influencers:\n${linhas.join("\n")}\n\nVendas por região: ${regioes}`;
}
