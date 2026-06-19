// Store de PCP — Zustand. Mock realista, pronto para troca por backend.
import { create } from "zustand";
import type {
  Lote,
  Ocorrencia,
  Passagem,
  ReferenciaLote,
  SetorPCP,
  TipoOcorrencia,
  TipoPassagem,
  LinhaPassagem,
} from "@/types/pcp";
import { SETORES_PCP, saldoReferencia, pendenteReferencia } from "@/types/pcp";

const nowISO = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- Seed ----------
const seed: Lote[] = [
  {
    numero: "LOTE 2601",
    grupo: "Camisaria Masculina",
    colecao: "Alto Verão 2026",
    prioridade: "Alta",
    data_abertura: "2026-06-01",
    data_prevista: "2026-07-05",
    responsavel: "Sandra Lima",
    referencias: [
      {
        ref: "CM704",
        nome: "Camisa Linho Amalfi",
        qtd_programada: 500,
        qtd_adicional: 0,
        qtd_perdida: 0,
        qtd_produzida: 320,
        setor_atual: "Costura",
        status: "Em produção",
        grade: { P: 80, M: 160, G: 160, GG: 100 },
        passagens: [],
        ocorrencias: [],
      },
      {
        ref: "CM709",
        nome: "Camisa Oxford",
        qtd_programada: 300,
        qtd_adicional: 0,
        qtd_perdida: 12,
        qtd_produzida: 150,
        setor_atual: "Silk",
        status: "Em produção",
        grade: { P: 60, M: 90, G: 90, GG: 60 },
        passagens: [],
        ocorrencias: [
          {
            id: uid(),
            tipo: "negativa",
            qtd: 12,
            motivo: "Defeito de malha",
            setor: "Corte",
            responsavel: "João",
            timestamp: nowISO(),
          },
        ],
      },
      {
        ref: "CM710",
        nome: "Camisa Slim",
        qtd_programada: 200,
        qtd_adicional: 0,
        qtd_perdida: 0,
        qtd_produzida: 0,
        setor_atual: "Corte",
        status: "Aguardando",
        passagens: [],
        ocorrencias: [],
      },
      {
        ref: "CM712",
        nome: "Camisa Estampada",
        qtd_programada: 150,
        qtd_adicional: 0,
        qtd_perdida: 20,
        qtd_produzida: 0,
        setor_atual: "Silk",
        status: "Ocorrência",
        passagens: [],
        ocorrencias: [
          {
            id: uid(),
            tipo: "negativa",
            qtd: 20,
            motivo: "Silk torto inutilizado",
            setor: "Silk",
            responsavel: "Marcos",
            timestamp: nowISO(),
          },
        ],
      },
    ],
  },
  {
    numero: "LOTE 2602",
    grupo: "Vestidos",
    colecao: "Alto Verão 2026",
    prioridade: "Urgente",
    data_abertura: "2026-06-03",
    data_prevista: "2026-06-25",
    responsavel: "Renata Souza",
    referencias: [
      {
        ref: "VT302",
        nome: "Vestido Midi Toscana",
        qtd_programada: 800,
        qtd_adicional: 20,
        qtd_perdida: 0,
        qtd_produzida: 800,
        setor_atual: "Expedição",
        status: "Concluído",
        passagens: [],
        ocorrencias: [
          {
            id: uid(),
            tipo: "positiva",
            qtd: 20,
            motivo: "Aproveitamento de retalho",
            setor: "Corte",
            responsavel: "Ana",
            timestamp: nowISO(),
          },
        ],
      },
      {
        ref: "VT305",
        nome: "Vestido Longuete Bali",
        qtd_programada: 400,
        qtd_adicional: 0,
        qtd_perdida: 0,
        qtd_produzida: 220,
        setor_atual: "Acabamento",
        status: "Em produção",
        passagens: [],
        ocorrencias: [],
      },
    ],
  },
  {
    numero: "LOTE 2603",
    grupo: "Calças",
    colecao: "Alto Verão 2026",
    prioridade: "Média",
    data_abertura: "2026-06-05",
    data_prevista: "2026-07-15",
    responsavel: "Felipe Garcia",
    referencias: [
      {
        ref: "CL110",
        nome: "Calça Alfaiataria",
        qtd_programada: 600,
        qtd_adicional: 0,
        qtd_perdida: 0,
        qtd_produzida: 0,
        setor_atual: "CAD",
        status: "Em produção",
        passagens: [],
        ocorrencias: [],
      },
      {
        ref: "CL115",
        nome: "Calça Wide Leg",
        qtd_programada: 350,
        qtd_adicional: 0,
        qtd_perdida: 0,
        qtd_produzida: 0,
        setor_atual: "Compras",
        status: "Aguardando",
        passagens: [],
        ocorrencias: [],
      },
    ],
  },
  {
    numero: "LOTE 2604",
    grupo: "Blusaria Feminina",
    colecao: "Pré-Verão 2026",
    prioridade: "Baixa",
    data_abertura: "2026-05-28",
    data_prevista: "2026-06-30",
    responsavel: "Carla Mendes",
    referencias: [
      {
        ref: "BL220",
        nome: "Blusa Bordado Manual",
        qtd_programada: 250,
        qtd_adicional: 0,
        qtd_perdida: 0,
        qtd_produzida: 120,
        setor_atual: "Terceirizados",
        status: "Em produção",
        passagens: [],
        ocorrencias: [],
      },
    ],
  },
];

// ---------- Tipos do store ----------
interface PCPState {
  lotes: Lote[];
  // ações
  registrarPassagem(args: {
    lote: string;
    ref: string;
    tipo: TipoPassagem;
    linha: LinhaPassagem;
    qtd: number;
    setor_destino: SetorPCP | null;
    responsavel: string;
    observacao?: string;
    defeito?: string;
  }): { ok: boolean; erro?: string };

  registrarOcorrencia(args: {
    lote: string;
    ref: string;
    tipo: TipoOcorrencia;
    qtd: number;
    motivo: string;
    responsavel: string;
    observacao?: string;
  }): { ok: boolean; erro?: string };

  criarLote(args: {
    grupo: string;
    colecao?: string;
    prioridade?: Lote["prioridade"];
    responsavel?: string;
    referencia: {
      ref: string;
      nome: string;
      qtd_programada: number;
      grade?: Record<string, number>;
    };
  }): { ok: boolean; numero?: string; erro?: string };
}

// ---------- Helpers ----------
function findRef(
  lotes: Lote[],
  loteNum: string,
  ref: string,
): { lote: Lote; r: ReferenciaLote } | null {
  const lote = lotes.find((l) => l.numero === loteNum);
  if (!lote) return null;
  const r = lote.referencias.find((x) => x.ref === ref);
  if (!r) return null;
  return { lote, r };
}

function cloneLotes(lotes: Lote[]): Lote[] {
  return lotes.map((l) => ({
    ...l,
    referencias: l.referencias.map((r) => ({
      ...r,
      passagens: [...r.passagens],
      ocorrencias: [...r.ocorrencias],
      grade: r.grade ? { ...r.grade } : undefined,
    })),
  }));
}

// ---------- Store ----------
export const usePCPStore = create<PCPState>((set, get) => ({
  lotes: seed,

  registrarPassagem({
    lote,
    ref,
    tipo,
    linha,
    qtd,
    setor_destino,
    responsavel,
    observacao,
    defeito,
  }) {
    const found = findRef(get().lotes, lote, ref);
    if (!found) return { ok: false, erro: "Referência não encontrada" };
    const { r } = found;

    if (qtd <= 0) return { ok: false, erro: "Quantidade inválida" };

    // 1ª linha: regras de saldo
    if (linha === "1a") {
      if (!setor_destino)
        return { ok: false, erro: "Informe o setor de destino" };
      const pendente = pendenteReferencia(r);
      if (qtd > pendente)
        return {
          ok: false,
          erro: `Quantidade (${qtd}) excede o saldo pendente (${pendente})`,
        };
      if (tipo === "integral" && qtd !== pendente)
        return {
          ok: false,
          erro: `Passagem integral exige enviar o saldo completo (${pendente})`,
        };
    }

    const novaPassagem: Passagem = {
      id: uid(),
      tipo,
      linha,
      setor_origem: r.setor_atual,
      setor_destino,
      qtd,
      responsavel,
      observacao,
      defeito,
      timestamp: nowISO(),
    };

    set((state) => {
      const lotes = cloneLotes(state.lotes);
      const f = findRef(lotes, lote, ref)!;
      f.r.passagens.push(novaPassagem);

      if (linha === "1a" && setor_destino) {
        const totalEnviadoAcumulado =
          f.r.passagens
            .filter((p) => p.linha === "1a")
            .reduce((acc, p) => acc + p.qtd, 0);
        // Se o setor destino é Expedição, contabiliza como produzida.
        if (setor_destino === "Expedição") {
          f.r.qtd_produzida = Math.min(
            saldoReferencia(f.r),
            f.r.qtd_produzida + qtd,
          );
        }
        // Avança o setor quando todo o saldo pendente foi enviado.
        if (tipo === "integral") {
          f.r.setor_atual = setor_destino;
        } else if (totalEnviadoAcumulado >= saldoReferencia(f.r)) {
          f.r.setor_atual = setor_destino;
        }
        // Status
        if (f.r.setor_atual === "Expedição" && pendenteReferencia(f.r) === 0) {
          f.r.status = "Concluído";
        } else {
          f.r.status = "Em produção";
        }
      }
      return { lotes };
    });

    return { ok: true };
  },

  registrarOcorrencia({
    lote,
    ref,
    tipo,
    qtd,
    motivo,
    responsavel,
    observacao,
  }) {
    const found = findRef(get().lotes, lote, ref);
    if (!found) return { ok: false, erro: "Referência não encontrada" };
    const { r } = found;
    if (qtd <= 0) return { ok: false, erro: "Quantidade inválida" };
    if (tipo === "negativa") {
      const saldo = saldoReferencia(r);
      if (qtd > saldo)
        return {
          ok: false,
          erro: `Perda (${qtd}) maior que o saldo atual (${saldo})`,
        };
    }

    const oc: Ocorrencia = {
      id: uid(),
      tipo,
      qtd,
      motivo,
      setor: r.setor_atual,
      responsavel,
      observacao,
      timestamp: nowISO(),
    };

    set((state) => {
      const lotes = cloneLotes(state.lotes);
      const f = findRef(lotes, lote, ref)!;
      f.r.ocorrencias.push(oc);
      if (tipo === "positiva") f.r.qtd_adicional += qtd;
      if (tipo === "negativa") f.r.qtd_perdida += qtd;
      if (tipo === "negativa" && f.r.status !== "Concluído")
        f.r.status = "Ocorrência";
      return { lotes };
    });

    void import("@/lib/activity/log").then(({ logActivity }) =>
      logActivity({
        module: "PCP",
        entity_type: "ocorrencia",
        entity_id: `${lote}/${ref}`,
        action: "occurrence",
        message: `Ocorrência ${tipo} em ${ref} (${lote}): ${motivo} · qtd ${qtd}`,
        metadata: { tipo, qtd, motivo, responsavel },
      }),
    );

    return { ok: true };
  },

  criarLote({ grupo, colecao, prioridade, responsavel, referencia }) {
    if (!referencia.ref || referencia.qtd_programada <= 0) {
      return { ok: false, erro: "Referência ou quantidade inválida" };
    }
    const numero = `LOTE ${2700 + Math.floor(Math.random() * 900)}`;
    const hoje = new Date().toISOString().slice(0, 10);
    const prazo = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const novo: Lote = {
      numero,
      grupo,
      colecao,
      prioridade: prioridade ?? "Média",
      data_abertura: hoje,
      data_prevista: prazo,
      responsavel: responsavel ?? "Planner AI",
      referencias: [
        {
          ref: referencia.ref,
          nome: referencia.nome,
          qtd_programada: referencia.qtd_programada,
          qtd_adicional: 0,
          qtd_perdida: 0,
          qtd_produzida: 0,
          setor_atual: "Compras",
          status: "Aguardando",
          grade: referencia.grade,
          passagens: [],
          ocorrencias: [],
        },
      ],
    };
    set((state) => ({ lotes: [novo, ...state.lotes] }));
    return { ok: true, numero };
  },
}));

// Selector utilitário: lotes agrupados por setor (um lote pode aparecer em vários).
export function lotesPorSetor(lotes: Lote[]): Record<SetorPCP, Lote[]> {
  const map = Object.fromEntries(
    SETORES_PCP.map((s) => [s, [] as Lote[]]),
  ) as Record<SetorPCP, Lote[]>;
  for (const l of lotes) {
    const setores = new Set(l.referencias.map((r) => r.setor_atual));
    for (const s of setores) map[s].push(l);
  }
  return map;
}
