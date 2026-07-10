import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  CircleDollarSign,
  DatabaseBackup,
  Fingerprint,
  Globe2,
  KeyRound,
  Languages,
  LockKeyhole,
  ScrollText,
  ShieldCheck,
  Store,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { ModuleTabs } from "@/components/nav/ModuleTabs";

export const Route = createFileRoute("/_authenticated/security")({
  component: SecurityPage,
});

const tenantCapabilities = [
  { label: "Multi Tenant", value: "12 empresas", icon: Building2 },
  { label: "Multi Marca", value: "28 marcas", icon: Store },
  { label: "Multi Coleção", value: "64 coleções", icon: ScrollText },
  { label: "Multi Unidade", value: "9 unidades", icon: Globe2 },
  { label: "Multi Idioma", value: "PT / EN / ES", icon: Languages },
  { label: "Multi Moeda", value: "BRL / USD / EUR", icon: CircleDollarSign },
];

const roles = [
  { role: "Admin Master", users: 4, scope: "Todas as empresas", risk: 98 },
  { role: "Diretoria Produto", users: 8, scope: "Coleções e BI", risk: 92 },
  { role: "PCP Operação", users: 21, scope: "Produção e estoque", risk: 81 },
  { role: "Fornecedor", users: 34, scope: "Portal externo", risk: 74 },
];

const auditEvents = [
  "Julia aprovou FT-V25-018 v4.2",
  "Fornecedor Têxtil Amalfi baixou pedido #882",
  "Admin ativou MFA obrigatório para Unidade SP",
  "USE AI gerou simulação de mix Verão 25",
];

function SecurityPage() {
  return (
    <ModuleLayout
      title="Segurança e SaaS"
      subtitle="Governança multiempresa com RBAC, MFA, SSO, OAuth, LGPD, auditoria, logs e backup automático."
      version="Trust Center v1.0"
      searchPlaceholder="Buscar usuário, perfil, tenant ou evento"
      metrics={[
        { label: "LGPD", value: "Ativo", detail: "bases e consentimentos" },
        { label: "MFA", value: "96%", detail: "usuários protegidos" },
        { label: "SSO/OAuth", value: "4 provedores", detail: "enterprise auth" },
        { label: "Backup", value: "15 min", detail: "RPO automático" },
      ]}
    >
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tenantCapabilities.map((item) => (
              <Card key={item.label} className="glass-card rounded-lg">
                <CardContent className="p-5">
                  <item.icon className="h-5 w-5 text-primary" />
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="glass-card rounded-lg overflow-hidden">
            <CardHeader className="p-5 border-b border-white/5 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                RBAC avançado
              </CardTitle>
              <Button className="rounded-md h-9 text-[10px] font-bold uppercase tracking-[0.14em] btn-primary-premium">
                Novo perfil
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left">
                <thead className="border-b border-white/5 bg-white/5">
                  <tr>
                    {["Perfil", "Usuários", "Escopo", "Postura", "Status"].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-4 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {roles.map((role) => (
                    <tr key={role.role} className="hover:bg-white/[0.025]">
                      <td className="px-5 py-4 text-sm font-bold text-white">{role.role}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{role.users}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{role.scope}</td>
                      <td className="px-5 py-4">
                        <div className="w-40">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>score</span>
                            <span>{role.risk}%</span>
                          </div>
                          <Progress value={role.risk} className="mt-2 h-1.5 bg-white/10" />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 rounded-md bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Ativo
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-card rounded-lg">
            <CardHeader className="p-5 border-b border-white/5">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                Controles de acesso
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-2 gap-3">
              {[
                { label: "MFA", value: "Obrigatório", icon: Fingerprint },
                { label: "SSO", value: "SAML/OIDC", icon: KeyRound },
                { label: "OAuth", value: "Ativo", icon: LockKeyhole },
                { label: "Logs", value: "365 dias", icon: ScrollText },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-md border border-white/10 bg-white/[0.035] p-4"
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card rounded-lg border-primary/20 bg-primary/[0.025]">
            <CardContent className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                LGPD e auditoria
              </p>
              <div className="mt-4 space-y-3">
                {auditEvents.map((event) => (
                  <div key={event} className="rounded-md border border-white/10 bg-black/20 p-3">
                    <p className="text-sm text-white/85">{event}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card rounded-lg">
            <CardContent className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white flex items-center gap-2">
                <DatabaseBackup className="h-4 w-4 text-primary" />
                Backup automático
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Snapshots incrementais a cada 15 minutos, retenção de 90 dias e restauração por
                tenant.
              </p>
              <Button className="mt-5 w-full rounded-md h-10 text-[10px] font-bold uppercase tracking-[0.14em] btn-primary-premium">
                Testar restauração
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
