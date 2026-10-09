// Registry central de rotas — usado por sidebar, breadcrumb, command palette e recentes/favoritos.
// Não substitui a definição de rotas do TanStack; é apenas metadata.

import type { ReactNode } from "react";

export type QuickAction = {
  id: string;
  label: string;
  shortcut?: string;
  // Evento custom disparado no window — cada rota escuta o seu.
  event: string;
};

export type NavIcon =
  | "layout-dashboard"
  | "workflow"
  | "shield-check"
  | "sparkles"
  | "palette"
  | "file-image"
  | "layout-template"
  | "table"
  | "layers"
  | "fingerprint"
  | "scissors"
  | "flask-conical"
  | "file-text"
  | "ruler"
  | "pen"
  | "package"
  | "network"
  | "calendar"
  | "box"
  | "truck"
  | "store"
  | "megaphone"
  | "shopping"
  | "rocket"
  | "bot"
  | "chart"
  | "globe"
  | "lock"
  | "users"
  | "clipboard"
  | "messages-square"
  | "dollar";

export type RouteMeta = {
  path: string;
  label: string;
  icon: NavIcon;
  group:
    | "geral"
    | "plm-criacao"
    | "plm-colecao"
    | "plm-engenharia"
    | "pcp"
    | "supply"
    | "gtm"
    | "insights"
    | "admin";
  crumbs?: string[]; // trilha adicional ex.: ["PLM", "Coleção"]
  quickActions?: QuickAction[];
};

export const NAV_GROUPS: Record<
  RouteMeta["group"],
  { id: RouteMeta["group"]; label: string; parent?: string }
> = {
  geral: { id: "geral", label: "Geral" },
  "plm-criacao": { id: "plm-criacao", label: "Pesquisa & Criação", parent: "PLM · Produto" },
  "plm-colecao": { id: "plm-colecao", label: "Coleção", parent: "PLM · Produto" },
  "plm-engenharia": { id: "plm-engenharia", label: "Engenharia", parent: "PLM · Produto" },
  pcp: { id: "pcp", label: "PCP · Produção" },
  supply: { id: "supply", label: "Supply Chain" },
  gtm: { id: "gtm", label: "Go-to-Market" },
  insights: { id: "insights", label: "Insights & IA" },
  admin: { id: "admin", label: "Administração" },
};

export const ROUTE_REGISTRY: RouteMeta[] = [
  // Geral
  { path: "/dashboard", icon: "layout-dashboard", label: "Dashboard", group: "geral" },
  { path: "/feed", icon: "messages-square", label: "Colaboração", group: "geral" },
  { path: "/flow", label: "Fluxo do Produto", group: "geral", icon: "workflow" },
  {
    path: "/approvals",
    label: "Aprovações",
    group: "geral",
    icon: "shield-check",
    crumbs: ["Geral"],
  },

  // PLM · Pesquisa & Criação
  {
    path: "/research",
    icon: "palette",
    label: "Pesquisa",
    group: "plm-criacao",
    crumbs: ["PLM", "Criação"],
  },
  {
    path: "/colors",
    icon: "palette",
    label: "Cartela de Cores",
    group: "plm-criacao",
    crumbs: ["PLM", "Criação"],
    quickActions: [{ id: "new-color", label: "Nova cor", event: "quick:new-color" }],
  },
  {
    path: "/prints",
    icon: "file-image",
    label: "Cartela de Estampas",
    group: "plm-criacao",
    crumbs: ["PLM", "Criação"],
    quickActions: [{ id: "new-print", label: "Nova estampa", event: "quick:new-print" }],
  },
  {
    path: "/display",
    icon: "clipboard",
    label: "Painel de Displayagem",
    group: "plm-criacao",
    crumbs: ["PLM", "Criação"],
  },
  {
    path: "/looks",
    icon: "layout-template",
    label: "Coordenados · Looks",
    group: "plm-criacao",
    crumbs: ["PLM", "Criação"],
    quickActions: [{ id: "new-look", label: "Novo look", event: "quick:new-look" }],
  },

  // PLM · Coleção
  {
    path: "/collections",
    icon: "layers",
    label: "Coleções",
    group: "plm-colecao",
    crumbs: ["PLM", "Coleção"],
    quickActions: [{ id: "new-collection", label: "Nova coleção", event: "quick:new-collection" }],
  },
  {
    path: "/collection-map",
    icon: "table",
    label: "Mapa de Coleção",
    group: "plm-colecao",
    crumbs: ["PLM", "Coleção"],
  },
  {
    path: "/references",
    icon: "fingerprint",
    label: "Núcleo · Referências",
    group: "plm-colecao",
    crumbs: ["PLM", "Coleção"],
    quickActions: [{ id: "new-ref", label: "Nova referência", event: "quick:new-reference" }],
  },

  // PLM · Engenharia
  {
    path: "/development",
    icon: "scissors",
    label: "Desenvolvimento",
    group: "plm-engenharia",
    crumbs: ["PLM", "Engenharia"],
  },
  {
    path: "/prototypes",
    icon: "flask-conical",
    label: "Protótipos",
    group: "plm-engenharia",
    crumbs: ["PLM", "Engenharia"],
    quickActions: [{ id: "new-piloto", label: "Novo piloto", event: "quick:new-piloto" }],
  },
  {
    path: "/tech-sheet",
    icon: "file-text",
    label: "Ficha Técnica",
    group: "plm-engenharia",
    crumbs: ["PLM", "Engenharia"],
  },
  {
    path: "/measurements",
    icon: "ruler",
    label: "Tabela de Medidas",
    group: "plm-engenharia",
    crumbs: ["PLM", "Engenharia"],
  },
  {
    path: "/pieces-report",
    icon: "file-text",
    label: "Relatório de Peças",
    group: "plm-engenharia",
    crumbs: ["PLM", "Engenharia"],
  },
  {
    path: "/official-models",
    label: "Modelos Oficiais",
    group: "plm-engenharia",
    icon: "ruler",
    crumbs: ["PLM", "Engenharia"],
  },

  {
    path: "/cad",
    icon: "pen",
    label: "CAD & Modelagem",
    group: "plm-engenharia",
    crumbs: ["PLM", "Engenharia"],
  },

  // PCP
  { path: "/production", icon: "package", label: "Produção", group: "pcp", crumbs: ["PCP"] },
  {
    path: "/route-engineering",
    icon: "network",
    label: "Engenharia de Rotas",
    group: "pcp",
    crumbs: ["PCP"],
  },
  { path: "/planner", icon: "calendar", label: "Planner", group: "pcp", crumbs: ["PCP"] },
  { path: "/quality", icon: "shield-check", label: "Qualidade", group: "pcp", crumbs: ["PCP"] },

  // Supply
  { path: "/inventory", icon: "box", label: "Almoxarifado", group: "supply", crumbs: ["Supply"] },
  { path: "/suppliers", icon: "truck", label: "Fornecedores", group: "supply", crumbs: ["Supply"] },
  {
    path: "/supplier-portal",
    icon: "store",
    label: "Portal do Fornecedor",
    group: "supply",
    crumbs: ["Supply"],
  },

  // GTM
  { path: "/launch", label: "Lançamento", group: "gtm", icon: "rocket", crumbs: ["GTM"] },
  { path: "/showroom", label: "Showroom", group: "gtm", icon: "store", crumbs: ["GTM"] },
  { path: "/marketing", icon: "megaphone", label: "Marketing", group: "gtm", crumbs: ["GTM"] },
  { path: "/commercial", icon: "shopping", label: "Comercial", group: "gtm", crumbs: ["GTM"] },
  { path: "/influencers", icon: "users", label: "Influencers", group: "gtm", crumbs: ["GTM"] },

  // Insights & IA
  {
    path: "/analytics",
    icon: "chart",
    label: "BI Executivo",
    group: "insights",
    crumbs: ["Insights"],
  },
  {
    path: "/financial",
    icon: "dollar",
    label: "Financeiro",
    group: "insights",
    crumbs: ["Insights"],
  },
  {
    path: "/ai-center",
    icon: "sparkles",
    label: "AI Product Studio",
    group: "plm-criacao",
    crumbs: ["PLM", "Criação"],
  },
  { path: "/ai-agents", icon: "bot", label: "AI Agents", group: "insights", crumbs: ["Insights"] },
  {
    path: "/digital-twin",
    icon: "globe",
    label: "Digital Twin",
    group: "insights",
    crumbs: ["Insights"],
  },

  // Admin
  {
    path: "/security",
    icon: "lock",
    label: "Segurança",
    group: "admin",
    crumbs: ["Administração"],
  },

  {
    path: "/audit",
    label: "Auditoria interna",
    group: "admin",
    icon: "clipboard",
    crumbs: ["Administração"],
  },
  {
    path: "/admin/users",
    icon: "users",
    label: "Admin · Usuários",
    group: "admin",
    crumbs: ["Administração"],
  },
];

export function findRouteMeta(pathname: string): RouteMeta | undefined {
  // Match exato, senão prefixo mais longo.
  const exact = ROUTE_REGISTRY.find((r) => r.path === pathname);
  if (exact) return exact;
  return ROUTE_REGISTRY.filter((r) => pathname.startsWith(r.path + "/")).sort(
    (a, b) => b.path.length - a.path.length,
  )[0];
}

export function dispatchQuickAction(event: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(event));
}

// helper para módulos escutarem
export function onQuickAction(event: string, handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const fn = () => handler();
  window.addEventListener(event, fn);
  return () => window.removeEventListener(event, fn);
}

export type _EnsureReactNodeIsUsed = ReactNode;
