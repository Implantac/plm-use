// Biblioteca de Materiais — módulo 11 do creative-sync + Rastreabilidade "Onde Usado"
// (Where-Used PLM 2.0): identifica em tempo real quais Fichas Técnicas utilizam cada
// insumo, simula o impacto de variação de preço no Custo Industrial e Margem Líquida,
// e propaga o reajuste para todas as fichas vinculadas em 1 clique.

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRightLeft, ExternalLink, Layers, Library, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { ExportMenu } from "@/components/export/ExportMenu";
import {
  MATERIAL_TIPOS,
  filterMaterials,
  removeMaterial,
  upsertMaterial,
  useMaterials,
  validateMaterialDraft,
  type MaterialItem,
  type MaterialTipo,
} from "@/lib/materials/store";
import { useTechSheetStore } from "@/lib/techsheet/store";
import { findMaterialWhereUsed } from "@/lib/techsheet/mrp";

export const Route = createFileRoute("/_authenticated/materials")({
  component: MaterialsPage,
});

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

type Draft = {
  id: string | null;
  name: string;
  tipo: MaterialTipo;
  supplier: string;
  unit: string;
  unitCost: string;
  sku: string;
  notes: string;
};

const EMPTY: Draft = {
  id: null,
  name: "",
  tipo: "Tecido",
  supplier: "",
  unit: "m",
  unitCost: "",
  sku: "",
  notes: "",
};

function toDraft(m: MaterialItem): Draft {
  return {
    id: m.id,
    name: m.name,
    tipo: m.tipo,
    supplier: m.supplier,
    unit: m.unit,
    unitCost: String(m.unitCost).replace(".", ","),
    sku: m.sku,
    notes: m.notes,
  };
}

function MaterialsPage() {
  const materials = useMaterials();
  const techDocs = useTechSheetStore((s) => s.data);
  const ensureSheet = useTechSheetStore((s) => s.ensure);
  const updateBomItem = useTechSheetStore((s) => s.updateBomItem);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [impactMaterial, setImpactMaterial] = useState<MaterialItem | null>(null);

  const visible = useMemo(() => filterMaterials(materials, q), [materials, q]);
  const avg =
    materials.length === 0 ? 0 : materials.reduce((a, m) => a + m.unitCost, 0) / materials.length;

  const usageMap = useMemo(() => {
    const out = new Map<string, ReturnType<typeof findMaterialWhereUsed>>();
    for (const m of materials) {
      out.set(m.id, findMaterialWhereUsed(m, techDocs));
    }
    return out;
  }, [materials, techDocs]);

  const totalLinkedHits = useMemo(() => {
    let acc = 0;
    for (const list of usageMap.values()) acc += list.length;
    return acc;
  }, [usageMap]);

  function openNew() {
    setDraft(EMPTY);
    setOpen(true);
  }

  function save() {
    const cost = parseFloat(draft.unitCost.replace(",", "."));
    const err = validateMaterialDraft({ name: draft.name, unitCost: cost, unit: draft.unit });
    if (err) {
      toast.error(err);
      return;
    }
    upsertMaterial({
      id: draft.id ?? `mat-${Date.now().toString(36)}`,
      name: draft.name.trim(),
      tipo: draft.tipo,
      supplier: draft.supplier.trim(),
      unit: draft.unit.trim(),
      unitCost: Math.round(cost * 10000) / 10000,
      sku: draft.sku.trim().toUpperCase(),
      notes: draft.notes.trim(),
    });
    toast.success(draft.id ? "Material atualizado." : "Material cadastrado.");
    setOpen(false);
  }

  function remove(m: MaterialItem) {
    removeMaterial(m.id);
    toast.info(`${m.name} removido do catálogo.`);
  }

  const impactHits = useMemo(
    () => (impactMaterial ? findMaterialWhereUsed(impactMaterial, techDocs) : []),
    [impactMaterial, techDocs],
  );

  const propagateCostToSheets = () => {
    if (!impactMaterial || impactHits.length === 0) return;
    for (const hit of impactHits) {
      ensureSheet(hit.ref);
      updateBomItem(hit.ref, hit.bomId, {
        custoUnitario: impactMaterial.unitCost,
        fornecedor: impactMaterial.supplier || undefined,
      });
    }
    toast.success(
      `Novo custo (${brl(impactMaterial.unitCost)}/${impactMaterial.unit}) propagado para ${impactHits.length} vínculo(s) em Fichas Técnicas!`,
    );
    setImpactMaterial(null);
  };

  return (
    <ModuleLayout
      title="Biblioteca de Materiais & Onde Usado (PLM)"
      subtitle="Catálogo unificado de tecidos, aviamentos, linhas e embalagens com rastreabilidade em tempo real e propagação de reajuste para as Fichas Técnicas."
      version="Módulo 11 · PLM 2.0"
      onAdd={openNew}
      searchPlaceholder="Buscar material, SKU ou fornecedor…"
      onSearch={setQ}
      metrics={[
        { label: "Materiais", value: String(materials.length), detail: "no catálogo" },
        { label: "Custo médio", value: brl(avg), detail: "por unidade" },
        {
          label: "Tecidos",
          value: String(materials.filter((m) => m.tipo === "Tecido").length),
          detail: "de 6 categorias",
        },
        {
          label: "Vínculos BOM",
          value: String(totalLinkedHits),
          detail: "em fichas técnicas",
        },
      ]}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.05em] text-muted-foreground flex items-center gap-2">
          <Library className="w-3.5 h-3.5 text-primary" /> catálogo · {visible.length} itens
        </p>
        <ExportMenu
          title="Catálogo de materiais"
          filename={"materiais-" + new Date().toISOString().slice(0, 10)}
          rows={visible.map((m) => ({
            nome: m.name,
            tipo: m.tipo,
            fornecedor: m.supplier,
            sku: m.sku,
            unidade: m.unit,
            custo_unitario: m.unitCost,
            fichas_vinculadas: usageMap.get(m.id)?.length ?? 0,
          }))}
        />
      </div>

      {visible.length === 0 ? (
        <Card className="glass-card rounded-lg p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {materials.length === 0
              ? "Catálogo vazio — cadastre o primeiro material e ele passa a abastecer o BOM de qualquer ficha técnica."
              : "Nenhum material casa com a busca atual."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((m, i) => {
            const hits = usageMap.get(m.id) ?? [];
            const hasPriceDiff = hits.some(
              (h) => Math.abs(h.custoUnitarioFicha - h.custoUnitarioCatalogo) >= 0.01,
            );
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.04 }}
              >
                <Card className="glass-card rounded-lg p-5 h-full flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{m.name}</p>
                      <p className="text-2xs font-mono text-muted-foreground mt-0.5">
                        {m.sku || "sem SKU"} · {m.supplier || "fornecedor não informado"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border-strong/70 px-2 py-0.5 text-2xs uppercase tracking-widest text-muted-foreground">
                      {m.tipo}
                    </span>
                  </div>

                  {m.notes && (
                    <p className="text-xs text-muted-foreground/90 line-clamp-2">{m.notes}</p>
                  )}

                  {/* Badge de Rastreabilidade Onde Usado (Where-Used BOM) */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setImpactMaterial(m)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-2xs font-medium transition ${
                        hits.length > 0
                          ? hasPriceDiff
                            ? "border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-300"
                            : "border-teal-500/45 bg-teal-500/12 text-teal-700 dark:text-teal-300"
                          : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Layers className="w-3 h-3" />
                      {hits.length > 0
                        ? `Usado em ${hits.length} ficha(s)${hasPriceDiff ? " · Divergente" : ""}`
                        : "Onde usado (0)"}
                    </button>
                  </div>

                  <div className="mt-auto flex items-end justify-between border-t border-border/60 pt-2.5">
                    <p className="text-lg font-bold text-foreground font-mono">
                      {brl(m.unitCost)}
                      <span className="ml-1 text-2xs font-sans font-normal text-muted-foreground">
                        /{m.unit}
                      </span>
                    </p>
                    <div className="flex gap-1">
                      {hits.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-2xs gap-1"
                          onClick={() => setImpactMaterial(m)}
                          title="Analisar impacto de custo nas fichas técnicas e propagar preço"
                        >
                          <ArrowRightLeft className="h-3 w-3 text-teal-500" /> Impacto
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setDraft(toDraft(m));
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-status-rejected"
                        onClick={() => remove(m)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Dialog: Análise "Onde Usado" & Propagação de Preço para Fichas Técnicas */}
      <Dialog open={Boolean(impactMaterial)} onOpenChange={(o) => !o && setImpactMaterial(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Onde Usado &amp; Simulador de Reajuste · {impactMaterial?.name}
            </DialogTitle>
          </DialogHeader>
          {impactMaterial && (
            <div className="space-y-3 py-1 text-xs max-h-[65vh] overflow-y-auto">
              <p className="text-muted-foreground">
                Custo atual no catálogo:{" "}
                <strong className="font-mono text-foreground">
                  {brl(impactMaterial.unitCost)}/{impactMaterial.unit}
                </strong>
                . Veja abaixo o efeito exato sobre o Custo Industrial e a Margem Líquida de cada
                referência antes de propagar:
              </p>

              {impactHits.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
                  Nenhuma ficha técnica referencia este SKU ou nome de material no momento.
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-2xs">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-2 text-left">Referência</th>
                        <th className="py-2 px-2 text-right">Consumo</th>
                        <th className="py-2 px-2 text-right">Custo na Ficha</th>
                        <th className="py-2 px-2 text-right">Novo Custo Ind.</th>
                        <th className="py-2 px-2 text-right">Δ / Peça</th>
                        <th className="py-2 px-2 text-right">Margem Líq.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 font-mono">
                      {impactHits.map((h) => (
                        <tr key={`${h.ref}-${h.bomId}`}>
                          <td className="py-1.5 px-2 font-sans">
                            <Link
                              to="/tech-sheet"
                              search={{ ref: h.ref }}
                              className="font-bold text-teal-600 dark:text-teal-300 hover:underline inline-flex items-center gap-1"
                            >
                              {h.ref} <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                              {h.productName}
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            {h.consumo} (+{h.perdaPct}%)
                          </td>
                          <td className="py-1.5 px-2 text-right">{brl(h.custoUnitarioFicha)}</td>
                          <td className="py-1.5 px-2 text-right font-semibold">
                            {brl(h.custoIndustrialNovo)}
                          </td>
                          <td
                            className={`py-1.5 px-2 text-right font-bold ${
                              h.deltaCustoPeca > 0
                                ? "text-destructive"
                                : h.deltaCustoPeca < 0
                                  ? "text-emerald-600 dark:text-emerald-300"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {h.deltaCustoPeca > 0
                              ? `+${brl(h.deltaCustoPeca)}`
                              : brl(h.deltaCustoPeca)}
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            {h.margemAtualPct}% → <strong>{h.margemNovaPct}%</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setImpactMaterial(null)}>
              Fechar
            </Button>
            {impactHits.length > 0 && (
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-500 text-[#EEF7FA]"
                onClick={propagateCostToSheets}
              >
                Propagar Custo p/ {impactHits.length} Ficha(s)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Editar material" : "Novo material"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground sm:col-span-2">
              Nome *
              <Input
                className="mt-1"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Ex.: Viscose Texturizada Cru"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Tipo
              <select
                className="mt-1 h-9 w-full rounded-md border border-border-strong/70 bg-background px-2 text-sm text-foreground"
                value={draft.tipo}
                onChange={(e) => setDraft({ ...draft, tipo: e.target.value as MaterialTipo })}
              >
                {MATERIAL_TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Fornecedor
              <Input
                className="mt-1"
                value={draft.supplier}
                onChange={(e) => setDraft({ ...draft, supplier: e.target.value })}
                placeholder="Têxtil X"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Custo unitário (R$) *
              <Input
                className="mt-1"
                value={draft.unitCost}
                onChange={(e) => setDraft({ ...draft, unitCost: e.target.value })}
                placeholder="42,00"
                inputMode="decimal"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Unidade *
              <Input
                className="mt-1"
                value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                placeholder="m, un, kg…"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              SKU
              <Input
                className="mt-1"
                value={draft.sku}
                onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                placeholder="TC-330"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Observações
              <Input
                className="mt-1"
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Largura útil, curva, MOQ…"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>{draft.id ? "Salvar alterações" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
