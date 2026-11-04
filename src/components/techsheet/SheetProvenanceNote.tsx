import { AlertTriangle, Info } from "lucide-react";
import type { SheetProvenance } from "@/lib/techsheet/provenance";
import { cn } from "@/lib/utils";

/**
 * Aviso curto sobre a origem da ficha que a tela está mostrando.
 *
 * Nasceu da constatação de que várias telas caem em `seedFor(code)` quando não
 * há ficha salva e exibem os números como se fossem ficha aprovada. Não é para
 * bloquear nada: é para o usuário saber o que está lendo antes de decidir
 * compra, corte ou preço.
 */
export function SheetProvenanceNote({
  provenance,
  code,
  className,
  compact = false,
  "data-testid": testId = "sheet-provenance",
}: {
  provenance: SheetProvenance;
  code?: string;
  className?: string;
  /** Uma linha só, para caber em cabeçalho de painel. */
  compact?: boolean;
  "data-testid"?: string;
}) {
  if (provenance === "salva") {
    return (
      <p
        data-testid={testId}
        data-provenance="salva"
        className={cn("flex items-center gap-1.5 text-[10px] text-muted-foreground", className)}
      >
        <Info className="h-3 w-3 shrink-0" />
        Ficha salva{code ? ` · ${code}` : ""}
      </p>
    );
  }

  return (
    <p
      data-testid={testId}
      data-provenance="referencia"
      className={cn(
        "flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] leading-snug text-amber-800 dark:text-amber-300",
        className,
      )}
    >
      <AlertTriangle className="h-3 w-3 shrink-0 mt-px" />
      <span>
        <strong className="font-semibold">Ficha de referência (demonstração)</strong>
        {code ? ` · ${code}` : ""}
        {compact
          ? " — não há ficha salva."
          : " — ainda não há ficha salva para esta referência. Os números vêm do exemplo padrão, não de uma ficha aprovada. Salve a ficha para trabalhar com dados reais."}
      </span>
    </p>
  );
}
