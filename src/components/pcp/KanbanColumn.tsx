import { Card } from "@/components/ui/card";
import { LoteCard } from "./LoteCard";
import type { Lote, SetorPCP } from "@/types/pcp";

interface Props {
  setor: SetorPCP;
  lotes: Lote[];
  onSelectLote(lote: Lote, setor: SetorPCP): void;
}

export function KanbanColumn({ setor, lotes, onSelectLote }: Props) {
  return (
    <div className="flex w-[300px] flex-shrink-0 flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white">{setor}</h3>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold text-primary">
          {lotes.length}
        </span>
      </div>
      <div className="flex flex-col gap-3 rounded-lg bg-black/20 p-2 min-h-[400px]">
        {lotes.length === 0 ? (
          <Card className="border-dashed border-white/10 bg-transparent p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Nenhum lote
            </p>
          </Card>
        ) : (
          lotes.map((l) => (
            <LoteCard
              key={`${setor}-${l.numero}`}
              lote={l}
              setor={setor}
              onClick={() => onSelectLote(l, setor)}
            />
          ))
        )}
      </div>
    </div>
  );
}
