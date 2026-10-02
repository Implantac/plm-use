import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import {
  REFERENCE_STATUS_LABEL,
  type ReferenceRow,
  type ReferenceStatus,
} from "@/hooks/use-references";
import { Button } from "@/components/ui/button";

const STEP_LABEL: Record<ReferenceStatus, string> = {
  IDEIA: "Conceito por definir",
  CROQUI: "Conceito em revisão",
  MODELAGEM: "Construção do produto",
  PILOTO: "Peça-piloto em desenvolvimento",
  AJUSTE: "Ajustes da peça",
  APROVACAO: "Decisão do piloto",
  ENGENHARIA: "Ficha técnica e custo",
  PRODUCAO: "Liberação para produção",
  FINALIZADA: "Ciclo concluído",
  ARQUIVADA: "No histórico",
};

interface ReferenceJourneyProps {
  references: ReferenceRow[];
  loading: boolean;
  error?: boolean;
  onOpen: (reference: ReferenceRow) => void;
  title?: string;
  limit?: number;
}

export function ReferenceJourney({
  references,
  loading,
  error = false,
  onOpen,
  title = "Próximas etapas",
  limit = 4,
}: ReferenceJourneyProps) {
  const activeReferences = references
    .filter((reference) => reference.status !== "FINALIZADA" && reference.status !== "ARQUIVADA")
    .slice()
    .sort((a, b) => Number(b.status === "APROVACAO") - Number(a.status === "APROVACAO"));
  const visibleReferences = activeReferences.slice(0, limit);

  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-xs text-muted-foreground">
          {loading ? "Atualizando" : `${activeReferences.length} em andamento`}
        </span>
      </div>

      {loading ? (
        <p className="py-4 text-sm text-muted-foreground">Carregando referências…</p>
      ) : error ? (
        <p role="alert" className="py-4 text-sm text-muted-foreground">
          Não foi possível carregar as referências. Tente novamente mais tarde.
        </p>
      ) : visibleReferences.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-4">
          <p className="text-sm text-muted-foreground">Crie uma ideia para iniciar o ciclo.</p>
          <Button asChild size="sm" variant="outline">
            <Link to="/ai-center">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Criar ideia
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-white/10 border-t border-white/10">
          {visibleReferences.map((reference) => (
            <li key={reference.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {reference.name}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {reference.code}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {REFERENCE_STATUS_LABEL[reference.status]} · {STEP_LABEL[reference.status]}
                </p>
              </div>
              {reference.status === "APROVACAO" ? (
                <Button asChild size="sm" variant="outline">
                  <Link to="/approvals">
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                    Revisar aprovação
                  </Link>
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => onOpen(reference)}>
                  Continuar etapa
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
