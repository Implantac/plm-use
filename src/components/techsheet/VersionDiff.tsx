import { ArrowRight, Minus, Plus, Equal } from "lucide-react";
import type { TechSheetVersion } from "@/lib/techsheet/store";

/**
 * Diff visual entre duas versões da ficha técnica.
 * - Detecta alterações "X → Y" e renderiza antes/depois lado a lado.
 * - Itens só em A = removidos (vermelho), só em B = adicionados (verde),
 *   presentes em ambos = inalterados.
 */
export function VersionDiff({
  a,
  b,
}: {
  a?: TechSheetVersion;
  b?: TechSheetVersion;
}) {
  if (!a || !b) {
    return (
      <div className="rounded-md border border-dashed border-white/10 p-4 text-[10px] text-muted-foreground">
        Selecione duas versões para comparar.
      </div>
    );
  }

  if (a.id === b.id) {
    return (
      <div className="rounded-md border border-dashed border-white/10 p-4 text-[10px] text-muted-foreground">
        Selecione duas versões diferentes.
      </div>
    );
  }

  const setA = new Set(a.alteracoes.map((x) => x.trim()));
  const setB = new Set(b.alteracoes.map((x) => x.trim()));
  const removidos = a.alteracoes.filter((x) => !setB.has(x.trim()));
  const adicionados = b.alteracoes.filter((x) => !setA.has(x.trim()));
  const mantidos = a.alteracoes.filter((x) => setB.has(x.trim()));

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] p-4 space-y-4">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
        <span className="text-rose-300">A · {a.versao}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <span className="text-emerald-300">B · {b.versao}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-[9px] uppercase tracking-widest">
        <Stat label="Removidos" value={removidos.length} tone="neg" />
        <Stat label="Mantidos" value={mantidos.length} tone="mut" />
        <Stat label="Adicionados" value={adicionados.length} tone="pos" />
      </div>

      <div className="space-y-1.5">
        {removidos.map((x, i) => (
          <DiffLine key={`r${i}`} text={x} kind="rem" />
        ))}
        {adicionados.map((x, i) => (
          <DiffLine key={`a${i}`} text={x} kind="add" />
        ))}
        {mantidos.map((x, i) => (
          <DiffLine key={`m${i}`} text={x} kind="eq" />
        ))}
        {removidos.length === 0 && adicionados.length === 0 && mantidos.length === 0 && (
          <p className="text-[10px] text-muted-foreground">Sem alterações registradas.</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "pos" | "neg" | "mut" }) {
  const color = tone === "pos" ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/5"
    : tone === "neg" ? "text-rose-300 border-rose-500/30 bg-rose-500/5"
    : "text-muted-foreground border-white/10 bg-white/[0.02]";
  return (
    <div className={`rounded-md border p-2 ${color}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[8px] mt-0.5">{label}</p>
    </div>
  );
}

function DiffLine({ text, kind }: { text: string; kind: "add" | "rem" | "eq" }) {
  const cfg =
    kind === "add"
      ? { bg: "bg-emerald-500/10 border-emerald-500/30", icon: <Plus className="w-3 h-3 text-emerald-400" />, color: "text-emerald-200" }
      : kind === "rem"
      ? { bg: "bg-rose-500/10 border-rose-500/30", icon: <Minus className="w-3 h-3 text-rose-400" />, color: "text-rose-200 line-through opacity-80" }
      : { bg: "bg-white/[0.02] border-white/5", icon: <Equal className="w-3 h-3 text-muted-foreground" />, color: "text-muted-foreground" };

  // Detecta "X → Y" ou "X -> Y"
  const m = text.match(/^(.*?)\s*(?:→|->)\s*(.*)$/);
  return (
    <div className={`rounded-md border p-2 flex items-start gap-2 text-[10px] ${cfg.bg}`}>
      <span className="mt-0.5">{cfg.icon}</span>
      {m ? (
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <span className={`px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-200 font-mono ${kind === "add" ? "opacity-60" : ""}`}>{m[1]}</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <span className={`px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-200 font-mono ${kind === "rem" ? "opacity-60" : ""}`}>{m[2]}</span>
        </div>
      ) : (
        <span className={`flex-1 ${cfg.color}`}>{text}</span>
      )}
    </div>
  );
}
