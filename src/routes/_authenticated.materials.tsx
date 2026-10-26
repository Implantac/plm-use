// Biblioteca de Materiais — módulo 11 do creative-sync. Catálogo que o BOM da
// ficha técnica consome ("Do catálogo" no painel de engenharia). Persistência
// real após o SQL 20261014220000; antes disso o módulo funciona por
// dispositivo (mesma degradação graciosa dos criativos — a /audit registra o
// estado).

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Library, Pencil, Trash2 } from "lucide-react";
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
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const visible = useMemo(() => filterMaterials(materials, q), [materials, q]);
  const avg =
    materials.length === 0 ? 0 : materials.reduce((a, m) => a + m.unitCost, 0) / materials.length;

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

  return (
    <ModuleLayout
      title="Biblioteca de Materiais"
      subtitle="Catálogo de tecidos, aviamentos, linhas e embalagens reutilizado pelas fichas técnicas — custo e fornecedor num lugar só."
      version="Módulo 11 · creative-sync"
      onAdd={openNew}
      searchPlaceholder="Buscar material, SKU ou fornecedor…"
      onSearch={setQ}
      metrics={[
        { label: "Materiais", value: String(materials.length), detail: "no catálogo" },
        { label: "Custo médio", value: brl(avg), detail: "por unidade" },
        {
          label: "Tecidos",
          value: String(materials.filter((m) => m.tipo === "Tecido").length),
          detail: "de um total de 6 tipos",
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
          {visible.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.04 }}
            >
              <Card className="glass-card rounded-lg p-5 h-full flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{m.name}</p>
                    <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                      {m.sku || "sem SKU"} · {m.supplier || "fornecedor não informado"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                    {m.tipo}
                  </span>
                </div>
                {m.notes && (
                  <p className="text-xs text-muted-foreground/90 line-clamp-2">{m.notes}</p>
                )}
                <div className="mt-auto flex items-end justify-between">
                  <p className="text-lg font-bold text-white">
                    {brl(m.unitCost)}
                    <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                      /{m.unit}
                    </span>
                  </p>
                  <div className="flex gap-1">
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
          ))}
        </div>
      )}

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
                className="mt-1 h-9 w-full rounded-md border border-white/15 bg-white/5 px-2 text-sm text-white"
                value={draft.tipo}
                onChange={(e) => setDraft({ ...draft, tipo: e.target.value as MaterialTipo })}
              >
                {MATERIAL_TIPOS.map((t) => (
                  <option key={t} value={t} className="bg-neutral-900">
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
