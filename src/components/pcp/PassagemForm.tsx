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

export function PassagemForm({ loteNumero, ref, linha }: Props) {
  const registrar = usePCPStore((s) => s.registrarPassagem);
  const pendente = pendenteReferencia(ref);
  const [tipo, setTipo] = useState<TipoPassagem>("integral");
  const [qtd, setQtd] = useState<number>(linha === "1a" ? pendente : 0);
  const [destino, setDestino] = useState<SetorPCP | "">("");
  const [resp, setResp] = useState("");
  const [obs, setObs] = useState("");
  const [defeito, setDefeito] = useState("");

  const handleSubmit = () => {
    if (!resp) {
      toast.error("Informe o responsável");
      return;
    }
    const res = registrar({
      lote: loteNumero,
      ref: ref.ref,
      tipo,
      linha,
      qtd: Number(qtd),
      setor_destino: linha === "1a" ? (destino || null) : null,
      responsavel: resp,
      observacao: obs || undefined,
      defeito: linha === "2a" ? defeito || undefined : undefined,
    });
    if (!res.ok) {
      toast.error(res.erro ?? "Erro ao registrar passagem");
      return;
    }
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
          <span className="font-bold text-white">{ref.setor_atual}</span>
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
                <SelectTrigger className="mt-1 h-10 bg-white/5 border-white/10">
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
              <Select
                value={destino}
                onValueChange={(v) => setDestino(v as SetorPCP)}
              >
                <SelectTrigger className="mt-1 h-10 bg-white/5 border-white/10">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {SETORES_PCP.filter((s) => s !== ref.setor_atual).map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {linha === "2a" && (
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Tipo de defeito
          </Label>
          <Input
            value={defeito}
            onChange={(e) => setDefeito(e.target.value)}
            placeholder="Ex: silk torto, peça manchada, costura aberta"
            className="mt-1 h-10 bg-white/5 border-white/10"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Quantidade
          </Label>
          <Input
            type="number"
            value={qtd}
            onChange={(e) => setQtd(Number(e.target.value))}
            disabled={linha === "1a" && tipo === "integral"}
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
            placeholder="Nome do operador"
            className="mt-1 h-10 bg-white/5 border-white/10"
          />
        </div>
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
        Registrar {linha === "1a" ? "Passagem" : "Retrabalho"}
      </Button>
    </div>
  );
}
