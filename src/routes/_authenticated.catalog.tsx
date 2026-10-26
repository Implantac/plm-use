// Catálogo técnico-comercial — o que o vendedor PODE vender.
//
// Regra central: produto só entra em pedido com status `validado`
// (submit_sales_order confere no banco). Aqui a engenharia/custo cadastra o
// produto e as OPÇÕES que carregam custeio (driver, custo unitário, setup e
// consumo delta) — é o que permite o pedido chegar pronto na ficha.
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  BadgeCheck,
  Boxes,
  CircleSlash,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { useAuth, useUserRoles } from "@/hooks/use-auth";
import {
  isMissingTable,
  listCatalog,
  listConfigurations,
  listOptionGroups,
  MIGRATION_HINT,
  saveCatalogProduct,
  saveOption,
  saveOptionGroup,
  setCatalogStatus,
} from "@/lib/sales/api";
import { DRIVERS } from "@/lib/sales/cost";
import {
  brl,
  CATALOG_STATUS,
  GRADE_PADRAO,
  type CatalogOption,
  type CatalogProduct,
  type CostDriver,
} from "@/lib/sales/types";

export const Route = createFileRoute("/_authenticated/catalog")({
  head: () => ({
    meta: [
      { title: "Catálogo técnico · USE MODA PLM" },
      {
        name: "description",
        content:
          "Catálogo de produtos validados com opções de personalização e custeio por driver (peça, mil pontos, m², cor, minuto, lote).",
      },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const { user } = useAuth();
  const { roles } = useUserRoles(user?.id);
  const canEdit = roles.some((r) =>
    ["admin", "manager", "engenharia_custo", "coordenador_produto"].includes(String(r)),
  );

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [configs, setConfigs] = useState<Array<{ id: string; name: string; baseProduct: string }>>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<CatalogProduct | null | "new">(null);
  const [managing, setManaging] = useState<CatalogProduct | null>(null);

  const load = useMemo(
    () => async () => {
      setLoading(true);
      const [res, cfg] = await Promise.all([listCatalog(), listConfigurations()]);
      if (res.error) {
        setFatal(isMissingTable(res.error) ? MIGRATION_HINT : res.error.message);
        setProducts([]);
      } else {
        setProducts(res.data ?? []);
        setFatal(null);
      }
      setConfigs(cfg.data ?? []);
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const needle = q.trim().toLowerCase();
  const visible = products.filter(
    (p) =>
      !needle || p.name.toLowerCase().includes(needle) || p.code.toLowerCase().includes(needle),
  );

  const metrics = [
    { label: "Produtos", value: String(products.length), detail: "no catálogo" },
    {
      label: "Validados",
      value: String(products.filter((p) => p.status === "validado").length),
      detail: "vendáveis",
    },
    {
      label: "Opções",
      value: String(products.reduce((a, p) => a + p.options.length, 0)),
      detail: "com custeio",
    },
    {
      label: "Rascunhos",
      value: String(products.filter((p) => p.status === "rascunho").length),
      detail: "fora do pedido",
    },
  ];

  async function validate(product: CatalogProduct, status: CatalogProduct["status"]) {
    const res = await setCatalogStatus(product.id, status);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(
      status === "validado" ? "Produto validado — já entra em pedido." : "Status atualizado.",
    );
    await load();
  }

  return (
    <ModuleLayout
      title="Catálogo técnico"
      subtitle="Produto validado + opções de personalização com driver de custeio. É a base que faz o pedido chegar preenchido na engenharia de custo."
      version="Sales Catalog v1.0"
      onAdd={canEdit ? () => setEditing("new") : undefined}
      onSearch={setQ}
      searchPlaceholder="Buscar produto ou código"
      metrics={metrics}
    >
      {fatal && (
        <div className="mb-6 flex items-start gap-3 rounded-md border border-status-progress/30 bg-status-progress/10 p-4">
          <AlertTriangle className="w-4 h-4 text-status-progress mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-status-progress">Catálogo ainda não ativo</p>
            <p className="text-xs text-status-progress/80">{fatal}</p>
          </div>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          onClick={() => void load()}
          className="text-[11px] tracking-[0.04em] gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </Button>
      </div>

      {loading ? (
        <Card className="glass-card rounded-lg p-8 text-sm text-muted-foreground">
          Carregando catálogo…
        </Card>
      ) : visible.length === 0 ? (
        <Card className="glass-card rounded-lg p-10 text-center space-y-3">
          <Boxes className="w-6 h-6 text-primary mx-auto" />
          <p className="text-sm text-white">Nenhum produto no catálogo.</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Cadastre o produto (com quantidade mínima e grade), crie as opções de personalização e
            clique em <strong>Validar</strong> — só então ele aparece para o vendedor.
          </p>
          {canEdit && (
            <Button
              onClick={() => setEditing("new")}
              className="text-[11px] tracking-[0.04em] gap-2"
            >
              <Plus className="w-4 h-4" /> Novo produto
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-3">
          {visible.map((p) => {
            const meta = CATALOG_STATUS[p.status];
            return (
              <Card key={p.id} className="glass-card rounded-lg p-5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-primary">
                        {p.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-[0.04em] ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                      {p.family && (
                        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                          {p.family}
                        </span>
                      )}
                    </div>
                    <p className="text-white font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      mínimo {p.minQty} peças · grade {p.grade.join(" · ") || "—"} · base{" "}
                      {brl(p.basePrice)} · {p.options.length} opção(ões)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canEdit && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setManaging(p)}
                          className="text-[11px] tracking-[0.04em] gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Opções
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setEditing(p)}
                          className="text-[11px] tracking-[0.04em] gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </Button>
                        {p.status !== "validado" ? (
                          <Button
                            onClick={() => validate(p, "validado")}
                            className="text-[11px] tracking-[0.04em] gap-1.5"
                          >
                            <BadgeCheck className="w-3.5 h-3.5" /> Validar
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => validate(p, "descontinuado")}
                            className="text-[11px] tracking-[0.04em] gap-1.5 text-status-rejected"
                          >
                            <CircleSlash className="w-3.5 h-3.5" /> Descontinuar
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {p.options.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/5 pt-3">
                    {p.options.map((o) => (
                      <span
                        key={o.id}
                        className="px-2 py-1 rounded border border-white/10 bg-white/5 text-[11px] text-white"
                        title={`${o.sector ?? "produção"} · ${o.driver} · ${brl(o.unitCost)}`}
                      >
                        {o.name}
                        <span className="text-muted-foreground"> · {o.driver}</span>
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ProductDialog
        open={editing !== null}
        product={editing === "new" ? null : editing}
        configs={configs}
        onOpenChange={(v) => !v && setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await load();
        }}
      />

      <OptionsDialog
        product={managing}
        onClose={() => setManaging(null)}
        onChanged={async () => {
          await load();
          if (managing) {
            const fresh = await listCatalog();
            const updated = (fresh.data ?? []).find((p) => p.id === managing.id) ?? null;
            setManaging(updated);
          }
        }}
      />
    </ModuleLayout>
  );
}

function ProductDialog({
  open,
  product,
  configs,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  product: CatalogProduct | null;
  configs: Array<{ id: string; name: string; baseProduct: string }>;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [family, setFamily] = useState("");
  const [description, setDescription] = useState("");
  const [referenceCode, setReferenceCode] = useState("");
  const [configurationId, setConfigurationId] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [minQty, setMinQty] = useState("10");
  const [grade, setGrade] = useState(GRADE_PADRAO.join(", "));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(product?.code ?? "");
    setName(product?.name ?? "");
    setFamily(product?.family ?? "");
    setDescription(product?.description ?? "");
    setReferenceCode(product?.referenceCode ?? "");
    setConfigurationId(product?.configurationId ?? "");
    setBasePrice(product ? String(product.basePrice) : "");
    setMinQty(String(product?.minQty ?? 10));
    setGrade((product?.grade?.length ? product.grade : GRADE_PADRAO).join(", "));
  }, [open, product]);

  async function save() {
    if (!code.trim() || !name.trim()) {
      toast.error("Código e nome são obrigatórios.");
      return;
    }
    setSaving(true);
    const res = await saveCatalogProduct({
      id: product?.id,
      code,
      name,
      family,
      description,
      referenceCode,
      configurationId: configurationId || undefined,
      basePrice: Number(String(basePrice).replace(",", ".")) || 0,
      minQty: Number(minQty) || 1,
      grade: grade
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(product ? "Produto atualizado." : "Produto criado — crie as opções e valide.");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {product ? `Editar ${product.code}` : "Novo produto do catálogo"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CAM-FUT-2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Família</Label>
              <Input
                value={family}
                onChange={(e) => setFamily(e.target.value)}
                placeholder="Camisa"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Camisa futebol oficial"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Referência da ficha técnica</Label>
              <Input
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value)}
                placeholder="V26-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Configuração de rota (PCP)</Label>
              <select
                value={configurationId}
                onChange={(e) => setConfigurationId(e.target.value)}
                className="h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"
              >
                <option value="">— sem rota padrão —</option>
                {configs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.baseProduct})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Sem configuração, a liberação para o PCP não acha a rota.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Preço base (R$)</Label>
              <Input
                inputMode="decimal"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantidade mínima</Label>
              <Input
                type="number"
                min={1}
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Grade (separada por vírgula)</Label>
            <Input
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="P, M, G, GG, 3G"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OptionsDialog({
  product,
  onClose,
  onChanged,
}: {
  product: CatalogProduct | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [groups, setGroups] = useState<Array<Record<string, unknown>>>([]);
  const [groupCode, setGroupCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupSelection, setGroupSelection] = useState<"single" | "multi">("single");
  const [groupRequired, setGroupRequired] = useState(false);
  const [targetGroup, setTargetGroup] = useState("");
  const [optName, setOptName] = useState("");
  const [optSector, setOptSector] = useState("");
  const [optOperation, setOptOperation] = useState("");
  const [optDriver, setOptDriver] = useState<CostDriver>("peca");
  const [optUnitCost, setOptUnitCost] = useState("");
  const [optSetup, setOptSetup] = useState("");
  const [optPriceDelta, setOptPriceDelta] = useState("");
  const [optOutsourced, setOptOutsourced] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!product) {
      setGroups([]);
      return;
    }
    void listOptionGroups(product.id).then((res) => {
      setGroups(res.data ?? []);
      const first = res.data?.[0];
      setTargetGroup(first ? String(first.id) : "");
    });
  }, [product]);

  if (!product) return null;

  const optionsByGroup = (groupId: string): CatalogOption[] =>
    product.options.filter((o) => o.groupId === groupId);

  async function addGroup() {
    if (!groupCode.trim() || !groupName.trim()) {
      toast.error("Código e nome do grupo são obrigatórios.");
      return;
    }
    setSaving(true);
    const res = await saveOptionGroup({
      productId: product!.id,
      code: groupCode,
      name: groupName,
      selection: groupSelection,
      required: groupRequired,
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Grupo criado.");
    setGroupCode("");
    setGroupName("");
    onChanged();
  }

  async function addOption() {
    if (!targetGroup) {
      toast.error("Crie um grupo antes de adicionar opções.");
      return;
    }
    if (!optName.trim()) {
      toast.error("Informe o nome da opção.");
      return;
    }
    setSaving(true);
    const res = await saveOption({
      groupId: targetGroup,
      name: optName,
      sector: optSector,
      operationName: optOperation || optName,
      driver: optDriver,
      unitCost: Number(String(optUnitCost).replace(",", ".")) || 0,
      setupCost: Number(String(optSetup).replace(",", ".")) || 0,
      priceDelta: Number(String(optPriceDelta).replace(",", ".")) || 0,
      outsourced: optOutsourced,
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Opção criada — ela entra sozinha na ficha do pedido.");
    setOptName("");
    setOptUnitCost("");
    setOptSetup("");
    onChanged();
  }

  return (
    <Dialog open={!!product} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Opções · {product.code}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3 h-3" /> Grupos e opções
            </p>
            {groups.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum grupo ainda. Ex.: “Gola” (escolha única), “Personalização” (múltipla).
              </p>
            ) : (
              <div className="space-y-2">
                {groups.map((g) => {
                  const gid = String(g.id);
                  const opts = optionsByGroup(gid);
                  return (
                    <div key={gid} className="rounded-md border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{String(g.name)}</span>
                        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                          {String(g.selection) === "multi" ? "múltipla" : "única"}
                          {g.required === true ? " · obrigatória" : ""}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {opts.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground">sem opções</span>
                        ) : (
                          opts.map((o) => (
                            <span
                              key={o.id}
                              className="px-2 py-1 rounded border border-white/10 bg-white/5 text-[11px] text-white"
                            >
                              {o.name}
                              <span className="text-primary"> · {o.driver}</span>
                              <span className="text-muted-foreground">
                                {" "}
                                {brl(o.unitCost)}
                                {o.setupCost ? ` + ${brl(o.setupCost)} setup` : ""}
                              </span>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-md border border-white/10 p-3 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground">
              Novo grupo
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={groupCode}
                onChange={(e) => setGroupCode(e.target.value)}
                placeholder="gola"
                className="h-9"
              />
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Gola"
                className="h-9"
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-white">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={groupSelection === "single"}
                  onChange={() => setGroupSelection("single")}
                />
                escolha única
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={groupSelection === "multi"}
                  onChange={() => setGroupSelection("multi")}
                />
                múltipla
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={groupRequired}
                  onChange={(e) => setGroupRequired(e.target.checked)}
                />
                obrigatória
              </label>
            </div>
            <Button
              variant="outline"
              onClick={addGroup}
              disabled={saving}
              className="text-[11px] tracking-[0.04em]"
            >
              Criar grupo
            </Button>
          </div>

          <div className="rounded-md border border-primary/20 bg-primary/[0.04] p-3 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-primary">
              Nova opção (com custeio)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Grupo
                </Label>
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                  className="h-9 w-full rounded-md border border-white/10 bg-black/30 px-2 text-xs text-white"
                >
                  <option value="">—</option>
                  {groups.map((g) => (
                    <option key={String(g.id)} value={String(g.id)}>
                      {String(g.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Nome
                </Label>
                <Input
                  value={optName}
                  onChange={(e) => setOptName(e.target.value)}
                  placeholder="Bordado escudo"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Setor
                </Label>
                <Input
                  value={optSector}
                  onChange={(e) => setOptSector(e.target.value)}
                  placeholder="Bordado"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Operação
                </Label>
                <Input
                  value={optOperation}
                  onChange={(e) => setOptOperation(e.target.value)}
                  placeholder="Bordado escudo 8cm"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Driver
                </Label>
                <select
                  value={optDriver}
                  onChange={(e) => setOptDriver(e.target.value as CostDriver)}
                  className="h-9 w-full rounded-md border border-white/10 bg-black/30 px-2 text-xs text-white"
                >
                  {DRIVERS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label} ({d.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Custo unitário (R$)
                </Label>
                <Input
                  inputMode="decimal"
                  value={optUnitCost}
                  onChange={(e) => setOptUnitCost(e.target.value)}
                  placeholder="0,11"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Setup do pedido (R$)
                </Label>
                <Input
                  inputMode="decimal"
                  value={optSetup}
                  onChange={(e) => setOptSetup(e.target.value)}
                  placeholder="38,00"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Δ preço de venda (R$)
                </Label>
                <Input
                  inputMode="decimal"
                  value={optPriceDelta}
                  onChange={(e) => setOptPriceDelta(e.target.value)}
                  placeholder="0,00"
                  className="h-9"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-white">
                <input
                  type="checkbox"
                  checked={optOutsourced}
                  onChange={(e) => setOptOutsourced(e.target.checked)}
                />
                terceirizado
              </label>
              <Button
                onClick={addOption}
                disabled={saving}
                className="text-[11px] tracking-[0.04em]"
              >
                {saving ? "Salvando…" : "Criar opção"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              O driver define como o custo multiplica: por peça, por mil pontos de bordado, por m²
              de sublimação, por cor de silk ou fixo por pedido (setup amortizado na quantidade).
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
