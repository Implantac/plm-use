import { ArrowRight, Minus, Plus, Equal, Layers } from "lucide-react";
import type { TechSheetVersion } from "@/lib/techsheet/store";
import { diffSnapshots, type DiffRow, type FieldChange } from "@/lib/techsheet/diff";

/**
 * Diff visual entre duas versões da ficha técnica.
 * - Detecta alterações "X → Y" e renderiza antes/depois lado a lado.
 * - Itens só em A = removidos (vermelho), só em B = adicionados (verde),
 *   presentes em ambos = inalterados.
 */
export function VersionDiff({ a, b }: { a?: TechSheetVersion; b?: TechSheetVersion }) {
  if (!a || !b) {
    return (
      <div className="rounded-md border border-dashed border-white/10 p-4 text-[11px] text-muted-foreground">
        Selecione duas versões para comparar.
      </div>
    );
  }

  if (a.id === b.id) {
    return (
      <div className="rounded-md border border-dashed border-white/10 p-4 text-[11px] text-muted-foreground">
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
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
        <span className="text-status-rejected">A · {a.versao}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <span className="text-status-approved">B · {b.versao}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-[11px] uppercase tracking-widest">
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
          <p className="text-[11px] text-muted-foreground">Sem alterações registradas.</p>
        )}
      </div>

      <SnapshotSection a={a} b={b} />
    </div>
  );
}

const money = (n: number) =>
  `${n >= 0 ? "+" : "−"}R$ ${Math.abs(n).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function ChangeList({ changes }: { changes: FieldChange[] }) {
  return (
    <span className="text-muted-foreground">
      {changes.map((c) => (
        <span key={c.field} className="mr-3 whitespace-nowrap">
          {c.field}: <span className="line-through opacity-70">{c.from}</span>
          <ArrowRight className="inline w-2.5 h-2.5 mx-1" />
          <span className="text-white">{c.to}</span>
        </span>
      ))}
    </span>
  );
}

function StructRows({ title, rows }: { title: string; rows: DiffRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
        {title}
      </p>
      {rows.map((r, i) => (
        <p
          key={`${r.kind}-${i}`}
          className={`text-[11px] flex flex-wrap items-center gap-x-2 gap-y-0.5 ${
            r.kind === "add"
              ? "text-status-approved"
              : r.kind === "rem"
                ? "text-status-rejected"
                : "text-status-progress"
          }`}
        >
          <span className="font-bold">
            {r.kind === "add" ? "＋" : r.kind === "rem" ? "－" : "≠"}
          </span>
          {r.label}
          {r.changes.length > 0 && <ChangeList changes={r.changes} />}
        </p>
      ))}
    </div>
  );
}

/** Diff estrutural BOM/BOP/pré-custo quando as duas versões têm instantâneo. */
function SnapshotSection({ a, b }: { a: TechSheetVersion; b: TechSheetVersion }) {
  const d = diffSnapshots(a.snapshot, b.snapshot);
  if (!d) {
    const faltantes = [!a.snapshot && a.versao, !b.snapshot && b.versao]
      .filter(Boolean)
      .join(" e ");
    return (
      <div className="rounded-md border border-dashed border-white/10 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Sem instantâneo estrutural em <strong>{faltantes}</strong> — versões criadas antes de 15/10
        registram apenas o texto das alterações. Toda versão nova captura BOM/BOP/pré-custo ao
        nascer e ganha o comparativo numérico completo abaixo do texto.
      </div>
    );
  }
  return (
    <div className="space-y-3 border-t border-white/5 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
          <Layers className="w-3 h-3 text-primary" /> Diff estrutural (instantâneo)
        </p>
        <span className="text-[11px] text-muted-foreground">
          Δ custo industrial{" "}
          <strong
            className={d.custoIndustrialDelta > 0 ? "text-status-rejected" : "text-status-approved"}
          >
            {money(d.custoIndustrialDelta)}
          </strong>{" "}
          · Δ tempo{" "}
          <strong className="text-white">
            {d.tempoBopDelta >= 0 ? "+" : "−"}
            {Math.abs(d.tempoBopDelta)} min
          </strong>
        </span>
      </div>
      <StructRows
        title={`BOM · +${d.bom.added.length} −${d.bom.removed.length} ≠${d.bom.changed.length} · ${d.bom.kept} iguais`}
        rows={[...d.bom.added, ...d.bom.removed, ...d.bom.changed]}
      />
      <StructRows
        title={`BOP · +${d.bop.added.length} −${d.bop.removed.length} ≠${d.bop.changed.length} · ${d.bop.kept} iguais`}
        rows={[...d.bop.added, ...d.bop.removed, ...d.bop.changed]}
      />
      {d.preCost.length > 0 && (
        <StructRows
          title="Pré-custo"
          rows={[{ label: "parâmetros", kind: "chg", changes: d.preCost }]}
        />
      )}
      {d.bom.added.length +
        d.bom.removed.length +
        d.bom.changed.length +
        d.bop.added.length +
        d.bop.removed.length +
        d.bop.changed.length +
        d.preCost.length ===
        0 && (
        <p className="text-[11px] text-muted-foreground">
          Instantâneos idênticos — nada mudou na estrutura.
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "pos" | "neg" | "mut";
}) {
  const color =
    tone === "pos"
      ? "text-status-approved border-status-approved/30 bg-status-approved/5"
      : tone === "neg"
        ? "text-status-rejected border-status-rejected/30 bg-status-rejected/5"
        : "text-muted-foreground border-white/10 bg-white/[0.02]";
  return (
    <div className={`rounded-md border p-2 ${color}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] mt-0.5">{label}</p>
    </div>
  );
}

function DiffLine({ text, kind }: { text: string; kind: "add" | "rem" | "eq" }) {
  const cfg =
    kind === "add"
      ? {
          bg: "bg-status-approved/10 border-status-approved/30",
          icon: <Plus className="w-3 h-3 text-status-approved" />,
          color: "text-status-approved",
        }
      : kind === "rem"
        ? {
            bg: "bg-status-rejected/10 border-status-rejected/30",
            icon: <Minus className="w-3 h-3 text-status-rejected" />,
            color: "text-status-rejected line-through opacity-80",
          }
        : {
            bg: "bg-white/[0.02] border-white/5",
            icon: <Equal className="w-3 h-3 text-muted-foreground" />,
            color: "text-muted-foreground",
          };

  // Detecta "X → Y" ou "X -> Y"
  const m = text.match(/^(.*?)\s*(?:→|->)\s*(.*)$/);
  return (
    <div className={`rounded-md border p-2 flex items-start gap-2 text-[11px] ${cfg.bg}`}>
      <span className="mt-0.5">{cfg.icon}</span>
      {m ? (
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <span
            className={`px-1.5 py-0.5 rounded bg-status-rejected/15 text-status-rejected font-mono ${kind === "add" ? "opacity-60" : ""}`}
          >
            {m[1]}
          </span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <span
            className={`px-1.5 py-0.5 rounded bg-status-approved/15 text-status-approved font-mono ${kind === "rem" ? "opacity-60" : ""}`}
          >
            {m[2]}
          </span>
        </div>
      ) : (
        <span className={`flex-1 ${cfg.color}`}>{text}</span>
      )}
    </div>
  );
}
