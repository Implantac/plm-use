import { useEffect, useMemo, useState } from "react";
import { GlossarioTermos } from "@/components/onboarding/GlossarioTermos";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Box,
  Download,
  FileText,
  PackageX,
  PlugZap,
  RefreshCcw,
  Store,
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
  buildPackingListPrintableHtml,
  buildPreNfeXml400,
  computePackingAndNfePreview,
  resolveReferenceTechSheet,
} from "@/lib/techsheet/dpp-expedition";
import { useTechSheetStore } from "@/lib/techsheet/store";

export const Route = createFileRoute("/_authenticated/commercial")({
  component: CommercialPage,
});

const STORAGE_KEY = "use-moda:commercial-b2b-v2";

interface B2bClient {
  id: number;
  name: string;
  cnpj: string;
  uf: string;
  orders: number;
  total: string;
}

// A carteira nasce vazia (Onda 67): os quatro lojistas de demonstração
// (Luxury Boutique SP, Moda Carioca Store, Urban Concept Curitiba, Style
// Hub BH) com CNPJ, pedidos e "R$ 124k" de faturamento fictícios davam
// para expedir romaneio e pré-NFe para cliente que não existe. Só lojista
// cadastrado pelo usuário entra na carteira — mesmo contrato dos parceiros
// (Onda 42) e das coleções (Onda 51).
const DEFAULT_CLIENTS: B2bClient[] = [];

const MOTIVO_LABEL: Record<string, string> = {
  "sem-ficha": "sem ficha salva",
  template: "ficha ainda é o modelo",
  "sem-ncm": "sem NCM na ficha",
};

function CommercialPage() {
  const navigate = useNavigate();
  const sheetsMap = useTechSheetStore((s) => s.data);

  const [clients, setClients] = useState<B2bClient[]>(DEFAULT_CLIENTS);
  const [selectedClientId, setSelectedClientId] = useState<number>(0);
  // Quantidades de expedição nascem zeradas (Onda 67): o pré-preenchimento
  // com DEV000006/V24-001/U25-014 (72/48/24 peças) era o mesmo vazamento
  // de formulário das Ondas 64/66 — quantidade de demonstração esperando
  // para virar romaneio. A expedição só oferece ficha salva de qualquer
  // forma; sem quantidade digitada, nada entra no pré-NFe.
  const [qtyByRef, setQtyByRef] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as B2bClient[];
        if (Array.isArray(parsed) && parsed.length > 0) setClients(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    } catch {
      // ignore
    }
  }, [clients]);

  const activeClient = clients.find((c) => c.id === selectedClientId) ?? clients[0];

  // A expedição só oferece ficha salva. Antes plantava quatro referências de
  // demonstração e o romaneio / pré-NFe saía com dados delas.
  const expeditionRefs = useMemo(() => Object.keys(sheetsMap).sort(), [sheetsMap]);

  const nfeSummary = useMemo(
    () =>
      computePackingAndNfePreview(
        expeditionRefs.map((refCode) => {
          const ref = resolveReferenceTechSheet(refCode, sheetsMap);
          return {
            refCode,
            qtyPieces: qtyByRef[refCode] ?? 0,
            doc: ref.doc,
            provenance: ref.provenance,
          };
        }),
        activeClient?.name ?? "Cliente B2B",
        activeClient?.cnpj ?? "00.000.000/0001-00",
        activeClient?.uf ?? "SP",
      ),
    [expeditionRefs, qtyByRef, sheetsMap, activeClient],
  );

  const fmtBrl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<B2bClient | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "00.000.000/0001-00",
    uf: "SP",
    orders: "",
    total: "",
  });

  const handleOpenDialog = (client?: B2bClient) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        cnpj: client.cnpj,
        uf: client.uf,
        orders: client.orders.toString(),
        total: client.total,
      });
    } else {
      setEditingClient(null);
      setFormData({ name: "", cnpj: "", uf: "SP", orders: "", total: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return toast.error("Informe a Razão Social / Nome Fantasia.");
    if (editingClient) {
      setClients(
        clients.map((c) =>
          c.id === editingClient.id
            ? { ...c, ...formData, orders: parseInt(formData.orders) || 0 }
            : c,
        ),
      );
      toast.success("Cliente B2B atualizado e persistido");
    } else {
      setClients([
        {
          id: Date.now(),
          ...formData,
          orders: parseInt(formData.orders) || 1,
        },
        ...clients,
      ]);
      toast.success("Novo cliente B2B cadastrado na carteira");
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setClients(clients.filter((c) => c.id !== id));
    toast.error("Cliente removido da carteira");
  };

  function bloqueioDeEmissao(): boolean {
    if (nfeSummary.ignoradas.length === 0) return false;
    const lista = nfeSummary.ignoradas
      .map((i) => `${i.refCode} (${MOTIVO_LABEL[i.motivo]})`)
      .join(", ");
    toast.error(`Há referência com quantidade que não pode ser faturada: ${lista}`);
    return true;
  }

  function exportPreNfeXml() {
    if (!activeClient) {
      toast.error("Cadastre um lojista na carteira antes de exportar o Pré-XML NFe.");
      return;
    }
    if (bloqueioDeEmissao()) return;
    if (nfeSummary.lines.length === 0) {
      toast.error("Informe quantidade > 0 em ao menos uma referência para gerar o XML NFe.");
      return;
    }
    const xml = buildPreNfeXml400(nfeSummary);
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pre-nfe-400-${activeClient.uf.toLowerCase()}-${Date.now()}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Pré-XML SEFAZ NFe 4.00 (CFOP ${nfeSummary.cfop}) exportado!`);
  }

  function printPackingList() {
    if (!activeClient) {
      toast.error("Cadastre um lojista na carteira antes de imprimir o Romaneio.");
      return;
    }
    if (bloqueioDeEmissao()) return;
    if (nfeSummary.lines.length === 0) {
      toast.error("Informe quantidade > 0 para emitir o Romaneio Packing List.");
      return;
    }
    const html = buildPackingListPrintableHtml(nfeSummary);
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para imprimir o Packing List A4.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  // Onda 73: o mix por canal era um vetor fixo com receita inventada. Só
  // pedido salvo por canal pode ratear receita; até lá, lista vazia + aviso.
  const canaisVenda: { channel: string; val: string; perc: number }[] = [];

  const salesStats = [
    {
      label: "Carteira B2B Ativa",
      value: `${clients.length} lojistas`,
      change: "+12%",
      trend: "up",
    },
    {
      label: "Pré-Faturamento Atual",
      value: fmtBrl(nfeSummary.productsTotalBrl),
      change: `CFOP ${nfeSummary.cfop}`,
      trend: "up",
    },
    {
      label: "Expedição / Cubagem",
      value: `${nfeSummary.totalMasterBoxes} cx (${nfeSummary.volumeCbm.toFixed(2)} m³)`,
      change: `${nfeSummary.grossWeightKg.toFixed(1)} kg bruto`,
      trend: "up",
    },
    // Onda 73: "2,4% / -0,8%" era número de vitrine lido como KPI real.
    {
      label: "Taxa de Devolução Fit",
      value: "—",
      change: "sem devolução registrada",
      trend: "down",
    },
  ];

  return (
    <ModuleLayout
      title="Comercial · Expedição Packing List & Pré-NFe"
      subtitle="Carteira B2B persistida, cálculo de caixas master/cubagem, alíquotas estaduais/interestaduais (CFOP 5101/6101) e exportação Pré-XML SEFAZ NFe 4.00."
      version="Sales & Fiscal v3.0"
      onAdd={() => handleOpenDialog()}
      searchPlaceholder="Buscar cliente, CNPJ, UF ou SKU"
      metrics={[
        { label: "Peças Romaneio", value: String(nfeSummary.totalPieces), detail: "em expedição" },
        { label: "Volumes", value: `${nfeSummary.totalMasterBoxes} cx`, detail: "caixas master" },
        { label: "CFOP Fiscal", value: nfeSummary.cfop, detail: `PR → ${nfeSummary.clientUf}` },
        {
          label: "Total NF",
          value: fmtBrl(nfeSummary.productsTotalBrl),
          detail: "pré-faturamento",
        },
      ]}
    >
      {/* Onda 58: 6 siglas medidas no texto desta tela, sem glossário até aqui. */}
      <GlossarioTermos
        siglas={["CFOP", "XML", "NCM", "POM", "GTM", "NF-e"]}
        testId="glossario-commercial"
      />
      {/* Simulador de Expedição, Packing List & Pré-XML NFe 4.00 */}
      <Card className="rounded-xl border-border bg-card p-4 mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Box className="h-4 w-4 text-primary" />
              Expedição Industrial · Romaneio Packing List & Pré-Nota Fiscal (SEFAZ NFe 4.00)
            </h3>
            <p className="text-2xs text-muted-foreground mt-0.5">
              Usa NCM, peso líquido e preço atacado das Fichas Técnicas <strong>salvas</strong>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Selecionar Cliente Destinatário"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(Number(e.target.value))}
              className="h-8 rounded border border-border bg-background px-2.5 text-xs text-foreground"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.uf}) — CNPJ {c.cnpj}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={exportPreNfeXml}
              className="h-8 gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5 text-primary" /> Exportar Pré-XML NFe
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={printPackingList}
              className="h-8 gap-1.5 text-xs"
            >
              <FileText className="h-3.5 w-3.5" /> Packing List A4
            </Button>
          </div>
        </div>

        {nfeSummary.ignoradas.length > 0 && (
          <div
            data-testid="expedicao-bloqueada"
            className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-2xs text-rose-700 dark:text-rose-300"
          >
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Romaneio e Pré-XML bloqueados
            </p>
            <p className="mt-1 leading-snug">
              Estas referências têm quantidade acima de zero, mas não podem virar documento:{" "}
              {nfeSummary.ignoradas
                .map((i) => `${i.refCode} (${MOTIVO_LABEL[i.motivo]})`)
                .join(", ")}
              . Salve a ficha (e preencha o NCM) ou zere a quantidade.
            </p>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-2xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-2.5 text-left">Referência</th>
                <th className="p-2.5 text-left">NCM</th>
                <th className="p-2.5 text-left">CFOP</th>
                <th className="p-2.5 text-right">Qtd. Expedir (UN)</th>
                <th className="p-2.5 text-right">Caixas Master (24pç)</th>
                <th className="p-2.5 text-right">Peso Líquido</th>
                <th className="p-2.5 text-right">Subtotal NF</th>
              </tr>
            </thead>
            <tbody>
              {expeditionRefs.slice(0, 4).map((refCode) => {
                const { doc } = resolveReferenceTechSheet(refCode, sheetsMap);
                const line = nfeSummary.lines.find((l) => l.refCode === refCode);
                const qty = qtyByRef[refCode] ?? 0;
                return (
                  <tr key={refCode} className="border-t border-border/60">
                    <td className="p-2.5">
                      <span className="font-mono text-primary mr-1.5">{refCode}</span>
                      <span className="font-medium text-foreground">
                        {doc?.meta?.name || refCode}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-muted-foreground">
                      {doc?.etiquetagem?.ncm || <span className="text-rose-500">sem NCM</span>}
                    </td>
                    <td className="p-2.5 font-mono">{nfeSummary.cfop}</td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        step={12}
                        aria-label={`Quantidade expedir ${refCode}`}
                        value={qty}
                        onChange={(e) =>
                          setQtyByRef((prev) => ({
                            ...prev,
                            [refCode]: Math.max(0, Math.round(Number(e.target.value) || 0)),
                          }))
                        }
                        className="h-7 w-20 rounded border border-border bg-background px-1.5 text-right font-mono text-xs text-foreground"
                      />
                    </td>
                    <td className="p-2.5 text-right font-mono">{line?.masterBoxes ?? 0} cx</td>
                    <td className="p-2.5 text-right font-mono">
                      {(line?.netWeightKg ?? 0).toFixed(2)} kg
                    </td>
                    <td className="p-2.5 text-right font-mono font-semibold">
                      {fmtBrl(line?.subtotalBrl ?? 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-muted-foreground pt-1">
          <span>
            Peso Líquido:{" "}
            <strong className="text-foreground">{nfeSummary.netWeightKg.toFixed(2)} kg</strong> ·
            Peso Bruto (c/ tara caixas):{" "}
            <strong className="text-foreground">{nfeSummary.grossWeightKg.toFixed(2)} kg</strong> ·
            Cubagem:{" "}
            <strong className="text-foreground">{nfeSummary.volumeCbm.toFixed(3)} m³</strong>
          </span>
          <span>
            ICMS Destacado:{" "}
            <strong className="text-foreground">{fmtBrl(nfeSummary.icmsValueBrl)}</strong> ·
            PIS/COFINS:{" "}
            <strong className="text-foreground">{fmtBrl(nfeSummary.pisCofinsValueBrl)}</strong>
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {salesStats.map((stat) => (
          <Card
            key={stat.label}
            className="glass-card rounded-xl p-5 group hover:border-primary/40 transition-all"
          >
            <CardHeader className="p-0 mb-3 flex flex-row items-center justify-between">
              <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {stat.label}
              </p>
              <div className="p-1.5 rounded-full bg-status-approved/10 text-status-approved">
                {stat.trend === "up" ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
              </div>
            </CardHeader>
            <div className="space-y-1">
              <p className="text-xl font-semibold text-foreground tabular-nums tracking-tight">
                {stat.value}
              </p>
              <Badge variant="outline" className="text-2xs font-mono">
                {stat.change}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card rounded-xl p-6 space-y-6">
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-primary" /> Vendas por Canal Omnichannel
          </h3>
          <div className="space-y-4">
            {canaisVenda.length === 0 && (
              <div
                data-testid="commercial-canais-vazios"
                className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-muted-foreground space-y-2"
              >
                <p>
                  <strong className="text-foreground">Nenhuma venda registrada por canal.</strong> O
                  mix por canal que aparecia aqui era de demonstração e foi removido — o PLM não é
                  ERP e não rateia receita por canal sem pedido salvo.
                </p>
                <Button size="sm" variant="outline" className="h-7 text-2xs" asChild>
                  <a href="/orders">Ver pedidos salvos</a>
                </Button>
              </div>
            )}
            {canaisVenda.map((c) => (
              <div key={c.channel} className="space-y-2">
                <div className="flex justify-between items-end">
                  <p className="text-xs font-medium text-foreground">{c.channel}</p>
                  <p className="text-xs font-mono font-bold text-foreground">{c.val}</p>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${c.perc}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-card rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Carteira de Clientes B2B
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenDialog()}
              className="h-7 text-2xs"
            >
              + Novo Lojista
            </Button>
          </div>
          {clients.length === 0 && (
            <div
              data-testid="commercial-carteira-vazia"
              className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-muted-foreground"
            >
              <strong className="text-foreground">Carteira B2B vazia.</strong> Nenhum lojista
              cadastrado — romaneio e pré-NFe não são emitidos para cliente de demonstração. O PLM
              não é ERP: cadastre o lojista real para expedir.
            </div>
          )}
          <div className="space-y-2.5">
            {clients.map((client) => (
              <div
                key={client.id}
                onClick={() => setSelectedClientId(client.id)}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                  client.id === selectedClientId
                    ? "border-primary bg-primary/5"
                    : "border-border/60 bg-muted/40 hover:border-primary/40"
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {client.name} <span className="font-mono text-primary">({client.uf})</span>
                  </p>
                  <p className="text-2xs text-muted-foreground font-mono">
                    CNPJ {client.cnpj} · {client.orders} pedidos
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-foreground">
                    {client.total}
                  </span>
                  <ModuleActionMenu
                    onEdit={() => handleOpenDialog(client)}
                    onDelete={() => handleDelete(client.id)}
                    onView={() => setSelectedClientId(client.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="glass-card rounded-xl p-5">
          <h3 className="text-2xs font-semibold uppercase tracking-[0.05em] text-foreground mb-4 flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-primary" /> Conectores Fiscais & Canais
          </h3>
          <div className="space-y-2.5">
            {["SEFAZ NFe 4.00 XML", "ERP UseCloud", "Showroom Digital B2B", "E-commerce VTEX"].map(
              (item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-md border border-border bg-muted/40 p-2.5"
                >
                  <span className="text-xs font-medium text-foreground">{item}</span>
                  {/* Onda 73: nenhum destes conectores está integrado de fato —
                      "Ativo" era afirmação de integração sem lastro. */}
                  <span className="text-2xs font-semibold uppercase text-muted-foreground">
                    Não conectado
                  </span>
                </div>
              ),
            )}
          </div>
        </Card>

        <Card className="glass-card rounded-xl p-5">
          <h3 className="text-2xs font-semibold uppercase tracking-[0.05em] text-foreground mb-4 flex items-center gap-2">
            <RefreshCcw className="h-4 w-4 text-primary" /> Logística Reversa & Caimento
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              // Onda 73: 36 trocas / 2,4% devoluções / 41% de motivo fit eram
              // números fixos lidos como logística reversa real.
              { label: "Trocas abertas", value: "—", icon: RefreshCcw },
              { label: "Devoluções", value: "—", icon: PackageX },
              { label: "Motivo fit", value: "—", icon: Users },
              { label: "Lojas B2B", value: String(clients.length), icon: Store },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-border bg-muted/40 p-3">
                <item.icon className="h-4 w-4 text-primary" />
                <p className="mt-2 text-2xs uppercase text-muted-foreground">{item.label}</p>
                <p className="mt-0.5 text-base font-bold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-card rounded-xl p-5 border-primary/25 bg-primary/[0.04] flex flex-col justify-between">
          <div>
            <h3 className="text-2xs font-semibold uppercase tracking-[0.05em] text-primary mb-2">
              USE AI · Engenharia de Caimento
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Sem devolução registrada não há causa para inferir: o diagnóstico de caimento que
              aparecia aqui era de demonstração e foi removido. Registre as trocas reais para o PLM
              sugerir ajuste de tolerância POM e revalidar no Gêmeo Digital 3D.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => void navigate({ to: "/measurements" })}
            className="mt-4 w-full text-xs"
          >
            Revisar Tabela de Medidas (POM)
          </Button>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Editar Cliente B2B" : "Cadastrar Novo Lojista B2B"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-2xs uppercase text-muted-foreground">Razão Social</Label>
              <Input
                aria-label="Razão Social"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Luxury Boutique LTDA"
              />
            </div>
            <div className="grid grid-cols-[1fr_90px] gap-3">
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">CNPJ</Label>
                <Input
                  aria-label="CNPJ"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Pedidos</Label>
                <Input
                  aria-label="Pedidos"
                  type="number"
                  value={formData.orders}
                  onChange={(e) => setFormData({ ...formData, orders: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Volume Anual</Label>
                <Input
                  aria-label="Volume Anual"
                  value={formData.total}
                  onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar na Carteira</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
