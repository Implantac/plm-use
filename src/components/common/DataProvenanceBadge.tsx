import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Database } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Origem do dado de um painel analítico.
 *
 * - `real`         → lê o banco (tabela/view) ou uma RPC.
 * - `referencia`   → números de referência do BOM/ficha. Não é operação real.
 * - `demonstracao` → dados semeados de exemplo (seed), típicos de tela em construção.
 * - `parcial`      → parte real, parte de referência (o MRP é o caso: só as linhas
 *                    com item no almoxarifado têm saldo real).
 * - `local`        → dado digitado pelo usuário, persistido no navegador e
 *                    sincronizado com o banco quando a tabela existe.
 *
 * O ponto deste componente é não deixar um número fictício parecer operação.
 * Um painel analítico sem selo é uma promessa de que o dado é real.
 */
export type DataProvenance = "real" | "parcial" | "referencia" | "demonstracao" | "local";

const COPY: Record<
  DataProvenance,
  { label: string; title: string; className: string; Icon: typeof Database }
> = {
  real: {
    label: "Dados reais",
    title: "Lê o banco de dados em tempo real (RLS aplicada como usuário).",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  parcial: {
    label: "Parcial: banco + referência",
    title:
      "Parte dos números vem do banco; o restante é referência de ficha/BOM e está marcado linha a linha.",
    className: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    Icon: Database,
  },
  referencia: {
    label: "Valores de referência do BOM",
    title:
      "Derivado da ficha técnica, não do estoque. Serve para planejar, não para confirmar saldo.",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    Icon: AlertTriangle,
  },
  local: {
    label: "Dados do navegador (sincronizados)",
    title:
      "Você digitou estes dados; eles ficam no navegador e sobem para o banco quando a conexão permite. Outra máquina só vê depois da sincronização.",
    className: "border-slate-400/40 bg-slate-400/10 text-slate-600 dark:text-slate-300",
    Icon: Database,
  },
  demonstracao: {
    label: "Demonstração — não usar para decidir",
    title: "Números de exemplo (seed) para avaliação da tela. Não refletem a operação da empresa.",
    className: "border-amber-600/50 bg-amber-600/15 text-amber-800 dark:text-amber-300",
    Icon: AlertTriangle,
  },
};

export function DataProvenanceBadge({
  source,
  detail,
  className,
  "data-testid": testId,
}: {
  source: DataProvenance;
  detail?: string;
  className?: string;
  "data-testid"?: string;
}) {
  const { label, title, className: tone, Icon } = COPY[source];
  return (
    <Badge
      variant="outline"
      data-testid={testId ?? "data-provenance"}
      data-provenance={source}
      title={detail ? `${title} ${detail}` : title}
      className={cn("gap-1 text-[10px] font-medium", tone, className)}
    >
      <Icon className="h-3 w-3" />
      {label}
      {detail && <span className="opacity-70">· {detail}</span>}
    </Badge>
  );
}
