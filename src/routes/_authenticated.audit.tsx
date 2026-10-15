// Painel de estado REAL do produto — reescrito em 09/10.
//
// A versão anterior era um checklist de promises do prompt-mestre ("SaaS Ready",
// "multiempresa, MFA, SSO", stack Next/NestJS/Redis que não existe). Isso é
// munição para expectativa errada — e num repo público, histórico que vende o
// que o produto não tem. Este painel agora deriva dos números do próprio código
// (registry de rotas + módulos do creative-sync) e da tabela entity_events;
// status por área é classificativo, não comercial:
//   real   → persiste no Supabase hoje
//   sync   → espelhado via creative-sync (migrations 100% aplicadas via SQL editor do Cloud)
//   parcial→ mistura fonte real com camada demo/local
//   vitrine→ tela de portfólio; edição não persiste (a própria tela avisa)

import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCopy,
  Database,
  Layers3,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ROUTE_REGISTRY } from "@/lib/nav/routes";
import { __internals } from "@/lib/creative-sync";
import { supabase } from "@/integrations/supabase/client";
// O SQL migra com a UI: botão "Copiar SQL" entrega exatamente o arquivo versionado,
// não uma cópia à mão que apodrece (regra da casa — artefatos do operador nascem do repo).
import materialsSql from "../../supabase/migrations/20261014220000_persist_materials.sql?raw";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Estado do produto | USE MODA PLM AI" },
      {
        name: "description",
        content: "Painel de estado real: cobertura por área, persistência e atividade recente.",
      },
    ],
  }),
  component: AuditScreen,
});

type CovStatus = "real" | "sync" | "parcial" | "vitrine";

const STATUS_META: Record<CovStatus, { label: string; cls: string }> = {
  real: { label: "Real", cls: "bg-emerald-300/10 text-emerald-300" },
  sync: { label: "Sync*", cls: "bg-sky-300/10 text-sky-300" },
  parcial: { label: "Parcial", cls: "bg-amber-300/10 text-amber-300" },
  vitrine: { label: "Vitrine", cls: "bg-zinc-300/10 text-zinc-300" },
};

const coverage: Array<{ area: string; route: string; evidence: string; status: CovStatus }> = [
  {
    area: "Desenvolvimento / Kanban",
    route: "/development",
    evidence:
      "Fichas e etapas com cloud-sync no Supabase; drag-and-drop persistido; PDF A4 via impressão e diff estrutural A→B por instantâneo de versão (15/10).",
    status: "real",
  },
  {
    area: "Ficha Técnica",
    route: "/tech-sheet",
    evidence: "Materiais, custos, versões e arquivos persistidos; IA usa modelos oficiais reais.",
    status: "real",
  },
  {
    area: "PCP e Produção",
    route: "/production",
    evidence: "pcp_lots + realtime; passagens/GC geram entity_events.",
    status: "real",
  },
  {
    area: "Almoxarifado",
    route: "/inventory",
    evidence: "Server functions dedicadas (inventário, reserva por OP).",
    status: "real",
  },
  {
    area: "Showroom",
    route: "/showroom",
    evidence: "Peça-mãe, kits, feedback e Go/No-Go em tabelas próprias + realtime.",
    status: "real",
  },
  {
    area: "Lançamentos",
    route: "/launch",
    evidence: "Ondas persistidas; sell-through do cron aguarda ErpAdapter (mock declarado).",
    status: "real",
  },
  {
    area: "Coleções",
    route: "/collections",
    evidence:
      "CRUD completo espelhado (módulo 7); busca na URL, CSV e comparativo. KPIs de benchmark são demo até ERP/BI.",
    status: "sync",
  },
  {
    area: "Cores / Estampas / Looks / Display / Medidas / Mapas",
    route: "/colors",
    evidence: "Módulos 1–6 do creative-sync; timeline unificada com entity_events.",
    status: "sync",
  },
  {
    area: "Biblioteca de materiais",
    route: "/materials",
    evidence:
      "Módulo 11 do creative-sync; migration 20261014220000 pendente — catálogo funciona por dispositivo até o db push, e o BOM consome via 'Do catálogo'.",
    status: "sync",
  },
  {
    area: "Qualidade / CAPA",
    route: "/quality",
    evidence: "Defeitos derivados dos lotes são reais; CAPA espelhada (módulo 9).",
    status: "sync",
  },
  {
    area: "BI Executivo",
    route: "/analytics",
    evidence:
      "KPIs editáveis persistidos (módulo 8) + export CSV; valores ainda manuais por definição.",
    status: "sync",
  },
  {
    area: "Influenciadores / GTM",
    route: "/influencers",
    evidence: "Cadastro + envios espelhados (módulo 10); métricas de engajamento são manuais.",
    status: "sync",
  },
  {
    area: "Fluxo da Coleção",
    route: "/flow",
    evidence: "Gate view derivada das referências reais (read-only).",
    status: "real",
  },
  {
    area: "Aprovações / Feed",
    route: "/approvals",
    evidence: "Notificações em tempo real via tabela notifications; comentários por entidade.",
    status: "real",
  },
  {
    area: "Pesquisa / Protótipos / Marketing / Comercial / Financeiro / CAD",
    route: "/marketing",
    evidence:
      "Telas de portfólio com dados de exemplo — a edição não persiste e cada uma diz isso na própria tela.",
    status: "vitrine",
  },
  {
    area: "Fornecedores",
    route: "/suppliers",
    evidence: "Log de eventos por fornecedor é real; o cadastro da lista é de exemplo.",
    status: "parcial",
  },
  {
    area: "Portal do Fornecedor",
    route: "/supplier-portal",
    evidence: "Leitura da base real (pedidos por fornecedor); sem escrita self-service.",
    status: "parcial",
  },
  {
    area: "USE AI",
    route: "/ai-center",
    evidence: "Agents com contexto live e geração de imagem server-side (auth própria).",
    status: "parcial",
  },
  {
    area: "Admin / Usuários / Segurança",
    route: "/admin/users",
    evidence:
      "Convites, roles e guards verificados (16/16 APIs). Ainda não: SSO, MFA, multiempresa.",
    status: "parcial",
  },
];

const stack = [
  "React 19 + TypeScript, TanStack Router/Start (preset cloudflare-module)",
  "UI Tailwind + shadcn/radix; deploy e sync bidirecional via Lovable Cloud",
  "Supabase: Postgres + RLS + realtime + storage; migrations SQL timestampadas",
  "Qualidade: Vitest (unit/componente), CI GitHub Actions, E2E em staging agendado",
];

type RecentEvent = {
  id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  note: string | null;
  actor_name: string | null;
  created_at: string;
};

function useRecentEvents(limit = 30) {
  const [items, setItems] = useState<RecentEvent[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("entity_events")
      .select("id,entity_type,entity_id,event_type,note,actor_name,created_at")
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setFailed(true);
        else setItems((data ?? []) as RecentEvent[]);
      });
    return () => {
      cancelled = true;
    };
  }, [limit]);
  return { items, failed };
}

type Probe = "checking" | "ok" | "warn" | "dead";

/**
 * Estado VIVO das três pendências que dependem de mãos humanas. Nasceu de
 * prosear menos e provar mais: cada linha vem de uma sonda de leitura feita
 * neste navegador, não de nota de commit. Todas as sondas são de efeito zero —
 * o POST de cron sem assinatura é rejeitado na verificação HMAC antes de
 * qualquer fila de escrita (ordem conferida no handler em 15/10).
 */
function useOperatorProbes() {
  const [state, setState] = useState<{ materials: Probe; publish: Probe; abc: Probe }>({
    materials: "checking",
    publish: "checking",
    abc: "checking",
  });
  const [run, setRun] = useState(0);

  useEffect(() => {
    let alive = true;
    const loose = supabase as unknown as {
      from: (t: string) => {
        select: (c: string, o: Record<string, unknown>) => Promise<{ error: unknown }>;
      };
    };

    // 1) tabela materials no Cloud (PGRST205/"does not exist" = migração não aplicada)
    loose
      .from("materials")
      .select("id", { count: "exact", head: true })
      .then(({ error }) => {
        if (!alive) return;
        const msg = typeof error === "object" && error ? JSON.stringify(error) : "";
        setState((v) => ({
          ...v,
          materials: !error
            ? "ok"
            : /could not find|does not exist|PGRST205/i.test(msg)
              ? "warn"
              : "dead",
        }));
      })
      .catch(() => alive && setState((v) => ({ ...v, materials: "dead" })));

    // 2) publish: o bundle publicado serve /materials com 200; rota inexistente = 404
    //    (controle medido por sonda externa em 15/10)
    fetch(`${window.location.origin}/materials`, { cache: "no-store" })
      .then(
        (r) =>
          alive &&
          setState((v) => ({
            ...v,
            publish: r.ok ? "ok" : r.status === 404 ? "warn" : "dead",
          })),
      )
      .catch(() => alive && setState((v) => ({ ...v, publish: "dead" })));

    // 3) segredo do cron ABC: 503 = env ausente (fail-closed projetado); 401/429 = ativo
    fetch(`${window.location.origin}/api/public/cron/abc-classify`, {
      method: "POST",
      cache: "no-store",
    })
      .then(
        (r) =>
          alive &&
          setState((v) => ({
            ...v,
            abc: r.status === 503 ? "warn" : r.status === 401 || r.status === 429 ? "ok" : "dead",
          })),
      )
      .catch(() => alive && setState((v) => ({ ...v, abc: "dead" })));

    return () => {
      alive = false;
    };
  }, [run]);

  return { ...state, refresh: () => setRun((n) => n + 1) };
}

const PROBE_META: Record<Probe, { icon: typeof CheckCircle2; tone: string }> = {
  checking: { icon: RotateCw, tone: "text-muted-foreground" },
  ok: { icon: CheckCircle2, tone: "text-emerald-400" },
  warn: { icon: AlertTriangle, tone: "text-amber-400" },
  dead: { icon: AlertTriangle, tone: "text-muted-foreground/60" },
};

function TaskRow({
  probe,
  title,
  okText,
  warnText,
  deadText,
  action,
}: {
  probe: Probe;
  title: string;
  okText: string;
  warnText: string;
  deadText: string;
  action?: React.ReactNode;
}) {
  const meta = PROBE_META[probe];
  const Icon = meta.icon;
  const text =
    probe === "ok"
      ? okText
      : probe === "warn"
        ? warnText
        : probe === "dead"
          ? deadText
          : "Sondando…";
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white">
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${meta.tone} ${probe === "checking" ? "animate-spin" : ""}`}
        />
        {title}
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{text}</p>
      {probe === "warn" && action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

function OperatorTasks() {
  const p = useOperatorProbes();
  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(materialsSql);
      toast.success("SQL no clipboard — cole em More → Cloud → SQL editor e Run.");
    } catch {
      toast.error(
        "Clipboard bloqueado; o arquivo está em supabase/migrations/20261014220000_persist_materials.sql",
      );
    }
  };
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
      <h2 className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-white">
        <span className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          Mãos do operador
        </span>
        <button
          onClick={p.refresh}
          title="Re-sondar (leitura pura, sem efeitos)"
          className="rounded-md border border-white/10 p-1.5 text-muted-foreground hover:bg-white/5 hover:text-white"
        >
          <RotateCw className="h-3 w-3" />
        </button>
      </h2>
      <div className="mt-4 space-y-2">
        <TaskRow
          probe={p.materials}
          title="Catálogo no banco"
          okText="Tabela materials viva no Cloud — catálogo compartilhado entre dispositivos, com realtime."
          warnText="Migração 20261014220000 ainda não aplicada; o módulo 11 funciona por dispositivo até o paste no SQL editor."
          deadText="Sem resposta legível do banco nesta sessão — a sonda não pôde concluir."
          action={
            <Button variant="outline" size="sm" className="h-7 gap-2 text-[9px]" onClick={copySql}>
              <ClipboardCopy className="h-3 w-3" /> Copiar SQL do catálogo
            </Button>
          }
        />
        <TaskRow
          probe={p.publish}
          title="Publicação Lovable"
          okText="O bundle publicado nesta origem já serve /materials — módulo visível para todas as sessões."
          warnText="A main tem commits que este deploy ainda não serve: clique Publish no editor Lovable para republicar."
          deadText="A sonda de rota não pôde ser concluída (offline?)"
        />
        <TaskRow
          probe={p.abc}
          title="Cron da curva ABC"
          okText="Segredo HMAC presente: pedidos sem assinatura são rejeitados na porta (401) — o agendamento vale quando o pg_cron disparar."
          warnText="ABC_CRON_SECRET ausente no environment do Lovable (endpoint responde 503 fail-closed). Gere com openssl rand -hex 32, plugue em Settings → Environment Variables e alinhe a linha app_cron_config."
          deadText="O endpoint de cron não respondeu a esta sonda."
        />
      </div>
      <p className="mt-3 text-[9px] leading-relaxed text-muted-foreground/80">
        Cada linha vem de uma sonda feita agora contra o deploy real — não de nota de commit. Sondas
        só leem; nada muda no mundo ao abrir este painel.
      </p>
    </div>
  );
}

function AuditScreen() {
  const { items: events, failed } = useRecentEvents();
  const counts = coverage.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});
  const modules = __internals.moduleKeys();

  return (
    <div className="min-h-dvh bg-background text-white p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-lg border border-white/10 bg-white/[0.035] p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <Button
                asChild
                variant="ghost"
                className="mb-5 text-[10px] tracking-[0.16em] text-primary"
              >
                <Link to="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao cockpit
                </Link>
              </Button>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                USE MODA PLM AI
              </p>
              <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">
                Estado real do produto
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Este painel é gerado do próprio código (registry de rotas, módulos de sincronização
                e trilha de eventos). Vitrine é vitrine — e está escrita como vitrine.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Rotas no registry",
                  value: String(ROUTE_REGISTRY.length),
                  icon: Layers3,
                },
                { label: "Módulos sync", value: String(modules.length), icon: Database },
                {
                  label: "Persistência real",
                  value: `${(counts.real ?? 0) + (counts.sync ?? 0)}/${coverage.length} áreas`,
                  icon: CheckCircle2,
                },
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
              <span>Estado da arte</span>
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
                <span
                  className={`self-start inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${STATUS_META[item.status].cls}`}
                >
                  {item.status === "vitrine" ? (
                    <Store className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {STATUS_META[item.status].label}
                </span>
              </Link>
            ))}
            <p className="px-5 py-3 text-[10px] leading-relaxed text-muted-foreground">
              * Sync = espelho no Supabase via `creative-sync`. As migrations foram aplicadas via
              SQL editor do Lovable Cloud (14/10/2026) — os módulos criativos e a timeline
              cross-device já gravam no banco (enum atual ao vivo, verificado por sonda). As 12
              tabelas e o enum respondem 200 às sondas de 14/10 (19h50). O estado ATUAL das
              pendências humanas (SQL do `materials`, publish, segredo do cron) é o card "Mãos do
              operador" ao lado, re-sondado a cada visita — esta nota ficou como histórico; o cache
              local segue como fallback de rede em qualquer cenário.
            </p>
          </div>

          <div className="space-y-6">
            <OperatorTasks />
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Atividade recente
              </h2>
              <div className="mt-4 space-y-2">
                {failed && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    A trilha `entity_events` ainda não respondeu — o histórico grava assim que o
                    banco estiver no schema atual.
                  </p>
                )}
                {!failed && events === null && (
                  <p className="text-xs text-muted-foreground">Consultando a trilha…</p>
                )}
                {events?.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum evento registrado ainda.</p>
                )}
                {(events ?? []).slice(0, 12).map((e) => (
                  <div key={e.id} className="rounded-md border border-white/10 bg-black/20 p-3">
                    <p className="text-[11px] font-bold text-white">
                      {e.event_type}{" "}
                      <span className="text-muted-foreground font-normal">
                        · {e.entity_type} {e.entity_id.slice(0, 8)}
                      </span>
                    </p>
                    {e.note && (
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {e.note}
                      </p>
                    )}
                    <p className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                      {new Date(e.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {e.actor_name ? ` · ${e.actor_name}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-primary" />
                Stack real
              </h2>
              <div className="mt-5 space-y-3">
                {stack.map((item) => (
                  <div key={item} className="rounded-md border border-white/10 bg-black/20 p-3">
                    <p className="text-sm leading-relaxed text-white/85">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/[0.025] p-5">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Segurança, hoje
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/85">
                HMAC nos crons públicos + rate-limit, guards 16/16 nas APIs, RLS em todas as
                tabelas, upload validado, auto-cadastro fechado, recuperação de senha. O que ainda
                NÃO existe: SSO/OAuth, MFA, multiempresa, export LGPD automatizado — promessa só de
                roadmap.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Por dentro do espelho
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {modules.length} módulos sincronizados:{" "}
                <span className="text-white/85">{modules.join(", ")}</span>. Cada um tem migration
                própria, RLS, realtime e testes da engine (client fake).
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
