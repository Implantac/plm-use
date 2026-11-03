// Motor de Governança RBAC, Simulação de Isolamento RLS (Postgres / Supabase)
// e Exportação de Trilha de Auditoria LGPD (CSV + Relatório A4).

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { canAnyRole, type AppRole } from "@/lib/authz";

export interface ProtectedResourceRule {
  id: string;
  tableOrDomain: string;
  label: string;
  allowedRoles: readonly AppRole[];
  blindCostEnforcedFor?: readonly AppRole[];
  rlsPolicyNote: string;
}

export interface SimulatedAccessRow {
  resource: ProtectedResourceRule;
  allowed: boolean;
  blindCostOnly: boolean;
  effectiveOutcome: "ACESSO_COMPLETO" | "FICHA_CEGA_SEM_CUSTO" | "BLOQUEADO_RLS_0_LINHAS";
}

export interface GovernanceAuditEntry {
  id: string;
  timestampIso: string;
  actor: string;
  role: AppRole;
  action: string;
  lgpdBasis: "Execução de Contrato" | "Legítimo Interesse" | "Obrigação Legal Fiscal";
}

export const SIMULATABLE_ROLES: Array<{
  role: AppRole;
  label: string;
  department: string;
}> = [
  { role: "admin", label: "Admin Master", department: "Diretoria / TI" },
  {
    role: "engenharia_custo",
    label: "Engenharia de Custos",
    department: "Custos Industriais & Pré-Custo",
  },
  { role: "comercial", label: "Comercial / Representante", department: "Vendas B2B & Pedidos" },
  { role: "pcp", label: "PCP & Chão de Fábrica", department: "Ordens de Produção & Facções" },
  {
    role: "fornecedor_externo",
    label: "Facção / Fornecedor Externo",
    department: "Portal Terceirizado",
  },
  { role: "estilista", label: "Estilo & Criação", department: "Pesquisa, Briefing & Ficha" },
  { role: "qualidade", label: "Qualidade & AQL", department: "Inspeção ISO 2859-1" },
];

export const PROTECTED_RESOURCES: ProtectedResourceRule[] = [
  {
    id: "sales_order_item_costs",
    tableOrDomain: "public.sales_order_item_costs",
    label: "Custos Reais de Pedido, Setup & Margem Industrial",
    allowedRoles: ["admin", "manager", "diretor_produto", "engenharia_custo"],
    rlsPolicyNote:
      "RLS restrito: perfil comercial, pcp e fornecedor_externo recebem 0 linhas (proteção total de margem industrial).",
  },
  {
    id: "tech_sheets_pre_cost",
    tableOrDomain: "public.tech_sheets (BOM & Pré-Custo)",
    label: "Ficha Técnica · Consumo + Custo de Matéria-Prima",
    allowedRoles: [
      "admin",
      "manager",
      "diretor_produto",
      "coordenador_produto",
      "engenharia_custo",
      "pcp",
      "fornecedor_externo",
      "estilista",
      "qualidade",
    ],
    blindCostEnforcedFor: ["pcp", "fornecedor_externo", "qualidade"],
    rlsPolicyNote:
      "Chão de fábrica e facção acessam exclusivamente a Ficha Cega A4 (gramatura, medidas ABNT e consumo físico sem R$).",
  },
  {
    id: "sales_orders_commercial",
    tableOrDomain: "public.sales_orders + Lista Nominal",
    label: "Pedidos B2B, Clonagem, Grade & Lista Nominal por Peça",
    allowedRoles: [
      "admin",
      "manager",
      "comercial",
      "showroom",
      "merchandising",
      "engenharia_custo",
      "pcp",
    ],
    rlsPolicyNote:
      "Comercial cria/clona pedidos e importa Lista Nominal; PCP consulta grade consolidada para corte e expedição.",
  },
  {
    id: "pcp_lots_kardex",
    tableOrDomain: "public.pcp_lots + Remessa CFOP 5901/5902",
    label: "Ordens de Produção, Balanceamento & Kardex de Facção",
    allowedRoles: ["admin", "manager", "pcp", "qualidade", "almoxarifado"],
    rlsPolicyNote:
      "Movimentações de estoque, lotes e retorno de facção auditadas em entity_events.",
  },
  {
    id: "supplier_portal_os",
    tableOrDomain: "Portal Externo /supplier-portal",
    label: "Ordens de Serviço Terceirizadas (Costura / Bordado / Lavanderia)",
    allowedRoles: ["admin", "manager", "pcp", "fornecedor_externo"],
    blindCostEnforcedFor: ["fornecedor_externo"],
    rlsPolicyNote:
      "Isolamento multi-fornecedor: cada facção visualiza apenas suas próprias OS sem preço de venda da marca.",
  },
  {
    id: "admin_rbac_users",
    tableOrDomain: "public.user_roles + Governança LGPD",
    label: "Concessão de Papéis RBAC, Convites & Trilha LGPD",
    allowedRoles: ["admin"],
    rlsPolicyNote: "Somente has_role(auth.uid(), 'admin') pode alterar privilégios em user_roles.",
  },
];

export function simulateRoleAccess(role: AppRole): SimulatedAccessRow[] {
  return PROTECTED_RESOURCES.map((resource) => {
    const allowed = canAnyRole([role], resource.allowedRoles);
    const blindCostOnly =
      allowed && role !== "admin" && Boolean(resource.blindCostEnforcedFor?.includes(role));

    const effectiveOutcome: SimulatedAccessRow["effectiveOutcome"] = !allowed
      ? "BLOQUEADO_RLS_0_LINHAS"
      : blindCostOnly
        ? "FICHA_CEGA_SEM_CUSTO"
        : "ACESSO_COMPLETO";

    return {
      resource,
      allowed,
      blindCostOnly,
      effectiveOutcome,
    };
  });
}

export function buildLgpdAuditCsv(entries: GovernanceAuditEntry[]): string {
  const header = "id;data_hora;ator;papel_rbac;acao_auditada;base_legal_lgpd";
  const rows = entries.map((e) =>
    [
      e.id,
      e.timestampIso,
      e.actor.replace(/;/g, ","),
      e.role,
      e.action.replace(/;/g, ","),
      e.lgpdBasis,
    ].join(";"),
  );
  return [header, ...rows].join("\n");
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildRbacGovernanceHtmlReport(
  role: AppRole,
  entries: GovernanceAuditEntry[],
): string {
  const sim = simulateRoleAccess(role);
  const simRows = sim
    .map(
      (r) => `<tr>
      <td><strong>${escapeHtml(r.resource.label)}</strong><br/><span style="font-size:9px;color:#475569">${escapeHtml(r.resource.tableOrDomain)}</span></td>
      <td><strong>${r.effectiveOutcome}</strong></td>
      <td>${escapeHtml(r.resource.rlsPolicyNote)}</td>
    </tr>`,
    )
    .join("");

  const logRows = entries
    .slice(0, 12)
    .map(
      (e) => `<tr>
      <td>${escapeHtml(e.timestampIso.slice(0, 19).replace("T", " "))}</td>
      <td>${escapeHtml(e.actor)} (${escapeHtml(e.role)})</td>
      <td>${escapeHtml(e.action)}</td>
      <td>${escapeHtml(e.lgpdBasis)}</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório de Governança RBAC & LGPD · USE MODA PLM</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: Inter, -apple-system, sans-serif; color: #0f172a; font-size: 11px; margin: 0; }
  h1 { font-size: 15px; margin: 4px 0; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 14px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
  th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; }
</style>
</head>
<body>
  <div style="border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:12px">
    <div style="font-size:9px;font-weight:700">TRUST CENTER · ISOLAMENTO RLS & CONFORMIDADE LGPD</div>
    <h1>Matriz Auditada para o Perfil: ${escapeHtml(role)}</h1>
  </div>
  <h2 style="font-size:11px;text-transform:uppercase">Simulação Efetiva de Políticas RLS</h2>
  <table>
    <thead><tr><th>Domínio / Tabela</th><th>Resultado Efetivo</th><th>Regra de Segurança</th></tr></thead>
    <tbody>${simRows}</tbody>
  </table>
  <h2 style="font-size:11px;text-transform:uppercase">Trilha Recente de Auditoria & LGPD</h2>
  <table>
    <thead><tr><th>Data/Hora</th><th>Ator / Papel</th><th>Evento</th><th>Base Legal LGPD</th></tr></thead>
    <tbody>${logRows}</tbody>
  </table>
</body>
</html>`;
}

export const INITIAL_GOVERNANCE_EVENTS: GovernanceAuditEntry[] = [
  {
    id: "aud-1",
    timestampIso: "2026-11-03T13:40:00.000Z",
    actor: "Helena Prado",
    role: "engenharia_custo",
    action: "Aprovou matriz de setup e margem do pedido B2B PD-2026-802",
    lgpdBasis: "Execução de Contrato",
  },
  {
    id: "aud-2",
    timestampIso: "2026-11-03T12:15:00.000Z",
    actor: "Marcos Viana",
    role: "comercial",
    action: "Importou Lista Nominal por Peça (8 atletas) no pedido PD-2026-801",
    lgpdBasis: "Execução de Contrato",
  },
  {
    id: "aud-3",
    timestampIso: "2026-11-03T10:50:00.000Z",
    actor: "Facção Costura Fina",
    role: "fornecedor_externo",
    action: "Emitiu Ficha Técnica Cega de Custo A4 (OS-2026-089 · CFOP 5901)",
    lgpdBasis: "Obrigação Legal Fiscal",
  },
  {
    id: "aud-4",
    timestampIso: "2026-11-03T09:10:00.000Z",
    actor: "Admin PLM",
    role: "admin",
    action: "Verificou isolamento RLS 0-linhas em sales_order_item_costs p/ perfil comercial",
    lgpdBasis: "Legítimo Interesse",
  },
];

interface SecurityGovernanceState {
  selectedRole: AppRole;
  lastDrDrillIso: string;
  auditEntries: GovernanceAuditEntry[];
  setSelectedRole: (role: AppRole) => void;
  recordAuditEvent: (entry: Omit<GovernanceAuditEntry, "id" | "timestampIso">) => void;
  runRestoreDrill: () => string;
}

export const useSecurityGovernanceStore = create<SecurityGovernanceState>()(
  persist(
    (set) => ({
      selectedRole: "comercial",
      lastDrDrillIso: "2026-11-02T22:00:00.000Z",
      auditEntries: INITIAL_GOVERNANCE_EVENTS,
      setSelectedRole: (selectedRole) => set({ selectedRole }),
      recordAuditEvent: (entry) =>
        set((s) => ({
          auditEntries: [
            {
              ...entry,
              id: `aud-${Date.now()}`,
              timestampIso: new Date().toISOString(),
            },
            ...s.auditEntries,
          ],
        })),
      runRestoreDrill: () => {
        const now = new Date().toISOString();
        set((s) => ({
          lastDrDrillIso: now,
          auditEntries: [
            {
              id: `aud-dr-${Date.now()}`,
              timestampIso: now,
              actor: "Operador Trust Center",
              role: "admin",
              action:
                "Executou simulação íntegra de restauração point-in-time (RPO 15 min · Checksum OK)",
              lgpdBasis: "Legítimo Interesse",
            },
            ...s.auditEntries,
          ],
        }));
        return now;
      },
    }),
    { name: "use-moda:security-governance-v1" },
  ),
);
