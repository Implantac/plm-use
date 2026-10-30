// Hub persistente de CAD, Risco & Modelagem — conectado diretamente à Ficha Técnica Fluida:
// calcula consumo linear (m/peça) e ponderal (kg/peça) a partir do estudo de encaixe
// e sincroniza tanto os metadados CAD quanto o consumo do tecido principal no BOM.
import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ExternalLink, Link2, PenTool, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { useCadStore, type CadFormat, type CadMarkerItem, type CadStatus } from "@/lib/cad/store";
import { useTechSheetStore } from "@/lib/techsheet/store";
import { converterMetroParaKg, round4 } from "@/lib/techsheet/textile";

export const Route = createFileRoute("/_authenticated/cad")({
  component: CadPage,
});

const integrations = [
  { name: "Audaces Vestuário / Moldes", mode: ".ADS · Risco & Encaixe", status: "Homologado" },
  { name: "Lectra Modaris / Diamino", mode: ".DXF / .MDL · Encaixe", status: "Homologado" },
  { name: "Gerber AccuMark", mode: ".DXF / .PLT · Plotter", status: "Homologado" },
  { name: "CLO3D / Browzwear", mode: "Prova 3D & Gêmeo Têxtil", status: "Conectado" },
];

function calcMarkerConsumption(m: CadMarkerItem): { mPorPeca: number; kgPorPeca: number | null } {
  const pecas = Math.max(1, Number(m.pecasNoRisco) || 5);
  const mPorPeca = round4((Number(m.comprimentoRiscoM) || 0) / pecas);
  const gram = Number(m.gramaturaGm2) || 0;
  const larg = Number(m.larguraEnfestoM) || 0;
  const kgPorPeca =
    gram > 0 && larg > 0 ? round4(converterMetroParaKg(mPorPeca, larg, gram)) : null;
  return { mPorPeca, kgPorPeca };
}

function CadPage() {
  const navigate = useNavigate();
  const markers = useCadStore((s) => s.markers);
  const addMarker = useCadStore((s) => s.addMarker);
  const removeMarker = useCadStore((s) => s.removeMarker);

  const ensureSheet = useTechSheetStore((s) => s.ensure);
  const setEncaixeCad = useTechSheetStore((s) => s.setEncaixeCad);
  const updateBomItem = useTechSheetStore((s) => s.updateBomItem);
  const updateMeta = useTechSheetStore((s) => s.updateMeta);

  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [syncConsumptionOnSave, setSyncConsumptionOnSave] = useState(true);
  const [form, setForm] = useState({
    refCode: "DEV000006",
    fileName: "",
    format: "ADS" as CadFormat,
    sistemaCad: "Audaces" as CadMarkerItem["sistemaCad"],
    version: "v1.0",
    eficienciaPct: 88.3,
    larguraEnfestoM: 1.8,
    comprimentoRiscoM: 5.35,
    pecasNoRisco: 5,
    gramaturaGm2: 135,
    encolhimentoUrdumePct: 2.0,
    encolhimentoTramaPct: 1.5,
    status: "Revisão" as CadStatus,
    notes: "",
  });

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return markers;
    return markers.filter(
      (m) =>
        m.refCode.toLowerCase().includes(needle) ||
        m.fileName.toLowerCase().includes(needle) ||
        m.sistemaCad.toLowerCase().includes(needle),
    );
  }, [markers, q]);

  const avgEfficiency = useMemo(() => {
    if (!markers.length) return 0;
    return (
      Math.round((markers.reduce((acc, m) => acc + m.eficienciaPct, 0) / markers.length) * 10) / 10
    );
  }, [markers]);

  const syncToTechSheet = (m: CadMarkerItem, alsoUpdateBom: boolean) => {
    const code = m.refCode.trim().toUpperCase();
    const sheet = ensureSheet(code);
    setEncaixeCad(code, {
      eficienciaPct: m.eficienciaPct,
      larguraEnfestoM: m.larguraEnfestoM,
      comprimentoRiscoM: m.comprimentoRiscoM,
      encolhimentoUrdumePct: m.encolhimentoUrdumePct,
      encolhimentoTramaPct: m.encolhimentoTramaPct,
      arquivoMolde: m.fileName,
      sistemaCad: m.sistemaCad,
    });

    const { mPorPeca, kgPorPeca } = calcMarkerConsumption(m);
    let updatedFabricMsg = "";

    if (alsoUpdateBom) {
      const mainFabric = sheet.bom.find((b) => b.tipo === "Tecido");
      if (mainFabric) {
        const useKg = (mainFabric.unidade ?? "").toLowerCase() === "kg" && kgPorPeca != null;
        const newConsumo = useKg ? String(kgPorPeca) : String(mPorPeca);
        updateBomItem(code, mainFabric.id, {
          consumo: newConsumo,
          larguraM: m.larguraEnfestoM,
          gramaturaGm2: m.gramaturaGm2 || mainFabric.gramaturaGm2,
        });
        updatedFabricMsg = ` · Tecido atualizado p/ ${newConsumo} ${mainFabric.unidade || "m"}/pç`;
      }
      if ((sheet.meta?.stage ?? 3) < 5) {
        updateMeta(code, { stage: 5 });
      }
    }

    toast.success(`Encaixe CAD (${m.eficienciaPct}%) sincronizado em ${code}${updatedFabricMsg}!`);
  };

  const handleSave = () => {
    if (!form.refCode.trim() || !form.fileName.trim()) {
      toast.error("Informe o código da referência e o nome do arquivo de molde.");
      return;
    }
    const created = addMarker(form);
    syncToTechSheet(created, syncConsumptionOnSave);
    setDialogOpen(false);
    setForm((s) => ({ ...s, fileName: "", notes: "" }));
  };

  const previewCalc = calcMarkerConsumption({
    ...form,
    id: "preview",
    updatedAt: "",
  });

  return (
    <ModuleLayout
      title="CAD, Risco & Consumo Real de Corte"
      subtitle="Repositório persistente de moldes (.ADS, .DXF, .PLT), aproveitamento de risco e atualização direta do consumo m/kg na Ficha Técnica."
      version="CAD Hub v2.1"
      onAdd={() => setDialogOpen(true)}
      searchPlaceholder="Buscar por referência, arquivo .ADS/.DXF/.PLT ou sistema CAD"
      onSearch={setQ}
      metrics={[
        { label: "Moldes ativos", value: String(markers.length), detail: "persistidos" },
        { label: "Eficiência média", value: `${avgEfficiency}%`, detail: "aproveitamento" },
        { label: "Formatos", value: "ADS · DXF · PLT · AI", detail: "padrão confecção" },
        {
          label: "Aprovados",
          value: String(
            markers.filter((m) => m.status === "Aprovado" || m.status === "Produção").length,
          ),
          detail: "prontos p/ corte",
        },
      ]}
    >
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_330px] gap-6">
        <Card className="glass-card rounded-lg overflow-hidden">
          <CardHeader className="p-4 border-b border-border/60">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Scissors className="w-4 h-4 text-primary" /> Estudos de Risco, Encaixe &amp; Consumo
              por Peça
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-xs">
              <thead className="border-b border-border/60 bg-muted/50 text-2xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Referência</th>
                  <th className="px-4 py-3">Arquivo / Sistema</th>
                  <th className="px-4 py-3 text-right">Aproveit.</th>
                  <th className="px-4 py-3 text-right">Risco / Peças</th>
                  <th className="px-4 py-3 text-right">Consumo Real</th>
                  <th className="px-4 py-3 text-right">Encolhim.</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {visible.map((m) => {
                  const { mPorPeca, kgPorPeca } = calcMarkerConsumption(m);
                  return (
                    <tr key={m.id} className="hover:bg-accent/40">
                      <td className="px-4 py-3 font-mono font-bold text-primary">{m.refCode}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{m.fileName}</div>
                        <div className="text-2xs text-muted-foreground">
                          {m.sistemaCad} · {m.format} · {m.version} ·{" "}
                          <span className="text-status-approved font-semibold">{m.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-300">
                        {m.eficienciaPct}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {m.larguraEnfestoM}m × {m.comprimentoRiscoM}m
                        <div className="text-[10px]">{m.pecasNoRisco ?? 5} pçs no risco</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <div className="font-semibold text-foreground">{mPorPeca} m/pç</div>
                        {kgPorPeca != null && (
                          <div className="text-[10px] text-teal-600 dark:text-teal-300">
                            {kgPorPeca} kg/pç ({m.gramaturaGm2} g/m²)
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {m.encolhimentoUrdumePct}% × {m.encolhimentoTramaPct}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-2xs gap-1 border-teal-500/40 hover:border-teal-500"
                            title="Sincroniza eficiência CAD e atualiza o consumo do tecido principal no BOM da Ficha Técnica"
                            onClick={() => syncToTechSheet(m, true)}
                          >
                            <Link2 className="w-3 h-3 text-teal-500" /> Sync + BOM
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Abrir Ficha Técnica"
                            onClick={() =>
                              void navigate({ to: "/tech-sheet", search: { ref: m.refCode } })
                            }
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeMarker(m.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="glass-card rounded-lg">
            <CardHeader className="p-4 border-b border-border/60">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <PenTool className="w-4 h-4 text-primary" /> Ecossistema CAD Homologado
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {integrations.map((integration) => (
                <div
                  key={integration.name}
                  className="rounded-md border border-border bg-muted/40 p-3 flex items-start justify-between gap-2"
                >
                  <div>
                    <p className="text-xs font-semibold text-foreground">{integration.name}</p>
                    <p className="text-2xs text-muted-foreground mt-0.5">{integration.mode}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-status-approved shrink-0" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Molde / Estudo de Encaixe CAD</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Referência PLM</Label>
                <Input
                  value={form.refCode}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, refCode: e.target.value.toUpperCase() }))
                  }
                  placeholder="DEV000006"
                  className="font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">Sistema CAD</Label>
                <select
                  value={form.sistemaCad}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      sistemaCad: e.target.value as CadMarkerItem["sistemaCad"],
                    }))
                  }
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
                >
                  {["Audaces", "Lectra", "Gerber", "Optitex", "CLO3D", "Outro"].map((sys) => (
                    <option key={sys} value={sys}>
                      {sys}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Nome do Arquivo</Label>
                <Input
                  value={form.fileName}
                  onChange={(e) => setForm((s) => ({ ...s, fileName: e.target.value }))}
                  placeholder="DEV000006_DRY_PRO_v5.ADS"
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Formato</Label>
                <select
                  value={form.format}
                  onChange={(e) => setForm((s) => ({ ...s, format: e.target.value as CadFormat }))}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
                >
                  {["ADS", "DXF", "PLT", "AI", "CLO3D", "PDF", "SVG"].map((fmt) => (
                    <option key={fmt} value={fmt}>
                      {fmt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Eficiência Risco (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.eficienciaPct}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      eficienciaPct: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Largura Enfesto (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.larguraEnfestoM}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      larguraEnfestoM: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Compr. Risco (m)</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={form.comprimentoRiscoM}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      comprimentoRiscoM: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Peças Encaixadas no Risco</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.pecasNoRisco}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      pecasNoRisco: Math.max(1, Math.round(Number(e.target.value) || 1)),
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Gramatura Malha/Tecido (g/m²)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.gramaturaGm2}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      gramaturaGm2: Math.max(0, Number.parseFloat(e.target.value) || 0),
                    }))
                  }
                />
              </div>
            </div>

            <div className="rounded-md border border-teal-500/35 bg-teal-500/10 px-3 py-2 font-mono text-2xs flex items-center justify-between">
              <span>Consumo Apurado pelo Risco:</span>
              <strong>
                {previewCalc.mPorPeca} m/pç
                {previewCalc.kgPorPeca != null ? ` · ${previewCalc.kgPorPeca} kg/pç` : ""}
              </strong>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Encolhimento Urdume (%)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.encolhimentoUrdumePct}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      encolhimentoUrdumePct: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Encolhimento Trama (%)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.encolhimentoTramaPct}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      encolhimentoTramaPct: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-2xs text-muted-foreground">
              <input
                type="checkbox"
                checked={syncConsumptionOnSave}
                onChange={(e) => setSyncConsumptionOnSave(e.target.checked)}
              />
              <span>
                Atualizar automaticamente o consumo do Tecido Principal no BOM da Ficha Técnica
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar &amp; Sincronizar Ficha</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
