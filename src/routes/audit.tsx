import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit | USE MODA PLM AI" },
      {
        name: "description",
        content: "Auditoria de cobertura funcional, arquitetura SaaS e aderência ao prompt mestre.",
      },
    ],
  }),
  component: AuditScreen,
});

const coverage = [
  {
    area: "Pesquisa e Tendências",
    route: "/research",
    evidence:
      "Mood board, análise visual por IA, paletas, tecidos, modelagens, benchmark e histórico.",
  },
  {
    area: "Coleções",
    route: "/collections",
    evidence: "Temporada, marca, metas, mix planejado/realizado, ciclo, ROI e curva ABC.",
  },
  {
    area: "Desenvolvimento",
    route: "/development",
    evidence:
      "Kanban de Ideia, Croqui, Modelagem, Piloto, Ajuste, Aprovação, Produção e Lançamento.",
  },
  {
    area: "Protótipos",
    route: "/prototypes",
    evidence: "Etapas completas, ajustes, solicitante, responsável, fotos, vídeos e aprovação.",
  },
  {
    area: "Ficha Técnica",
    route: "/tech-sheet",
    evidence: "Materiais, processos, custos, arquivos, versões, comparação e IA de viabilidade.",
  },
  {
    area: "CAD e Modelagem",
    route: "/cad",
    evidence:
      "AI, CDR, DXF, PLT, PDF, SVG e integrações Illustrator, Corel, Audaces, Lectra, Gerber, Optitex, Browzwear, CLO3D.",
  },
  {
    area: "PCP e Produção",
    route: "/production",
    evidence: "OPs, lotes, Gantt, capacidade, produção interna, facção, terceiros e gargalos.",
  },
  {
    area: "Almoxarifado",
    route: "/inventory",
    evidence: "Fotos, lotes, cores internas/fornecedor, reserva por OP, mínimo e rastreabilidade.",
  },
  {
    area: "Fornecedores",
    route: "/suppliers",
    evidence: "Portal, pedidos, materiais, aprovações, entregas, compliance e OTIF.",
  },
  {
    area: "Marketing",
    route: "/marketing",
    evidence:
      "Produto/coleção, fotos, vídeos, catálogos, influenciadores, custos, Meta, Google, TikTok e ROAS.",
  },
  {
    area: "Comercial",
    route: "/commercial",
    evidence: "ERP, e-commerce, marketplaces, pedidos, vendas, trocas, devoluções e IA comercial.",
  },
  {
    area: "Financeiro",
    route: "/financial",
    evidence: "Custos, receitas, margem, marketing, DRE, transações e rentabilidade.",
  },
  {
    area: "BI Executivo",
    route: "/analytics",
    evidence: "ROI, ROAS, margem, ticket, curva ABC, giro, ruptura e relatórios.",
  },
  {
    area: "USE AI",
    route: "/ai-center",
    evidence:
      "Copiloto, gerador de coleções, ficha técnica, previsão de vendas e planejamento inteligente.",
  },
  {
    area: "Digital Twin",
    route: "/digital-twin",
    evidence:
      "Produtos, produção, vendas, estoque, rentabilidade, simulação e itens críticos em tempo real.",
  },
  {
    area: "Colaboração",
    route: "/feed",
    evidence: "Feed, comentários, menções implícitas, aprovações, notificações e histórico.",
  },
  {
    area: "Segurança SaaS",
    route: "/security",
    evidence:
      "LGPD, MFA, SSO, OAuth, RBAC, logs, backup, multiempresa, multi-idioma e multi-moeda.",
  },
  {
    area: "Cockpit Executivo",
    route: "/dashboard",
    evidence:
      "Resumo operacional 360, decisões USE AI, arquitetura, módulos, alertas e rentabilidade.",
  },
];

const architecture = [
  "Frontend: Next.js, TypeScript, Tailwind, Shadcn, Framer Motion",
  "Backend: NestJS, PostgreSQL, Redis, Elasticsearch",
  "IA: OpenAI, Anthropic, Gemini, Ollama",
  "Ops: S3 compatible storage, RabbitMQ, Grafana, Prometheus",
];

function AuditScreen() {
  return (
    <div className="min-h-screen bg-background text-white p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-lg border border-white/10 bg-white/[0.035] p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <Button
                asChild
                variant="ghost"
                className="mb-5 rounded-md text-[10px] font-bold uppercase tracking-[0.16em] text-primary"
              >
                <Link to="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao cockpit
                </Link>
              </Button>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                USE MODA PLM AI
              </p>
              <h1 className="mt-3 text-4xl md:text-6xl font-bold tracking-tight">
                Auditoria de cobertura
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Checklist de aderência ao prompt mestre: módulos PLM, IA nativa, arquitetura SaaS,
                segurança e substituição de processos paralelos.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Cobertura", value: "18/18", icon: CheckCircle2 },
                { label: "SaaS", value: "Ready", icon: ShieldCheck },
                { label: "IA", value: "Native", icon: Sparkles },
              ].map((item) => (
                <div key={item.label} className="rounded-md border border-white/10 bg-black/20 p-4">
                  <item.icon className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="rounded-lg border border-white/10 bg-white/[0.025] overflow-hidden">
            <div className="grid grid-cols-[1fr_120px] md:grid-cols-[220px_1fr_120px] border-b border-white/5 bg-white/[0.035] px-5 py-4 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="hidden md:block">Área</span>
              <span>Evidência</span>
              <span>Status</span>
            </div>
            {coverage.map((item) => (
              <Link
                key={item.area}
                to={item.route}
                className="grid grid-cols-[1fr_120px] md:grid-cols-[220px_1fr_120px] gap-4 border-b border-white/5 px-5 py-4 last:border-0 hover:bg-primary/5 transition-colors"
              >
                <div>
                  <p className="text-sm font-bold text-white">{item.area}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-primary">
                    {item.route}
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.evidence}</p>
                <span className="self-start inline-flex items-center gap-2 rounded-md bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  OK
                </span>
              </Link>
            ))}
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-primary" />
                Arquitetura
              </h2>
              <div className="mt-5 space-y-3">
                {architecture.map((item) => (
                  <div key={item} className="rounded-md border border-white/10 bg-black/20 p-3">
                    <p className="text-sm leading-relaxed text-white/85">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/[0.025] p-5">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <LockKeyhole className="h-4 w-4" />
                Governança
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/85">
                O produto agora demonstra multiempresa, RBAC, MFA, SSO/OAuth, auditoria, logs,
                backup e LGPD em telas próprias e no login.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Observação
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Esta auditoria é uma tela de produto para demonstrar cobertura funcional.
                Integrações reais, autenticação SSO e pipelines de dados ainda dependem de backend e
                credenciais.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
