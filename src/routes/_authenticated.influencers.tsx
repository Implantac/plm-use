// Influencer Center — gestão de envios, ROI e mapa de calor do Brasil.
// PLM/Marketing-only: store compartilhado com Marketing AI.
// Onda 59: a vitrine de 5 creators (`demo: true`) continua visível e rotulada,
// mas não gera KPI, heat map, ROI, ROAS/CAC, cupom/CFOP nem Guia de Remessa
// Bonificação A4. Só creator salvo por ação explícita apura e emite.
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  ArrowRight,
  Heart,
  Instagram,
  MapPin,
  Package,
  Plus,
  Send,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { FieldMessage } from "@/components/ui/field-message";
import { SeedingAttributionPanel } from "@/components/influencers/SeedingAttributionPanel";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { CtaProximoPasso } from "@/components/onboarding/CtaProximoPasso";
import {
  CRIADOR_DEMO_LABEL,
  influencerEhVitrine,
  influencersOperacionais,
  REGIOES_BR,
  useInfluencersStore,
  type Envio,
  type Influencer,
  type NovoCriador,
} from "@/lib/influencers/store";

export const Route = createFileRoute("/_authenticated/influencers")({
  component: InfluencersPage,
});

const CRIADOR_VAZIO: NovoCriador = {
  nome: "",
  handle: "",
  regiao: "Sudeste",
  uf: "",
  seguidores: 0,
  segmento: "",
  perfil: "Micro",
  custoMedio: 0,
  vendasGeradas: 0,
  primeiraRef: "",
  primeiraPeca: "",
};

type ErrosCriador = Partial<Record<keyof NovoCriador, string>>;

function InfluencersPage() {
  const influencers = useInfluencersStore((s) => s.influencers);
  const registrarEnvioStore = useInfluencersStore((s) => s.registrarEnvio);
  const registrarCreatorStore = useInfluencersStore((s) => s.registrarCreator);
  const [sel, setSel] = useState<Influencer | null>(null);
  const [envioOpen, setEnvioOpen] = useState(false);
  const [novoRef, setNovoRef] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [envioErrors, setEnvioErrors] = useState<{ ref?: string; nome?: string }>({});
  const [criadorOpen, setCriadorOpen] = useState(false);
  const [criador, setCriador] = useState<NovoCriador>(CRIADOR_VAZIO);
  const [criadorErrors, setCriadorErrors] = useState<ErrosCriador>({});

  const operacionais = useMemo(() => influencersOperacionais(influencers), [influencers]);
  const soVitrine = operacionais.length === 0;

  const totais = useMemo(() => {
    const enviosTot = operacionais.reduce((a, i) => a + i.envios.length, 0);
    const vendasTot = operacionais.reduce((a, i) => a + i.vendasGeradas, 0);
    const investido = operacionais.reduce((a, i) => a + i.custoMedio * i.envios.length, 0);
    const engMedio =
      operacionais
        .flatMap((i) => i.envios.map((e) => e.engajamento ?? 0))
        .filter((x) => x > 0)
        .reduce((a, b, _, arr) => a + b / arr.length, 0) || 0;
    return { enviosTot, vendasTot, investido, engMedio };
  }, [operacionais]);

  const heatmap = useMemo(() => {
    const map = Object.fromEntries(REGIOES_BR.map((r) => [r, 0])) as Record<string, number>;
    for (const i of operacionais) map[i.regiao] += i.vendasGeradas;
    const max = Math.max(...Object.values(map), 1);
    return { map, max };
  }, [operacionais]);

  function registrarEnvio() {
    if (!sel) return;
    // A vitrine não é promovida por efeito colateral: registrar um envio em
    // creator de demonstração criaria uma remessa "real" em cima do seed.
    if (influencerEhVitrine(sel)) {
      toast.error(CRIADOR_DEMO_LABEL);
      return;
    }
    const errs: typeof envioErrors = {};
    if (!novoRef.trim()) errs.ref = "Informe a referência.";
    if (!novoNome.trim()) errs.nome = "Informe o nome da peça.";
    if (Object.keys(errs).length > 0) {
      setEnvioErrors(errs);
      return;
    }
    setEnvioErrors({});

    const envio: Envio = {
      id: Math.random().toString(36).slice(2, 8),
      ref: novoRef.toUpperCase(),
      nome: novoNome,
      data: new Date().toISOString().slice(0, 10),
      status: "Enviado",
    };
    registrarEnvioStore(sel.id, envio);
    setSel((s) => (s ? { ...s, envios: [envio, ...s.envios] } : s));
    setNovoRef("");
    setNovoNome("");
    setEnvioOpen(false);
    toast.success(`Envio registrado para ${sel.nome}`);
  }

  function registrarCreator() {
    const errs: ErrosCriador = {};
    if (!criador.nome.trim()) errs.nome = "Informe o nome do creator.";
    if (!criador.handle.trim()) errs.handle = "Informe o handle.";
    if (criador.uf.trim().length !== 2) errs.uf = "Informe a UF com 2 letras.";
    if (!criador.primeiraRef.trim()) errs.primeiraRef = "Informe a referência da peça enviada.";
    if (!criador.primeiraPeca.trim()) errs.primeiraPeca = "Informe o nome da peça enviada.";
    if (!Number.isFinite(criador.custoMedio) || criador.custoMedio < 0)
      errs.custoMedio = "Informe um custo maior ou igual a zero.";
    if (!Number.isFinite(criador.vendasGeradas) || criador.vendasGeradas < 0)
      errs.vendasGeradas = "Informe vendas maiores ou iguais a zero.";
    if (Object.keys(errs).length > 0) {
      setCriadorErrors(errs);
      return;
    }
    registrarCreatorStore(criador);
    setCriadorErrors({});
    setCriador(CRIADOR_VAZIO);
    setCriadorOpen(false);
    toast.success(`Creator ${criador.nome.trim()} salvo com a primeira remessa.`);
  }

  const selVitrine = sel ? influencerEhVitrine(sel) : false;

  return (
    <ModuleLayout
      title="Influencer Center"
      subtitle="Curadoria de creators, envios de peças, engajamento e mapa de demanda por região."
      version="Influencer v1.1"
      onAdd={() => setCriadorOpen(true)}
      metrics={[
        {
          label: "Influencers",
          value: soVitrine ? "—" : String(operacionais.length),
          detail: soVitrine ? "não apurável" : "salvos",
        },
        {
          label: "Envios",
          value: soVitrine ? "—" : String(totais.enviosTot),
          detail: soVitrine ? "não apurável" : "no período",
        },
        {
          label: "Vendas atribuídas",
          value: soVitrine ? "—" : String(totais.vendasTot),
          detail: soVitrine ? "não apurável" : "geradas",
        },
        {
          label: "Eng. médio",
          value: soVitrine ? "—" : `${totais.engMedio.toFixed(1)}%`,
          detail: soVitrine ? "não apurável" : "posts ativos",
        },
      ]}
    >
      <SeedingAttributionPanel onRegistrar={() => setCriadorOpen(true)} />

      {soVitrine && (
        <div
          data-testid="influencer-so-vitrine"
          className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-muted-foreground"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p>
              <strong className="text-foreground">
                {influencers.filter(influencerEhVitrine).length} creators de demonstração na
                vitrine.
              </strong>{" "}
              {CRIADOR_DEMO_LABEL} Influencers, envios, vendas atribuídas, engajamento, mapa por
              região, investimento e ROI ficam em <strong className="text-foreground">—</strong>,
              não em números de fábrica. Registre um creator e sua primeira remessa para apurar.
              <Button
                size="sm"
                data-testid="cta-influencer-registrar"
                onClick={() => setCriadorOpen(true)}
                className="mt-2 h-7 gap-1 px-2.5 text-2xs"
              >
                Registrar creator real <ArrowRight className="h-3 w-3" />
              </Button>
              <CtaProximoPasso
                passo="campanha"
                onAcao={() => setCriadorOpen(true)}
                label="Começar pelo drop"
                testId="cta-influencer-proximo-passo"
              />
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {influencers.map((i) => {
            const vitrine = influencerEhVitrine(i);
            const eng =
              i.envios.filter((e) => e.engajamento).reduce((a, e) => a + (e.engajamento ?? 0), 0) /
                Math.max(1, i.envios.filter((e) => e.engajamento).length) || 0;
            return (
              <Card
                key={i.id}
                className="glass-card rounded-lg hover:border-primary/30 transition cursor-pointer"
                onClick={() => setSel(i)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{i.nome}</p>
                        <Badge
                          variant="outline"
                          className="text-2xs border-primary/40 text-primary"
                        >
                          {i.perfil}
                        </Badge>
                        {vitrine && (
                          <Badge
                            variant="outline"
                            data-testid={`demo-creator-${i.id}`}
                            className="text-2xs border-amber-500/40 text-amber-600 dark:text-amber-300"
                          >
                            Demonstração
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <Instagram className="h-3 w-3" /> {i.handle} •
                        <MapPin className="h-3 w-3" /> {i.uf} • {i.segmento}
                      </p>
                      <p className="text-2xs text-muted-foreground mt-1">
                        {vitrine
                          ? "— seguidores • — médio/envio"
                          : `${(i.seguidores / 1000).toFixed(0)}k seguidores • R$ ${i.custoMedio.toLocaleString("pt-BR")} médio/envio`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xs uppercase tracking-wider text-muted-foreground">
                        Vendas geradas
                      </p>
                      <p className="text-2xl font-bold text-status-approved">
                        {vitrine ? "—" : i.vendasGeradas}
                      </p>
                      <p className="text-2xs text-muted-foreground">
                        {vitrine
                          ? "— envios • —% eng"
                          : `${i.envios.length} envios • ${eng.toFixed(1)}% eng`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-3">
          <Card className="glass-card rounded-lg">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Heat Map Brasil
              </h3>
              <div className="space-y-2" data-testid="heatmap-regioes">
                {REGIOES_BR.map((r) => {
                  const v = soVitrine ? null : heatmap.map[r];
                  const pct = v === null ? 0 : Math.round((v / heatmap.max) * 100);
                  return (
                    <div key={r} className="flex items-center gap-3 text-xs">
                      <span className="w-24 truncate text-muted-foreground">{r}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary/40 to-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-semibold text-white">
                        {v === null ? "—" : v}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-2xs text-muted-foreground mt-3">
                {soVitrine
                  ? "Concentração não apurável: só há creators de demonstração."
                  : "Concentração de vendas atribuídas a creators salvos por macro-região."}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card rounded-lg border-primary/20">
            <CardContent className="p-4">
              <p className="text-2xs uppercase tracking-wider text-primary mb-1 flex items-center gap-1">
                <Heart className="h-3 w-3" /> Investimento total
              </p>
              <p className="text-2xl font-bold text-white">
                {soVitrine ? "—" : `R$ ${totais.investido.toLocaleString("pt-BR")}`}
              </p>
              <p className="text-xs text-muted-foreground">
                ROI estimado:{" "}
                <span className="text-status-approved font-bold">
                  {!soVitrine && totais.investido > 0
                    ? `${Math.round(((totais.vendasTot * 350) / totais.investido) * 100)}%`
                    : "—"}
                </span>{" "}
                (ticket médio de referência R$ 350; estimativa, não apuração fiscal)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Drawer influencer */}
      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="glass-card border-border bg-popover text-white max-w-2xl">
          {sel && (
            <>
              <DialogHeader>
                <p className="text-2xs font-semibold uppercase tracking-[0.05em] text-primary">
                  {sel.handle}
                </p>
                <DialogTitle className="text-xl">
                  {sel.nome}{" "}
                  {selVitrine && (
                    <Badge
                      variant="outline"
                      className="text-2xs border-amber-500/40 text-amber-600 dark:text-amber-300"
                    >
                      Demonstração — números não apurados
                    </Badge>
                  )}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {sel.regiao} • {sel.uf} • {sel.segmento} •{" "}
                  {selVitrine ? "—" : `${(sel.seguidores / 1000).toFixed(0)}k`}
                </p>
              </DialogHeader>

              <div className="flex justify-between items-center mt-2">
                <p className="text-2xs uppercase tracking-wider text-muted-foreground">
                  Histórico de envios ({selVitrine ? "—" : sel.envios.length})
                </p>
                <Button
                  size="sm"
                  onClick={() => setEnvioOpen(true)}
                  disabled={selVitrine}
                  title={selVitrine ? CRIADOR_DEMO_LABEL : "Registrar novo envio"}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Novo envio
                </Button>
              </div>
              {selVitrine && (
                <p
                  data-testid="drawer-vitrine-sem-envio"
                  className="text-2xs text-amber-600 dark:text-amber-300"
                >
                  Envios abaixo são exemplos de vitrine. Registre um creator real para lançar
                  remessas e emitir a guia.
                </p>
              )}

              <div className="space-y-2 mt-2 max-h-[360px] overflow-y-auto pr-1">
                {sel.envios.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-md border border-border bg-muted/50 p-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-2xs font-semibold uppercase tracking-[0.04em] text-primary">
                        {e.ref}
                      </p>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        {e.nome}
                      </p>
                      <p className="text-2xs text-muted-foreground">
                        {new Date(e.data).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className={`text-2xs ${
                          e.status === "Engajou"
                            ? "border-status-approved/40 text-status-approved"
                            : e.status === "Postou"
                              ? "border-primary/40 text-primary"
                              : e.status === "Pendente"
                                ? "border-status-progress/40 text-status-progress"
                                : "border-border-strong/70"
                        }`}
                      >
                        {e.status}
                      </Badge>
                      {e.engajamento && !selVitrine && (
                        <p className="text-2xs text-status-approved mt-1">{e.engajamento}% eng</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-2xs uppercase tracking-wider text-muted-foreground">Vendas</p>
                  <p className="text-lg font-bold text-status-approved">
                    {selVitrine ? "—" : sel.vendasGeradas}
                  </p>
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-2xs uppercase tracking-wider text-muted-foreground">
                    Custo médio
                  </p>
                  <p className="text-lg font-bold text-white">
                    {selVitrine ? "—" : `R$ ${sel.custoMedio.toLocaleString("pt-BR")}`}
                  </p>
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-2xs uppercase tracking-wider text-muted-foreground">
                    Conversão
                  </p>
                  <p className="text-lg font-bold text-primary">
                    {selVitrine
                      ? "—"
                      : `${(sel.vendasGeradas / Math.max(1, sel.envios.length)) | 0}/envio`}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal envio — Onda 59: os 2 campos que só aparecem após 2 cliques
          não tinham nome acessível (varredura da Onda 52 não abria este drawer). */}
      <Dialog open={envioOpen} onOpenChange={setEnvioOpen}>
        <DialogContent className="glass-card border-border bg-popover text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Registrar envio para {sel?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label
                htmlFor="envio-referencia"
                className="text-2xs uppercase tracking-wider text-muted-foreground"
                required
              >
                Referência
              </Label>
              <Input
                id="envio-referencia"
                value={novoRef}
                onChange={(e) => {
                  setNovoRef(e.target.value);
                  if (e.target.value.trim()) setEnvioErrors((p) => ({ ...p, ref: undefined }));
                }}
                placeholder="ex: VT302"
                className="bg-muted/60 text-white"
                aria-label="Referência da peça enviada"
                aria-invalid={!!envioErrors.ref}
              />
              {envioErrors.ref && <FieldMessage variant="error">{envioErrors.ref}</FieldMessage>}
            </div>
            <div>
              <Label
                htmlFor="envio-nome-peca"
                className="text-2xs uppercase tracking-wider text-muted-foreground"
                required
              >
                Nome da peça
              </Label>
              <Input
                id="envio-nome-peca"
                value={novoNome}
                onChange={(e) => {
                  setNovoNome(e.target.value);
                  if (e.target.value.trim()) setEnvioErrors((p) => ({ ...p, nome: undefined }));
                }}
                placeholder="ex: Vestido Midi Toscana"
                className="bg-muted/60 text-white"
                aria-label="Nome da peça enviada"
                aria-invalid={!!envioErrors.nome}
              />
              {envioErrors.nome && <FieldMessage variant="error">{envioErrors.nome}</FieldMessage>}
            </div>
            <Button
              onClick={registrarEnvio}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Registrar envio
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de promoção explícita: creator salvo + primeira remessa real. */}
      <Dialog open={criadorOpen} onOpenChange={setCriadorOpen}>
        <DialogContent
          data-testid="dialogo-registrar-creator"
          className="glass-card border-border bg-popover text-white max-w-lg"
        >
          <DialogHeader>
            <DialogTitle className="text-lg">Registrar creator real</DialogTitle>
            <p className="text-2xs text-muted-foreground">
              O creator salvo e sua primeira remessa passam a apurar KPIs, atribuição de seeding e a
              guia A4. A vitrine de demonstração permanece separada.
            </p>
          </DialogHeader>
          <div className="space-y-3 mt-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="criador-nome" required>
                  Nome do creator
                </Label>
                <Input
                  id="criador-nome"
                  value={criador.nome}
                  onChange={(e) => setCriador((c) => ({ ...c, nome: e.target.value }))}
                  className="bg-muted/60 text-white"
                  aria-label="Nome do creator"
                  aria-invalid={!!criadorErrors.nome}
                />
                {criadorErrors.nome && (
                  <FieldMessage variant="error">{criadorErrors.nome}</FieldMessage>
                )}
              </div>
              <div>
                <Label htmlFor="criador-handle" required>
                  Handle
                </Label>
                <Input
                  id="criador-handle"
                  value={criador.handle}
                  onChange={(e) => setCriador((c) => ({ ...c, handle: e.target.value }))}
                  placeholder="@creator"
                  className="bg-muted/60 text-white"
                  aria-label="Handle do creator"
                  aria-invalid={!!criadorErrors.handle}
                />
                {criadorErrors.handle && (
                  <FieldMessage variant="error">{criadorErrors.handle}</FieldMessage>
                )}
              </div>
              <div>
                <Label htmlFor="criador-uf" required>
                  UF
                </Label>
                <Input
                  id="criador-uf"
                  value={criador.uf}
                  maxLength={2}
                  onChange={(e) => setCriador((c) => ({ ...c, uf: e.target.value }))}
                  placeholder="SP"
                  className="bg-muted/60 text-white"
                  aria-label="UF do creator"
                  aria-invalid={!!criadorErrors.uf}
                />
                {criadorErrors.uf && (
                  <FieldMessage variant="error">{criadorErrors.uf}</FieldMessage>
                )}
              </div>
              <div>
                <Label htmlFor="criador-regiao">Região</Label>
                <select
                  id="criador-regiao"
                  value={criador.regiao}
                  onChange={(e) => setCriador((c) => ({ ...c, regiao: e.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-muted/60 px-3 text-sm text-white"
                  aria-label="Região do creator"
                >
                  {REGIOES_BR.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="criador-perfil">Perfil</Label>
                <select
                  id="criador-perfil"
                  value={criador.perfil}
                  onChange={(e) =>
                    setCriador((c) => ({ ...c, perfil: e.target.value as NovoCriador["perfil"] }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-muted/60 px-3 text-sm text-white"
                  aria-label="Perfil do creator"
                >
                  {(["Macro", "Médio", "Micro"] as const).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="criador-segmento">Segmento</Label>
                <Input
                  id="criador-segmento"
                  value={criador.segmento}
                  onChange={(e) => setCriador((c) => ({ ...c, segmento: e.target.value }))}
                  placeholder="ex: Moda Urbana"
                  className="bg-muted/60 text-white"
                  aria-label="Segmento do creator"
                />
              </div>
              <div>
                <Label htmlFor="criador-seguidores">Seguidores</Label>
                <Input
                  id="criador-seguidores"
                  type="number"
                  min={0}
                  value={criador.seguidores}
                  onChange={(e) =>
                    setCriador((c) => ({ ...c, seguidores: Number(e.target.value) }))
                  }
                  className="bg-muted/60 text-white"
                  aria-label="Seguidores do creator"
                />
              </div>
              <div>
                <Label htmlFor="criador-custo">Custo médio por envio (R$)</Label>
                <Input
                  id="criador-custo"
                  type="number"
                  min={0}
                  value={criador.custoMedio}
                  onChange={(e) =>
                    setCriador((c) => ({ ...c, custoMedio: Number(e.target.value) }))
                  }
                  className="bg-muted/60 text-white"
                  aria-label="Custo médio por envio em reais"
                  aria-invalid={!!criadorErrors.custoMedio}
                />
                {criadorErrors.custoMedio && (
                  <FieldMessage variant="error">{criadorErrors.custoMedio}</FieldMessage>
                )}
              </div>
              <div>
                <Label htmlFor="criador-vendas">Vendas geradas</Label>
                <Input
                  id="criador-vendas"
                  type="number"
                  min={0}
                  value={criador.vendasGeradas}
                  onChange={(e) =>
                    setCriador((c) => ({ ...c, vendasGeradas: Number(e.target.value) }))
                  }
                  className="bg-muted/60 text-white"
                  aria-label="Vendas geradas pelo creator"
                  aria-invalid={!!criadorErrors.vendasGeradas}
                />
                {criadorErrors.vendasGeradas && (
                  <FieldMessage variant="error">{criadorErrors.vendasGeradas}</FieldMessage>
                )}
              </div>
              <div>
                <Label htmlFor="criador-ref" required>
                  Referência da peça enviada
                </Label>
                <Input
                  id="criador-ref"
                  value={criador.primeiraRef}
                  onChange={(e) => setCriador((c) => ({ ...c, primeiraRef: e.target.value }))}
                  placeholder="ex: VT302"
                  className="bg-muted/60 text-white"
                  aria-label="Referência da primeira peça enviada"
                  aria-invalid={!!criadorErrors.primeiraRef}
                />
                {criadorErrors.primeiraRef && (
                  <FieldMessage variant="error">{criadorErrors.primeiraRef}</FieldMessage>
                )}
              </div>
              <div>
                <Label htmlFor="criador-peca" required>
                  Nome da peça enviada
                </Label>
                <Input
                  id="criador-peca"
                  value={criador.primeiraPeca}
                  onChange={(e) => setCriador((c) => ({ ...c, primeiraPeca: e.target.value }))}
                  placeholder="ex: Vestido Midi Toscana"
                  className="bg-muted/60 text-white"
                  aria-label="Nome da primeira peça enviada"
                  aria-invalid={!!criadorErrors.primeiraPeca}
                />
                {criadorErrors.primeiraPeca && (
                  <FieldMessage variant="error">{criadorErrors.primeiraPeca}</FieldMessage>
                )}
              </div>
            </div>
            <Button
              data-testid="btn-salvar-creator"
              onClick={registrarCreator}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Salvar creator e primeira remessa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
