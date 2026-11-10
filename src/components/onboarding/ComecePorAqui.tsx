// Onda 43. Um único lugar responde "por que está tudo vazio e o que eu faço
// agora?", em vez de dezenas de avisos âmbar espalhados pelas 17 telas.
// O estado vem dos mesmos stores dos números: sem contador paralelo e sem
// dado inventado. Quando o usuário cria dados reais, o card se desfaz sozinho.

import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, CircleHelp, Sparkles } from "lucide-react";
import { usePrimeirosPassos } from "@/lib/onboarding/primeiros-passos";
import { Button } from "@/components/ui/button";

export function ComecePorAqui() {
  const estado = usePrimeirosPassos();

  if (estado.pronto) {
    return (
      <div
        data-testid="onboarding-concluido"
        className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-300"
        role="status"
      >
        <Check className="h-4 w-4 shrink-0" />
        Sua operação já tem dados reais. Os painéis abaixo estão apurando a partir deles.
      </div>
    );
  }

  return (
    <section
      data-testid="comece-por-aqui"
      aria-labelledby="comece-por-aqui-titulo"
      className="rounded-xl border border-primary/25 bg-primary/[0.035] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 id="comece-por-aqui-titulo" className="text-base font-semibold tracking-tight">
              Comece por aqui
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Seu PLM ainda não tem dados da sua empresa. Por isso os números aparecem como{" "}
              <span className="font-mono font-semibold text-foreground">—</span>: o sistema não
              mistura exemplos de demonstração com a operação real. Conclua os passos abaixo, na
              ordem que fizer sentido, para que os painéis comecem a apurar.
            </p>
          </div>
        </div>
        <span
          data-testid="progresso-onboarding"
          className="shrink-0 rounded-full border border-primary/30 bg-background px-3 py-1 text-2xs font-semibold tabular-nums text-primary"
        >
          {estado.concluidos} de {estado.total} concluídos
        </span>
      </div>

      <div
        className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={estado.percentual}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso da configuração inicial"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${estado.percentual}%` }}
        />
      </div>

      <ol className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {estado.passos.map((passo, i) => {
          const proximo = estado.proximo?.id === passo.id;
          return (
            <li
              key={passo.id}
              data-testid={`passo-${passo.id}`}
              data-concluido={passo.concluido ? "true" : "false"}
              className={`flex flex-col gap-2 rounded-lg border p-3 ${
                passo.concluido
                  ? "border-border/60 bg-background/60"
                  : proximo
                    ? "border-primary/40 bg-background"
                    : "border-border/60 bg-background/40"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-2xs font-semibold tabular-nums ${
                    passo.concluido
                      ? "bg-emerald-500/15 text-emerald-600"
                      : proximo
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {passo.concluido ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-semibold ${passo.concluido ? "text-muted-foreground line-through" : ""}`}
                  >
                    {passo.titulo}
                  </p>
                  <p className="mt-0.5 text-2xs leading-snug text-muted-foreground">
                    {passo.descricao}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pl-7">
                <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
                  <CircleHelp className="h-3 w-3 shrink-0" />
                  {passo.acao}
                </span>
                <Button
                  asChild
                  size="sm"
                  variant={proximo ? "default" : "ghost"}
                  className="h-7 shrink-0 gap-1 px-2.5 text-2xs"
                >
                  <Link to={passo.rota} aria-label={`Ir para: ${passo.titulo}`}>
                    {proximo ? "Começar" : "Abrir"}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
