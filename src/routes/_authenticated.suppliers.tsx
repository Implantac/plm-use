import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Star,
  MapPin,
  Mail,
  ShieldCheck,
  TrendingUp,
  PackageCheck,
  Clock,
  Gauge,
  GitBranch,
  ExternalLink,
} from "lucide-react";
import { ModuleLayout, ModuleActionMenu } from "@/components/modules/ModuleLayout";
import { GlossarioTermos } from "@/components/onboarding/GlossarioTermos";
import { useEntityDrawer } from "@/components/entity/EntityContext";
import { useEventEmitter } from "@/hooks/use-entity-events";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { OutsourcingServiceOrderPanel } from "@/components/pcp/OutsourcingServiceOrderPanel";
import { SupplierScoreboard } from "@/components/suppliers/SupplierScoreboard";
import { CtaProximoPasso } from "@/components/onboarding/CtaProximoPasso";
import {
  PARCEIRO_DEMO_LABEL,
  computePartnerMetrics,
  parceirosOperacionais,
  useOutsourcingStore,
  type ComplianceBadge,
  type IndustrialPartner,
  type PartnerCategory,
} from "@/lib/techsheet/outsourcing-os";
import { useTechSheetStore } from "@/lib/techsheet/store";

export const Route = createFileRoute("/_authenticated/suppliers")({
  component: SuppliersPage,
});

function SuppliersPage() {
  const navigate = useNavigate();
  const { openEntity } = useEntityDrawer();
  const { emit } = useEventEmitter();

  const partners = useOutsourcingStore((s) => s.partners);
  const serviceOrders = useOutsourcingStore((s) => s.serviceOrders);
  const upsertPartner = useOutsourcingStore((s) => s.upsertPartner);
  const deletePartner = useOutsourcingStore((s) => s.deletePartner);
  const sheetsMap = useTechSheetStore((s) => s.data);

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<IndustrialPartner | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    cnpj: string;
    city: string;
    uf: string;
    category: PartnerCategory;
    compliance: ComplianceBadge;
    machinesSummary: string;
    capacityMinutesMonth: string;
    leadTimeDays: string;
    contactEmail: string;
  }>({
    name: "",
    cnpj: "15.880.120/0001-40",
    city: "Apucarana",
    uf: "PR",
    category: "Facção Costura",
    compliance: "Certificado ABVTEX",
    machinesSummary: "Retas Eletrônicas · Overloques 4F · Galoneiras",
    capacityMinutesMonth: "75000",
    leadTimeDays: "6",
    contactEmail: "pcp@parceiro.ind.br",
  });

  const enriched = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return partners
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.uf.toLowerCase().includes(q) ||
          p.cnpj.includes(q),
      )
      .map((p) => ({
        partner: p,
        metrics: computePartnerMetrics(p, serviceOrders, sheetsMap),
      }));
  }, [partners, serviceOrders, sheetsMap, searchTerm]);

  // Onda 42: os 4 parceiros de fábrica têm CNPJ, "Certificado ABVTEX" e
  // scores AQL/OTIF inventados. Não são homologação e não geram OTIF médio.
  const parceirosReais = useMemo(() => parceirosOperacionais(partners), [partners]);
  const soVitrine = parceirosReais.length === 0;
  const avgOtif = useMemo(() => {
    if (parceirosReais.length === 0) return null;
    return Math.round(
      parceirosReais.reduce((acc, p) => acc + p.otifScore, 0) / parceirosReais.length,
    );
  }, [parceirosReais]);

  const totalOpenOs = useMemo(
    () => enriched.reduce((acc, r) => acc + r.metrics.openOrdersCount, 0),
    [enriched],
  );

  const totalPiecesExternal = useMemo(
    () => enriched.reduce((acc, r) => acc + r.metrics.piecesInPossession, 0),
    [enriched],
  );

  const handleOpenDialog = (p?: IndustrialPartner) => {
    if (p) {
      setEditingPartner(p);
      setFormData({
        name: p.name,
        cnpj: p.cnpj,
        city: p.city,
        uf: p.uf,
        category: p.category,
        compliance: p.compliance,
        machinesSummary: p.machinesSummary,
        capacityMinutesMonth: String(p.capacityMinutesMonth),
        leadTimeDays: String(p.leadTimeDays),
        contactEmail: p.contactEmail,
      });
    } else {
      setEditingPartner(null);
      setFormData({
        name: "",
        cnpj: "15.880.120/0001-40",
        city: "Apucarana",
        uf: "PR",
        category: "Facção Costura",
        compliance: "Certificado ABVTEX",
        machinesSummary: "Retas Eletrônicas · Overloques 4F · Galoneiras",
        capacityMinutesMonth: "75000",
        leadTimeDays: "6",
        contactEmail: "pcp@parceiro.ind.br",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Informe a Razão Social da facção, lavanderia ou fornecedor.");
      return;
    }
    const next: IndustrialPartner = {
      id: editingPartner?.id ?? crypto.randomUUID(),
      name: formData.name.trim(),
      cnpj: formData.cnpj.trim() || "00.000.000/0001-00",
      city: formData.city.trim() || "Apucarana",
      uf: (formData.uf.trim() || "PR").toUpperCase().slice(0, 2),
      category: formData.category,
      compliance: formData.compliance,
      machinesSummary: formData.machinesSummary.trim() || "Parque industrial homologado",
      capacityMinutesMonth: Math.max(1000, Number(formData.capacityMinutesMonth) || 60000),
      qualityScore: editingPartner?.qualityScore ?? 92,
      otifScore: editingPartner?.otifScore ?? 90,
      costScore: editingPartner?.costScore ?? 86,
      reliabilityScore: editingPartner?.reliabilityScore ?? 90,
      leadTimeDays: Math.max(1, Number(formData.leadTimeDays) || 6),
      contactEmail: formData.contactEmail.trim() || "contato@fornecedor.ind.br",
    };

    upsertPartner(next);
    setIsDialogOpen(false);
    toast.success(
      editingPartner ? "Parceiro industrial atualizado e persistido!" : "Novo parceiro homologado!",
    );

    await emit({
      entity_type: "supplier",
      entity_id: next.id,
      event_type: editingPartner ? "updated" : "created",
      to_status: next.compliance,
      note: `${editingPartner ? "Atualizado" : "Homologado"}: ${next.name} (${next.category})`,
      payload: { name: next.name, category: next.category, uf: next.uf },
    });
  };

  const handleDelete = async (id: string) => {
    const target = partners.find((s) => s.id === id);
    deletePartner(id);
    toast.error("Parceiro removido da base homologada");
    if (target) {
      await emit({
        entity_type: "supplier",
        entity_id: id,
        event_type: "deleted",
        from_status: target.compliance,
        note: `Removido: ${target.name}`,
      });
    }
  };

  return (
    <ModuleLayout
      title="Fornecedores · Facções & Beneficiamento"
      subtitle="Base persistida de tecelagens, facções de costura, estamparias e lavanderias homologadas ABVTEX, capacidade mensal SAM e remessa/retorno CFOP 5901/5902."
      version="Supply & Facções v3.0"
      onAdd={() => handleOpenDialog()}
      onSearch={setSearchTerm}
      searchPlaceholder="Buscar facção, lavanderia, tecelagem, CNPJ ou UF"
      metrics={[
        {
          label: "Parceiros Ativos",
          value: soVitrine ? "—" : String(parceirosReais.length),
          detail: soVitrine ? "só demonstração" : "homologados",
        },
        { label: "OS em Aberto", value: String(totalOpenOs), detail: "industrialização" },
        {
          label: "Peças em Terceiros",
          value: totalPiecesExternal.toLocaleString("pt-BR"),
          detail: "saldo remessa",
        },
        {
          label: "OTIF Médio",
          value: avgOtif === null ? "—" : `${avgOtif}%`,
          detail: avgOtif === null ? "não apurável" : "entrega no prazo",
        },
      ]}
    >
      {/* Onda 47: 30 travessões e 11 siglas medidas na tela de fornecedores. */}
      <GlossarioTermos
        siglas={["OTIF", "SAM", "CFOP", "RFQ", "AQL", "NCM", "XML", "NF-e", "CAPA", "LGPD"]}
        testId="glossario-suppliers"
      />
      <OutsourcingServiceOrderPanel />

      {soVitrine && (
        <div
          data-testid="supplier-so-vitrine"
          className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-800 dark:text-amber-300"
        >
          <strong>{partners.length} fornecedores de demonstração.</strong> {PARCEIRO_DEMO_LABEL}.
          Cadastre ou edite um parceiro para que o ranking, o OTIF médio e os documentos de remessa
          passem a ser apurados.
          <CtaProximoPasso
            passo="fornecedor"
            onAcao={() => handleOpenDialog()}
            label="Cadastrar parceiro"
            testId="cta-supplier-so-vitrine"
          />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {enriched.map(({ partner: sup, metrics: m }) => (
          <Card
            key={sup.id}
            className="glass-card rounded-xl p-6 hover:border-primary/40 transition-all group relative"
          >
            <div className="absolute top-5 right-5">
              <ModuleActionMenu
                onEdit={() => handleOpenDialog(sup)}
                onDelete={() => void handleDelete(sup.id)}
                onView={() =>
                  openEntity({
                    type: "supplier",
                    id: String(sup.id),
                    title: sup.name,
                    subtitle: `${sup.category} · ${sup.city}/${sup.uf}`,
                  })
                }
              />
            </div>

            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-lg bg-muted/50 border border-border/60 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground tracking-tight">
                      {sup.name}
                    </h3>
                    {sup.compliance === "Certificado ABVTEX" && !sup.demo && (
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    )}
                    {sup.demo && (
                      <Badge
                        variant="outline"
                        title={PARCEIRO_DEMO_LABEL}
                        className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300"
                      >
                        Demonstração
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xs font-semibold uppercase tracking-[0.04em] text-primary">
                    {sup.category} · CNPJ {sup.cnpj}
                  </p>
                </div>
              </div>
              <div className="text-right pr-10">
                <div className="flex items-center justify-end gap-1 text-amber-500 mb-0.5">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="text-sm font-bold text-foreground font-mono">
                    {m.apuravel ? `${m.overallScore} (${m.tier})` : "—"}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px]"
                  title={sup.demo ? PARCEIRO_DEMO_LABEL : undefined}
                >
                  {sup.demo ? "Certificação de demonstração" : sup.compliance}
                </Badge>
              </div>
            </div>

            <p className="text-2xs text-muted-foreground mb-4 truncate" title={sup.machinesSummary}>
              Parque fabril: <strong className="text-foreground">{sup.machinesSummary}</strong>
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 border-y border-border/60 py-3.5 text-xs">
              <div>
                <span className="text-2xs uppercase text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Origem
                </span>
                <strong className="text-foreground">
                  {sup.city}/{sup.uf}
                </strong>
              </div>
              <div>
                <span className="text-2xs uppercase text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Qualidade AQL
                </span>
                <strong className="text-status-approved font-mono">{sup.qualityScore}%</strong>
              </div>
              <div>
                <span className="text-2xs uppercase text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> OTIF
                </span>
                <strong className="text-status-approved font-mono">{sup.otifScore}%</strong>
              </div>
              <div>
                <span className="text-2xs uppercase text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Contato
                </span>
                <strong className="text-foreground truncate block" title={sup.contactEmail}>
                  {sup.contactEmail}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <div className="rounded-md border border-border bg-muted/40 p-2.5">
                <PackageCheck className="h-3.5 w-3.5 text-primary" />
                <p className="mt-1 text-2xs uppercase text-muted-foreground">Saldo Remetido</p>
                <p className="text-xs font-bold font-mono text-foreground">
                  {m.piecesInPossession} pçs ({m.openOrdersCount} OS)
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-2.5">
                <Gauge className="h-3.5 w-3.5 text-primary" />
                <p className="mt-1 text-2xs uppercase text-muted-foreground">Capacidade Mês</p>
                <p className="text-xs font-bold font-mono text-foreground">
                  {(sup.capacityMinutesMonth / 1000).toFixed(0)}k min ({m.capacityUtilizationPct}%)
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-2.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <p className="mt-1 text-2xs uppercase text-muted-foreground">Lead Time</p>
                <p className="text-xs font-bold font-mono text-foreground">
                  {sup.leadTimeDays} dias corridos
                </p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => void navigate({ to: "/supplier-portal" })}
                className="flex-1 text-xs gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-primary" /> Portal RFQ & Cotações
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  openEntity({
                    type: "supplier",
                    id: String(sup.id),
                    title: sup.name,
                    subtitle: `${sup.category} · ${sup.city}/${sup.uf}`,
                  })
                }
                title="Abrir histórico de eventos e auditoria"
                className="gap-1.5 text-xs"
              >
                <GitBranch className="w-3.5 h-3.5 text-primary" /> Trilha
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {editingPartner
                ? "Editar Parceiro / Facção Homologada"
                : "Homologar Novo Fornecedor / Facção / Lavanderia"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-[1fr_160px] gap-3">
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Razão Social</Label>
                <Input
                  aria-label="Razão Social"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Facção Modelo Apucarana LTDA"
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">CNPJ</Label>
                <Input
                  aria-label="CNPJ"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Especialidade</Label>
                <select
                  aria-label="Especialidade"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as PartnerCategory })
                  }
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground"
                >
                  <option value="Facção Costura">Facção Costura</option>
                  <option value="Lavanderia & Beneficiamento">Lavanderia & Beneficiamento</option>
                  <option value="Estamparia & Bordado">Estamparia & Bordado</option>
                  <option value="Tecelagem & Malharia">Tecelagem & Malharia</option>
                  <option value="Aviamentos">Aviamentos</option>
                </select>
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">
                  Certificação Social/Fiscal
                </Label>
                <select
                  aria-label="Certificação Social/Fiscal"
                  value={formData.compliance}
                  onChange={(e) =>
                    setFormData({ ...formData, compliance: e.target.value as ComplianceBadge })
                  }
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground"
                >
                  <option value="Certificado ABVTEX">Certificado ABVTEX</option>
                  <option value="Homologado">Homologado</option>
                  <option value="Em Auditoria">Em Auditoria</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_70px_130px_90px] gap-2.5">
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Cidade</Label>
                <Input
                  aria-label="Cidade"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">UF</Label>
                <Input
                  aria-label="UF"
                  maxLength={2}
                  value={formData.uf}
                  onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Cap. (min/mês)</Label>
                <Input
                  aria-label="Cap. (min/mês)"
                  type="number"
                  value={formData.capacityMinutesMonth}
                  onChange={(e) =>
                    setFormData({ ...formData, capacityMinutesMonth: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Prazo (d)</Label>
                <Input
                  aria-label="Prazo (d)"
                  type="number"
                  value={formData.leadTimeDays}
                  onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">
                  Parque de Máquinas
                </Label>
                <Input
                  aria-label="Parque de Máquinas"
                  value={formData.machinesSummary}
                  onChange={(e) => setFormData({ ...formData, machinesSummary: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">E-mail PCP/OS</Label>
                <Input
                  aria-label="E-mail PCP/OS"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()}>Salvar Parceiro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SupplierScoreboard />
    </ModuleLayout>
  );
}
