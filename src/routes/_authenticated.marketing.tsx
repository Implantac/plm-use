import { useMemo, useState } from "react";
import { GlossarioTermos } from "@/components/onboarding/GlossarioTermos";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  FileText,
  Instagram,
  Megaphone,
  PlayCircle,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { ModuleLayout, ModuleActionMenu } from "@/components/modules/ModuleLayout";
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
import {
  buildDropMediaKitHtml,
  computeCampaignRoas,
  computeGtmPortfolioSummary,
  campanhasOperacionais,
  GTM_DEMO_LABEL,
  MEDIA_KIT_DEMO_BLOQUEIO,
  podeEmitirMediaKit,
  useResearchGtmStore,
  type DropCampaignStatus,
  type GtmDropCampaign,
} from "@/lib/techsheet/research-gtm";
import { useTechSheetStore } from "@/lib/techsheet/store";
import { CtaProximoPasso } from "@/components/onboarding/CtaProximoPasso";

export const Route = createFileRoute("/_authenticated/marketing")({
  component: MarketingPage,
});

function MarketingPage() {
  const navigate = useNavigate();
  const sheetsMap = useTechSheetStore((s) => s.data);
  const campaigns = useResearchGtmStore((s) => s.campaigns);
  const upsertCampaign = useResearchGtmStore((s) => s.upsertCampaign);
  const deleteCampaign = useResearchGtmStore((s) => s.deleteCampaign);

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<GtmDropCampaign | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    collectionName: string;
    channel: string;
    dropDate: string;
    status: DropCampaignStatus;
    skuRefsText: string;
    creativeFormat: string;
    transparentStudioReady: boolean;
    productionCostBrl: string;
    mediaSpendBrl: string;
    attributedSalesBrl: string;
  }>({
    name: "",
    collectionName: "Alto Verão 2027",
    channel: "Meta Ads + Reels",
    dropDate: "2026-11-28",
    status: "Planejada",
    skuRefsText: "",
    creativeFormat: "Pack PNG Transparente + Reels",
    transparentStudioReady: true,
    productionCostBrl: "",
    mediaSpendBrl: "",
    attributedSalesBrl: "",
  });

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.collectionName.toLowerCase().includes(q) ||
        c.channel.toLowerCase().includes(q) ||
        c.skuRefs.some((r) => r.toLowerCase().includes(q)),
    );
  }, [campaigns, searchTerm]);

  const summary = useMemo(() => computeGtmPortfolioSummary(campaigns), [campaigns]);
  // Onda 38: as 3 campanhas de fábrica são vitrine, não portfólio. Os números
  // do resumo já as ignoram; `—` evita que zero pareça apuração.
  const soVitrine = campanhasOperacionais(campaigns).length === 0 && campaigns.length > 0;

  const fmtBrlCompact = (v: number) =>
    v.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });

  function handleOpenDialog(c?: GtmDropCampaign) {
    if (c) {
      setEditingCampaign(c);
      setFormData({
        name: c.name,
        collectionName: c.collectionName,
        channel: c.channel,
        dropDate: c.dropDate,
        status: c.status,
        skuRefsText: c.skuRefs.join(", "),
        creativeFormat: c.creativeFormat,
        transparentStudioReady: c.transparentStudioReady,
        productionCostBrl: String(c.productionCostBrl),
        mediaSpendBrl: String(c.mediaSpendBrl),
        attributedSalesBrl: String(c.attributedSalesBrl),
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        name: "",
        collectionName: "Alto Verão 2027",
        channel: "Meta Ads + Reels",
        dropDate: "2026-11-28",
        status: "Planejada",
        skuRefsText: "",
        creativeFormat: "Pack PNG Transparente + Reels",
        transparentStudioReady: true,
        productionCostBrl: "",
        mediaSpendBrl: "",
        attributedSalesBrl: "",
      });
    }
    setIsDialogOpen(true);
  }

  function handleSave() {
    if (!formData.name.trim()) {
      toast.error("Informe o nome da campanha ou drop.");
      return;
    }
    // Onda 31: campanha vazia não ganhava SKU de demonstração escondido.
    const skuRefs = formData.skuRefsText
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const next: GtmDropCampaign = {
      id: editingCampaign?.id ?? `gtm-${Date.now()}`,
      name: formData.name.trim(),
      collectionName: formData.collectionName.trim() || "Alto Verão 2027",
      channel: formData.channel.trim() || "Omnichannel",
      dropDate: formData.dropDate || "2026-11-28",
      status: formData.status,
      skuRefs,
      creativeFormat: formData.creativeFormat.trim() || "Fotos + Catálogo",
      transparentStudioReady: formData.transparentStudioReady,
      productionCostBrl: Math.max(0, Number(formData.productionCostBrl) || 0),
      mediaSpendBrl: Math.max(0, Number(formData.mediaSpendBrl) || 0),
      attributedSalesBrl: Math.max(0, Number(formData.attributedSalesBrl) || 0),
      clicksCount: editingCampaign?.clicksCount ?? 12_500,
    };

    upsertCampaign(next);
    setIsDialogOpen(false);
    toast.success(
      editingCampaign ? "Drop GTM atualizado e persistido!" : "Novo Drop GTM planejado!",
    );
  }

  function printMediaKit(camp: GtmDropCampaign) {
    // Onda 48: nenhum documento operacional nasce da vitrine. Cobre também o
    // "Visualizar" do ModuleActionMenu, que chama esta mesma função.
    if (!podeEmitirMediaKit(camp)) {
      toast.error(`${GTM_DEMO_LABEL}. ${MEDIA_KIT_DEMO_BLOQUEIO}`);
      return;
    }
    const html = buildDropMediaKitHtml(camp, sheetsMap);
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para imprimir o Media Kit A4.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  return (
    <ModuleLayout
      title="Marketing · Calendário de Drops & ROAS"
      subtitle="Gestão persistida de lançamentos por coleção e SKU: investimento de mídia vs. produção criativa, prontidão de fotos PNG transparente e Media Kit A4."
      version="GTM & Drops v3.0"
      onAdd={() => handleOpenDialog()}
      onSearch={setSearchTerm}
      searchPlaceholder="Buscar drop, coleção, SKU ou canal"
      metrics={[
        {
          label: "Drops & Campanhas",
          value: soVitrine ? "—" : String(summary.totalCampaigns),
          detail: soVitrine ? "só demonstração" : "persistidos",
        },
        {
          label: "Mídia + Produção",
          value: soVitrine ? "—" : fmtBrlCompact(summary.totalInvestmentBrl),
          detail: "investimento total",
        },
        {
          label: "Receita Atribuída",
          value: soVitrine ? "—" : fmtBrlCompact(summary.totalSalesBrl),
          detail: "sell-out canais",
        },
        {
          label: "ROAS Mídia / Full",
          value: soVitrine
            ? "—"
            : `${summary.blendedRoas.toFixed(1)}x / ${summary.netFullRoas.toFixed(1)}x`,
          detail: "bruto vs. líquido prod.",
        },
      ]}
    >
      {/* Onda 58: 6 siglas medidas no texto desta tela, sem glossário até aqui. */}
      <GlossarioTermos
        siglas={["ROAS", "ESG", "GTM", "DPP", "SKU", "ROI"]}
        testId="glossario-marketing"
      />
      {soVitrine && (
        <div
          data-testid="gtm-so-vitrine"
          className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-800 dark:text-amber-300"
        >
          <strong>{campaigns.length} campanhas de demonstração na vitrine.</strong> {GTM_DEMO_LABEL}
          . Cadastre um Drop ou edite um dos existentes para que os números de mídia, receita
          atribuída e ROAS passem a ser apurados.
          <CtaProximoPasso
            passo="campanha"
            onAcao={() => handleOpenDialog()}
            label="Cadastrar Drop"
            testId="cta-gtm-so-vitrine"
          />
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Performance por Drop, Coleção e SKUs
              Vinculados
            </h3>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void navigate({ to: "/launch" })}
              className="h-8 text-xs gap-1.5"
            >
              <Calendar className="h-3.5 w-3.5 text-primary" /> Ver Ondas de Lançamento
            </Button>
          </div>

          <div className="space-y-4">
            {filtered.map((camp) => {
              const roas = computeCampaignRoas(camp);
              return (
                <Card
                  key={camp.id}
                  className="glass-card rounded-xl p-5 hover:border-primary/40 transition-all group relative space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                        <Megaphone className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-bold text-foreground tracking-tight">
                            {camp.name}
                          </h4>
                          <Badge variant="outline" className="text-[10px]">
                            {camp.status}
                          </Badge>
                          {camp.demo && (
                            <Badge
                              variant="outline"
                              title={GTM_DEMO_LABEL}
                              className="text-[10px] border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            >
                              Demonstração
                            </Badge>
                          )}
                          {camp.transparentStudioReady && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 gap-1"
                            >
                              <CheckCircle2 className="h-2.5 w-2.5" /> PNG Transparente OK
                            </Badge>
                          )}
                        </div>
                        <p className="text-2xs text-muted-foreground mt-0.5">
                          {camp.collectionName} · {camp.channel} · Drop {camp.dropDate} ·{" "}
                          {camp.creativeFormat}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {podeEmitirMediaKit(camp) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => printMediaKit(camp)}
                          className="h-7 text-2xs gap-1"
                        >
                          <FileText className="h-3 w-3 text-primary" /> Media Kit A4
                        </Button>
                      ) : (
                        <span
                          data-testid="media-kit-bloqueado"
                          className="inline-flex flex-wrap items-center gap-1"
                        >
                          <span
                            title={MEDIA_KIT_DEMO_BLOQUEIO}
                            className="inline-flex h-7 items-center rounded-md border border-amber-500/40 px-2 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
                          >
                            Media Kit indisponível
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDialog(camp)}
                            className="h-7 text-2xs"
                          >
                            Editar para emitir
                          </Button>
                        </span>
                      )}
                      <ModuleActionMenu
                        onEdit={() => handleOpenDialog(camp)}
                        onDelete={() => {
                          deleteCampaign(camp.id);
                          toast.error("Campanha removida.");
                        }}
                        onView={podeEmitirMediaKit(camp) ? () => printMediaKit(camp) : undefined}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-2xs uppercase text-muted-foreground mr-1">SKUs:</span>
                      {camp.skuRefs.map((ref) => (
                        <Link
                          key={ref}
                          to="/tech-sheet"
                          search={{ ref } as never}
                          className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-2xs text-primary hover:border-primary"
                        >
                          {ref}
                        </Link>
                      ))}
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-right text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground block">
                          Produção
                        </span>
                        <strong className="font-mono text-foreground">
                          {fmtBrlCompact(camp.productionCostBrl)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground block">
                          Mídia Paga
                        </span>
                        <strong className="font-mono text-foreground">
                          {fmtBrlCompact(camp.mediaSpendBrl)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground block">
                          Vendas
                        </span>
                        <strong className="font-mono text-foreground">
                          {fmtBrlCompact(camp.attributedSalesBrl)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground block">
                          ROAS
                        </span>
                        <strong
                          className={`font-mono ${roas >= 3 ? "text-status-approved" : "text-amber-500"}`}
                        >
                          {roas.toFixed(2)}x
                        </strong>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="glass-card rounded-xl p-5 border-primary/20 bg-primary/[0.03] space-y-4">
            <h3 className="text-2xs font-semibold uppercase tracking-[0.06em] text-primary flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Estúdio Criativo & Pack E-Commerce
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {summary.transparentReadyCount} de {summary.totalCampaigns} drops já contam com fotos
              de produto em <strong>fundo 100% transparente (PNG alpha)</strong> prontas para
              vitrine, marketplace e lookbook B2B.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => void navigate({ to: "/ai-center" })}
              className="w-full text-xs gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" /> Gerar Fotos no AI Product Studio
            </Button>
          </Card>

          <Card className="glass-card rounded-xl p-5 space-y-3">
            <h3 className="text-2xs font-semibold uppercase tracking-[0.06em] text-foreground">
              Integrações de Mídia & Atribuição
            </h3>
            {[
              { label: "Meta Ads & Catálogo Dinâmico", status: "Ativo", icon: Instagram },
              { label: "TikTok Shop & Creators", status: "Ativo", icon: PlayCircle },
              { label: "Google Analytics 4 / ROAS", status: "Ativo", icon: BarChart3 },
            ].map((sync) => (
              <div
                key={sync.label}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60 text-xs"
              >
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <sync.icon className="w-3.5 h-3.5 text-primary" />
                  {sync.label}
                </span>
                <span className="text-2xs font-semibold uppercase text-status-approved">
                  {sync.status}
                </span>
              </div>
            ))}
          </Card>

          <Card className="glass-card rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-2xs font-semibold uppercase tracking-[0.06em] text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Seeding & Influenciadores
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Gerencie envios de peças-piloto, cupons rastreáveis e entregas de seeding conectadas à
              coleção.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void navigate({ to: "/influencers" })}
              className="w-full text-xs"
            >
              Abrir Gestão de Influenciadores
            </Button>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? "Editar Drop / Campanha GTM" : "Planejar Novo Drop GTM"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-[1fr_160px] gap-3">
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Nome do Drop</Label>
                <Input
                  aria-label="Nome do Drop"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Drop 03 · Cápsula Linho Resort"
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Data Lançamento</Label>
                <Input
                  aria-label="Data Lançamento"
                  type="date"
                  value={formData.dropDate}
                  onChange={(e) => setFormData({ ...formData, dropDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Coleção</Label>
                <Input
                  aria-label="Coleção"
                  value={formData.collectionName}
                  onChange={(e) => setFormData({ ...formData, collectionName: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Canal Principal</Label>
                <Input
                  aria-label="Canal Principal"
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Status</Label>
                <select
                  aria-label="Status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as DropCampaignStatus })
                  }
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                >
                  <option value="Planejada">Planejada</option>
                  <option value="Em Produção Criativa">Em Produção Criativa</option>
                  <option value="Ativa">Ativa</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">
                  SKUs Vinculados (separados por vírgula)
                </Label>
                <Input
                  aria-label="SKUs Vinculados (separados por vírgula)"
                  value={formData.skuRefsText}
                  onChange={(e) => setFormData({ ...formData, skuRefsText: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Formato Criativo</Label>
                <Input
                  aria-label="Formato Criativo"
                  value={formData.creativeFormat}
                  onChange={(e) => setFormData({ ...formData, creativeFormat: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Produção (R$)</Label>
                <Input
                  aria-label="Produção (R$)"
                  type="number"
                  value={formData.productionCostBrl}
                  onChange={(e) => setFormData({ ...formData, productionCostBrl: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Mídia Paga (R$)</Label>
                <Input
                  aria-label="Mídia Paga (R$)"
                  type="number"
                  value={formData.mediaSpendBrl}
                  onChange={(e) => setFormData({ ...formData, mediaSpendBrl: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">
                  Vendas Atribuídas (R$)
                </Label>
                <Input
                  aria-label="Vendas Atribuídas (R$)"
                  type="number"
                  value={formData.attributedSalesBrl}
                  onChange={(e) => setFormData({ ...formData, attributedSalesBrl: e.target.value })}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar Drop GTM</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
