// O fluxo do pedido VISÍVEL — o redesign de 26/out respondeu à queixa
// "não dá pra saber onde começa e onde termina": esta barra mostra as seis
// etapas da máquina de estados (fonte única: ORDER_FLOW_STEPS, provada contra
// o ciclo real em docs/FLUXO-OPERACIONAL-PEDIDO.md), com dono e ação da etapa
// atual. Renderiza igual nos dois temas porque só usa tokens (badge-status-*).
import { Check } from "lucide-react";
import { ORDER_FLOW_STEPS, ORDER_STATUS, type SalesOrderStatus } from "@/lib/sales/types";

export function OrderFlowStepper({ status }: { status: SalesOrderStatus }) {
  const idx = ORDER_FLOW_STEPS.findIndex((s) => s.status === status);

  if (status === "cancelado") {
    return (
      <div className="glass-card flex flex-wrap items-center gap-2 rounded-lg px-3 py-2">
        <span className="badge-status-rejected rounded-md px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.03em]">
          {ORDER_STATUS.cancelado.label}
        </span>
        <span className="text-xs text-muted-foreground">
          Saída lateral — este pedido não percorre mais o fluxo.
        </span>
      </div>
    );
  }

  if (idx < 0) return null; // status fora da máquina conhecida: melhor nada que mentira
  const terminal = idx === ORDER_FLOW_STEPS.length - 1;

  return (
    <div className="glass-card rounded-lg px-3 py-2.5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="uppercase-label text-muted-foreground">Fluxo do pedido</span>
        <span className="text-xs text-muted-foreground">
          {terminal ? (
            <>
              <span className="font-semibold text-status-approved">Concluído</span> — virou OP no
              PCP
            </>
          ) : (
            <>
              Etapa <span className="font-semibold tabular-nums text-foreground">{idx + 1}</span>
              {" de "}
              <span className="tabular-nums">{ORDER_FLOW_STEPS.length}</span> · a bola está com{" "}
              <span className="font-semibold text-foreground">{ORDER_FLOW_STEPS[idx].who}</span>
            </>
          )}
        </span>
      </div>
      <ol className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {ORDER_FLOW_STEPS.map((step, i) => {
          const state = i < idx ? "done" : i === idx ? "current" : "future";
          return (
            <li
              key={step.status}
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
              className="flex items-start gap-2"
            >
              <span
                className={
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-2xs font-semibold tabular-nums " +
                  (state === "done"
                    ? "border-transparent bg-primary text-primary-foreground"
                    : state === "current"
                      ? "border-primary text-primary ring-1 ring-primary/35"
                      : "border-border text-muted-foreground")
                }
              >
                {state === "done" ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
              </span>
              <span className="min-w-0">
                <span
                  className={
                    "block text-xs font-semibold " +
                    (state === "current" ? "text-foreground" : "text-muted-foreground")
                  }
                >
                  {ORDER_STATUS[step.status].label}
                </span>
                <span className="block text-2xs leading-snug text-muted-foreground">
                  {state === "current" ? step.action : step.who}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
