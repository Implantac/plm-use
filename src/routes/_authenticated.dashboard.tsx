import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Brain,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Factory,
  FileText,
  Globe,
  Layers3,
  LockKeyhole,
  Megaphone,
  PackageCheck,
  Palette,
  PenTool,
  Route as RouteIcon,
  Scissors,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { OptimizedImage } from "@/components/OptimizedImage";
import { LivePCPWidget } from "@/components/dashboard/LivePCPWidget";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const executiveStats = [
  {
    label: "ROI da colecao",
    value: "3.4x",
    change: "+18%",
    detail: "vs. meta financeira",
    icon: TrendingUp,
    tone: "text-emerald-300",
  },
  {
    label: "Margem projetada",
    value: "67.8%",
    change: "+4.2 pp",
    detail: "com custos atuais",
    icon: CircleDollarSign,
    tone: "text-sky-300",
  },
  {
    label: "Produtos em ciclo",
    value: "186",
    change: "42 criticos",
    detail: "da ideia ao lancamento",
    icon: Scissors,
    tone: "text-primary",
  },
  {
    label: "Lead time medio",
    value: "28d",
    change: "-9d",
    detail: "desenvolvimento",
    icon: CalendarClock,
    tone: "text-amber-300",
  },
];

const modules = [
  { label: "Pesquisa", href: "/research", value: "34 tendencias", icon: Palette, progress: 82 },
  { label: "Colecoes", href: "/collections", value: "4 ativas", icon: Layers3, progress: 74 },
  { label: "Produto", href: "/development", value: "186 refs", icon: Scissors, progress: 61 },
  {
    label: "Prototipos",
    href: "/prototypes",
    value: "9 pilotos",
    icon: PackageCheck,
    progress: 58,
  },
  {
    label: "Ficha tecnica",
    href: "/tech-sheet",
    value: "129 aprovadas",
    icon: FileText,
    progress: 69,
  },
  { label: "CAD", href: "/cad", value: "8 integracoes", icon: PenTool, progress: 72 },
  { label: "PCP", href: "/production", value: "24 OPs", icon: Factory, progress: 57 },
  { label: "Almoxarifado", href: "/inventory", value: "8 alertas", icon: Boxes, progress: 46 },
  { label: "Fornecedores", href: "/suppliers", value: "12 pendencias", icon: Truck, progress: 54 },
  { label: "Marketing", href: "/marketing", value: "6 campanhas", icon: Megaphone, progress: 78 },
  {
    label: "Comercial",
    href: "/commercial",
    value: "842 pedidos",
    icon: PackageCheck,
    progress: 76,
  },
  {
    label: "Financeiro",
    href: "/financial",
    value: "62% margem",
    icon: CircleDollarSign,
    progress: 67,
  },
  { label: "BI", href: "/analytics", value: "18 KPIs", icon: BarChart3, progress: 88 },
  { label: "USE AI", href: "/ai-center", value: "4 motores", icon: Brain, progress: 91 },
  { label: "Digital Twin", href: "/digital-twin", value: "live", icon: Globe, progress: 84 },
  { label: "Seguranca", href: "/security", value: "RBAC/MFA", icon: LockKeyhole, progress: 96 },
];

const architecture = [
  { group: "Frontend", items: "Next.js, TypeScript, Tailwind, Shadcn, Framer Motion" },
  { group: "Backend", items: "NestJS, PostgreSQL, Redis, Elasticsearch" },
  { group: "IA", items: "OpenAI, Anthropic, Gemini, Ollama" },
  { group: "Ops", items: "S3, RabbitMQ, Grafana, Prometheus" },
];

const workflow = [
  { step: "Ideia", count: 32, color: "bg-sky-400" },
  { step: "Croqui", count: 28, color: "bg-cyan-300" },
  { step: "Modelagem", count: 41, color: "bg-primary" },
  { step: "Piloto", count: 24, color: "bg-amber-300" },
  { step: "Aprovacao", count: 17, color: "bg-emerald-300" },
  { step: "Producao", count: 44, color: "bg-violet-300" },
];

const decisions = [
  "Repetir Blusa Linho Amalfi: ROI 4.8x, ruptura prevista em 11 dias.",
  "Reduzir 18% do mix de tricot pesado para evitar estoque lento.",
  "Antecipar compra de viscose off-white: fornecedor elevou prazo para 21 dias.",
];

const productRanking = [
  {
    name: "Blusa Linho Amalfi",
    ref: "FT-V25-018",
    roi: "4.8x",
    margin: "78%",
    status: "Repetir",
    image:
      "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=700",
  },
  {
    name: "Pantalona Riviera",
    ref: "FT-V25-044",
    roi: "3.1x",
    margin: "64%",
    status: "Escalar",
    image:
      "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=700",
  },
  {
    name: "Vestido Gala Resort",
    ref: "FT-V25-097",
    roi: "2.6x",
    margin: "59%",
    status: "Ajustar custo",
    image:
      "https://images.unsplash.com/photo-1566206091558-7f218b696731?auto=format&fit=crop&q=80&w=700",
  },
];

function Dashboard() {
  return (
    <div className="space-y-6 pb-10">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-6"
      >
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 md:p-7 flex flex-col justify-between gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-md border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              SaaS multiempresa
            </span>
            <span className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              LGPD, SSO, MFA, auditoria
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                USE MODA PLM AI
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Cockpit unico para pesquisa, desenvolvimento, engenharia, producao, marketing,
                comercial, financeiro e rentabilidade da colecao.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
 asChild
 className="text-[10px] tracking-[0.16em]"
 >
                <Link to="/ai-center">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Abrir USE AI
                </Link>
              </Button>
              <Button
 asChild
 variant="outline"
 className="text-[10px] tracking-[0.16em]"
 >
                <Link to="/digital-twin">
                  <RouteIcon className="mr-2 h-4 w-4" />
                  Digital Twin
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <Card className="glass-card rounded-lg border-primary/15">
          <CardHeader className="p-5 border-b border-white/5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                USE AI Decisions
              </CardTitle>
              <Brain className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {decisions.map((decision, index) => (
              <div key={decision} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-white/90">{decision}</p>
                </div>
              </div>
            ))}
            <Button className="w-full text-[10px] tracking-[0.16em]">
              Gerar plano inteligente
            </Button>
          </CardContent>
        </Card>
      </motion.section>


      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {executiveStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="glass-card rounded-lg hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {stat.label}
                  </p>
                  <stat.icon className={`h-4 w-4 ${stat.tone}`} />
                </div>
                <p className="mt-5 text-3xl font-bold tracking-tight text-white">{stat.value}</p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <span className={stat.tone}>{stat.change}</span> {stat.detail}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>

      <LivePCPWidget />


      <section className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr_1fr] gap-6">
        <Card className="glass-card rounded-lg">
          <CardHeader className="p-5 border-b border-white/5">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              Cobertura modular completa
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
            {modules.map((module) => (
              <Link
                key={module.label}
                to={module.href}
                className="rounded-md border border-white/10 bg-white/[0.035] p-4 transition-colors hover:border-primary/35 hover:bg-primary/5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <module.icon className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                      {module.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{module.value}</span>
                </div>
                <Progress value={module.progress} className="mt-3 h-1.5 bg-white/10" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card rounded-lg">
          <CardHeader className="p-5 border-b border-white/5 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              Workflow de produto
            </CardTitle>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
              186 referencias
            </span>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {workflow.map((item) => (
                <div
                  key={item.step}
                  className="rounded-md border border-white/10 bg-white/[0.035] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                    <span className="text-2xl font-bold text-white">{item.count}</span>
                  </div>
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {item.step}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-md border border-white/10 bg-black/25 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                    Linha critica
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    12 pilotos aguardam aprovacao tecnica e bloqueiam 3 ordens de producao.
                  </p>
                </div>
                <Button
 asChild
 variant="outline"
 className="text-[10px] tracking-[0.14em]"
 >
                  <Link to="/prototypes">Resolver fila</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-lg">
          <CardHeader className="p-5 border-b border-white/5">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              Digital twin da colecao
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {[
              { label: "Pesquisa", icon: Palette, value: "82%", status: "tendencias validadas" },
              { label: "Engenharia", icon: FileText, value: "69%", status: "fichas versionadas" },
              { label: "Producao", icon: Factory, value: "57%", status: "capacidade alocada" },
              { label: "Comercial", icon: PackageCheck, value: "76%", status: "sell-in previsto" },
            ].map((node) => (
              <div key={node.label} className="grid grid-cols-[32px_1fr_auto] items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                  <node.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                    {node.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{node.status}</p>
                </div>
                <span className="text-sm font-bold text-primary">{node.value}</span>
              </div>
            ))}
            <div className="rounded-md border border-primary/20 bg-primary/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                Simulacao ativa
              </p>
              <p className="mt-2 text-sm text-white/85">
                Aumentar camisaria premium em 15% eleva margem prevista para R$ 412 mil.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
        <Card className="glass-card rounded-lg">
          <CardHeader className="p-5 border-b border-white/5">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              Arquitetura SaaS e IA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            {architecture.map((layer) => (
              <div
                key={layer.group}
                className="rounded-md border border-white/10 bg-white/[0.035] p-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  {layer.group}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/85">{layer.items}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card rounded-lg border-primary/20 bg-primary/[0.025]">
          <CardHeader className="p-5 border-b border-white/5">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              Substituição de processos paralelos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "Planilhas de coleção substituídas por mix planejado/realizado.",
              "WhatsApp substituído por feed, menções, aprovações e histórico.",
              "BI externo substituído por ROI, ROAS, margem, giro e ruptura.",
              "Parte do ERP conectada a custos, pedidos, estoque e rentabilidade.",
            ].map((item) => (
              <div key={item} className="rounded-md border border-white/10 bg-black/20 p-4">
                <p className="text-sm leading-relaxed text-white/85">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6">
        <Card className="glass-card rounded-lg">
          <CardHeader className="p-5 border-b border-white/5 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              Ranking de rentabilidade PLM + ERP
            </CardTitle>
            <Button
 asChild
 variant="ghost"
 className="text-[10px] tracking-[0.16em] text-primary"
 >
              <Link to="/financial">
                Ver financeiro
                <ArrowUpRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {productRanking.map((product) => (
              <div
                key={product.ref}
                className="rounded-lg border border-white/10 bg-white/[0.035] overflow-hidden"
              >
                <div className="relative h-56">
                  <OptimizedImage
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-3 top-3 rounded-md bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur">
                    ROI {product.roi}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm font-bold text-white">{product.name}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {product.ref} - margem {product.margin}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="rounded-md bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                      {product.status}
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card rounded-lg">
          <CardHeader className="p-5 border-b border-white/5">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              Alertas executivos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {[
              {
                icon: AlertTriangle,
                title: "Risco de ruptura",
                text: "Linho puro off-white cobre apenas 8 dias de consumo.",
                tone: "text-amber-300",
              },
              {
                icon: TrendingDown,
                title: "ROAS abaixo da meta",
                text: "Campanha TikTok Ads performa 22% abaixo do planejado.",
                tone: "text-rose-300",
              },
              {
                icon: Users,
                title: "Fornecedor pendente",
                text: "Portal aguarda aprovacao de 4 aviamentos criticos.",
                tone: "text-sky-300",
              },
              {
                icon: BarChart3,
                title: "Curva ABC",
                text: "18% dos SKUs concentram 72% da margem bruta.",
                tone: "text-emerald-300",
              },
            ].map((alert) => (
              <div
                key={alert.title}
                className="rounded-md border border-white/10 bg-white/[0.035] p-4"
              >
                <div className="flex items-start gap-3">
                  <alert.icon className={`mt-0.5 h-4 w-4 ${alert.tone}`} />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                      {alert.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {alert.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
