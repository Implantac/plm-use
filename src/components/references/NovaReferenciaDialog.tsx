// Cadastro guiado de referência — foco em operação simples do PLM.
// Sugere código automático, valida inline e permite já iniciar o piloto rodada 1.
import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldMessage } from "@/components/ui/field-message";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreatePiloto } from "@/hooks/use-pilotos";
import { useSuppliers } from "@/hooks/use-suppliers";
import {
  REFERENCE_PRIORITIES,
  REFERENCE_STATUS_LABEL,
  type ReferencePriority,
  type ReferenceRow,
  type ReferenceStatus,
} from "@/hooks/use-references";

const ENTRY_STATUSES: ReferenceStatus[] = ["IDEIA", "CROQUI", "MODELAGEM", "PILOTO"];

function suggestCode(existing: string[], collection: string) {
  const prefix = (collection.trim().slice(0, 2) || "RF").toUpperCase().replace(/[^A-Z]/g, "R");
  const nums = existing
    .map((c) => Number(c.match(/(\d{2,})\s*$/)?.[1] ?? NaN))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

export interface NovaReferenciaInput {
  code: string;
  name: string;
  collection_id?: string;
  line?: string;
  theme?: string;
  season?: string;
  priority?: ReferencePriority;
  status?: ReferenceStatus;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCodes: string[];
  onCreate: (input: NovaReferenciaInput) => Promise<ReferenceRow | null>;
  onCreated?: (created: ReferenceRow) => void;
}

export function NovaReferenciaDialog({
  open,
  onOpenChange,
  existingCodes,
  onCreate,
  onCreated,
}: Props) {
  const { create: createPiloto } = useCreatePiloto();
  const { items: suppliers } = useSuppliers();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [collection, setCollection] = useState("");
  const [line, setLine] = useState("");
  const [theme, setTheme] = useState("");
  const [season, setSeason] = useState("");
  const [priority, setPriority] = useState<ReferencePriority>("MEDIA");
  const [status, setStatus] = useState<ReferenceStatus>("IDEIA");
  const [briefing, setBriefing] = useState("");
  const [comPiloto, setComPiloto] = useState(false);
  const [supplierId, setSupplierId] = useState("none");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({});

  useEffect(() => {
    if (!open) return;
    setCode("");
    setName("");
    setCollection("");
    setLine("");
    setTheme("");
    setSeason("");
    setPriority("MEDIA");
    setStatus("IDEIA");
    setBriefing("");
    setComPiloto(false);
    setSupplierId("none");
    setErrors({});
  }, [open]);

  const codeTaken = useMemo(
    () => existingCodes.some((c) => c.toLowerCase() === code.trim().toLowerCase()),
    [existingCodes, code],
  );

  const validate = () => {
    const next: typeof errors = {};
    if (!code.trim()) next.code = "Informe o código da referência.";
    else if (codeTaken) next.code = "Já existe uma referência com este código.";
    if (!name.trim()) next.name = "Dê um nome claro para a peça.";
    setErrors(next);
    if (next.code) document.getElementById("ref-code")?.focus();
    else if (next.name) document.getElementById("ref-name")?.focus();
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    const created = await onCreate({
      code: code.trim(),
      name: name.trim(),
      collection_id: collection.trim() || undefined,
      line: line.trim() || undefined,
      theme: theme.trim() || undefined,
      season: season.trim() || undefined,
      priority,
      status: comPiloto ? "PILOTO" : status,
    });
    if (!created) {
      setBusy(false);
      toast.error("Falha ao criar referência");
      return;
    }
    if (comPiloto) {
      const p = await createPiloto({
        reference_id: created.id,
        tipo: "prova",
        status: "EM_DESENVOLVIMENTO",
        supplier_id: supplierId === "none" ? null : supplierId,
        observacoes: briefing.trim() || null,
      });
      if (p) toast.success(`Referência ${created.code} criada com piloto rodada ${p.rodada}`);
      else toast.warning(`Referência ${created.code} criada, mas o piloto falhou`);
    } else {
      toast.success(`Referência ${created.code} criada em ${REFERENCE_STATUS_LABEL[created.status]}`);
    }
    setBusy(false);
    onOpenChange(false);
    onCreated?.(created);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-h-[88dvh] overflow-y-auto border-white/10 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova referência</DialogTitle>
          <DialogDescription>
            Identifique a peça, escolha a etapa inicial do ciclo de vida e, se quiser, já abra o piloto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              1 · Identificação
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ref-code">Código *</Label>
                <div className="flex gap-2">
                  <Input
                    id="ref-code"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setErrors((p) => ({ ...p, code: undefined }));
                    }}
                    placeholder="VR-001"
                    aria-invalid={!!errors.code}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Sugerir código"
                    onClick={() => {
                      setCode(suggestCode(existingCodes, collection));
                      setErrors((p) => ({ ...p, code: undefined }));
                    }}
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <FieldMessage variant={errors.code ? "error" : "helper"}>
                  {errors.code ?? "Use o botão da varinha para gerar o próximo código livre."}
                </FieldMessage>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ref-priority">Prioridade</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as ReferencePriority)}>
                  <SelectTrigger id="ref-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFERENCE_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ref-name">Nome da peça *</Label>
                <Input
                  id="ref-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors((p) => ({ ...p, name: undefined }));
                  }}
                  placeholder="Camiseta manga curta gola V"
                  aria-invalid={!!errors.name}
                />
                {errors.name && <FieldMessage variant="error">{errors.name}</FieldMessage>}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              2 · Coleção
            </p>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="ref-collection">Coleção</Label>
                <Input
                  id="ref-collection"
                  value={collection}
                  onChange={(e) => setCollection(e.target.value)}
                  placeholder="Verão 2027"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref-line">Linha</Label>
                <Input id="ref-line" value={line} onChange={(e) => setLine(e.target.value)} placeholder="Casual" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref-theme">Tema</Label>
                <Input id="ref-theme" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Beachwear" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref-season">Temporada</Label>
                <Input id="ref-season" value={season} onChange={(e) => setSeason(e.target.value)} placeholder="SS27" />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              3 · Ciclo de vida
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ref-status">Etapa inicial</Label>
                <Select
                  value={comPiloto ? "PILOTO" : status}
                  onValueChange={(v) => setStatus(v as ReferenceStatus)}
                  disabled={comPiloto}
                >
                  <SelectTrigger id="ref-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTRY_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {REFERENCE_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldMessage variant="helper">
                  {comPiloto
                    ? "Com piloto inicial a referência entra direto em Piloto."
                    : "Você pode avançar as etapas depois pelo Fluxo do Produto."}
                </FieldMessage>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ref-supplier">Fornecedor / Facção do piloto</Label>
                <Select value={supplierId} onValueChange={setSupplierId} disabled={!comPiloto}>
                  <SelectTrigger id="ref-supplier">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem fornecedor definido</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} · {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3">
              <Checkbox
                checked={comPiloto}
                onCheckedChange={(v) => setComPiloto(v === true)}
                aria-label="Criar piloto rodada 1"
              />
              <span className="text-[12px] leading-relaxed">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Já abrir piloto rodada 1
                </span>
                <span className="text-muted-foreground">
                  Cria a peça piloto vinculada à referência, pronta para acompanhamento.
                </span>
              </span>
            </label>

            <div className="space-y-1.5">
              <Label htmlFor="ref-briefing">Briefing / observações do piloto</Label>
              <Textarea
                id="ref-briefing"
                value={briefing}
                onChange={(e) => setBriefing(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Tecido, caimento, referências visuais, pontos de atenção…"
              />
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {comPiloto ? "Criar referência + piloto" : "Criar referência"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
