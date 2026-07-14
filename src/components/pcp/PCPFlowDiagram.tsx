// Fluxo do PCP — visualização do processo (continuação da OP após aprovação do Piloto no PLM).
// Baseado no fluxograma "CONTINUAÇÃO – PROCESSO PCP / ORDEM DE PRODUÇÃO (OP)".
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

type Kind = "handoff" | "step" | "decision" | "terminal";

interface Node {
  id: string;
  label: string;
  detail?: string;
  kind: Kind;
  icon: React.ComponentType<{ className?: string }>;
}

const NODES: Node[] = [
  {
    id: "handoff",
    label: "PLM → PCP",
    detail: "Piloto aprovado dispara continuação da OP",
    kind: "handoff",
    icon: Workflow,
  },
  {
    id: "analisar",
    label: "1 · Analisar produção",
    detail: "Quais e quantos produtos serão produzidos",
    kind: "step",
    icon: BarChart3,
  },
  {
    id: "almoxarifado",
    label: "2 · Verificar almoxarifado",
    detail: "Cores de tecido disponíveis",
    kind: "step",
    icon: PackageSearch,
  },
  {
    id: "organizar",
    label: "3 · Organizar o que será produzido",
    detail: "Cores, quantidade total/grade e reposição de estoque",
    kind: "step",
    icon: Layers3,
  },
  {
    id: "cadastro",
    label: "4 · Referência/cor cadastrada?",
    detail: "Não → solicitar ao Desenvolvimento · Sim → finalizar OP",
    kind: "decision",
    icon: GitFork,
  },
  {
    id: "finalizar",
    label: "5 · Finalizar OP",
    detail: "Consolida ordem de produção",
    kind: "step",
    icon: ClipboardCheck,
  },
  {
    id: "rota",
    label: "6 · Definir rota produtiva",
    detail: "Sequência operacional da OP",
    kind: "step",
    icon: RouteIcon,
  },
  {
    id: "mapa",
    label: "7 · Mapa de risco?",
    detail: "Se sim, solicitar à modelista",
    kind: "decision",
    icon: ShieldAlert,
  },
  {
    id: "lancar",
    label: "8 · Lançar pedido para produção",
    detail: "Cria lote no Kanban do PCP",
    kind: "step",
    icon: Send,
  },
  {
    id: "acompanhar",
    label: "9 · Acompanhar via Kanban",
    detail: "Passagens, ocorrências, torre de controle",
    kind: "step",
    icon: KanbanSquare,
  },
  {
    id: "controle",
    label: "Entrada no controle",
    detail: "OP monitorada até expedição",
    kind: "terminal",
    icon: CheckCircle2,
  },
];

const KIND_STYLES: Record<Kind, string> = {
  handoff: "border-emerald-400/40 bg-emerald-400/[0.06] text-emerald-200",
  step: "border-white/10 bg-white/[0.03] text-white",
  decision: "border-amber-300/40 bg-amber-300/[0.06] text-amber-100",
  terminal: "border-primary/40 bg-primary/[0.08] text-primary",
};

interface Props {
  activeId?: string;
  compact?: boolean;
}

export function PCPFlowDiagram({ activeId, compact }: Props) {
  return (
    <Card className="glass-card rounded-lg p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
            <Workflow className="w-4 h-4 text-primary" />
            Fluxo do PCP · continuação da OP
          </h3>
          <p className="text-[10px] text-muted-foreground mt-1 max-w-2xl">
            Rotina disparada logo após o piloto aprovado no PLM. Cada etapa
            alimenta o Kanban, a Torre de Controle e o Gantt abaixo.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-emerald-400/40 text-emerald-200 text-[9px] uppercase tracking-widest"
        >
          Handoff PLM → PCP
        </Badge>
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
          const active = activeId === n.id;
          return (
            <li
              key={n.id}
              className={`relative rounded-md border p-3 transition ${
                KIND_STYLES[n.kind]
              } ${active ? "ring-1 ring-primary/70 shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]" : ""}`}
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
            </li>
          );
        })}
      </ol>

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
