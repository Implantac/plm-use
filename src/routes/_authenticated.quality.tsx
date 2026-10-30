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
  ShieldCheck,
  Microscope,
} from "lucide-react";
import { statusToast } from "@/components/ui/status-presets";
import { FieldMessage } from "@/components/ui/field-message";
import { usePCPStore } from "@/lib/pcp/store";
import { defeitosDosLotes, rankingPorChave } from "@/lib/quality/store";
import { computeAqlInspectionPlan } from "@/lib/quality/aql";
import { useTechSheetStore } from "@/lib/techsheet/store";
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
  Aberta: "bg-status-review/15 text-status-review border-status-review/30",
  Investigação: "bg-status-review/15 text-status-review border-status-review/30",
  Ação: "bg-status-progress/15 text-status-progress border-status-progress/30",
  Verificação: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  Concluída: "bg-status-approved/15 text-status-approved border-status-approved/30",
  Reprovada: "bg-status-rejected/15 text-status-rejected border-status-rejected/30",
};

const SEV_STYLES: Record<CapaSeveridade, string> = {
  Baixa: "bg-muted/50 text-white/70 border-border",
  Média: "bg-status-review/10 text-status-review border-status-review/25",
  Alta: "bg-status-progress/10 text-status-progress border-status-progress/25",
  Crítica: "bg-status-rejected/15 text-status-rejected border-status-rejected/40",
};

function QualityPage() {
  const lotes = usePCPStore((s) => s.lotes);
  const { items: capa, create } = useCapa();

  const defeitos = useMemo(() => defeitosDosLotes(lotes), [lotes]);
  const totalDefeitos = defeitos.reduce((a, d) => a + d.qtd, 0);
  const rankSetor = useMemo(() => rankingPorChave(defeitos, "setor"), [defeitos]);
  const rankMotivo = useMemo(() => rankingPorChave(defeitos, "motivo"), [defeitos]);

  const abertas = capa.filter((c) => c.status !== "Concluída" && c.status !== "Reprovada");
  const atrasadas = capa.filter(isOverdue);
  const criticas = capa.filter((c) => c.severidade === "Crítica" && c.status !== "Concluída");

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
  const [capaErrors, setCapaErrors] = useState<{
    defeito?: string;
    responsavel?: string;
    form?: string;
  }>({});

  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<CapaStatus | "Todas">("Todas");
  const [selected, setSelected] = useState<Capa | null>(null);

  // Inspeção Amostral AQL 2.5 / 4.0 (NBR 5426 / ISO 2859-1 Nível II)
  const sheetsMap = useTechSheetStore((s) => s.data);
  const [aqlRef, setAqlRef] = useState("DEV000006");
  const [aqlLoteCode, setAqlLoteCode] = useState("OP-2026-084");
  const [aqlFaccao, setAqlFaccao] = useState("Facção Vale Têxtil");
  const [aqlLotSize, setAqlLotSize] = useState<number>(
    () => sheetsMap["DEV000006"]?.preCost?.tiragemPlanejada ?? 600,
  );
  const [aqlCriticos, setAqlCriticos] = useState(0);
  const [aqlMaiores, setAqlMaiores] = useState(2);
  const [aqlMenores, setAqlMenores] = useState(3);

  const aqlPlan = useMemo(
    () =>
      computeAqlInspectionPlan(aqlLotSize, {
        criticos: aqlCriticos,
        maiores: aqlMaiores,
        menores: aqlMenores,
      }),
    [aqlLotSize, aqlCriticos, aqlMaiores, aqlMenores],
  );

  async function gerarCapaDoLaudoAql() {
    const severidade: CapaSeveridade =
      aqlPlan.found.criticos > 0 ? "Crítica" : aqlPlan.aprovado ? "Média" : "Alta";
    const motivoTexto =
      aqlPlan.motivosReprovacao.join(" · ") ||
      `Observação amostral AQL (${aqlPlan.found.maiores} maiores, ${aqlPlan.found.menores} menores)`;
    const nova = await create({
      defeito: `[Laudo AQL ${aqlPlan.codeLetter} · n=${aqlPlan.sampleSize}] ${motivoTexto}`,
      setor: "Costura",
      tipo: "Corretiva",
      severidade,
      responsavel: "Inspetor Qualidade AQL",
      ref: aqlRef,
      lote: aqlLoteCode,
      fornecedor: aqlFaccao,
      prazo: new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10),
    });
    if (nova) {
      statusToast.success(
        `CAPA de quarentena aberta para ${aqlRef} (${aqlLoteCode}) — ${aqlFaccao}`,
      );
      setSelected(nova);
    }
  }

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
  const currentSelected = selected ? (capa.find((c) => c.id === selected.id) ?? null) : null;

  async function submit() {
    const errs: typeof capaErrors = {};
    if (!form.defeito) errs.defeito = "Descreva o defeito.";
    if (!form.responsavel) errs.responsavel = "Informe o responsável.";
    if (Object.keys(errs).length > 0) {
      setCapaErrors(errs);
      return;
    }
    setCapaErrors({});
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
      setCapaErrors({ form: "Falha ao criar CAPA. Tente novamente." });
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
      {/* Inspeção de Recebimento de Lote / Facção — NBR 5426 / ISO 2859-1 (AQL 2,5 / 4,0) */}
      <Card className="glass-card rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-foreground flex items-center gap-2">
              <Microscope className="w-4 h-4 text-[#2A6F7D] dark:text-[#6AD8FA]" />
              Laudo de Inspeção de Recebimento de Facção · NBR 5426 / ISO 2859-1 (Nível Geral II)
            </h3>
            <p className="text-2xs text-muted-foreground mt-0.5">
              Cálculo automático de amostragem oficial (Letra-Código, n amostral e limites Ac/Re
              para AQL 0 Crítico · AQL 2,5 Maior · AQL 4,0 Menor).
            </p>
          </div>
          <div className="flex items-center gap-2">
            {aqlPlan.aprovado ? (
              <Badge className="gap-1.5 border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-xs">
                <ShieldCheck className="h-3.5 w-3.5" /> LOTE APROVADO (LIBERAR ALMOXARIFADO)
              </Badge>
            ) : (
              <Badge className="gap-1.5 border border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300 px-2.5 py-1 text-xs">
                <ShieldAlert className="h-3.5 w-3.5" /> LOTE REPROVADO (RETER EM QUARENTENA)
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 text-xs">
          <div className="space-y-1">
            <label
              htmlFor="aql-ref-input"
              className="text-2xs uppercase tracking-wider text-muted-foreground"
            >
              Referência
            </label>
            <Input
              id="aql-ref-input"
              value={aqlRef}
              onChange={(e) => setAqlRef(e.target.value.toUpperCase())}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="aql-op-input"
              className="text-2xs uppercase tracking-wider text-muted-foreground"
            >
              OP / Lote
            </label>
            <Input
              id="aql-op-input"
              value={aqlLoteCode}
              onChange={(e) => setAqlLoteCode(e.target.value)}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label
              htmlFor="aql-faccao-input"
              className="text-2xs uppercase tracking-wider text-muted-foreground"
            >
              Facção / Origem
            </label>
            <Input
              id="aql-faccao-input"
              value={aqlFaccao}
              onChange={(e) => setAqlFaccao(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="aql-lot-size-input"
              className="text-2xs uppercase tracking-wider text-muted-foreground"
            >
              Tam. Lote (pçs)
            </label>
            <Input
              id="aql-lot-size-input"
              type="number"
              min={2}
              value={aqlLotSize}
              onChange={(e) => setAqlLotSize(Math.max(2, Number(e.target.value) || 2))}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="rounded-md border border-[#2C6478]/40 bg-[#2C6478]/10 px-3 py-1.5 flex flex-col justify-center">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Letra {aqlPlan.codeLetter} · Amostra
            </span>
            <span className="font-mono text-sm font-bold text-[#1E5568] dark:text-[#7AD4F0]">
              n = {aqlPlan.sampleSize} pçs
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 items-stretch text-xs">
          <div className="rounded-md border border-border bg-muted/30 p-3 flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">Críticos (AQL 0)</p>
              <p className="text-2xs text-muted-foreground font-mono">
                Ac {aqlPlan.limits.critico.ac} · Re {aqlPlan.limits.critico.re} (agulha, risco)
              </p>
            </div>
            <Input
              aria-label="Defeitos críticos encontrados"
              type="number"
              min={0}
              value={aqlCriticos}
              onChange={(e) => setAqlCriticos(Math.max(0, Number(e.target.value) || 0))}
              className="h-8 w-20 font-mono text-right"
            />
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">Maiores (AQL 2,5)</p>
              <p className="text-2xs text-muted-foreground font-mono">
                Ac {aqlPlan.limits.maior25.ac} · Re {aqlPlan.limits.maior25.re} (costura aberta,
                mancha)
              </p>
            </div>
            <Input
              aria-label="Defeitos maiores encontrados"
              type="number"
              min={0}
              value={aqlMaiores}
              onChange={(e) => setAqlMaiores(Math.max(0, Number(e.target.value) || 0))}
              className="h-8 w-20 font-mono text-right"
            />
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">Menores (AQL 4,0)</p>
              <p className="text-2xs text-muted-foreground font-mono">
                Ac {aqlPlan.limits.menor40.ac} · Re {aqlPlan.limits.menor40.re} (ponta linha, leve
                tensão)
              </p>
            </div>
            <Input
              aria-label="Defeitos menores encontrados"
              type="number"
              min={0}
              value={aqlMenores}
              onChange={(e) => setAqlMenores(Math.max(0, Number(e.target.value) || 0))}
              className="h-8 w-20 font-mono text-right"
            />
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between text-2xs">
              <span className="text-muted-foreground">Taxa na amostra:</span>
              <span className="font-mono font-semibold text-foreground">
                {aqlPlan.taxaDefeitoAmostraPct.toFixed(1)}%
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant={aqlPlan.aprovado ? "outline" : "destructive"}
              onClick={gerarCapaDoLaudoAql}
              className="w-full h-8 text-xs gap-1.5"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {aqlPlan.aprovado ? "Registrar Observação CAPA" : "Gerar CAPA de Quarentena"}
            </Button>
          </div>
        </div>
      </Card>

      {/* CAPA board */}
      <Card className="glass-card rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-white flex items-center gap-3">
            <ClipboardList className="w-4 h-4 text-primary" /> CAPA · workflow
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar defeito, ref, lote..."
                className="pl-7 w-64 text-xs"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CapaStatus | "Todas")}
              className="h-8 bg-muted/50 border border-border rounded-md text-xs px-2"
            >
              <option value="Todas">Todos os status</option>
              {CAPA_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick add */}
        <div className="p-3 rounded-md bg-muted/40 border border-border/60 space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              value={form.defeito}
              onChange={(e) => {
                setForm({ ...form, defeito: e.target.value });
                if (e.target.value) setCapaErrors((p) => ({ ...p, defeito: undefined }));
              }}
              placeholder="Defeito / problema"
              className="flex-1 min-w-[220px] text-xs"
              aria-invalid={!!capaErrors.defeito}
            />
            <select
              value={form.setor}
              onChange={(e) => setForm({ ...form, setor: e.target.value })}
              className="h-9 bg-muted/50 border border-border rounded-md text-xs px-2"
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
              onChange={(e) => setForm({ ...form, tipo: e.target.value as CapaTipo })}
              className="h-9 bg-muted/50 border border-border rounded-md text-xs px-2"
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
              className="h-9 bg-muted/50 border border-border rounded-md text-xs px-2"
            >
              {CAPA_SEVERIDADES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <Input
              value={form.responsavel}
              onChange={(e) => {
                setForm({ ...form, responsavel: e.target.value });
                if (e.target.value) setCapaErrors((p) => ({ ...p, responsavel: undefined }));
              }}
              placeholder="Responsável"
              className="w-36 text-xs"
              aria-invalid={!!capaErrors.responsavel}
            />
            <Input
              type="date"
              value={form.prazo}
              onChange={(e) => setForm({ ...form, prazo: e.target.value })}
              className="w-36 text-xs"
            />
            <Button size="sm" className="gap-1" onClick={submit}>
              <Plus className="w-3.5 h-3.5" /> Abrir CAPA
            </Button>
          </div>
          {(capaErrors.defeito || capaErrors.responsavel || capaErrors.form) && (
            <FieldMessage variant="error">
              {capaErrors.form ?? capaErrors.defeito ?? capaErrors.responsavel}
            </FieldMessage>
          )}
        </div>

        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-border/60 bg-muted/50 text-2xs uppercase tracking-widest text-muted-foreground">
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
            <tbody className="divide-y divide-border/70 text-xs text-white">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma CAPA encontrada com esses filtros.
                  </td>
                </tr>
              )}
              {filtered.map((c) => {
                const overdue = isOverdue(c);
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-accent/60 cursor-pointer"
                    onClick={() => setSelected(c)}
                  >
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={`text-2xs ${STATUS_STYLES[c.status]}`}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={`text-2xs ${SEV_STYLES[c.severidade]}`}>
                        {c.severidade}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-primary/70 font-semibold uppercase text-2xs">
                      {c.tipo}
                    </td>
                    <td className="px-3 py-3 max-w-[280px] truncate">{c.defeito}</td>
                    <td className="px-3 py-3 text-primary/80 text-2xs">
                      {c.ref ?? "—"}
                      {c.lote && <span className="text-muted-foreground"> · {c.lote}</span>}
                    </td>
                    <td className="px-3 py-3">{c.setor}</td>
                    <td className="px-3 py-3 text-muted-foreground">{c.responsavel}</td>
                    <td
                      className={`px-3 py-3 ${
                        overdue ? "text-status-rejected font-bold" : "text-muted-foreground"
                      }`}
                    >
                      {c.prazo ?? "—"}
                      {overdue && <AlertTriangle className="w-3 h-3 inline ml-1" />}
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
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-white flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-status-progress" /> Defeitos registrados (PCP)
          </h3>
          <div className="rounded-lg border border-border/60 overflow-hidden max-h-[420px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="border-b border-border/60 bg-muted/50 text-2xs uppercase tracking-widest text-muted-foreground sticky top-0">
                <tr>
                  <th className="px-4 py-3">Quando</th>
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Setor</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3 text-right">Qtd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70 text-xs text-white">
                {defeitos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Sem defeitos registrados.
                    </td>
                  </tr>
                )}
                {defeitos.map((d, i) => (
                  <tr key={i} className="hover:bg-accent/50">
                    <td className="px-4 py-3 text-muted-foreground text-2xs">
                      {new Date(d.timestamp).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">{d.lote}</td>
                    <td className="px-4 py-3 text-primary">{d.ref}</td>
                    <td className="px-4 py-3">{d.setor}</td>
                    <td className="px-4 py-3">{d.motivo}</td>
                    <td className="px-4 py-3 text-right font-semibold text-status-rejected">
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
            <h4 className="text-2xs font-semibold uppercase tracking-[0.05em] text-white flex items-center gap-2 mb-4">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Ranking por setor
            </h4>
            <BarList rows={rankSetor} />
          </Card>
          <Card className="glass-card rounded-lg p-5">
            <h4 className="text-2xs font-semibold uppercase tracking-[0.05em] text-white flex items-center gap-2 mb-4">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Top motivos
            </h4>
            <BarList rows={rankMotivo} />
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <DefectHeatmap defeitos={defeitos} />
      </div>

      <CapaDrawer capa={currentSelected} open={!!selected} onClose={() => setSelected(null)} />
    </ModuleLayout>
  );
}

function BarList({ rows }: { rows: [string, number][] }) {
  const max = Math.max(...rows.map((r) => r[1]), 1);
  if (rows.length === 0) return <p className="text-2xs text-muted-foreground">Sem dados.</p>;
  return (
    <div className="space-y-2">
      {rows.slice(0, 6).map(([label, val]) => (
        <div key={label} className="space-y-1">
          <div className="flex justify-between text-2xs">
            <span className="text-white">{label}</span>
            <span className="text-primary font-bold">{val}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <div className="h-full bg-primary/70" style={{ width: `${(val / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
