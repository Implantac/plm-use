import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldMessage } from "@/components/ui/field-message";
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
  SETORES_PCP,
  pendenteReferencia,
  type LinhaPassagem,
  type ReferenciaLote,
  type SetorPCP,
  type TipoPassagem,
} from "@/types/pcp";

interface Props {
  loteNumero: string;
  referencia: ReferenciaLote;
  linha: LinhaPassagem;
}

export function PassagemForm({ loteNumero, referencia, linha }: Props) {
  const registrar = usePCPStore((s) => s.registrarPassagem);
  const pendente = pendenteReferencia(referencia);
  const [tipo, setTipo] = useState<TipoPassagem>("integral");
  const [qtd, setQtd] = useState<number>(linha === "1a" ? pendente : 0);
  const [destino, setDestino] = useState<SetorPCP | "">("");
  const [resp, setResp] = useState("");
  const [obs, setObs] = useState("");
  const [defeito, setDefeito] = useState("");
  const [errors, setErrors] = useState<{
    responsavel?: string;
    defeito?: string;
    form?: string;
  }>({});

  const handleSubmit = () => {
    const next: typeof errors = {};
    if (!resp.trim()) next.responsavel = "Informe o responsável.";
    if (linha === "2a" && !defeito.trim())
      next.defeito = "Descreva o tipo de defeito para o retrabalho.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    const res = registrar({
      lote: loteNumero,
      ref: referencia.ref,
      tipo,
      linha,
      qtd: Number(qtd),
      setor_destino: linha === "1a" ? destino || null : null,
      responsavel: resp,
      observacao: obs || undefined,
      defeito: linha === "2a" ? defeito || undefined : undefined,
    });
    if (!res.ok) {
      setErrors({ form: res.erro ?? "Erro ao registrar passagem." });
      return;
    }
    setErrors({});
    toast.success(
      linha === "1a"
        ? `Passagem ${tipo} registrada (${qtd} pç)`
        : `Retrabalho registrado (${qtd} pç)`,
    );
    setObs("");
    setDefeito("");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-[11px]">
        <div className="flex justify-between text-muted-foreground">
          <span>Setor atual</span>
          <span className="font-bold text-white">{referencia.setor_atual}</span>
        </div>
        <div className="mt-1 flex justify-between text-muted-foreground">
          <span>Saldo pendente</span>
          <span className="font-bold text-amber-300">{pendente} pç</span>
        </div>
      </div>

      {linha === "1a" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Tipo
              </Label>
              <Select
                value={tipo}
                onValueChange={(v) => {
                  setTipo(v as TipoPassagem);
                  if (v === "integral") setQtd(pendente);
                }}
              >
                <SelectTrigger className="">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="integral">Integral</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Setor destino
              </Label>
              <Select value={destino} onValueChange={(v) => setDestino(v as SetorPCP)}>
                <SelectTrigger className="">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {SETORES_PCP.filter((s) => s !== referencia.setor_atual).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {linha === "2a" && (
        <div>
          <Label required>Tipo de defeito</Label>
          <Input
            value={defeito}
            onChange={(e) => setDefeito(e.target.value)}
            placeholder="Ex: silk torto, peça manchada, costura aberta"
            aria-invalid={!!errors.defeito}
          />
          {errors.defeito && <FieldMessage variant="error">{errors.defeito}</FieldMessage>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Quantidade</Label>
          <Input
            type="number"
            value={qtd}
            onChange={(e) => setQtd(Number(e.target.value))}
            disabled={linha === "1a" && tipo === "integral"}
          />
        </div>
        <div>
          <Label required>Responsável</Label>
          <Input
            value={resp}
            onChange={(e) => setResp(e.target.value)}
            placeholder="Nome do operador"
            aria-invalid={!!errors.responsavel}
          />
          {errors.responsavel && <FieldMessage variant="error">{errors.responsavel}</FieldMessage>}
        </div>
      </div>

      <div>
        <Label>Observação</Label>
        <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
      </div>

      {errors.form && <FieldMessage variant="error">{errors.form}</FieldMessage>}

      <Button onClick={handleSubmit} className="w-full text-[10px]">
        Registrar {linha === "1a" ? "Passagem" : "Retrabalho"}
      </Button>
    </div>
  );
}
