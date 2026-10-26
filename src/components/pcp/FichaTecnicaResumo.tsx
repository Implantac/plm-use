import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ExternalLink, Layers, Package, Ruler, Scissors } from "lucide-react";
import type { ReferenciaLote } from "@/types/pcp";
import {
  useTechSheetStore,
  custoTotalBOM,
  custoTotalBOP,
  tempoTotalBOP,
} from "@/lib/techsheet/store";
import { formatSheetSummary, summarizeSheet } from "@/lib/reference/sheet-summary";
import { custoAplicacoesPecasTotal, custoPeca, setupTotal } from "@/lib/techsheet/aplicacoes";

// Ficha técnica resumida usada dentro do drawer de PCP.
// Lê o MESMO store do /tech-sheet (a ficha da ref é a única fonte) — até a
// reescrita de 15/10 esta tela renderizava MATERIAIS_MOCK/PROCESSOS_MOCK
// hardcoded: quem abrisse a "ficha" no PCP via uma lista que não existe em
// lugar nenhum e decidia produção com base nela. Sem doc, a tela diz
// "sem ficha" em vez de inventar.

interface Props {
  referencia: ReferenciaLote;
  grupo?: string;
  colecao?: string;
}

const brl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function FichaTecnicaResumo({ referencia, grupo, colecao }: Props) {
  const grade = referencia.grade ? Object.entries(referencia.grade) : [];
  // leitura direta: data[ref] só existe se alguém abriu/criou a ficha (ou o
  // cloud-sync trouxe). ensure() aqui fabricaria seed-demo como se fosse real.
  const doc = useTechSheetStore((s) => s.data[referencia.ref]);
  const summary = summarizeSheet(doc);
  const bopOrdem = doc ? [...doc.bop].sort((a, b) => a.seq - b.seq) : [];
  const custoIndustrial = doc ? custoTotalBOM(doc.bom) + custoTotalBOP(doc.bop) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xs uppercase tracking-[0.05em] text-muted-foreground">
            Identificação
          </p>
          <p className="text-sm font-bold text-white">
            {referencia.ref} · {referencia.nome}
          </p>
          <p className="text-xs text-muted-foreground">
            {grupo ?? "Grupo —"}
            {colecao ? ` • ${colecao}` : ""}
          </p>
          <p
            className={`mt-1 text-2xs font-semibold uppercase tracking-wider ${
              summary.exists ? "text-status-approved/90" : "text-status-progress/90"
            }`}
          >
            {formatSheetSummary(summary)}
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="text-2xs tracking-[0.04em] gap-1">
          <Link to="/tech-sheet" search={{ ref: referencia.ref }}>
            Abrir ficha completa <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      <div className="aspect-video rounded-lg border border-border bg-muted/50 flex items-center justify-center text-muted-foreground">
        {(() => {
          const fotoUrl =
            referencia.imagem ??
            (doc?.image && /^https:\/\//.test(doc.image) ? doc.image : undefined);
          return fotoUrl ? (
            <img
              src={fotoUrl}
              alt={referencia.nome}
              className="h-full w-full object-cover rounded-lg"
            />
          ) : (
            <Package className="h-10 w-10 opacity-40" />
          );
        })()}
      </div>

      <Section icon={<Ruler className="h-3 w-3" />} title="Grade programada">
        {grade.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem grade definida.</p>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {grade.map(([tam, qtd]) => (
              <div key={tam} className="rounded border border-border bg-muted/50 py-2 text-center">
                <p className="text-2xs uppercase tracking-wider text-muted-foreground">{tam}</p>
                <p className="text-sm font-bold text-white">{qtd}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {doc ? (
        <>
          <Section
            icon={<Layers className="h-3 w-3" />}
            title={`Materiais · ${doc.bom.length} itens`}
          >
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-2xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2 text-right">Consumo</th>
                    <th className="px-3 py-2 text-right">Custo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {doc.bom.map((m) => (
                    <tr key={m.id}>
                      <td className="px-3 py-2 text-primary/80 text-2xs uppercase">{m.tipo}</td>
                      <td className="px-3 py-2 text-white">{m.material}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {m.consumo} {m.unidade}
                      </td>
                      <td className="px-3 py-2 text-right text-white">{brl(m.custo)}</td>
                    </tr>
                  ))}
                  {doc.bom.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-3 text-center text-2xs text-muted-foreground"
                      >
                        Ficha criada, BOM ainda vazio — preencha na ficha completa.
                      </td>
                    </tr>
                  )}
                </tbody>
                {doc.bom.length > 0 && (
                  <tfoot>
                    <tr className="bg-muted/50 text-2xs">
                      <td
                        colSpan={3}
                        className="px-3 py-2 uppercase tracking-wider text-muted-foreground"
                      >
                        Custo de materiais
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-white">
                        {brl(custoTotalBOM(doc.bom))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Section>

          {doc.aplicacoes?.length ? (
            <Section
              icon={<Layers className="h-3 w-3" />}
              title={`Aplicações · ${doc.aplicacoes.length} posições`}
            >
              <div className="space-y-1.5">
                {doc.aplicacoes.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded border border-border bg-muted/50 px-3 py-2 text-xs"
                  >
                    <span className="text-white">
                      <span className="text-2xs uppercase tracking-wider text-primary mr-2">
                        {a.tipo}
                      </span>
                      {a.posicao}{" "}
                      <span className="text-muted-foreground">
                        · {a.larguraCm}×{a.alturaCm} cm · {a.cores} cor(a)
                      </span>
                    </span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {a.qtdPorPeca}/pç · <span className="text-white">{brl(custoPeca(a))}</span>
                    </span>
                  </div>
                ))}
                <p className="pt-1 text-right text-2xs uppercase tracking-wider text-muted-foreground">
                  Aplicações/peça:{" "}
                  <strong className="text-white normal-case tracking-normal">
                    {brl(custoAplicacoesPecasTotal(doc.aplicacoes))}
                  </strong>
                  {setupTotal(doc.aplicacoes) > 0 && (
                    <>
                      {" "}
                      · setup único:{" "}
                      <strong className="text-status-progress normal-case tracking-normal">
                        {brl(setupTotal(doc.aplicacoes))}
                      </strong>
                    </>
                  )}
                </p>
              </div>
            </Section>
          ) : null}

          <Section
            icon={<Scissors className="h-3 w-3" />}
            title={`Sequência operacional · ${doc.bop.length} etapas · ${tempoTotalBOP(doc.bop)} min`}
          >
            <div className="space-y-1.5">
              {bopOrdem.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded border border-border bg-muted/50 px-3 py-2 text-xs"
                >
                  <span className="flex items-center gap-2 text-white">
                    <span className="text-2xs text-muted-foreground">{p.seq}.</span>
                    {p.etapa}
                    <span className="text-2xs text-muted-foreground">· {p.setor}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {p.tempoMin} min · <span className="text-white">{brl(p.custo)}</span>
                  </span>
                </div>
              ))}
              {doc.bop.length === 0 && (
                <p className="rounded-md border border-dashed border-border p-3 text-center text-2xs text-muted-foreground">
                  Nenhuma etapa de operação na ficha ainda.
                </p>
              )}
              {doc.bom.length + doc.bop.length > 0 && (
                <p className="pt-1 text-right text-2xs uppercase tracking-wider text-muted-foreground">
                  Custo industrial (BOM+BOP):{" "}
                  <strong className="text-white normal-case tracking-normal">
                    {brl(custoIndustrial)}
                  </strong>
                </p>
              )}
            </div>
          </Section>
        </>
      ) : (
        <div className="rounded-md border border-dashed border-status-progress/30 bg-status-progress/5 p-4 text-xs leading-relaxed text-muted-foreground">
          Esta referência ainda não tem ficha técnica registrada (nem local, nem na nuvem). "Abrir
          ficha completa" cria e edita a real — nada aqui é exemplo: a versão anterior desta tela
          mostrava materiais e processos hardcoded que não existiam em ficha nenhuma.
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-2xs uppercase tracking-[0.05em] text-primary">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}
