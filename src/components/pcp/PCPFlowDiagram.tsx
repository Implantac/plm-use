// Fluxo do PCP — visualização + stepper interativo (continuação da OP).
// Baseado no fluxograma "CONTINUAÇÃO – PROCESSO PCP / ORDEM DE PRODUÇÃO (OP)".
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Workflow,
  BarChart3,
  PackageSearch,
  Layers3,
  GitFork,
  ClipboardCheck,
  Route as RouteIcon,
  ShieldAlert,
  Send,
  KanbanSquare,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  X,
} from "lucide-react";

export type PCPStepId =
  | "handoff"
  | "analisar"
  | "almoxarifado"
  | "organizar"
  | "cadastro"
  | "finalizar"
  | "rota"
  | "mapa"
  | "lancar"
  | "acompanhar"
  | "controle";

type Kind = "handoff" | "step" | "decision" | "terminal";

interface Node {
  id: PCPStepId;
  label: string;
  detail?: string;
  kind: Kind;
  icon: React.ComponentType<{ className?: string }>;
  checklist: string[];
}

const NODES: Node[] = [
  {
    id: "handoff",
    label: "PLM → PCP",
    detail: "Piloto aprovado dispara continuação da OP",
    kind: "handoff",
    icon: Workflow,
    checklist: [
      "Confirmar piloto aprovado e ficha técnica publicada",
      "Registrar handoff (responsável PLM → responsável PCP)",
    ],
  },
  {
    id: "analisar",
    label: "1 · Analisar produção",
    detail: "Quais e quantos produtos serão produzidos",
    kind: "step",
    icon: BarChart3,
    checklist: [
      "Validar demanda comercial (pedidos + previsão)",
      "Confirmar quantidade total por referência/cor",
      "Definir prioridade e prazo alvo",
    ],
  },
  {
    id: "almoxarifado",
    label: "2 · Verificar almoxarifado",
    detail: "Cores de tecido disponíveis",
    kind: "step",
    icon: PackageSearch,
    checklist: [
      "Consultar saldo por cor/tecido",
      "Reservar matéria-prima disponível",
      "Sinalizar faltas para Compras",
    ],
  },
  {
    id: "organizar",
    label: "3 · Organizar produção",
    detail: "Cores, grade e reposição de estoque",
    kind: "step",
    icon: Layers3,
    checklist: [
      "Distribuir grade P/M/G/GG",
      "Balancear cores conforme estoque",
      "Definir lotes e sequência",
    ],
  },
  {
    id: "cadastro",
    label: "4 · Referência/cor cadastrada?",
    detail: "Não → Desenvolvimento · Sim → Finalizar OP",
    kind: "decision",
    icon: GitFork,
    checklist: [
      "Verificar referência/cor no cadastro",
      "Se não existe: acionar Desenvolvimento",
      "Aguardar liberação para prosseguir",
    ],
  },
  {
    id: "finalizar",
    label: "5 · Finalizar OP",
    detail: "Consolida ordem de produção",
    kind: "step",
    icon: ClipboardCheck,
    checklist: [
      "Consolidar itens, grade e cores",
      "Anexar ficha técnica vigente",
      "Emitir número de OP",
    ],
  },
  {
    id: "rota",
    label: "6 · Definir rota produtiva",
    detail: "Sequência operacional da OP",
    kind: "step",
    icon: RouteIcon,
    checklist: [
      "Definir setores (Corte → Silk → Costura → Acabamento)",
      "Prever terceirizados quando necessário",
      "Calcular tempo/capacidade",
    ],
  },
  {
    id: "mapa",
    label: "7 · Mapa de risco?",
    detail: "Se sim, solicitar à modelista",
    kind: "decision",
    icon: ShieldAlert,
    checklist: [
      "Avaliar risco de encolhimento / rendimento",
      "Se necessário: solicitar mapa à modelista",
      "Registrar decisão no histórico",
    ],
  },
  {
    id: "lancar",
    label: "8 · Lançar pedido",
    detail: "Cria lote no Kanban do PCP",
    kind: "step",
    icon: Send,
    checklist: [
      "Criar lote no Kanban (setor Corte/Compras)",
      "Distribuir para responsáveis",
      "Notificar equipes",
    ],
  },
  {
    id: "acompanhar",
    label: "9 · Acompanhar via Kanban",
    detail: "Passagens, ocorrências, torre de controle",
    kind: "step",
    icon: KanbanSquare,
    checklist: [
      "Registrar passagens 1ª linha e retrabalhos",
      "Tratar ocorrências e perdas",
      "Monitorar SLA na Torre de Controle",
    ],
  },
  {
    id: "controle",
    label: "Entrada no controle",
    detail: "OP monitorada até expedição",
    kind: "terminal",
    icon: CheckCircle2,
    checklist: [
      "Fechar OP quando saldo = 0",
      "Encaminhar para Expedição",
      "Registrar aprendizados",
    ],
  },
];

const KIND_STYLES: Record<Kind, string> = {
  handoff: "border-emerald-400/40 bg-emerald-400/[0.06] text-emerald-200",
  step: "border-white/10 bg-white/[0.03] text-white",
  decision: "border-amber-300/40 bg-amber-300/[0.06] text-amber-100",
  terminal: "border-primary/40 bg-primary/[0.08] text-primary",
};

interface Props {
  activeId?: PCPStepId | null;
  refCode?: string;
  onSelect?: (id: PCPStepId | null) => void;
  compact?: boolean;
}

export function PCPFlowDiagram({ activeId, refCode, onSelect, compact }: Props) {
  const activeIdx = activeId ? NODES.findIndex((n) => n.id === activeId) : -1;
  const active = activeIdx >= 0 ? NODES[activeIdx] : null;
  const prev = activeIdx > 0 ? NODES[activeIdx - 1] : null;
  const next = activeIdx >= 0 && activeIdx < NODES.length - 1 ? NODES[activeIdx + 1] : null;

  return (
    <Card id="pcp-flow" className="glass-card rounded-lg p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
            <Workflow className="w-4 h-4 text-primary" />
            Fluxo do PCP · continuação da OP
          </h3>
          <p className="text-[10px] text-muted-foreground mt-1 max-w-2xl">
            Rotina disparada logo após o piloto aprovado no PLM. Clique em uma
            etapa para abrir seu checklist sem sair desta tela.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {refCode && (
            <Badge
              variant="outline"
              className="border-primary/40 text-primary text-[9px] uppercase tracking-widest"
            >
              Ref · {refCode}
            </Badge>
          )}
          <Badge
            variant="outline"
            className="border-emerald-400/40 text-emerald-200 text-[9px] uppercase tracking-widest"
          >
            Handoff PLM → PCP
          </Badge>
        </div>
      </div>

      <ol
        className={`grid gap-2 ${
          compact
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        }`}
      >
        {NODES.map((n, i) => {
          const Icon = n.icon;
          const isActive = activeId === n.id;
          const clickable = !!onSelect;
          return (
            <li key={n.id}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onSelect?.(isActive ? null : n.id)}
                className={`relative w-full text-left rounded-md border p-3 transition ${
                  KIND_STYLES[n.kind]
                } ${
                  isActive
                    ? "ring-1 ring-primary/70 shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]"
                    : clickable
                      ? "hover:border-primary/40 hover:bg-white/[0.06]"
                      : ""
                } ${clickable ? "cursor-pointer" : "cursor-default"}`}
                aria-pressed={isActive}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`shrink-0 rounded-md p-1.5 border ${
                      n.kind === "decision"
                        ? "border-amber-300/40 bg-amber-300/10"
                        : n.kind === "handoff"
                          ? "border-emerald-400/40 bg-emerald-400/10"
                          : n.kind === "terminal"
                            ? "border-primary/40 bg-primary/10"
                            : "border-white/10 bg-white/[0.04]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em]">
                      {n.label}
                    </p>
                    {n.detail && (
                      <p className="mt-1 text-[10px] leading-snug text-white/70">
                        {n.detail}
                      </p>
                    )}
                  </div>
                </div>
                {i < NODES.length - 1 && (
                  <span className="absolute -bottom-2 right-3 text-[9px] uppercase tracking-widest text-muted-foreground/60">
                    ↓
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {active && (
        <div className="rounded-md border border-primary/30 bg-primary/[0.05] p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Etapa ativa {refCode ? `· ${refCode}` : ""}
              </p>
              <p className="mt-0.5 text-sm font-bold text-white">
                {active.label}
              </p>
              {active.detail && (
                <p className="mt-1 text-[11px] text-white/70">{active.detail}</p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-white gap-1"
              onClick={() => onSelect?.(null)}
            >
              <X className="h-3.5 w-3.5" /> Fechar
            </Button>
          </div>
          <ul className="space-y-1.5">
            {active.checklist.map((c) => (
              <li
                key={c}
                className="flex items-start gap-2 text-[11px] text-white/85"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-primary shrink-0" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <Button
              size="sm"
              variant="outline"
              disabled={!prev}
              onClick={() => prev && onSelect?.(prev.id)}
              className="gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              {prev ? prev.label.replace(/^\d+\s·\s/, "") : "Início"}
            </Button>
            <span className="text-[10px] text-muted-foreground">
              {activeIdx + 1} / {NODES.length}
            </span>
            <Button
              size="sm"
              variant="default"
              disabled={!next}
              onClick={() => next && onSelect?.(next.id)}
              className="gap-1"
            >
              {next ? next.label.replace(/^\d+\s·\s/, "") : "Concluído"}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <details className="rounded-md border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-white">
          Ver fluxograma original
        </summary>
        <img
          src="/assets/fluxo-pcp.png"
          alt="Fluxograma do processo PCP / Ordem de Produção"
          className="mt-3 w-full max-w-2xl rounded border border-white/10"
          loading="lazy"
        />
      </details>
    </Card>
  );
}

export const PCP_STEP_IDS: PCPStepId[] = NODES.map((n) => n.id);
