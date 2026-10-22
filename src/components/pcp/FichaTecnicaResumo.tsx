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
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            Identificação
          </p>
          <p className="text-sm font-bold text-white">
            {referencia.ref} · {referencia.nome}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {grupo ?? "Grupo —"}
            {colecao ? ` • ${colecao}` : ""}
          </p>
          <p
            className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${
              summary.exists ? "text-emerald-400/90" : "text-amber-400/90"
            }`}
          >
            {formatSheetSummary(summary)}
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="text-[10px] tracking-[0.15em] gap-1">
          <Link to="/tech-sheet" search={{ ref: referencia.ref }}>
            Abrir ficha completa <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      <div className="aspect-video rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-muted-foreground">
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
          <p className="text-[11px] text-muted-foreground">Sem grade definida.</p>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {grade.map(([tam, qtd]) => (
              <div key={tam} className="rounded border border-white/10 bg-white/5 py-2 text-center">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{tam}</p>
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
            <div className="rounded-md border border-white/10 overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-white/5">
                  <tr className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2 text-right">Consumo</th>
                    <th className="px-3 py-2 text-right">Custo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {doc.bom.map((m) => (
                    <tr key={m.id}>
                      <td className="px-3 py-2 text-primary/80 text-[10px] uppercase">{m.tipo}</td>
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
                        className="px-3 py-3 text-center text-[10px] text-muted-foreground"
                      >
                        Ficha criada, BOM ainda vazio — preencha na ficha completa.
                      </td>
                    </tr>
                  )}
                </tbody>
                {doc.bom.length > 0 && (
                  <tfoot>
                    <tr className="bg-white/5 text-[10px]">
                      <td
                        colSpan={3}
                        className="px-3 py-2 uppercase tracking-wider text-muted-foreground"
                      >
                        Custo de materiais
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-white">
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
                    className="flex items-center justify-between rounded border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px]"
                  >
                    <span className="text-white">
                      <span className="text-[9px] uppercase tracking-wider text-primary mr-2">
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
                <p className="pt-1 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
                  Aplicações/peça:{" "}
                  <strong className="text-white normal-case tracking-normal">
                    {brl(custoAplicacoesPecasTotal(doc.aplicacoes))}
                  </strong>
                  {setupTotal(doc.aplicacoes) > 0 && (
                    <>
                      {" "}
                      · setup único:{" "}
                      <strong className="text-amber-200 normal-case tracking-normal">
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
                  className="flex items-center justify-between rounded border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px]"
                >
                  <span className="flex items-center gap-2 text-white">
                    <span className="text-[9px] text-muted-foreground">{p.seq}.</span>
                    {p.etapa}
                    <span className="text-[9px] text-muted-foreground">· {p.setor}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {p.tempoMin} min · <span className="text-white">{brl(p.custo)}</span>
                  </span>
                </div>
              ))}
              {doc.bop.length === 0 && (
                <p className="rounded-md border border-dashed border-white/10 p-3 text-center text-[10px] text-muted-foreground">
                  Nenhuma etapa de operação na ficha ainda.
                </p>
              )}
              {doc.bom.length + doc.bop.length > 0 && (
                <p className="pt-1 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
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
        <div className="rounded-md border border-dashed border-amber-500/30 bg-amber-500/5 p-4 text-[11px] leading-relaxed text-muted-foreground">
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
      <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}
