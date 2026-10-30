// Pilotagem, Prova de Caimento & Lacre de Peça Piloto — persistente e integrado à Ficha Técnica.
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Image,
  MessageSquare,
  Scissors,
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
import { ModuleActionMenu, ModuleLayout } from "@/components/modules/ModuleLayout";
import { OptimizedImage } from "@/components/OptimizedImage";
import { PROTOTYPE_STAGES, usePrototypeStore, type PrototypeItem } from "@/lib/prototypes/store";
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

  const { items: dbRefs } = useReferences();
  const { create: createDbPiloto } = useCreatePiloto();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrototype, setEditingPrototype] = useState<PrototypeItem | null>(null);
  const [formData, setFormData] = useState({
    refCode: "DEV000006",
    name: "",
    version: "",
    requester: "",
    owner: "",
  });

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
      // Se a referência já existir na tabela `references`, registra também em `pilotos`:
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
      title="Pilotagem & Prova de Caimento"
      subtitle="Controle persistente de peças piloto, rodadas de prova, ajustes de modelagem e lacre de aprovação conectado à Ficha Técnica."
      version="Craft v4.0"
      searchPlaceholder="Buscar piloto por referência, etapa ou pilotista"
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
        {prototypes.map((prototype) => (
          <Card
            key={prototype.id}
            className="glass-card rounded-lg overflow-hidden hover:border-primary/30 transition-colors"
          >
            <div className="relative h-52">
              <OptimizedImage
                src={prototype.image}
                alt={prototype.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 to-transparent" />
              <div className="absolute left-4 bottom-4 right-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-2xs font-mono font-bold uppercase tracking-wider text-primary">
                    {prototype.id} · REF {prototype.refCode}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-white">{prototype.name}</h3>
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
                    <item.icon className="h-3.5 w-3.5 text-primary" />
                    <p className="mt-1.5 text-2xs uppercase text-muted-foreground">{item.label}</p>
                    <p className="mt-0.5 text-xs font-semibold text-foreground truncate">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-2xs font-semibold uppercase text-muted-foreground">
                  <span>Evolução até o lacre ({PROTOTYPE_STAGES.length} etapas)</span>
                  <span className="text-foreground">{prototype.progress}%</span>
                </div>
                <Progress value={prototype.progress} className="h-2 bg-muted" />
              </div>

              <div className="flex items-center justify-between border-t border-border/60 pt-3 gap-2">
                <div className="flex gap-3 text-2xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Image className="h-3.5 w-3.5" /> {prototype.photos}
                  </span>
                  <span className="flex items-center gap-1">
                    <Video className="h-3.5 w-3.5" /> {prototype.videos}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
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
                  {prototype.status !== "Aprovado" && (
                    <Button
                      size="sm"
                      className="h-7 text-2xs gap-1"
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
