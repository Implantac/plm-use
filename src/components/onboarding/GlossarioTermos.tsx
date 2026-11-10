// Onda 45. Um `<details>` colapsado: quem já opera não perde espaço, quem
// está no primeiro dia encontra a tradução das siglas sem sair da tela.
// `<dl>/<dt>/<dd>` dá semântica de glossário para leitor de tela.

import { BookOpen, ChevronDown } from "lucide-react";
import { TERMOS_PRIMEIRA_DOBRA, termosPorSigla } from "@/lib/onboarding/glossario";

export function GlossarioTermos({
  siglas = TERMOS_PRIMEIRA_DOBRA,
  testId = "glossario-termos",
}: {
  siglas?: readonly string[];
  testId?: string;
}) {
  const termos = termosPorSigla(siglas);
  if (termos.length === 0) return null;

  return (
    <details
      data-testid={testId}
      className="group rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-2xs font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 text-primary" />O que significam essas siglas?
          <span className="font-normal text-muted-foreground">
            ({termos.length} termos em linguagem simples)
          </span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <dl
        aria-label="Glossário de termos técnicos"
        className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-border/60 pt-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {termos.map((t) => (
          <div key={t.sigla} className="min-w-0">
            <dt className="text-2xs font-semibold text-foreground">
              {t.sigla} <span className="font-normal text-muted-foreground">— {t.nome}</span>
            </dt>
            <dd className="text-2xs leading-snug text-muted-foreground">{t.explicacao}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
