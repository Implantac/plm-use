// Pilotagem, Prova de Caimento & Auditoria de Medidas POM (Lacre Bidirecional c/ Ficha Técnica).
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Image,
  MessageSquare,
  Ruler,
  Scissors,
  ShieldCheck,
  UserCheck,
  Video,
} from "lucide-react";
import { onQuickAction } from "@/lib/nav/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ModuleActionMenu, ModuleLayout } from "@/components/modules/ModuleLayout";
import { OptimizedImage } from "@/components/OptimizedImage";
import { PROTOTYPE_STAGES, usePrototypeStore, type PrototypeItem } from "@/lib/prototypes/store";
import { defaultMedidasFor, useTechSheetStore } from "@/lib/techsheet/store";
import { round2 } from "@/lib/techsheet/textile";
import { useCreatePiloto } from "@/hooks/use-pilotos";
import { useReferences } from "@/hooks/use-references";

export const Route = createFileRoute("/_authenticated/prototypes")({
  component: PrototypesPage,
});

function PrototypesPage() {
  const navigate = useNavigate();
  const prototypes = usePrototypeStore((s) => s.items);
  const upsert = usePrototypeStore((s) => s.upsert);
  const createLocal = usePrototypeStore((s) => s.create);
  const advanceStage = usePrototypeStore((s) => s.advanceStage);
  const remove = usePrototypeStore((s) => s.remove);

  const ensureSheet = useTechSheetStore((s) => s.ensure);
  const techDocs = useTechSheetStore((s) => s.data);
  const setMedidas = useTechSheetStore((s) => s.setMedidas);
  const updateMeta = useTechSheetStore((s) => s.updateMeta);
  const createVersion = useTechSheetStore((s) => s.createVersion);

  const { items: dbRefs } = useReferences();
  const { create: createDbPiloto } = useCreatePiloto();

  const [searchQ, setSearchQ] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrototype, setEditingPrototype] = useState<PrototypeItem | null>(null);
  const [formData, setFormData] = useState({
    refCode: "DEV000006",
    name: "",
    version: "",
    requester: "",
    owner: "",
  });

  // Modal de Auditoria de Medidas POM & Lacre da Piloto
  const [fitProto, setFitProto] = useState<PrototypeItem | null>(null);
  const [measuredMap, setMeasuredMap] = useState<Record<string, number>>({});
  const [fitNotes, setFitNotes] = useState("");
  const [adoptMeasuredOnApprove, setAdoptMeasuredOnApprove] = useState(false);

  const visiblePrototypes = useMemo(() => {
    const needle = searchQ.trim().toLowerCase();
    if (!needle) return prototypes;
    return prototypes.filter(
      (p) =>
        p.refCode.toLowerCase().includes(needle) ||
        p.name.toLowerCase().includes(needle) ||
        p.owner.toLowerCase().includes(needle) ||
        p.stage.toLowerCase().includes(needle),
    );
  }, [prototypes, searchQ]);

  const handleOpenDialog = (prototype?: PrototypeItem) => {
    if (prototype) {
      setEditingPrototype(prototype);
      setFormData({
        refCode: prototype.refCode,
        name: prototype.name,
        version: prototype.version,
        requester: prototype.requester,
        owner: prototype.owner,
      });
    } else {
      setEditingPrototype(null);
      setFormData({
        refCode: "DEV000006",
        name: "",
        version: "1ª Prova — corte piloto",
        requester: "",
        owner: "",
      });
    }
    setIsDialogOpen(true);
  };

  useEffect(() => onQuickAction("quick:new-piloto", () => handleOpenDialog()), []);

  const openFitAudit = (proto: PrototypeItem) => {
    const code = proto.refCode.toUpperCase();
    const sheet = techDocs[code] ?? ensureSheet(code);
    const spec = sheet.medidas ?? defaultMedidasFor();
    const initial: Record<string, number> = {};
    for (const pt of spec.pontos) {
      initial[pt.id] = pt.valorBase;
    }
    setMeasuredMap(initial);
    setFitNotes(proto.lacreObs ?? "");
    setAdoptMeasuredOnApprove(false);
    setFitProto(proto);
  };

  const fitSpec = useMemo(() => {
    if (!fitProto) return defaultMedidasFor();
    const code = fitProto.refCode.toUpperCase();
    const sheet = techDocs[code] ?? ensureSheet(code);
    return sheet.medidas ?? defaultMedidasFor();
  }, [fitProto, techDocs, ensureSheet]);

  const fitDeviations = useMemo(() => {
    return fitSpec.pontos.map((pt) => {
      const medido = measuredMap[pt.id] ?? pt.valorBase;
      const delta = round2(medido - pt.valorBase);
      const outOfTol = Math.abs(delta) > pt.toleranciaCm + 0.001;
      return { pt, medido, delta, outOfTol };
    });
  }, [fitSpec, measuredMap]);

  const outOfTolCount = fitDeviations.filter((d) => d.outOfTol).length;

  const handleRequestFitAdjustment = () => {
    if (!fitProto) return;
    upsert({
      ...fitProto,
      status: "Ajuste",
      stage: "Prova de Caimento",
      adjustments: Math.max(1, outOfTolCount),
      lacreObs:
        fitNotes.trim() || `${outOfTolCount} cota(s) POM fora da tolerância na prova física.`,
    });
    updateMeta(fitProto.refCode.toUpperCase(), { stage: 6 });
    setFitProto(null);
    toast.warning(
      `Piloto ${fitProto.id} enviada para ajuste de modelagem (${Math.max(1, outOfTolCount)} pendência(s)).`,
    );
  };

  const handleApproveAndSealPilot = () => {
    if (!fitProto) return;
    const code = fitProto.refCode.toUpperCase();
    ensureSheet(code);

    if (adoptMeasuredOnApprove) {
      setMedidas(code, {
        ...fitSpec,
        pontos: fitSpec.pontos.map((pt) => ({
          ...pt,
          valorBase: round2(measuredMap[pt.id] ?? pt.valorBase),
        })),
      });
    }

    updateMeta(code, { stage: 7, statusLabel: "Piloto Lacrada" });
    createVersion(
      code,
      fitProto.owner || "Qualidade Pilotagem",
      `Lacre de Peça Piloto (${fitProto.id}) — liberada para Custo & OP`,
      [
        fitNotes.trim() || `Prova física aprovada na base ${fitSpec.tamanhoBase}`,
        ...(adoptMeasuredOnApprove ? ["Cotas base atualizadas conforme peça lacrada"] : []),
      ],
    );

    upsert({
      ...fitProto,
      stage: "Aprovação / Lacre",
      status: "Aprovado",
      progress: 100,
      adjustments: 0,
      lacreObs: fitNotes.trim() || "Peça piloto aprovada e lacrada.",
    });

    setFitProto(null);
    toast.success(
      `Peça piloto ${fitProto.id} LACRADA! Ficha ${code} avançada para 7. Custo & Preço com versão congelada.`,
    );
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Informe o nome da peça piloto.");
      return;
    }
    if (editingPrototype) {
      upsert({
        ...editingPrototype,
        ...formData,
        refCode: formData.refCode.trim().toUpperCase(),
      });
      toast.success("Peça piloto atualizada.");
    } else {
      const created = createLocal(formData);
      const matchedRef = dbRefs.find((r) => r.code.toUpperCase() === created.refCode.toUpperCase());
      if (matchedRef) {
        await createDbPiloto({
          reference_id: matchedRef.id,
          tipo: "prova",
          observacoes: `${created.version} · Resp.: ${created.owner}`,
        });
      }
      toast.success(`Piloto ${created.id} (${created.refCode}) registrado com persistência.`);
    }
    setIsDialogOpen(false);
  };

  return (
    <ModuleLayout
      title="Pilotagem, Prova de Medidas POM & Lacre"
      subtitle="Controle persistente de peças piloto com auditoria física das cotas POM (Base M) e lacre integrado à Ficha Técnica Fluida."
      version="Craft v4.1 PLM"
      searchPlaceholder="Buscar piloto por referência, etapa ou pilotista"
      onSearch={setSearchQ}
      onAdd={() => handleOpenDialog()}
      metrics={[
        { label: "Pilotos ativos", value: String(prototypes.length), detail: "persistidos" },
        {
          label: "Ajustes abertos",
          value: String(prototypes.reduce((sum, item) => sum + item.adjustments, 0)),
          detail: "modelagem/costura",
        },
        {
          label: "Evidências",
          value: String(prototypes.reduce((sum, item) => sum + item.photos + item.videos, 0)),
          detail: "fotos e vídeos",
        },
        {
          label: "Lacrados",
          value: String(prototypes.filter((item) => item.status === "Aprovado").length),
          detail: "aptos para OP",
        },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {visiblePrototypes.map((prototype) => (
          <Card
            key={prototype.id}
            className="glass-card rounded-lg overflow-hidden hover:border-teal-500/40 transition-colors"
          >
            <div className="relative h-52 overflow-hidden">
              <OptimizedImage
                src={prototype.image}
                alt={prototype.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 to-transparent" />
              <div className="absolute left-4 bottom-4 right-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-2xs font-mono font-bold uppercase tracking-wider text-teal-500">
                    {prototype.id} · REF {prototype.refCode}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-foreground">{prototype.name}</h3>
                  <p className="mt-0.5 text-2xs text-muted-foreground">{prototype.version}</p>
                </div>
                <ModuleActionMenu
                  onEdit={() => handleOpenDialog(prototype)}
                  onDelete={() => {
                    remove(prototype.id);
                    toast.info("Piloto removido.");
                  }}
                  onView={() =>
                    void navigate({ to: "/tech-sheet", search: { ref: prototype.refCode } })
                  }
                />
              </div>
            </div>

            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Etapa", value: prototype.stage, icon: Scissors },
                  { label: "Status", value: prototype.status, icon: CheckCircle2 },
                  { label: "Solicitante", value: prototype.requester, icon: MessageSquare },
                  { label: "Pilotista", value: prototype.owner, icon: UserCheck },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-md border border-border bg-muted/50 p-2.5"
                  >
                    <item.icon className="h-3.5 w-3.5 text-teal-500" />
                    <p className="mt-1.5 text-2xs uppercase text-muted-foreground">{item.label}</p>
                    <p className="mt-0.5 text-xs font-semibold text-foreground truncate">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {prototype.lacreObs && (
                <p className="text-2xs text-muted-foreground rounded border border-border/60 bg-background/50 px-2.5 py-1.5">
                  {prototype.lacreObs}
                </p>
              )}

              <div className="space-y-1.5">
                <div className="flex justify-between text-2xs font-semibold uppercase text-muted-foreground">
                  <span>Evolução até o lacre ({PROTOTYPE_STAGES.length} etapas)</span>
                  <span className="text-foreground">{prototype.progress}%</span>
                </div>
                <Progress value={prototype.progress} className="h-2 bg-muted" />
              </div>

              <div className="flex items-center justify-between border-t border-border/60 pt-3 gap-1.5 flex-wrap">
                <div className="flex gap-2.5 text-2xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Image className="h-3.5 w-3.5" /> {prototype.photos}
                  </span>
                  <span className="flex items-center gap-1">
                    <Video className="h-3.5 w-3.5" /> {prototype.videos}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-2xs gap-1"
                    onClick={() =>
                      void navigate({ to: "/tech-sheet", search: { ref: prototype.refCode } })
                    }
                  >
                    <ExternalLink className="w-3 h-3" /> Ficha
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-2xs gap-1 border-teal-500/45 hover:border-teal-500"
                    onClick={() => openFitAudit(prototype)}
                  >
                    <Ruler className="w-3 h-3 text-teal-500" /> Prova POM &amp; Lacre
                  </Button>
                  {prototype.status !== "Aprovado" && (
                    <Button
                      size="sm"
                      className="h-7 text-2xs gap-1 bg-teal-600 hover:bg-teal-500 text-[#EEF7FA]"
                      onClick={() => {
                        advanceStage(prototype.id);
                        toast.success(`Piloto ${prototype.id} avançado de etapa.`);
                      }}
                    >
                      Avançar <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog: Auditoria Física de Medidas POM & Lacre da Peça Piloto */}
      <Dialog open={Boolean(fitProto)} onOpenChange={(o) => !o && setFitProto(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-500" />
              Conferência de Medidas na Mesa (Base {fitSpec.tamanhoBase}) · {fitProto?.id} (
              {fitProto?.refCode})
            </DialogTitle>
          </DialogHeader>
          {fitProto && (
            <div className="space-y-3 py-1 text-xs max-h-[68vh] overflow-y-auto">
              <p className="text-muted-foreground">
                Compare as cotas previstas na Ficha Técnica com a peça piloto costurada. Desvios
                acima da tolerância sinalizam necessidade de ajuste no molde CAD antes do corte.
              </p>

              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 px-2 text-left">POM · Medida</th>
                      <th className="py-2 px-2 text-right">Previsto ({fitSpec.tamanhoBase})</th>
                      <th className="py-2 px-2 text-right">Tolerância</th>
                      <th className="py-2 px-2 text-right w-28">Medido Piloto</th>
                      <th className="py-2 px-2 text-right">Desvio</th>
                      <th className="py-2 px-2 text-center">Laudo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {fitDeviations.map(({ pt, medido, delta, outOfTol }) => (
                      <tr key={pt.id}>
                        <td className="py-1.5 px-2">
                          <strong className="font-mono">{pt.codigo}</strong> · {pt.nome}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono">{pt.valorBase} cm</td>
                        <td className="py-1.5 px-2 text-right font-mono text-muted-foreground">
                          ±{pt.toleranciaCm} cm
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <Input
                            type="number"
                            step="0.25"
                            value={medido}
                            onChange={(e) =>
                              setMeasuredMap({
                                ...measuredMap,
                                [pt.id]: Number.parseFloat(e.target.value) || 0,
                              })
                            }
                            className="h-7 text-xs text-right font-mono"
                          />
                        </td>
                        <td
                          className={`py-1.5 px-2 text-right font-mono font-bold ${
                            outOfTol ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta} cm
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          {outOfTol ? (
                            <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                              <AlertTriangle className="w-3 h-3" /> Fora Tol.
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" /> OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <Label className="text-xs">Parecer Técnico da Prova / Lacre</Label>
                <Textarea
                  rows={2}
                  value={fitNotes}
                  onChange={(e) => setFitNotes(e.target.value)}
                  placeholder="Ex.: Caimento aprovado no manequim M; ribana da gola V assentou sem ondulação."
                  className="text-xs mt-1"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-2xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={adoptMeasuredOnApprove}
                  onChange={(e) => setAdoptMeasuredOnApprove(e.target.checked)}
                />
                <span>
                  Ao aprovar o lacre, atualizar as medidas base ({fitSpec.tamanhoBase}) na Ficha
                  Técnica com os valores medidos acima
                </span>
              </label>
            </div>
          )}
          <DialogFooter className="flex items-center justify-between sm:justify-between flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleRequestFitAdjustment}>
              Solicitar Ajuste de Molde ({outOfTolCount})
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setFitProto(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-500 text-[#EEF7FA]"
                onClick={handleApproveAndSealPilot}
              >
                Aprovar &amp; Lacrar Peça Piloto
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova / Editar Solicitação de Piloto */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPrototype ? "Editar Peça Piloto" : "Nova Solicitação de Peça Piloto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Código da Referência</Label>
              <Input
                value={formData.refCode}
                onChange={(e) =>
                  setFormData({ ...formData, refCode: e.target.value.toUpperCase() })
                }
                placeholder="DEV000006"
                className="font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Nome da Peça</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Camiseta Esportiva Dry Pro"
              />
            </div>
            <div>
              <Label className="text-xs">Rodada / Objetivo da Prova</Label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="1ª Prova — validar caimento M"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Solicitante</Label>
                <Input
                  value={formData.requester}
                  onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
                  placeholder="Estilo"
                />
              </div>
              <div>
                <Label className="text-xs">Pilotista / Responsável</Label>
                <Input
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="Sandra Pilotagem"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()}>Salvar Piloto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
