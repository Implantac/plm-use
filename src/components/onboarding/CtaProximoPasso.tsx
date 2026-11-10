// Onda 44. Os avisos de vitrine das Ondas 38–42 explicavam MUITO BEM por que
// o número não era apurável, mas não davam nenhuma saída: o usuário lia o
// aviso e não sabia onde clicar. Este componente é a saída, em um só lugar.
//
// O estado vem de `usePasso` (os mesmos stores do onboarding e dos números),
// então o CTA desaparece automaticamente quando o passo é concluído — sem
// contador paralelo e sem "configuração inicial" inventada.

import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { usePasso, type PassoId } from "@/lib/onboarding/primeiros-passos";
import { Button } from "@/components/ui/button";

type Props = {
  passo: PassoId;
  /** Ação na própria tela (abre diálogo/modal). Se ausente, navega para a rota. */
  onAcao?: () => void;
  label?: string;
  /** `data-testid` do CTA, para testes e para medir cobertura no bundle. */
  testId?: string;
  /** Mostra a dica "clique em ..." ao lado do botão. */
  dica?: boolean;
};

export function CtaProximoPasso({ passo, onAcao, label, testId, dica = false }: Props) {
  const p = usePasso(passo);

  // Passo já concluído: não há mais "próximo passo" a oferecer. A ausência
  // restante é de outro tipo (carregamento ou realmente nenhum registro).
  if (p.concluido) return null;

  const texto = label ?? (onAcao ? "Fazer agora" : `Ir para ${p.rota}`);

  return (
    <span
      data-testid={testId ?? `cta-${p.id}`}
      data-passo={p.id}
      className="mt-2 inline-flex flex-wrap items-center gap-2 align-middle"
    >
      <Button asChild={!onAcao} size="sm" onClick={onAcao} className="h-7 gap-1 px-2.5 text-2xs">
        {onAcao ? (
          <>
            {texto} <ArrowRight className="h-3 w-3" />
          </>
        ) : (
          <Link to={p.rota} aria-label={`${texto}: ${p.titulo}`}>
            {texto} <ArrowRight className="inline h-3 w-3" />
          </Link>
        )}
      </Button>
      {dica && !onAcao && <span className="text-[10px] text-muted-foreground">{p.acao}</span>}
    </span>
  );
}
