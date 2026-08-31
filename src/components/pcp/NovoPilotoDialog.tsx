// V5 · Modal para criar novo piloto com tipo, fornecedor e status inicial.
// H · Suporta trigger customizado para fluxo de repilotagem (reexecutar).
import { useState, useEffect, type ReactNode } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldMessage } from "@/components/ui/field-message";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { useCreatePiloto } from "@/hooks/use-pilotos";
import { useSuppliers } from "@/hooks/use-suppliers";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const schema = z.object({
  tipo: z.enum(["prova", "ajuste", "final"]),
  status: z.enum(["RASCUNHO", "EM_DESENVOLVIMENTO"]),
  supplier_id: z
    .string()
    .trim()
    .max(64)
    .optional()
    .refine((v) => !v || UUID_RE.test(v), {
      message: "UUID de fornecedor inválido",
    }),
  observacoes: z.string().trim().max(1000).optional(),
});

interface Props {
  referenceId: string;
  referenciaNome: string;
  onCreated?: (piloto: import("@/hooks/use-pilotos").Piloto) => void;
  /** Rodada corrente (usada para exibir "Rodada N+1" no trigger). */
  currentRodada?: number;
  defaultTipo?: "prova" | "ajuste" | "final";
  defaultStatus?: "RASCUNHO" | "EM_DESENVOLVIMENTO";
  defaultObservacoes?: string;
  trigger?: ReactNode;
}

export function NovoPilotoDialog({
  referenceId,
  referenciaNome,
  onCreated,
  currentRodada,
  defaultTipo = "prova",
  defaultStatus = "RASCUNHO",
  defaultObservacoes = "",
  trigger,
}: Props) {
  const { create } = useCreatePiloto();
  const { items: suppliers, loading: loadingSuppliers } = useSuppliers();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [tipo, setTipo] = useState<"prova" | "ajuste" | "final">(defaultTipo);
  const [status, setStatus] = useState<"RASCUNHO" | "EM_DESENVOLVIMENTO">(
    defaultStatus,
  );
  const [supplierId, setSupplierId] = useState("none");
  const [observacoes, setObservacoes] = useState(defaultObservacoes);
  const [errors, setErrors] = useState<{ supplier_id?: string; observacoes?: string }>({});

  // Ao reabrir, respeita novos defaults (ex.: trigger de repilotagem).
  useEffect(() => {
    if (open) {
      setTipo(defaultTipo);
      setStatus(defaultStatus);
      setObservacoes(defaultObservacoes);
      setErrors({});
    }
  }, [open, defaultTipo, defaultStatus, defaultObservacoes]);

  const reset = () => {
    setTipo(defaultTipo);
    setStatus(defaultStatus);
    setSupplierId("none");
    setObservacoes(defaultObservacoes);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      tipo,
      status,
      supplier_id: supplierId === "none" ? undefined : supplierId,
      observacoes: observacoes || undefined,
    });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof errors;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setPending(true);
    const p = await create({
      reference_id: referenceId,
      tipo: parsed.data.tipo,
      status: parsed.data.status,
      supplier_id: parsed.data.supplier_id ?? null,
      observacoes: parsed.data.observacoes ?? null,
    });
    setPending(false);
    if (!p) {
      toast.error("Falha ao criar piloto");
      return;
    }
    toast.success(`Piloto rodada ${p.rodada} criado (${p.status})`);
    setOpen(false);
    reset();
    onCreated?.(p);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-1">
            <Plus className="h-3 w-3" />
            Novo piloto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {currentRodada && currentRodada > 0
              ? `Reexecutar piloto · Rodada ${currentRodada + 1}`
              : "Novo piloto"}
          </DialogTitle>
          <DialogDescription>
            {referenciaNome} · a rodada é calculada automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(v) =>
                  setTipo(v as "prova" | "ajuste" | "final")
                }
              >
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prova">Prova</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Status inicial</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setStatus(v as "RASCUNHO" | "EM_DESENVOLVIMENTO")
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                  <SelectItem value="EM_DESENVOLVIMENTO">
                    Em desenvolvimento
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="supplier">Fornecedor / Facção</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger id="supplier" aria-invalid={!!errors.supplier_id}>
                <SelectValue placeholder={loadingSuppliers ? "Carregando…" : "Selecionar"} />
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
            <FieldMessage variant={errors.supplier_id ? "error" : "helper"}>
              {errors.supplier_id ?? "Quem vai costurar a peça piloto. Pode ser definido depois."}
            </FieldMessage>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obs">Observações</Label>
            <Textarea
              id="obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas iniciais, briefing, ajustes esperados…"
              maxLength={1000}
              rows={3}
              aria-invalid={!!errors.observacoes}
            />
            {errors.observacoes && (
              <FieldMessage variant="error">{errors.observacoes}</FieldMessage>
            )}
          </div>

          <DialogFooter>
            <Button
 type="button"
 variant="ghost"
 onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Criar piloto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
