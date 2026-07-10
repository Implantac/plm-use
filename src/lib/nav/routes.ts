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

export type RouteMeta = {
  path: string;
  label: string;
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

export const NAV_GROUPS: Record<RouteMeta["group"], { id: RouteMeta["group"]; label: string; parent?: string }> = {
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
  { path: "/dashboard", label: "Dashboard", group: "geral" },
  { path: "/feed", label: "Colaboração", group: "geral" },

  // PLM · Pesquisa & Criação
  { path: "/research", label: "Pesquisa", group: "plm-criacao", crumbs: ["PLM", "Criação"] },
  { path: "/colors", label: "Cartela de Cores", group: "plm-criacao", crumbs: ["PLM", "Criação"], quickActions: [{ id: "new-color", label: "Nova cor", event: "quick:new-color" }] },
  { path: "/prints", label: "Cartela de Estampas", group: "plm-criacao", crumbs: ["PLM", "Criação"], quickActions: [{ id: "new-print", label: "Nova estampa", event: "quick:new-print" }] },
  { path: "/display", label: "Painel de Displayagem", group: "plm-criacao", crumbs: ["PLM", "Criação"] },
  { path: "/looks", label: "Coordenados · Looks", group: "plm-criacao", crumbs: ["PLM", "Criação"], quickActions: [{ id: "new-look", label: "Novo look", event: "quick:new-look" }] },

  // PLM · Coleção
  { path: "/collections", label: "Coleções", group: "plm-colecao", crumbs: ["PLM", "Coleção"], quickActions: [{ id: "new-collection", label: "Nova coleção", event: "quick:new-collection" }] },
  { path: "/collection-map", label: "Mapa de Coleção", group: "plm-colecao", crumbs: ["PLM", "Coleção"] },
  { path: "/references", label: "Núcleo · Referências", group: "plm-colecao", crumbs: ["PLM", "Coleção"], quickActions: [{ id: "new-ref", label: "Nova referência", event: "quick:new-reference" }] },

  // PLM · Engenharia
  { path: "/development", label: "Desenvolvimento", group: "plm-engenharia", crumbs: ["PLM", "Engenharia"] },
  { path: "/prototypes", label: "Protótipos", group: "plm-engenharia", crumbs: ["PLM", "Engenharia"], quickActions: [{ id: "new-piloto", label: "Novo piloto", event: "quick:new-piloto" }] },
  { path: "/tech-sheet", label: "Ficha Técnica", group: "plm-engenharia", crumbs: ["PLM", "Engenharia"] },
  { path: "/measurements", label: "Tabela de Medidas", group: "plm-engenharia", crumbs: ["PLM", "Engenharia"] },
  { path: "/pieces-report", label: "Relatório de Peças", group: "plm-engenharia", crumbs: ["PLM", "Engenharia"] },
  { path: "/cad", label: "CAD & Modelagem", group: "plm-engenharia", crumbs: ["PLM", "Engenharia"] },

  // PCP
  { path: "/production", label: "Produção", group: "pcp", crumbs: ["PCP"] },
  { path: "/planner", label: "Planner", group: "pcp", crumbs: ["PCP"] },
  { path: "/quality", label: "Qualidade", group: "pcp", crumbs: ["PCP"] },

  // Supply
  { path: "/inventory", label: "Almoxarifado", group: "supply", crumbs: ["Supply"] },
  { path: "/suppliers", label: "Fornecedores", group: "supply", crumbs: ["Supply"] },
  { path: "/supplier-portal", label: "Portal do Fornecedor", group: "supply", crumbs: ["Supply"] },

  // GTM
  { path: "/marketing", label: "Marketing", group: "gtm", crumbs: ["GTM"] },
  { path: "/commercial", label: "Comercial", group: "gtm", crumbs: ["GTM"] },
  { path: "/influencers", label: "Influencers", group: "gtm", crumbs: ["GTM"] },

  // Insights & IA
  { path: "/analytics", label: "BI Executivo", group: "insights", crumbs: ["Insights"] },
  { path: "/financial", label: "Financeiro", group: "insights", crumbs: ["Insights"] },
  { path: "/ai-center", label: "USE AI", group: "insights", crumbs: ["Insights"] },
  { path: "/ai-agents", label: "AI Agents", group: "insights", crumbs: ["Insights"] },
  { path: "/digital-twin", label: "Digital Twin", group: "insights", crumbs: ["Insights"] },

  // Admin
  { path: "/security", label: "Segurança", group: "admin", crumbs: ["Administração"] },
  { path: "/admin/users", label: "Admin · Usuários", group: "admin", crumbs: ["Administração"] },
];

export function findRouteMeta(pathname: string): RouteMeta | undefined {
  // Match exato, senão prefixo mais longo.
  const exact = ROUTE_REGISTRY.find((r) => r.path === pathname);
  if (exact) return exact;
  return ROUTE_REGISTRY
    .filter((r) => pathname.startsWith(r.path + "/"))
    .sort((a, b) => b.path.length - a.path.length)[0];
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
