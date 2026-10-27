import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteCommercialItemDetailGroup,
  deleteItemDetailGroup,
  getItemTechnicalDetails,
  saveCommercialItemDetailGroup,
  saveItemDetailGroup,
  startCommercialItemDetails,
  startItemTechnicalDetails,
  type ItemTechnicalDetails,
  type TechnicalDetailGroup,
} from "@/lib/sales/technical-details-api";
import type { SalesOrderItem } from "@/lib/sales/types";
import { BaseSnapshotPanel } from "./ProductionDetails";
import { ItemConsumptionEditor } from "./ItemConsumptionEditor";

type DetailMode = "commercial" | "cost";
const groupText = (group: TechnicalDetailGroup, mode: DetailMode) =>
  mode === "commercial" ? (group.commercial_detail ?? "") : group.detail;

export function ItemTechnicalDetailsDialog({
  itemId,
  itemLabel,
  open,
  editable,
  mode = "cost",
  item,
  onConsumptionChanged,
  onClose,
}: {
  itemId: string;
  itemLabel: string;
  open: boolean;
  editable: boolean;
  mode?: DetailMode;
  item?: SalesOrderItem;
  onConsumptionChanged?: () => void;
  onClose: () => void;
}) {
  const [sheet, setSheet] = useState<ItemTechnicalDetails | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [consumptionDirty, setConsumptionDirty] = useState(false);
  const [consumptionSaving, setConsumptionSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroup, setNewGroup] = useState("");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setSheet(null);
    setDrafts({});
    setSelectedId(null);
    setNewGroup("");
    setAddingGroup(false);
    setLoading(true);
    setError(null);
    setMessage(null);
    setConsumptionDirty(false);
    setConsumptionSaving(false);
    // Comercial inicia no rascunho; custo inicia após envio; consulta não cria dados.
    const request = !editable
      ? getItemTechnicalDetails(itemId)
      : mode === "commercial"
        ? startCommercialItemDetails(itemId)
        : startItemTechnicalDetails(itemId);
    void request.then((res) => {
      if (!alive) return;
      setLoading(false);
      if (res.error || !res.data) {
        setError(res.error?.message ?? "Não foi possível carregar os detalhes.");
        return;
      }
      const groups = Array.isArray(res.data.groups) ? res.data.groups : [];
      setSheet({ ...res.data, groups });
      setDrafts(Object.fromEntries(groups.map((group) => [group.id, groupText(group, mode)])));
      setSelectedId(groups[0]?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, [itemId, open, editable, mode]);

  const groups = useMemo(() => sheet?.groups ?? [], [sheet]);
  const selected = groups.find((group) => group.id === selectedId);
  const changed = (id: string, original: string) => (drafts[id] ?? original) !== original;
  const hasUnsaved =
    groups.some((group) => changed(group.id, groupText(group, mode))) ||
    !!newGroup.trim() ||
    consumptionDirty;
  const blocking = saving || consumptionSaving;

  function close() {
    if (blocking) return;
    if (hasUnsaved && !window.confirm("Existem alterações não salvas. Deseja fechar mesmo assim?"))
      return;
    onClose();
  }

  async function saveSelected() {
    if (!selected || !editable || blocking) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const save = mode === "commercial" ? saveCommercialItemDetailGroup : saveItemDetailGroup;
    const res = await save({
      itemId,
      groupId: selected.id,
      name: null,
      detail: drafts[selected.id] ?? groupText(selected, mode),
      revision: selected.revision,
    });
    setSaving(false);
    if (res.error || !res.data) {
      setError(res.error?.message ?? "Não foi possível salvar. Seu texto continua na tela.");
      return;
    }
    const saved = res.data;
    setSheet((current) =>
      current
        ? { ...current, groups: current.groups.map((g) => (g.id === saved.id ? saved : g)) }
        : current,
    );
    setDrafts((current) => ({ ...current, [saved.id]: groupText(saved, mode) }));
    setMessage(`Detalhes de ${saved.name} salvos para este item.`);
  }

  async function addGroup() {
    if (!editable || blocking) return;
    const name = newGroup.trim();
    if (!name) {
      setError("Informe o nome do grupo.");
      return;
    }
    if (
      groups.some(
        (group) => group.name.trim().toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"),
      )
    ) {
      setError("Já existe um grupo com este nome.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    const save = mode === "commercial" ? saveCommercialItemDetailGroup : saveItemDetailGroup;
    const res = await save({ itemId, groupId: null, name, detail: "", revision: 0 });
    setSaving(false);
    if (res.error || !res.data) {
      setError(res.error?.message ?? "Não foi possível criar o grupo.");
      return;
    }
    const created = res.data;
    setSheet((current) =>
      current ? { ...current, groups: [...current.groups, created] } : current,
    );
    setDrafts((current) => ({ ...current, [created.id]: groupText(created, mode) }));
    setSelectedId(created.id);
    setNewGroup("");
    setAddingGroup(false);
    setMessage(`Grupo ${created.name} criado.`);
  }

  async function removeGroup() {
    if (!selected || !editable || blocking) return;
    if (
      (mode === "cost" && selected.commercial_detail?.trim()) ||
      (mode === "commercial" && selected.detail.trim())
    )
      return;
    if (!window.confirm(`Excluir o grupo ${selected.name} e suas instruções deste item?`)) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const remove = mode === "commercial" ? deleteCommercialItemDetailGroup : deleteItemDetailGroup;
    const res = await remove({
      itemId,
      groupId: selected.id,
      revision: selected.revision,
    });
    setSaving(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    const remaining = groups.filter((group) => group.id !== selected.id);
    setSheet((current) => (current ? { ...current, groups: remaining } : current));
    setDrafts((current) => {
      const next = { ...current };
      delete next[selected.id];
      return next;
    });
    setSelectedId(remaining[0]?.id ?? null);
    setMessage(`Grupo ${selected.name} removido deste item.`);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-h-[92dvh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <FileText className="h-5 w-5 text-primary" />{" "}
            {mode === "commercial" ? "Detalhes do comercial" : "Detalhes de produção"}
          </DialogTitle>
          <DialogDescription>
            {itemLabel} · ficha específica deste item, sem alterar a ficha padrão do produto.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando ficha do item…
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-md border border-status-rejected/30 bg-status-rejected/10 p-3 text-sm text-status-rejected"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="rounded-md border border-status-approved/30 bg-status-approved/10 p-3 text-sm text-status-approved"
          >
            {message}
          </p>
        )}
        {!loading && sheet && !sheet.initialized && (
          <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
            Os detalhes ainda não foram iniciados para este item.
          </p>
        )}
        {!loading && sheet?.initialized && (
          <>
            {item && <CommercialItemSummary item={item} />}
            <BaseSnapshotPanel
              snapshot={{
                ref: sheet.base_ref ?? null,
                found: !!sheet.base_found,
                data: sheet.base ?? {},
              }}
            />
            {editable && !sheet.base_found && (
              <p className="text-xs text-muted-foreground">
                Se a referência ou a ficha padrão for cadastrada depois, feche e reabra este editor
                antes da aprovação para buscá-la novamente.
              </p>
            )}
            <div className="grid gap-4 md:min-h-[380px] md:grid-cols-[220px_minmax(0,1fr)]">
              <aside className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="px-2 pb-2 text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Grupos de detalhes
                </p>
                <div className="flex flex-wrap gap-1.5 md:flex-col" aria-label="Grupos de detalhes">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      aria-pressed={selectedId === group.id}
                      onClick={() => {
                        setSelectedId(group.id);
                        setError(null);
                        setMessage(null);
                      }}
                      disabled={blocking}
                      className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        selectedId === group.id
                          ? "bg-primary/15 font-semibold text-primary"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{group.name}</span>
                      {changed(group.id, groupText(group, mode)) ? (
                        <span className="text-2xs text-status-progress">Não salvo</span>
                      ) : group.detail.trim() || group.commercial_detail?.trim() ? (
                        <span
                          className="h-2 w-2 rounded-full bg-status-approved"
                          aria-label="Preenchido"
                        />
                      ) : null}
                    </button>
                  ))}
                </div>
                {editable && (
                  <div className="mt-3 border-t border-border pt-3">
                    {addingGroup ? (
                      <div className="space-y-2">
                        <Input
                          aria-label="Nome do novo grupo"
                          placeholder="Nome do grupo"
                          value={newGroup}
                          maxLength={60}
                          onChange={(e) => setNewGroup(e.target.value)}
                          disabled={blocking}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void addGroup()}
                            disabled={blocking}
                          >
                            Criar grupo
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAddingGroup(false);
                              setNewGroup("");
                            }}
                            disabled={blocking}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAddingGroup(true)}
                        disabled={blocking}
                      >
                        <Plus className="h-3.5 w-3.5" /> Novo grupo
                      </Button>
                    )}
                  </div>
                )}
              </aside>

              <section className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-4">
                {selected ? (
                  <>
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">{selected.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {mode === "commercial"
                            ? "Informe o pedido do cliente para este grupo. O custo complementará depois."
                            : "Confira o que o comercial informou e acrescente o detalhamento técnico."}
                        </p>
                      </div>
                      <span className="text-2xs text-muted-foreground">
                        {changed(selected.id, groupText(selected, mode))
                          ? "Alterações não salvas"
                          : "Salvo"}
                      </span>
                    </div>
                    {mode === "cost" && (
                      <div className="mb-3 rounded-md border border-border bg-muted/30 p-3">
                        <p className="text-xs font-semibold text-foreground">
                          Informado pelo comercial
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                          {selected.commercial_detail?.trim()
                            ? selected.commercial_detail
                            : "Nenhuma informação neste grupo."}
                        </p>
                      </div>
                    )}
                    {mode === "commercial" && !!selected.detail.trim() && (
                      <div className="mb-3 rounded-md border border-border bg-muted/30 p-3">
                        <p className="text-xs font-semibold text-foreground">
                          Complemento do custo
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                          {selected.detail}
                        </p>
                      </div>
                    )}
                    <label
                      htmlFor={`detail-${selected.id}`}
                      className="mb-1 text-xs font-semibold text-foreground"
                    >
                      {mode === "commercial"
                        ? "Detalhes do comercial"
                        : "Complemento técnico do custo"}
                    </label>
                    <Textarea
                      id={`detail-${selected.id}`}
                      aria-label={`Detalhes de ${selected.name}`}
                      className="min-h-[260px] flex-1 resize-y text-sm leading-relaxed"
                      placeholder={`Descreva os detalhes de ${selected.name.toLowerCase()} para a produção…`}
                      value={drafts[selected.id] ?? groupText(selected, mode)}
                      maxLength={15000}
                      disabled={!editable || blocking}
                      onChange={(e) => {
                        setDrafts((current) => ({ ...current, [selected.id]: e.target.value }));
                        setMessage(null);
                      }}
                    />
                    <p className="mt-2 text-2xs text-muted-foreground">
                      {mode === "commercial"
                        ? "O custo verá estas informações e poderá complementar sem alterar o texto do comercial."
                        : "O complemento não altera o texto do comercial. Ambos aparecem na ficha e na OP."}
                    </p>
                    {editable && (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void removeGroup()}
                          disabled={
                            blocking ||
                            (mode === "cost"
                              ? !!selected.commercial_detail?.trim()
                              : !!selected.detail.trim())
                          }
                          title={
                            mode === "cost" && selected.commercial_detail?.trim()
                              ? "O grupo contém dados do comercial e não pode ser excluído pelo custo."
                              : undefined
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir grupo
                        </Button>
                        <Button
                          type="button"
                          onClick={() => void saveSelected()}
                          disabled={blocking || !changed(selected.id, groupText(selected, mode))}
                        >
                          <Save className="h-4 w-4" /> {saving ? "Salvando…" : "Salvar detalhes"}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="py-8 text-sm text-muted-foreground">
                    Nenhum grupo disponível. Crie um grupo para registrar instruções.
                  </p>
                )}
              </section>
            </div>
            {mode === "cost" && item && (
              <ItemConsumptionEditor
                itemId={itemId}
                quantity={item.quantity}
                baseMaterials={sheet.base?.materiais ?? []}
                editable={editable}
                disabled={saving}
                onDirtyChange={setConsumptionDirty}
                onSavingChange={setConsumptionSaving}
                onChanged={() => onConsumptionChanged?.()}
              />
            )}
            {!editable && (
              <p className="text-xs text-muted-foreground">
                Os detalhes deste item estão disponíveis somente para consulta.
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CommercialItemSummary({ item }: { item: SalesOrderItem }) {
  return (
    <section
      className="space-y-2 rounded-md border border-border bg-muted/20 p-3 text-sm"
      aria-label="Dados informados pelo comercial"
    >
      <h3 className="text-xs font-semibold uppercase tracking-[0.04em] text-primary">
        Dados informados pelo comercial
      </h3>
      <p className="text-foreground">
        {item.description} · {item.color || "sem cor informada"} · {item.quantity} peças
        {item.referenceCode ? ` · ref. ${item.referenceCode}` : ""}
      </p>
      <p className="text-xs text-muted-foreground">
        Grade:{" "}
        {item.sizes.length
          ? item.sizes.map((s) => `${s.size} × ${s.quantity}`).join(" · ")
          : "não informada"}
      </p>
      <p className="text-xs text-muted-foreground">
        Personalizações:{" "}
        {item.options.length
          ? item.options
              .map(
                (o) =>
                  `${o.name} × ${o.quantity}${o.driverQty != null ? ` (detalhe ${o.driverQty})` : ""}`,
              )
              .join(" · ")
          : "nenhuma"}
      </p>
      {item.notes && (
        <p className="whitespace-pre-wrap break-words text-xs text-foreground">
          Observações: {item.notes}
        </p>
      )}
    </section>
  );
}
