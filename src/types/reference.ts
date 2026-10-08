// Ciclo de vida da referência (PLM-centric).
// A referência é a entidade central: nasce na Pesquisa e segue viva após Sell Out.

export type StageId =
  | "pesquisa"
  | "croqui"
  | "modelagem"
  | "piloto"
  | "prova"
  | "ajustes"
  | "engenharia"
  | "liberacao_pcp"
  | "producao"
  | "marketing"
  | "sell_out";

export type StageStatus = "pendente" | "em_andamento" | "aprovado" | "reprovado" | "concluido";

export interface Stage {
  id: StageId;
  label: string;
  status: StageStatus;
  responsavel?: string;
  data?: string; // ISO
  comentario?: string;
}

export interface ReferenceLifecycle {
  ref: string;
  nome: string;
  imagem?: string;
  categoria?: string;
  colecao?: string;
  designer?: string;
  prioridade?: "Baixa" | "Média" | "Alta" | "Urgente";
  prazo?: string; // ISO
  stages: Stage[];
}

export const STAGE_ORDER: { id: StageId; label: string }[] = [
  { id: "pesquisa", label: "Pesquisa" },
  { id: "croqui", label: "Croqui" },
  { id: "modelagem", label: "Modelagem" },
  { id: "piloto", label: "Piloto" },
  { id: "prova", label: "Prova" },
  { id: "ajustes", label: "Ajustes" },
  { id: "engenharia", label: "Engenharia" },
  { id: "liberacao_pcp", label: "Liberação PCP" },
  { id: "producao", label: "Produção" },
  { id: "marketing", label: "Marketing" },
  { id: "sell_out", label: "Sell Out" },
];

export function emptyLifecycle(ref: string, nome: string): ReferenceLifecycle {
  return {
    ref,
    nome,
    stages: STAGE_ORDER.map((s) => ({ ...s, status: "pendente" })),
  };
}

export function stageAtual(lc: ReferenceLifecycle): Stage | undefined {
  return (
    lc.stages.find((s) => s.status === "em_andamento") ??
    [...lc.stages].reverse().find((s) => s.status === "concluido" || s.status === "aprovado")
  );
}

export function percentualLifecycle(lc: ReferenceLifecycle): number {
  const done = lc.stages.filter((s) => s.status === "concluido" || s.status === "aprovado").length;
  return Math.round((done / lc.stages.length) * 100);
}

export function estaAtrasada(lc: ReferenceLifecycle): boolean {
  if (!lc.prazo) return false;
  if (percentualLifecycle(lc) >= 100) return false;
  return new Date(lc.prazo).getTime() < Date.now();
}
