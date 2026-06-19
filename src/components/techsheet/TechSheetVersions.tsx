import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitBranch, CheckCircle2, Clock4, Archive, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTechSheetStore, type TechSheetVersion } from "@/lib/techsheet/store";
import { VersionDiff } from "@/components/techsheet/VersionDiff";

const statusIcon = (s: TechSheetVersion["status"]) =>
  s === "Aprovada" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> :
  s === "Em revisão" ? <Clock4 className="w-3.5 h-3.5 text-amber-400" /> :
  s === "Obsoleta" ? <Archive className="w-3.5 h-3.5 text-muted-foreground" /> :
  <GitBranch className="w-3.5 h-3.5 text-primary" />;

export function TechSheetVersions({ refAtual }: { refAtual: string }) {
  const ensure = useTechSheetStore((s) => s.ensure);
  const data = useTechSheetStore((s) => s.data[refAtual] ?? ensure(refAtual));
  const create = useTechSheetStore((s) => s.createVersion);
  const [compareA, setCompareA] = useState<string | null>(data.versoes[0]?.id ?? null);
  const [compareB, setCompareB] = useState<string | null>(data.versoes[1]?.id ?? null);
  const [resumo, setResumo] = useState("");
  const [alteracoes, setAlteracoes] = useState("");

  const va = data.versoes.find((v) => v.id === compareA);
  const vb = data.versoes.find((v) => v.id === compareB);

  return (
    <Card className="glass-card rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
          <GitBranch className="w-4 h-4 text-primary" /> Versionamento · {data.versoes.length} revisões
        </h3>
        <span className="px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold uppercase">
          Ativa: {data.versoes.find((v) => v.status === "Aprovada")?.versao ?? "—"}
        </span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Histórico</p>
          <div className="rounded-lg border border-white/5 overflow-hidden divide-y divide-white/5">
            {data.versoes.map((v) => (
              <button
                key={v.id}
                onClick={() => { if (compareA === v.id) setCompareB(v.id); else { setCompareB(compareA); setCompareA(v.id); } }}
                className={`w-full text-left p-3 flex items-center gap-3 hover:bg-white/5 transition ${compareA === v.id ? "bg-primary/10" : compareB === v.id ? "bg-white/5" : "bg-white/[0.02]"}`}
              >
                {statusIcon(v.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-white">{v.versao} <span className="text-muted-foreground font-normal">· {v.data} · {v.autor}</span></p>
                  <p className="text-[10px] text-muted-foreground truncate">{v.resumo}</p>
                </div>
                <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">{v.status}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Diff visual A → B</p>
          <VersionDiff a={va} b={vb} />
          <div className="grid grid-cols-2 gap-3">
            <DiffSide v={va} side="A" />
            <DiffSide v={vb} side="B" />
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 pt-5 space-y-3">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Criar nova versão</p>
        <Input value={resumo} onChange={(e) => setResumo(e.target.value)} placeholder="Resumo da alteração" className="bg-white/5 border-white/10 text-[11px]" />
        <Input value={alteracoes} onChange={(e) => setAlteracoes(e.target.value)} placeholder="Alterações (separe por ; )" className="bg-white/5 border-white/10 text-[11px]" />
        <Button
          size="sm" className="btn-primary-premium gap-2"
          onClick={() => {
            if (!resumo.trim()) return toast.error("Informe o resumo");
            const v = create(refAtual, "Você", resumo.trim(), alteracoes.split(";").map((x) => x.trim()).filter(Boolean));
            toast.success(`Versão ${v.versao} criada · em revisão`);
            setResumo(""); setAlteracoes("");
          }}
        ><Plus className="w-3.5 h-3.5" /> Gerar revisão</Button>
      </div>
    </Card>
  );
}

function DiffSide({ v, side }: { v?: TechSheetVersion; side: string }) {
  if (!v) return <div className="rounded-md border border-dashed border-white/10 p-3 text-[10px] text-muted-foreground">Selecione {side}</div>;
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{side} · {v.versao}</p>
      <p className="text-[10px] text-muted-foreground">{v.data} · {v.autor}</p>
      <ul className="text-[10px] text-white space-y-1">
        {v.alteracoes.map((a, i) => (<li key={i} className="flex gap-2"><span className="text-primary">›</span>{a}</li>))}
      </ul>
    </div>
  );
}
