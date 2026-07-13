import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import {
  ShieldAlert,
  AlertTriangle,
  ClipboardList,
  Plus,
  Search,
} from "lucide-react";
import { statusToast } from "@/components/ui/status-presets";
import { usePCPStore } from "@/lib/pcp/store";
import {
  defeitosDosLotes,
  rankingPorChave,
} from "@/lib/quality/store";
import { DefectHeatmap } from "@/components/quality/DefectHeatmap";
import { CapaDrawer } from "@/components/quality/CapaDrawer";
import {
  CAPA_SEVERIDADES,
  CAPA_STATUSES,
  isOverdue,
  useCapa,
  type Capa,
  type CapaSeveridade,
  type CapaStatus,
  type CapaTipo,
} from "@/hooks/use-capa";

export const Route = createFileRoute("/_authenticated/quality")({
  component: QualityPage,
});

const STATUS_STYLES: Record<CapaStatus, string> = {
  Aberta: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  "Investigação": "bg-violet-500/15 text-violet-300 border-violet-400/30",
  "Ação": "bg-amber-500/15 text-amber-300 border-amber-400/30",
  "Verificação": "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  "Concluída": "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  Reprovada: "bg-rose-500/15 text-rose-300 border-rose-400/30",
};

const SEV_STYLES: Record<CapaSeveridade, string> = {
  Baixa: "bg-white/5 text-white/70 border-white/10",
  "Média": "bg-sky-500/10 text-sky-300 border-sky-400/25",
  Alta: "bg-amber-500/10 text-amber-300 border-amber-400/25",
  "Crítica": "bg-rose-500/15 text-rose-300 border-rose-400/40",
};

function QualityPage() {
  const lotes = usePCPStore((s) => s.lotes);
  const { items: capa, create } = useCapa();

  const defeitos = useMemo(() => defeitosDosLotes(lotes), [lotes]);
  const totalDefeitos = defeitos.reduce((a, d) => a + d.qtd, 0);
  const rankSetor = useMemo(() => rankingPorChave(defeitos, "setor"), [defeitos]);
  const rankMotivo = useMemo(
    () => rankingPorChave(defeitos, "motivo"),
    [defeitos],
  );

  const abertas = capa.filter(
    (c) => c.status !== "Concluída" && c.status !== "Reprovada",
  );
  const atrasadas = capa.filter(isOverdue);
  const criticas = capa.filter(
    (c) => c.severidade === "Crítica" && c.status !== "Concluída",
  );

  const [form, setForm] = useState<{
    defeito: string;
    setor: string;
    tipo: CapaTipo;
    severidade: CapaSeveridade;
    responsavel: string;
    prazo: string;
  }>({
    defeito: "",
    setor: "Costura",
    tipo: "Corretiva",
    severidade: "Média",
    responsavel: "",
    prazo: "",
  });

  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<CapaStatus | "Todas">(
    "Todas",
  );
  const [selected, setSelected] = useState<Capa | null>(null);

  const filtered = capa.filter((c) => {
    if (statusFilter !== "Todas" && c.status !== statusFilter) return false;
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      c.defeito.toLowerCase().includes(q) ||
      c.setor.toLowerCase().includes(q) ||
      (c.ref ?? "").toLowerCase().includes(q) ||
      (c.lote ?? "").toLowerCase().includes(q) ||
      c.responsavel.toLowerCase().includes(q)
    );
  });

  // Keep drawer synced with realtime updates
  const currentSelected = selected
    ? capa.find((c) => c.id === selected.id) ?? null
    : null;

  async function submit() {
    if (!form.defeito || !form.responsavel)
      return statusToast.error("Preencha defeito e responsável");
    const c = await create({
      defeito: form.defeito,
      setor: form.setor,
      tipo: form.tipo,
      severidade: form.severidade,
      responsavel: form.responsavel,
      prazo: form.prazo || null,
    });
    if (c) {
      statusToast.success("CAPA aberta");
      setForm({ ...form, defeito: "", responsavel: "", prazo: "" });
      setSelected(c);
    } else {
      statusToast.error("Falha ao criar CAPA");
    }
  }

  return (
    <ModuleLayout
      title="Qualidade & CAPA"
      subtitle="Workflow real: Investigação · Ação · Verificação · Eficácia. Timeline imutável, causa-raiz e 5 Porquês por ocorrência."
      version="Quality v2.0"
      metrics={[
        {
          label: "CAPAs abertas",
          value: String(abertas.length),
          detail: `${capa.length} totais`,
        },
        {
          label: "Atrasadas",
          value: String(atrasadas.length),
          detail: atrasadas.length ? "ação imediata" : "sem atrasos",
        },
        {
          label: "Críticas",
          value: String(criticas.length),
          detail: "severidade máxima",
        },
        {
          label: "Defeitos (pç)",
          value: String(totalDefeitos),
          detail: `${defeitos.length} ocorrências`,
        },
      ]}
    >
      {/* CAPA board */}
      <Card className="glass-card rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
            <ClipboardList className="w-4 h-4 text-primary" /> CAPA · workflow
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar defeito, ref, lote..."
                className="h-8 pl-7 w-64 bg-white/5 border-white/10 text-[11px]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as CapaStatus | "Todas")
              }
              className="h-8 bg-white/5 border border-white/10 rounded-md text-[11px] px-2"
            >
              <option value="Todas">Todos os status</option>
              {CAPA_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick add */}
        <div className="flex flex-wrap gap-2 items-center p-3 rounded-md bg-white/[0.02] border border-white/5">
          <Input
            value={form.defeito}
            onChange={(e) => setForm({ ...form, defeito: e.target.value })}
            placeholder="Defeito / problema"
            className="h-9 flex-1 min-w-[220px] bg-white/5 border-white/10 text-[11px]"
          />
          <select
            value={form.setor}
            onChange={(e) => setForm({ ...form, setor: e.target.value })}
            className="h-9 bg-white/5 border border-white/10 rounded-md text-[11px] px-2"
          >
            {[
              "Corte",
              "Silk",
              "Bordado",
              "Costura",
              "Lavanderia",
              "Acabamento",
              "Expedição",
              "Fornecedor",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={form.tipo}
            onChange={(e) =>
              setForm({ ...form, tipo: e.target.value as CapaTipo })
            }
            className="h-9 bg-white/5 border border-white/10 rounded-md text-[11px] px-2"
          >
            <option>Corretiva</option>
            <option>Preventiva</option>
          </select>
          <select
            value={form.severidade}
            onChange={(e) =>
              setForm({
                ...form,
                severidade: e.target.value as CapaSeveridade,
              })
            }
            className="h-9 bg-white/5 border border-white/10 rounded-md text-[11px] px-2"
          >
            {CAPA_SEVERIDADES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <Input
            value={form.responsavel}
            onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
            placeholder="Responsável"
            className="h-9 w-36 bg-white/5 border-white/10 text-[11px]"
          />
          <Input
            type="date"
            value={form.prazo}
            onChange={(e) => setForm({ ...form, prazo: e.target.value })}
            className="h-9 w-36 bg-white/5 border-white/10 text-[11px]"
          />
          <Button size="sm" className="h-9 btn-primary-premium gap-1" onClick={submit}>
            <Plus className="w-3.5 h-3.5" /> Abrir CAPA
          </Button>
        </div>

        <div className="rounded-lg border border-white/5 overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-white/5 bg-white/5 text-[9px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Sev</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">Defeito</th>
                <th className="px-3 py-3">Ref/Lote</th>
                <th className="px-3 py-3">Setor</th>
                <th className="px-3 py-3">Responsável</th>
                <th className="px-3 py-3">Prazo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px] text-white">
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Nenhuma CAPA encontrada com esses filtros.
                  </td>
                </tr>
              )}
              {filtered.map((c) => {
                const overdue = isOverdue(c);
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-white/[0.03] cursor-pointer"
                    onClick={() => setSelected(c)}
                  >
                    <td className="px-3 py-3">
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${STATUS_STYLES[c.status]}`}
                      >
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${SEV_STYLES[c.severidade]}`}
                      >
                        {c.severidade}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-primary/70 font-bold uppercase text-[10px]">
                      {c.tipo}
                    </td>
                    <td className="px-3 py-3 max-w-[280px] truncate">
                      {c.defeito}
                    </td>
                    <td className="px-3 py-3 text-primary/80 text-[10px]">
                      {c.ref ?? "—"}
                      {c.lote && (
                        <span className="text-muted-foreground"> · {c.lote}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">{c.setor}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {c.responsavel}
                    </td>
                    <td
                      className={`px-3 py-3 ${
                        overdue ? "text-rose-400 font-bold" : "text-muted-foreground"
                      }`}
                    >
                      {c.prazo ?? "—"}
                      {overdue && (
                        <AlertTriangle className="w-3 h-3 inline ml-1" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Defeitos derivados do PCP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="lg:col-span-2 glass-card rounded-lg p-6 space-y-4">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Defeitos
            registrados (PCP)
          </h3>
          <div className="rounded-lg border border-white/5 overflow-hidden max-h-[420px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="border-b border-white/5 bg-white/5 text-[9px] uppercase tracking-widest text-muted-foreground sticky top-0">
                <tr>
                  <th className="px-4 py-3">Quando</th>
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Setor</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3 text-right">Qtd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[11px] text-white">
                {defeitos.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Sem defeitos registrados.
                    </td>
                  </tr>
                )}
                {defeitos.map((d, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-muted-foreground text-[10px]">
                      {new Date(d.timestamp).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">{d.lote}</td>
                    <td className="px-4 py-3 text-primary">{d.ref}</td>
                    <td className="px-4 py-3">{d.setor}</td>
                    <td className="px-4 py-3">{d.motivo}</td>
                    <td className="px-4 py-3 text-right font-bold text-rose-400">
                      {d.qtd}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="glass-card rounded-lg p-5">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.22em] text-white flex items-center gap-2 mb-4">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Ranking por
              setor
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

      <div className="mt-6">
        <DefectHeatmap defeitos={defeitos} />
      </div>

      <CapaDrawer
        capa={currentSelected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </ModuleLayout>
  );
}

function BarList({ rows }: { rows: [string, number][] }) {
  const max = Math.max(...rows.map((r) => r[1]), 1);
  if (rows.length === 0)
    return <p className="text-[10px] text-muted-foreground">Sem dados.</p>;
  return (
    <div className="space-y-2">
      {rows.slice(0, 6).map(([label, val]) => (
        <div key={label} className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-white">{label}</span>
            <span className="text-primary font-bold">{val}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-primary/70"
              style={{ width: `${(val / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
