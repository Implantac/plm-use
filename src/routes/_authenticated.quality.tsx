import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { ShieldAlert, AlertTriangle, CheckCircle2, ClipboardList, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePCPStore } from "@/lib/pcp/store";
import { useQualityStore, defeitosDosLotes, rankingPorChave, type CapaAction } from "@/lib/quality/store";

export const Route = createFileRoute("/_authenticated/quality")({
  component: QualityPage,
});

function QualityPage() {
  const lotes = usePCPStore((s) => s.lotes);
  const capa = useQualityStore((s) => s.capa);
  const addCapa = useQualityStore((s) => s.addCapa);
  const updateStatus = useQualityStore((s) => s.updateStatus);
  const removeCapa = useQualityStore((s) => s.remove);

  const defeitos = useMemo(() => defeitosDosLotes(lotes), [lotes]);
  const totalDefeitos = defeitos.reduce((a, d) => a + d.qtd, 0);
  const rankSetor = useMemo(() => rankingPorChave(defeitos, "setor"), [defeitos]);
  const rankMotivo = useMemo(() => rankingPorChave(defeitos, "motivo"), [defeitos]);

  const [form, setForm] = useState({ defeito: "", setor: "Costura", responsavel: "", tipo: "Corretiva" as CapaAction["tipo"], prazo: "" });

  return (
    <ModuleLayout
      title="Qualidade & CAPA"
      subtitle="Defeitos derivados do PCP, ações corretivas/preventivas, ranking por setor, motivo e fornecedor."
      version="Quality v1.0"
      metrics={[
        { label: "Defeitos (total peças)", value: String(totalDefeitos), detail: `${defeitos.length} ocorrências` },
        { label: "CAPAs abertas", value: String(capa.filter((c) => c.status !== "Concluída").length), detail: `${capa.length} totais` },
        { label: "Setor crítico", value: rankSetor[0]?.[0] ?? "—", detail: rankSetor[0] ? `${rankSetor[0][1]} pç` : "" },
        { label: "Motivo recorrente", value: rankMotivo[0]?.[0]?.split(" ").slice(0, 2).join(" ") ?? "—", detail: rankMotivo[0] ? `${rankMotivo[0][1]} pç` : "" },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass-card rounded-lg p-6 space-y-4">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Defeitos registrados
          </h3>
          <div className="rounded-lg border border-white/5 overflow-hidden">
            <table className="w-full text-left">
              <thead className="border-b border-white/5 bg-white/5 text-[9px] uppercase tracking-widest text-muted-foreground">
                <tr><th className="px-4 py-3">Quando</th><th className="px-4 py-3">Lote</th><th className="px-4 py-3">Ref</th><th className="px-4 py-3">Setor</th><th className="px-4 py-3">Motivo</th><th className="px-4 py-3 text-right">Qtd</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[11px] text-white">
                {defeitos.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Sem defeitos registrados.</td></tr>
                )}
                {defeitos.map((d, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-muted-foreground text-[10px]">{new Date(d.timestamp).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3">{d.lote}</td>
                    <td className="px-4 py-3 text-primary">{d.ref}</td>
                    <td className="px-4 py-3">{d.setor}</td>
                    <td className="px-4 py-3">{d.motivo}</td>
                    <td className="px-4 py-3 text-right font-bold text-rose-400">{d.qtd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="glass-card rounded-lg p-5">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.22em] text-white flex items-center gap-2 mb-4">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Ranking por setor
            </h4>
            <BarList rows={rankSetor} />
          </Card>
          <Card className="glass-card rounded-lg p-5">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.22em] text-white flex items-center gap-2 mb-4">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Top motivos
            </h4>
            <BarList rows={rankMotivo} />
          </Card>
        </div>
      </div>

      <Card className="glass-card rounded-lg p-6 mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
            <ClipboardList className="w-4 h-4 text-primary" /> CAPA · ações corretivas e preventivas
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 items-center p-3 rounded-md bg-white/[0.02] border border-white/5">
          <Input value={form.defeito} onChange={(e) => setForm({ ...form, defeito: e.target.value })} placeholder="Defeito / problema" className="h-9 flex-1 min-w-[200px] bg-white/5 border-white/10 text-[11px]" />
          <select value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} className="h-9 bg-white/5 border border-white/10 rounded-md text-[11px] px-2">
            {["Corte", "Silk", "Bordado", "Costura", "Lavanderia", "Acabamento", "Expedição", "Fornecedor"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as CapaAction["tipo"] })} className="h-9 bg-white/5 border border-white/10 rounded-md text-[11px] px-2">
            <option>Corretiva</option><option>Preventiva</option>
          </select>
          <Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} placeholder="Responsável" className="h-9 w-36 bg-white/5 border-white/10 text-[11px]" />
          <Input type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} className="h-9 w-36 bg-white/5 border-white/10 text-[11px]" />
          <Button
            size="sm" className="h-9 btn-primary-premium gap-1"
            onClick={() => {
              if (!form.defeito || !form.responsavel || !form.prazo) return toast.error("Preencha defeito, responsável e prazo");
              addCapa({ defeito: form.defeito, setor: form.setor, responsavel: form.responsavel, tipo: form.tipo, prazo: form.prazo });
              toast.success("CAPA registrada");
              setForm({ ...form, defeito: "", responsavel: "", prazo: "" });
            }}
          ><Plus className="w-3.5 h-3.5" /> Abrir CAPA</Button>
        </div>
        <div className="rounded-lg border border-white/5 overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-white/5 bg-white/5 text-[9px] uppercase tracking-widest text-muted-foreground">
              <tr><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Defeito</th><th className="px-4 py-3">Setor</th><th className="px-4 py-3">Responsável</th><th className="px-4 py-3">Prazo</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right" /></tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px] text-white">
              {capa.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-primary/70 font-bold uppercase text-[10px]">{c.tipo}</td>
                  <td className="px-4 py-3">{c.defeito}{c.ref && <span className="text-muted-foreground"> · {c.ref}</span>}</td>
                  <td className="px-4 py-3">{c.setor}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.responsavel}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.prazo}</td>
                  <td className="px-4 py-3">
                    <select value={c.status} onChange={(e) => updateStatus(c.id, e.target.value as CapaAction["status"])} className="h-7 bg-white/5 border border-white/10 rounded-md text-[10px] px-2">
                      <option>Aberta</option><option>Em andamento</option><option>Concluída</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.status === "Concluída" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" /> : null}
                    <Button variant="ghost" size="icon" onClick={() => removeCapa(c.id)}><Trash2 className="w-3.5 h-3.5 text-rose-400" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </ModuleLayout>
  );
}

function BarList({ rows }: { rows: [string, number][] }) {
  const max = Math.max(...rows.map((r) => r[1]), 1);
  if (rows.length === 0) return <p className="text-[10px] text-muted-foreground">Sem dados.</p>;
  return (
    <div className="space-y-2">
      {rows.slice(0, 6).map(([label, val]) => (
        <div key={label} className="space-y-1">
          <div className="flex justify-between text-[10px]"><span className="text-white">{label}</span><span className="text-primary font-bold">{val}</span></div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-primary/70" style={{ width: `${(val / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
