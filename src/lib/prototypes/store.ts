// Store persistente de Pilotagem & Prova de Roupa (Lacre de Piloto).
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PrototypeStatus = "Em progresso" | "Ajuste" | "Aprovado" | "Pausado";

export type PrototypeItem = {
  id: string;
  /** Onda 46: piloto de exemplo. Não apura número nem gera ficha/lacre. */
  demo?: boolean;
  refCode: string;
  name: string;
  version: string;
  stage: string;
  requester: string;
  owner: string;
  adjustments: number;
  progress: number;
  photos: number;
  videos: number;
  status: PrototypeStatus;
  image: string;
  lacreObs?: string;
};

export const PROTOTYPE_STAGES = [
  "Modelagem",
  "Corte",
  "Costura",
  "Silk / Bordado",
  "Prova de Caimento",
  "Acabamento",
  "Aprovação / Lacre",
] as const;

export const initialPrototypes: PrototypeItem[] = [
  {
    id: "PR-2606",
    demo: true,
    refCode: "DEV000006",
    name: "Camiseta Esportiva Dry Pro",
    version: "2ª Prova — ajuste cava e ribana gola V",
    stage: "Prova de Caimento",
    requester: "Estilo Esportivo",
    owner: "Sandra Pilotagem",
    adjustments: 1,
    progress: 80,
    photos: 8,
    videos: 1,
    status: "Em progresso",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800",
    lacreObs: "Validar elasticidade da costura na gola V após lavagem.",
  },
  {
    id: "PR-2501",
    demo: true,
    refCode: "V24-001",
    name: "Blusa Linho Amalfi",
    version: "Piloto Lacrado — liberado p/ OP",
    stage: "Aprovação / Lacre",
    requester: "Julia Designer",
    owner: "Ana Qualidade",
    adjustments: 0,
    progress: 100,
    photos: 12,
    videos: 2,
    status: "Aprovado",
    image:
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800",
  },
];

interface PrototypeState {
  items: PrototypeItem[];
  upsert: (item: PrototypeItem) => void;
  create: (input: {
    refCode: string;
    name: string;
    version: string;
    requester: string;
    owner: string;
  }) => PrototypeItem;
  advanceStage: (id: string) => void;
  remove: (id: string) => void;
}

export const usePrototypeStore = create<PrototypeState>()(
  persist(
    (set, get) => ({
      items: initialPrototypes,
      upsert(item) {
        set((s) => {
          const exists = s.items.some((x) => x.id === item.id);
          return {
            items: exists ? s.items.map((x) => (x.id === item.id ? item : x)) : [item, ...s.items],
          };
        });
      },
      create(input) {
        const created: PrototypeItem = {
          id: `PR-${Math.floor(Date.now() / 1000)
            .toString()
            .slice(-4)}`,
          // Onda 46: sem fallback silencioso. A rota valida o campo vazio
          // antes de chamar create(); nenhum piloto novo nasce no DEV000006.
          refCode: input.refCode.trim().toUpperCase(),
          name: input.name.trim() || "Peça Piloto",
          version: input.version.trim() || "1ª Prova — primeiro corte",
          stage: PROTOTYPE_STAGES[0],
          requester: input.requester.trim() || "Estilo",
          owner: input.owner.trim() || "Pilotagem",
          adjustments: 0,
          progress: 15,
          photos: 0,
          videos: 0,
          status: "Em progresso",
          // Sem foto de fábrica: a tela mostra o estado "sem foto" até o
          // usuário anexar a evidência real.
          image: "",
          demo: false,
        };
        set((s) => ({ items: [created, ...s.items] }));
        return created;
      },
      advanceStage(id) {
        const cur = get().items.find((x) => x.id === id);
        if (!cur) return;
        const idx = PROTOTYPE_STAGES.findIndex((st) => st === cur.stage);
        const nextIdx = Math.min(PROTOTYPE_STAGES.length - 1, idx + 1);
        const nextStage = PROTOTYPE_STAGES[nextIdx];
        const isFinal = nextIdx === PROTOTYPE_STAGES.length - 1;
        get().upsert({
          ...cur,
          stage: nextStage,
          progress: Math.round(((nextIdx + 1) / PROTOTYPE_STAGES.length) * 100),
          status: isFinal ? "Aprovado" : "Em progresso",
        });
      },
      remove(id) {
        set((s) => ({ items: s.items.filter((x) => x.id !== id) }));
      },
    }),
    { name: "use-moda:prototypes" },
  ),
);

// ---------------------------------------------------------------------------
// Onda 46 — a vitrine de Pilotagem não apura número.
//
// Medido com browser em 06/11: `/prototypes` abria com 2 pilotos, 1 ajuste,
// 23 evidências e 1 lacrado, todos de fábrica; o formulário "Novo piloto" já
// vinha preenchido com DEV000006 e "Prova POM & Lacre" chamava ensure() para
// materializar a ficha de demonstração.
// ---------------------------------------------------------------------------
export const PILOTO_DEMO_LABEL =
  "Piloto de demonstração — etapas, evidências e lacre não entram nos números";

/** Só pilotos salvos/editados pela empresa. */
export function pilotosOperacionais(items: PrototypeItem[]): PrototypeItem[] {
  return items.filter((p) => p.demo !== true);
}

/** Promoção explícita: o usuário assume o exemplo como cadastro próprio. */
export function promoverPiloto(p: PrototypeItem): PrototypeItem {
  return { ...p, demo: false };
}
