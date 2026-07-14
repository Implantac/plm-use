// Modal de confirmação para iniciar o fluxo do PCP a partir do PLM.
// Permite escolher a primeira etapa antes de navegar para /production.
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Workflow, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { PCPStepId } from "./PCPFlowDiagram";

interface StartStep {
  id: PCPStepId;
  label: string;
  detail: string;
}

const START_STEPS: StartStep[] = [
  { id: "handoff", label: "Handoff PLM → PCP", detail: "Registrar o repasse formal do piloto aprovado." },
  { id: "analisar", label: "1 · Analisar produção", detail: "Pular handoff e ir direto para demanda/quantidades." },
  { id: "almoxarifado", label: "2 · Verificar almoxarifado", detail: "Referência já analisada; conferir cores/tecidos." },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenciaRef: string;
  referenciaNome: string;
}

export function IniciarPCPDialog({ open, onOpenChange, referenciaRef, referenciaNome }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<PCPStepId>("handoff");

  const handleConfirm = () => {
    onOpenChange(false);
    navigate({
      to: "/production",
      search: { pcpStep: step, pcpRef: referenciaRef },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em]">
            <Workflow className="h-4 w-4 text-primary" />
            Iniciar fluxo PCP
          </DialogTitle>
          <DialogDescription className="text-[11px] leading-relaxed">
            Confirme o handoff do piloto aprovado{" "}
            <span className="font-bold text-white">{referenciaNome}</span> para
            o PCP e escolha por onde começar. O restante do fluxo permanecerá
            carregado no mesmo contexto em Produção.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Badge
            variant="outline"
            className="border-primary/40 text-primary text-[9px] uppercase tracking-widest"
          >
            Ref · {referenciaRef}
          </Badge>

          <RadioGroup
            value={step}
            onValueChange={(v) => setStep(v as PCPStepId)}
            className="space-y-2"
          >
            {START_STEPS.map((s) => (
              <Label
                key={s.id}
                htmlFor={`pcp-start-${s.id}`}
                className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition ${
                  step === s.id
                    ? "border-primary/60 bg-primary/[0.06]"
                    : "border-white/10 bg-white/[0.02] hover:border-primary/30"
                }`}
              >
                <RadioGroupItem
                  id={`pcp-start-${s.id}`}
                  value={s.id}
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                    {s.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/70">{s.detail}</p>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm} className="gap-1.5">
            Abrir no PCP
            <ArrowRight className="h-3 w-3" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
