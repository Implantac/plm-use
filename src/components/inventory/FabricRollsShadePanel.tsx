import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Disc, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { evaluateRollShadeBatch, type FabricRollItem } from "@/lib/techsheet/cut-order";
import { useTechSheetStore } from "@/lib/techsheet/store";
import { useOperationalRefs, useSelectedRef } from "@/lib/techsheet/use-operational-refs";

const STORAGE_KEY = "use-moda:fabric-rolls-v1";

const SEED_ROLLS: FabricRollItem[] = [
  {
    id: "rl-1",
    rollCode: "RL-2601",
    material: "Malha Dry Fit UV50+ Microperfurada",
    partida: "PT-8841",
    nuance: "A1",
    deltaECmc: 0.32,
    larguraRealM: 1.8,
    gramaturaRealGm2: 135,
    pesoLiquidoKg: 26.4,
    metragemM: 108.6,
    status: "Liberado",
  },
  {
    id: "rl-2",
    rollCode: "RL-2602",
    material: "Malha Dry Fit UV50+ Microperfurada",
    partida: "PT-8841",
    nuance: "A1",
    deltaECmc: 0.45,
    larguraRealM: 1.81,
    gramaturaRealGm2: 136,
    pesoLiquidoKg: 25.8,
    metragemM: 104.8,
    status: "Liberado",
  },
  {
    id: "rl-3",
    rollCode: "RL-2603",
    material: "Malha Dry Fit UV50+ Microperfurada",
    partida: "PT-8910",
    nuance: "B2",
    deltaECmc: 1.28,
    larguraRealM: 1.78,
    gramaturaRealGm2: 134,
    pesoLiquidoKg: 24.1,
    metragemM: 101.0,
    status: "Liberado",
  },
  {
    id: "rl-4",
    rollCode: "RL-2604",
    material: "Piquet Algodão Pima 210g",
    partida: "PT-7720",
    nuance: "A1",
    deltaECmc: 0.29,
    larguraRealM: 1.84,
    gramaturaRealGm2: 210,
    pesoLiquidoKg: 28.5,
    metragemM: 73.7,
    status: "Reservado Corte",
  },
];

export function FabricRollsShadePanel() {
  const { sheetsMap, codes: refOptions } = useOperationalRefs();
  const updateBomItem = useTechSheetStore((s) => s.updateBomItem);

  const [rolls, setRolls] = useState<FabricRollItem[]>(SEED_ROLLS);
  const [selectedIds, setSelectedIds] = useState<string[]>(["rl-1", "rl-2"]);
  const [targetRef, setTargetRef] = useSelectedRef(refOptions);
  const [newRollCode, setNewRollCode] = useState("");
  const [newPartida, setNewPartida] = useState("PT-8841");
  const [newNuance, setNewNuance] = useState("A1");
  const [newKg, setNewKg] = useState(25);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FabricRollItem[];
        if (Array.isArray(parsed) && parsed.length > 0) setRolls(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rolls));
    } catch {
      // ignore
    }
  }, [rolls]);

  const selectedRolls = useMemo(
    () => rolls.filter((r) => selectedIds.includes(r.id)),
    [rolls, selectedIds],
  );
  const report = useMemo(() => evaluateRollShadeBatch(selectedRolls), [selectedRolls]);

  function toggleRoll(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function addNewRoll() {
    const code = newRollCode.trim().toUpperCase() || `RL-${Math.floor(2700 + Math.random() * 900)}`;
    const kg = Math.max(1, Number(newKg) || 25);
    const created: FabricRollItem = {
      id: `rl-${Date.now()}`,
      rollCode: code,
      material: "Malha Dry Fit UV50+ Microperfurada",
      partida: newPartida.trim().toUpperCase() || "PT-8841",
      nuance: newNuance.trim().toUpperCase() || "A1",
      deltaECmc: 0.38,
      larguraRealM: 1.8,
      gramaturaRealGm2: 135,
      pesoLiquidoKg: kg,
      metragemM: Number(((kg * 1000) / (1.8 * 135)).toFixed(1)),
      status: "Liberado",
    };
    setRolls((prev) => [created, ...prev]);
    setNewRollCode("");
    toast.success(`Rolo ${code} registrado na partida ${created.partida} (${created.nuance})!`);
  }

  function syncRollBalanceToBom() {
    // `ensure(targetRef)` fabricava a ficha de demonstração e gravava nela o
    // saldo REAL do rolo: dado verdadeiro sobre uma BOM inventada.
    const doc = targetRef ? sheetsMap[targetRef] : undefined;
    if (!doc) {
      toast.error("Sem ficha técnica salva: o saldo do rolo não tem BOM para vincular.");
      return;
    }
    const mainFabric = doc.bom.find((b) => b.tipo === "Tecido");
    if (!mainFabric) {
      toast.error(`Nenhum tecido encontrado na BOM de ${targetRef}.`);
      return;
    }
    const useMeters = (mainFabric.unidade ?? "").toLowerCase() === "m";
    const qty = useMeters ? report.totalMeters : report.totalKg;
    updateBomItem(targetRef, mainFabric.id, { estoqueDisponivel: qty });
    toast.success(
      `Saldo selecionado (${qty.toFixed(1)} ${useMeters ? "m" : "kg"}) vinculado ao tecido principal de ${targetRef}!`,
    );
  }

  return (
    <Card className="border-border bg-card mb-6">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Disc className="h-4 w-4 text-primary" />
              Rastreabilidade de Rolos Têxteis · Partida de Tingimento & Nuance (ΔE CMC)
            </h3>
            <p className="text-2xs text-muted-foreground mt-0.5">
              Selecione os rolos candidatos ao enfesto para validar homogeneidade de banho/nuance e
              evitar sombra entre partes costuradas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Selecionar Ficha Técnica destino do estoque"
              value={targetRef}
              onChange={(e) => setTargetRef(e.target.value)}
              className="h-8 rounded border border-border bg-background px-2.5 text-xs text-foreground"
            >
              {refOptions.length === 0 && <option value="">Sem ficha salva</option>}
              {refOptions.map((r) => (
                <option key={r} value={r}>
                  {r} — {sheetsMap[r]?.meta?.name ?? r}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={selectedRolls.length === 0}
              onClick={syncRollBalanceToBom}
              className="h-8 gap-1.5 text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Vincular Saldo à BOM ({report.totalKg.toFixed(1)} kg)
            </Button>
          </div>
        </div>

        {/* Laudo Espectrofotométrico de Homogeneidade do Enfesto */}
        <div
          className={`rounded-lg border p-3 flex flex-wrap items-center justify-between gap-2 text-xs ${
            report.homogeneo
              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          <span className="flex items-center gap-2 font-medium">
            {report.homogeneo ? (
              <ShieldCheck className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            {report.verdict}
          </span>
          <span className="font-mono text-2xs">
            {report.selectedCount} rolo(s) · {report.totalKg.toFixed(1)} kg ·{" "}
            {report.totalMeters.toFixed(1)} m
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-2xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-2.5 text-left w-10">Enf.</th>
                <th className="p-2.5 text-left">Rolo</th>
                <th className="p-2.5 text-left">Tecido / Malha</th>
                <th className="p-2.5 text-left">Partida</th>
                <th className="p-2.5 text-left">Nuance</th>
                <th className="p-2.5 text-right">ΔE CMC</th>
                <th className="p-2.5 text-right">Larg. / Gram.</th>
                <th className="p-2.5 text-right">Peso / Metros</th>
                <th className="p-2.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rolls.map((r) => {
                const checked = selectedIds.includes(r.id);
                return (
                  <tr
                    key={r.id}
                    onClick={() => toggleRoll(r.id)}
                    className={`cursor-pointer border-t border-border/60 ${
                      checked ? "bg-primary/10" : "hover:bg-muted/30"
                    }`}
                  >
                    <td className="p-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRoll(r.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Selecionar rolo ${r.rollCode}`}
                      />
                    </td>
                    <td className="p-2.5 font-mono font-semibold text-primary">{r.rollCode}</td>
                    <td className="p-2.5 text-foreground">{r.material}</td>
                    <td className="p-2.5 font-mono">{r.partida}</td>
                    <td className="p-2.5">
                      <Badge variant="outline" className="font-mono text-2xs">
                        {r.nuance}
                      </Badge>
                    </td>
                    <td
                      className={`p-2.5 text-right font-mono ${
                        r.deltaECmc > 0.85 ? "text-rose-500 font-bold" : "text-foreground"
                      }`}
                    >
                      {r.deltaECmc.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-muted-foreground">
                      {r.larguraRealM.toFixed(2)}m · {r.gramaturaRealGm2}g/m²
                    </td>
                    <td className="p-2.5 text-right font-mono font-semibold">
                      {r.pesoLiquidoKg.toFixed(1)} kg ({r.metragemM.toFixed(0)} m)
                    </td>
                    <td className="p-2.5">
                      <Badge variant="outline" className="text-2xs">
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Entrada rápida de novo rolo recebido */}
        <div className="flex flex-wrap items-end gap-2 pt-1">
          <div>
            <Label
              htmlFor="novo-rolo-codigo"
              className="text-2xs uppercase text-muted-foreground block mb-1"
            >
              Cód. Rolo
            </Label>
            <Input
              id="novo-rolo-codigo"
              value={newRollCode}
              onChange={(e) => setNewRollCode(e.target.value)}
              placeholder="RL-2605"
              className="h-8 w-28 font-mono text-xs"
            />
          </div>
          <div>
            <Label
              htmlFor="novo-rolo-partida"
              className="text-2xs uppercase text-muted-foreground block mb-1"
            >
              Partida
            </Label>
            <Input
              id="novo-rolo-partida"
              value={newPartida}
              onChange={(e) => setNewPartida(e.target.value)}
              className="h-8 w-28 font-mono text-xs"
            />
          </div>
          <div>
            <Label
              htmlFor="novo-rolo-nuance"
              className="text-2xs uppercase text-muted-foreground block mb-1"
            >
              Nuance
            </Label>
            <Input
              id="novo-rolo-nuance"
              value={newNuance}
              onChange={(e) => setNewNuance(e.target.value)}
              className="h-8 w-20 font-mono text-xs"
            />
          </div>
          <div>
            <Label
              htmlFor="novo-rolo-peso"
              className="text-2xs uppercase text-muted-foreground block mb-1"
            >
              Peso (kg)
            </Label>
            <Input
              id="novo-rolo-peso"
              type="number"
              min={1}
              step="0.5"
              value={newKg}
              onChange={(e) => setNewKg(Number(e.target.value) || 25)}
              className="h-8 w-24 font-mono text-xs"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addNewRoll}
            className="h-8 gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Receber Rolo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
