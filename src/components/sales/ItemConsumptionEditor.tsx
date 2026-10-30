import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteItemConsumption,
  listItemConsumption,
  saveItemConsumption,
  type BaseMaterial,
  type ItemMaterialConsumption,
} from "@/lib/sales/technical-details-api";

type Values = { consumption: string; waste: string; unitCost: string };
type NewMaterial = Values & { kind: string; material: string; unit: string };
const emptyNew = (): NewMaterial => ({
  kind: "tecido",
  material: "",
  unit: "",
  consumption: "",
  waste: "0",
  unitCost: "",
});
const valuesFor = (row: ItemMaterialConsumption): Values => ({
  consumption: String(row.consumption),
  waste: String(row.waste_pct),
  unitCost: String(row.unit_cost),
});
const sameValues = (left: Values, right: Values) =>
  left.consumption === right.consumption &&
  left.waste === right.waste &&
  left.unitCost === right.unitCost;
const numberInput = (value: string, decimals: number, max: number): number | null => {
  const text = value.trim().replace(",", ".");
  if (!new RegExp(`^(?:[0-9]+(?:\\.[0-9]{1,${decimals}})?|\\.[0-9]{1,${decimals}})$`).test(text))
    return null;
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 && number <= max ? number : null;
};
const parseValues = (values: Values) => {
  const consumption = numberInput(values.consumption, 4, 99999999.9999);
  const wastePct = numberInput(values.waste, 2, 999.99);
  const unitCost = numberInput(values.unitCost, 4, 99999999.9999);
  return consumption === null || wastePct === null || unitCost === null
    ? null
    : { consumption, wastePct, unitCost };
};
const kindFromBase = (kind: string | null) => {
  const value = (kind ?? "").trim().toLocaleLowerCase("pt-BR");
  if (["tecido", "aviamento", "linha", "embalagem"].includes(value)) return value;
  return value === "bordado" || value === "silk" || value === "serviço" || value === "servico"
    ? "servico"
    : "aviamento";
};
const format = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });

/** Editor do consumo real da ficha do item; preço/custo só vai para quem pode custear. */
export function ItemConsumptionEditor({
  itemId,
  quantity,
  baseMaterials,
  editable,
  disabled,
  onDirtyChange,
  onSavingChange,
  onChanged,
}: {
  itemId: string;
  quantity: number;
  baseMaterials: BaseMaterial[];
  editable: boolean;
  disabled: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<ItemMaterialConsumption[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Values>>({});
  const [adding, setAdding] = useState(false);
  const [next, setNext] = useState<NewMaterial>(emptyNew);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadFailed(false);
    setError(null);
    void listItemConsumption(itemId).then((res) => {
      if (!alive) return;
      setLoading(false);
      if (res.error || !res.data) {
        setLoadFailed(true);
        setError(res.error?.message ?? "Não foi possível carregar os materiais do item.");
        return;
      }
      setRows(res.data);
      setDrafts(Object.fromEntries(res.data.map((row) => [row.id, valuesFor(row)])));
    });
    return () => {
      alive = false;
    };
  }, [itemId]);

  const dirty =
    rows.some((row) => !sameValues(drafts[row.id] ?? valuesFor(row), valuesFor(row))) ||
    (adding &&
      (next.kind !== "tecido" ||
        !!next.material.trim() ||
        !!next.unit.trim() ||
        !!next.consumption.trim() ||
        !!next.unitCost.trim() ||
        next.waste !== "0"));
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    onSavingChange(busy);
    return () => onSavingChange(false);
  }, [busy, onSavingChange]);

  function change(id: string, key: keyof Values, value: string) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
    setMessage(null);
  }

  async function saveRow(row: ItemMaterialConsumption) {
    if (!editable || busy || disabled) return;
    const parsed = parseValues(drafts[row.id] ?? valuesFor(row));
    if (!parsed) {
      setError(
        "Preencha consumo, perda e custo unitário com números válidos. Use até 4 casas no consumo/custo e 2 na perda.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await saveItemConsumption({
      itemId,
      materialId: row.id,
      kind: null,
      material: null,
      unit: null,
      ...parsed,
      revision: row.revision,
    });
    setBusy(false);
    if (res.error || !res.data) {
      setError(
        res.error?.message ??
          "Não foi possível salvar o consumo. Seu preenchimento continua na tela.",
      );
      return;
    }
    const saved = res.data;
    setRows((current) => current.map((r) => (r.id === saved.id ? saved : r)));
    setDrafts((current) => ({ ...current, [saved.id]: valuesFor(saved) }));
    onSavingChange(false);
    onDirtyChange(false);
    setMessage(`Consumo de ${saved.material} salvo e custo recalculado.`);
    onChanged();
  }

  async function createMaterial() {
    if (!editable || busy || disabled) return;
    const parsed = parseValues(next);
    if (!next.material.trim() || !next.unit.trim() || !parsed) {
      setError(
        "Informe material, unidade, consumo, perda e custo unitário válidos. Para custo zero, digite 0.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await saveItemConsumption({
      itemId,
      materialId: null,
      kind: next.kind,
      material: next.material.trim(),
      unit: next.unit.trim(),
      ...parsed,
      revision: 0,
    });
    setBusy(false);
    if (res.error || !res.data) {
      setError(
        res.error?.message ??
          "Não foi possível adicionar o material. Seu preenchimento continua na tela.",
      );
      return;
    }
    const created = res.data;
    setRows((current) => [...current, created]);
    setDrafts((current) => ({ ...current, [created.id]: valuesFor(created) }));
    setAdding(false);
    setNext(emptyNew());
    setMessage(`Material ${created.material} adicionado e custo recalculado.`);
    onChanged();
  }

  async function removeMaterial(row: ItemMaterialConsumption) {
    if (!editable || busy || disabled || row.source !== "custo") return;
    if (!window.confirm(`Remover ${row.material} deste item e recalcular o custo?`)) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await deleteItemConsumption({ itemId, materialId: row.id, revision: row.revision });
    setBusy(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setRows((current) => current.filter((r) => r.id !== row.id));
    setDrafts((current) => {
      const copy = { ...current };
      delete copy[row.id];
      return copy;
    });
    setMessage(`Material ${row.material} removido e custo recalculado.`);
    onChanged();
  }

  function chooseBase(index: string) {
    if (!index) return;
    const base = baseMaterials[Number(index)];
    if (!base) return;
    const rawConsumption = String(base.consumo ?? "").trim();
    setNext((old) => ({
      ...old,
      kind: kindFromBase(base.tipo),
      material: base.material ?? "",
      unit: base.unidade ?? "",
      consumption: numberInput(rawConsumption, 4, 99999999.9999) === null ? "" : rawConsumption,
    }));
  }

  const locked = busy || disabled || !editable;
  return (
    <section
      className="space-y-4 rounded-lg border border-border bg-card p-4"
      aria-label="Consumo de materiais do item"
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">Consumo dos materiais deste item</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Informe consumo por peça, perda e custo por unidade. Ao salvar, o custo deste item é
          recalculado; a ficha e a OP mostram apenas as quantidades.
        </p>
      </div>
      {loading && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando materiais…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-md border border-status-rejected/30 bg-status-rejected/10 p-3 text-xs text-status-rejected"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-md border border-status-approved/30 bg-status-approved/10 p-3 text-xs text-status-approved"
        >
          {message}
        </p>
      )}
      {!loading && !error && rows.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhum material lançado no consumo deste item.
        </p>
      )}
      {!loading &&
        rows.map((row) => {
          const values = drafts[row.id] ?? valuesFor(row);
          const isChanged = !sameValues(values, valuesFor(row));
          const total = Number(row.consumption) * (1 + Number(row.waste_pct) / 100) * quantity;
          return (
            <div key={row.id} className="space-y-3 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{row.material}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.kind} · {row.unit} · total salvo: {format(total)} {row.unit}
                  </p>
                </div>
                {isChanged && <span className="text-2xs text-status-progress">Não salvo</span>}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 text-xs text-muted-foreground">
                  Consumo por peça ({row.unit})
                  <Input
                    aria-label={`Consumo por peça de ${row.material}`}
                    inputMode="decimal"
                    value={values.consumption}
                    disabled={locked}
                    onChange={(e) => change(row.id, "consumption", e.target.value)}
                  />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Perda (%)
                  <Input
                    aria-label={`Perda de ${row.material} (%)`}
                    inputMode="decimal"
                    value={values.waste}
                    disabled={locked}
                    onChange={(e) => change(row.id, "waste", e.target.value)}
                  />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Custo unitário (R$/{row.unit})
                  <Input
                    aria-label={`Custo unitário de ${row.material}`}
                    inputMode="decimal"
                    value={values.unitCost}
                    disabled={locked}
                    onChange={(e) => change(row.id, "unitCost", e.target.value)}
                  />
                </label>
              </div>
              {editable && (
                <div className="flex flex-wrap justify-between gap-2">
                  {row.source === "custo" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={locked}
                      onClick={() => void removeMaterial(row)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remover
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Material originado no catálogo
                    </span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    aria-label={`Salvar consumo de ${row.material}`}
                    disabled={locked || !isChanged}
                    onClick={() => void saveRow(row)}
                  >
                    <Save className="h-3.5 w-3.5" /> Salvar consumo
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      {editable &&
        !loading &&
        !loadFailed &&
        (adding ? (
          <div className="space-y-3 rounded-md border border-dashed border-primary/30 p-3">
            <h4 className="text-sm font-semibold">Adicionar material ao item</h4>
            {baseMaterials.length > 0 && (
              <label className="block space-y-1 text-xs text-muted-foreground">
                Usar dados da ficha padrão como sugestão
                <select
                  aria-label="Material da ficha padrão"
                  defaultValue=""
                  disabled={locked}
                  onChange={(e) => chooseBase(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Selecione uma sugestão (opcional)</option>
                  {baseMaterials.map((m, i) => (
                    <option key={i} value={String(i)}>
                      {m.material || `Material ${i + 1}`} {m.unidade ? `· ${m.unidade}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs text-muted-foreground">
                Material
                <Input
                  aria-label="Novo material"
                  value={next.material}
                  maxLength={160}
                  disabled={locked}
                  onChange={(e) => setNext({ ...next, material: e.target.value })}
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Tipo
                <select
                  aria-label="Tipo do novo material"
                  value={next.kind}
                  disabled={locked}
                  onChange={(e) => setNext({ ...next, kind: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="tecido">Tecido</option>
                  <option value="aviamento">Aviamento</option>
                  <option value="linha">Linha</option>
                  <option value="embalagem">Embalagem</option>
                  <option value="servico">Serviço</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Unidade
                <Input
                  aria-label="Unidade do novo material"
                  value={next.unit}
                  maxLength={12}
                  disabled={locked}
                  onChange={(e) => setNext({ ...next, unit: e.target.value })}
                  placeholder="m, kg, un…"
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Consumo por peça
                <Input
                  aria-label="Consumo por peça do novo material"
                  inputMode="decimal"
                  value={next.consumption}
                  disabled={locked}
                  onChange={(e) => setNext({ ...next, consumption: e.target.value })}
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Perda (%)
                <Input
                  aria-label="Perda do novo material (%)"
                  inputMode="decimal"
                  value={next.waste}
                  disabled={locked}
                  onChange={(e) => setNext({ ...next, waste: e.target.value })}
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Custo unitário (R$)
                <Input
                  aria-label="Custo unitário do novo material"
                  inputMode="decimal"
                  value={next.unitCost}
                  disabled={locked}
                  onChange={(e) => setNext({ ...next, unitCost: e.target.value })}
                  placeholder="Informe o custo"
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              A sugestão não cria uma linha automaticamente. Confira o consumo e informe o custo
              unitário antes de adicionar.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={locked}
                onClick={() => void createMaterial()}
              >
                Adicionar e recalcular
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={locked}
                onClick={() => {
                  setAdding(false);
                  setNext(emptyNew());
                  setError(null);
                }}
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
            disabled={locked}
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar material
          </Button>
        ))}
      {!editable && (
        <p className="text-xs text-muted-foreground">
          Item aprovado ou fora do custo: consumo somente para consulta.
        </p>
      )}
    </section>
  );
}
