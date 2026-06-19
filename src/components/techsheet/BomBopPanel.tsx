import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Workflow, Boxes, Clock, DollarSign } from "lucide-react";
import {
  useTechSheetStore,
  custoTotalBOM,
  tempoTotalBOP,
  custoTotalBOP,
  type BomItem,
  type BopStep,
} from "@/lib/techsheet/store";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export function BomBopPanel({ refAtual }: { refAtual: string }) {
  const ensure = useTechSheetStore((s) => s.ensure);
  const data = useTechSheetStore((s) => s.data[refAtual] ?? ensure(refAtual));
  const addBom = useTechSheetStore((s) => s.addBomItem);
  const rmBom = useTechSheetStore((s) => s.removeBomItem);
  const addBop = useTechSheetStore((s) => s.addBopStep);
  const rmBop = useTechSheetStore((s) => s.removeBopStep);

  const totals = useMemo(
    () => ({
      bom: custoTotalBOM(data.bom),
      bopTempo: tempoTotalBOP(data.bop),
      bopCusto: custoTotalBOP(data.bop),
    }),
    [data],
  );
  const custoIndustrial = totals.bom + totals.bopCusto;

  return (
    <Card className="glass-card rounded-lg p-6 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
          <Workflow className="w-4 h-4 text-primary" /> BOM + BOP · Engenharia da Referência {refAtual}
        </h3>
        <div className="flex gap-3 text-[10px] uppercase font-bold tracking-[0.18em]">
          <Stat icon={<Boxes className="w-3.5 h-3.5" />} label="BOM" value={brl(totals.bom)} />
          <Stat icon={<Clock className="w-3.5 h-3.5" />} label="Tempo total" value={`${totals.bopTempo} min`} />
          <Stat icon={<DollarSign className="w-3.5 h-3.5" />} label="Custo industrial" value={brl(custoIndustrial)} accent />
        </div>
      </div>

      <BomTable items={data.bom} onAdd={(i) => addBom(refAtual, i)} onRemove={(id) => rmBom(refAtual, id)} />
      <BopTable steps={data.bop} onAdd={(s) => addBop(refAtual, s)} onRemove={(id) => rmBop(refAtual, id)} />
    </Card>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md border ${accent ? "border-primary/30 bg-primary/10 text-primary" : "border-white/10 bg-white/5 text-white"}`}>
      {icon}
      <span className="text-muted-foreground text-[9px]">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function BomTable({
  items, onAdd, onRemove,
}: { items: BomItem[]; onAdd: (i: Omit<BomItem, "id">) => void; onRemove: (id: string) => void }) {
  const [form, setForm] = useState({ tipo: "Tecido", material: "", fornecedor: "", consumo: "", unidade: "m", custo: "" });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.22em] text-white flex items-center gap-2">
          <Boxes className="w-3.5 h-3.5 text-primary" /> Bill of Materials
        </h4>
      </div>
      <div className="rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b border-white/5 bg-white/5 text-[9px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Material</th>
              <th className="px-4 py-3">Fornecedor</th><th className="px-4 py-3">Consumo</th>
              <th className="px-4 py-3">Custo</th><th className="px-4 py-3 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-[11px] text-white">
            {items.map((i) => (
              <tr key={i.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-primary/70 font-bold uppercase text-[10px]">{i.tipo}</td>
                <td className="px-4 py-3">{i.material}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.fornecedor}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.consumo} {i.unidade}</td>
                <td className="px-4 py-3">{brl(i.custo)}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => onRemove(i.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  </Button>
                </td>
              </tr>
            ))}
            <tr className="bg-white/[0.015]">
              <td className="px-4 py-2">
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="h-9 bg-white/5 border border-white/10 rounded-md text-[11px] px-2 w-full"
                >
                  {["Tecido", "Aviamento", "Linha", "Embalagem", "Bordado", "Silk"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-2"><Input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} placeholder="Material" className="h-9 bg-white/5 border-white/10 text-[11px]" /></td>
              <td className="px-4 py-2"><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} placeholder="Fornecedor" className="h-9 bg-white/5 border-white/10 text-[11px]" /></td>
              <td className="px-4 py-2 flex gap-1">
                <Input value={form.consumo} onChange={(e) => setForm({ ...form, consumo: e.target.value })} placeholder="0" className="h-9 w-16 bg-white/5 border-white/10 text-[11px]" />
                <Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} placeholder="m" className="h-9 w-12 bg-white/5 border-white/10 text-[11px]" />
              </td>
              <td className="px-4 py-2"><Input value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} placeholder="0,00" className="h-9 bg-white/5 border-white/10 text-[11px]" /></td>
              <td className="px-4 py-2 text-right">
                <Button
                  size="sm"
                  className="h-9 btn-primary-premium gap-1"
                  onClick={() => {
                    if (!form.material) return;
                    onAdd({ tipo: form.tipo as BomItem["tipo"], material: form.material, fornecedor: form.fornecedor || "—", consumo: form.consumo || "0", unidade: form.unidade || "un", custo: Number(form.custo.replace(",", ".")) || 0 });
                    setForm({ ...form, material: "", fornecedor: "", consumo: "", custo: "" });
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BopTable({
  steps, onAdd, onRemove,
}: { steps: BopStep[]; onAdd: (s: Omit<BopStep, "id">) => void; onRemove: (id: string) => void }) {
  const [form, setForm] = useState({ etapa: "", setor: "Costura", tempo: "", custo: "" });
  const sorted = [...steps].sort((a, b) => a.seq - b.seq);
  const maxTempo = Math.max(...sorted.map((s) => s.tempoMin), 1);
  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.22em] text-white flex items-center gap-2">
        <Workflow className="w-3.5 h-3.5 text-primary" /> Bill of Process · sequência produtiva
      </h4>
      <div className="space-y-2">
        {sorted.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded-md bg-white/[0.02] border border-white/5 group">
            <span className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold flex items-center justify-center">{s.seq}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-white truncate">{s.etapa}</p>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{s.setor} · {s.responsavel ?? "—"}</p>
            </div>
            <div className="w-40 hidden md:block">
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-primary/70" style={{ width: `${(s.tempoMin / maxTempo) * 100}%` }} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-white">{s.tempoMin} min</p>
              <p className="text-[10px] text-primary">{brl(s.custo)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onRemove(s.id)} className="opacity-40 group-hover:opacity-100">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center p-3 rounded-md bg-white/[0.02] border border-white/5">
        <Input value={form.etapa} onChange={(e) => setForm({ ...form, etapa: e.target.value })} placeholder="Etapa" className="h-9 flex-1 min-w-[160px] bg-white/5 border-white/10 text-[11px]" />
        <select value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} className="h-9 bg-white/5 border border-white/10 rounded-md text-[11px] px-2">
          {["Compras", "CAD", "Corte", "Silk", "Bordado", "Costura", "Lavanderia", "Acabamento", "Expedição"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <Input value={form.tempo} onChange={(e) => setForm({ ...form, tempo: e.target.value })} placeholder="Min" className="h-9 w-20 bg-white/5 border-white/10 text-[11px]" />
        <Input value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} placeholder="Custo R$" className="h-9 w-24 bg-white/5 border-white/10 text-[11px]" />
        <Button
          size="sm" className="h-9 btn-primary-premium gap-1"
          onClick={() => {
            if (!form.etapa) return;
            onAdd({ seq: sorted.length + 1, etapa: form.etapa, setor: form.setor, tempoMin: Number(form.tempo) || 0, custo: Number(form.custo.replace(",", ".")) || 0 });
            setForm({ etapa: "", setor: form.setor, tempo: "", custo: "" });
          }}
        ><Plus className="w-3.5 h-3.5" /> Adicionar etapa</Button>
      </div>
    </div>
  );
}
