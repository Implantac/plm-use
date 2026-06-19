import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ExternalLink, Layers, Package, Ruler, Scissors } from "lucide-react";
import type { ReferenciaLote } from "@/types/pcp";

// Ficha técnica resumida usada dentro do drawer de PCP.
// Reaproveita a mesma estrutura do módulo /tech-sheet (materiais, processos, grade)
// para garantir uma única fonte conceitual sem duplicar o módulo completo.

interface Props {
  referencia: ReferenciaLote;
  grupo?: string;
  colecao?: string;
}

const MATERIAIS_MOCK = [
  { tipo: "Tecido", nome: "Linho 100% Off-White", consumo: "1.20 m", custo: "R$ 42,00" },
  { tipo: "Aviamento", nome: "Botão madrepérola 12mm", consumo: "4 un", custo: "R$ 12,00" },
  { tipo: "Linha", nome: "Poliéster 120 tom 14", consumo: "200 m", custo: "R$ 2,50" },
  { tipo: "Embalagem", nome: "Tag + polybag", consumo: "1 un", custo: "R$ 4,50" },
];

const PROCESSOS_MOCK = [
  { nome: "Corte", tempo: "12 min", custo: "R$ 4,50" },
  { nome: "Silk localizado", tempo: "06 min", custo: "R$ 3,80" },
  { nome: "Costura reta/overloque", tempo: "45 min", custo: "R$ 18,00" },
  { nome: "Acabamento + QC", tempo: "10 min", custo: "R$ 4,20" },
];

export function FichaTecnicaResumo({ referencia, grupo, colecao }: Props) {
  const grade = referencia.grade
    ? Object.entries(referencia.grade)
    : [];

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
        </div>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="border-white/15 text-[10px] uppercase tracking-[0.15em] gap-1"
        >
          <Link to="/tech-sheet" search={{ ref: referencia.ref }}>
            Abrir ficha completa <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      <div className="aspect-video rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-muted-foreground">
        {referencia.imagem ? (
          <img
            src={referencia.imagem}
            alt={referencia.nome}
            className="h-full w-full object-cover rounded-lg"
          />
        ) : (
          <Package className="h-10 w-10 opacity-40" />
        )}
      </div>

      <Section icon={<Ruler className="h-3 w-3" />} title="Grade programada">
        {grade.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Sem grade definida.</p>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {grade.map(([tam, qtd]) => (
              <div
                key={tam}
                className="rounded border border-white/10 bg-white/5 py-2 text-center"
              >
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  {tam}
                </p>
                <p className="text-sm font-bold text-white">{qtd}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={<Layers className="h-3 w-3" />} title="Materiais (resumo)">
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
              {MATERIAIS_MOCK.map((m) => (
                <tr key={m.nome}>
                  <td className="px-3 py-2 text-primary/80 text-[10px] uppercase">
                    {m.tipo}
                  </td>
                  <td className="px-3 py-2 text-white">{m.nome}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {m.consumo}
                  </td>
                  <td className="px-3 py-2 text-right text-white">{m.custo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section icon={<Scissors className="h-3 w-3" />} title="Sequência operacional">
        <div className="space-y-1.5">
          {PROCESSOS_MOCK.map((p, i) => (
            <div
              key={p.nome}
              className="flex items-center justify-between rounded border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px]"
            >
              <span className="flex items-center gap-2 text-white">
                <span className="text-[9px] text-muted-foreground">{i + 1}.</span>
                {p.nome}
              </span>
              <span className="text-muted-foreground">
                {p.tempo} · <span className="text-white">{p.custo}</span>
              </span>
            </div>
          ))}
        </div>
      </Section>
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
