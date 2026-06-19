import { Check, Circle, Clock, X } from "lucide-react";
import { percentualLifecycle, type ReferenceLifecycle, type Stage } from "@/types/reference";

interface Props {
  lifecycle: ReferenceLifecycle;
  compact?: boolean;
}

// Timeline universal da referência — usada em tech-sheet e no drawer do PCP.
export function ReferenceTimeline({ lifecycle, compact }: Props) {
  const pct = percentualLifecycle(lifecycle);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Ciclo de vida
          </p>
          <p className="text-sm font-bold text-white">
            {lifecycle.ref} · {lifecycle.nome}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Progresso
          </p>
          <p className="text-lg font-bold text-primary">{pct}%</p>
        </div>
      </div>

      <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary/60 to-primary"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className={compact ? "space-y-2" : "space-y-3"}>
        {lifecycle.stages.map((stage, i) => (
          <StageRow
            key={stage.id}
            stage={stage}
            isLast={i === lifecycle.stages.length - 1}
            compact={compact}
          />
        ))}
      </ol>
    </div>
  );
}

function StageRow({
  stage,
  isLast,
  compact,
}: {
  stage: Stage;
  isLast: boolean;
  compact?: boolean;
}) {
  const tone = {
    pendente: "text-muted-foreground border-white/15 bg-white/[0.02]",
    em_andamento: "text-primary border-primary/40 bg-primary/10",
    aprovado: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10",
    concluido: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10",
    reprovado: "text-rose-300 border-rose-400/40 bg-rose-400/10",
  }[stage.status];

  const icon =
    stage.status === "concluido" || stage.status === "aprovado" ? (
      <Check className="h-3 w-3" />
    ) : stage.status === "em_andamento" ? (
      <Clock className="h-3 w-3" />
    ) : stage.status === "reprovado" ? (
      <X className="h-3 w-3" />
    ) : (
      <Circle className="h-3 w-3" />
    );

  return (
    <li className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full border ${tone}`}
        >
          {icon}
        </span>
        {!isLast && <span className="h-full min-h-[18px] w-px bg-white/10" />}
      </div>
      <div className={`flex-1 ${compact ? "pb-1" : "pb-2"}`}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white">
            {stage.label}
          </p>
          <span
            className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${tone}`}
          >
            {stage.status.replace("_", " ")}
          </span>
        </div>
        {(stage.responsavel || stage.data) && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {stage.responsavel ?? "—"}
            {stage.data ? ` · ${new Date(stage.data).toLocaleDateString()}` : ""}
          </p>
        )}
        {stage.comentario && !compact && (
          <p className="text-[11px] text-white/80 mt-1">{stage.comentario}</p>
        )}
      </div>
    </li>
  );
}
