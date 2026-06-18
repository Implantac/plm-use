import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { usePCPStore } from "@/lib/pcp/store";
import {
  saldoReferencia,
  type ReferenciaLote,
  type TipoOcorrencia,
} from "@/types/pcp";

interface Props {
  loteNumero: string;
  referencia: ReferenciaLote;
}

export function OcorrenciaForm({ loteNumero, ref }: Props) {
  const registrar = usePCPStore((s) => s.registrarOcorrencia);
  const [tipo, setTipo] = useState<TipoOcorrencia>("neutra");
  const [qtd, setQtd] = useState<number>(0);
  const [motivo, setMotivo] = useState("");
  const [resp, setResp] = useState("");
  const [obs, setObs] = useState("");

  const handleSubmit = () => {
    if (!motivo) {
      toast.error("Informe o motivo");
      return;
    }
    if (!resp) {
      toast.error("Informe o responsável");
      return;
    }
    const res = registrar({
      lote: loteNumero,
      ref: ref.ref,
      tipo,
      qtd: Number(qtd),
      motivo,
      responsavel: resp,
      observacao: obs || undefined,
    });
    if (!res.ok) {
      toast.error(res.erro ?? "Erro ao registrar ocorrência");
      return;
    }
    toast.success(`Ocorrência ${tipo} registrada (${qtd} pç)`);
    setMotivo("");
    setObs("");
    setQtd(0);
  };

  const corTipo =
    tipo === "positiva"
      ? "border-emerald-400/30 bg-emerald-400/5"
      : tipo === "negativa"
        ? "border-rose-400/30 bg-rose-400/5"
        : "border-amber-300/30 bg-amber-300/5";

  return (
    <div className="space-y-4">
      <div className={`rounded-md border p-3 text-[11px] ${corTipo}`}>
        <p className="text-muted-foreground">
          <strong className="text-white">Positiva</strong>: aumenta produção
          final • <strong className="text-white">Negativa</strong>: reduz
          saldo final • <strong className="text-white">Neutra</strong>:
          registra evento sem afetar saldo.
        </p>
        <p className="mt-2 text-muted-foreground">
          Saldo atual previsto:{" "}
          <span className="font-bold text-white">{saldoReferencia(ref)} pç</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Tipo
          </Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoOcorrencia)}>
            <SelectTrigger className="mt-1 h-10 bg-white/5 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="positiva">Positiva (+)</SelectItem>
              <SelectItem value="negativa">Negativa (-)</SelectItem>
              <SelectItem value="neutra">Neutra (0)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Quantidade
          </Label>
          <Input
            type="number"
            value={qtd}
            onChange={(e) => setQtd(Number(e.target.value))}
            className="mt-1 h-10 bg-white/5 border-white/10"
          />
        </div>
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Motivo
        </Label>
        <Input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex: Aproveitamento de retalho, defeito de malha..."
          className="mt-1 h-10 bg-white/5 border-white/10"
        />
      </div>
      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Responsável
        </Label>
        <Input
          value={resp}
          onChange={(e) => setResp(e.target.value)}
          className="mt-1 h-10 bg-white/5 border-white/10"
        />
      </div>
      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Observação
        </Label>
        <Textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          rows={2}
          className="mt-1 bg-white/5 border-white/10"
        />
      </div>

      <Button
        onClick={handleSubmit}
        className="w-full h-10 btn-primary-premium rounded-md text-[10px] font-bold uppercase tracking-widest"
      >
        Registrar Ocorrência
      </Button>
    </div>
  );
}
