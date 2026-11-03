import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  DatabaseBackup,
  Download,
  EyeOff,
  FileText,
  LockKeyhole,
  Plus,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { ModuleTabs } from "@/components/nav/ModuleTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SIMULATABLE_ROLES,
  buildLgpdAuditCsv,
  buildRbacGovernanceHtmlReport,
  simulateRoleAccess,
  useSecurityGovernanceStore,
} from "@/lib/security/rbac-governance";

export const Route = createFileRoute("/_authenticated/security")({
  component: SecurityPage,
});

function SecurityPage() {
  const selectedRole = useSecurityGovernanceStore((s) => s.selectedRole);
  const lastDrDrillIso = useSecurityGovernanceStore((s) => s.lastDrDrillIso);
  const auditEntries = useSecurityGovernanceStore((s) => s.auditEntries);
  const setSelectedRole = useSecurityGovernanceStore((s) => s.setSelectedRole);
  const recordAuditEvent = useSecurityGovernanceStore((s) => s.recordAuditEvent);
  const runRestoreDrill = useSecurityGovernanceStore((s) => s.runRestoreDrill);

  const [search, setSearch] = useState("");
  const [openLogModal, setOpenLogModal] = useState(false);
  const [actorName, setActorName] = useState("");
  const [actionDesc, setActionDesc] = useState("");

  const simulatedRows = useMemo(() => simulateRoleAccess(selectedRole), [selectedRole]);

  const filteredAudit = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return auditEntries;
    return auditEntries.filter((e) =>
      `${e.actor} ${e.role} ${e.action} ${e.lgpdBasis}`.toLowerCase().includes(q),
    );
  }, [auditEntries, search]);

  const blockedCount = simulatedRows.filter(
    (r) => r.effectiveOutcome === "BLOQUEADO_RLS_0_LINHAS",
  ).length;
  const blindCount = simulatedRows.filter(
    (r) => r.effectiveOutcome === "FICHA_CEGA_SEM_CUSTO",
  ).length;

  function handleExportCsv() {
    const csv = buildLgpdAuditCsv(auditEntries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trilha-lgpd-rbac-${selectedRole}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Trilha de Auditoria LGPD exportada em CSV!");
  }

  function handlePrintGovernanceReport() {
    const html = buildRbacGovernanceHtmlReport(selectedRole, auditEntries);
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para imprimir o Relatório de Governança A4.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  function handleRegisterEvent() {
    if (!actorName.trim() || !actionDesc.trim()) {
      toast.error("Preencha o responsável e a descrição do evento.");
      return;
    }
    recordAuditEvent({
      actor: actorName.trim(),
      role: selectedRole,
      action: actionDesc.trim(),
      lgpdBasis: "Legítimo Interesse",
    });
    setActorName("");
    setActionDesc("");
    setOpenLogModal(false);
    toast.success("Registro de governança adicionado à trilha LGPD!");
  }

  return (
    <ModuleLayout
      title="Governança RBAC, Isolamento RLS & LGPD"
      subtitle="Simulador real de políticas Postgres RLS (proteção de margem industrial e Ficha Cega), auditoria LGPD exportável e verificação de RPO."
      version="Trust Center v2.16"
      searchPlaceholder="Filtrar trilha por ator, papel RBAC ou evento..."
      onSearch={setSearch}
      metrics={[
        {
          label: "Perfil em Simulação",
          value: selectedRole,
          detail: `${SIMULATABLE_ROLES.find((r) => r.role === selectedRole)?.department ?? ""}`,
        },
        {
          label: "Domínios Bloqueados (RLS)",
          value: `${blockedCount} / ${simulatedRows.length}`,
          detail: "0 linhas no banco",
        },
        {
          label: "Modo Ficha Cega",
          value: `${blindCount} domínios`,
          detail: "sem R$ / sem margem",
        },
        {
          label: "Trilha LGPD",
          value: `${auditEntries.length} eventos`,
          detail: "exportável CSV + A4",
        },
      ]}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ModuleTabs group="admin" />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5 text-primary" /> Exportar CSV LGPD
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrintGovernanceReport}
            className="gap-1.5 text-xs"
          >
            <FileText className="h-3.5 w-3.5 text-emerald-500" /> Relatório A4
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setOpenLogModal(true)}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Registrar Evento
          </Button>
        </div>
      </div>

      {/* Seletor de Papel AppRole para Simulação de Isolamento */}
      <Card className="border-border bg-card rounded-xl mb-6">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Simulador Interativo de Papel RBAC (`public.app_role`)
              </span>
            </div>
            <span className="text-2xs text-muted-foreground">
              Espelha `src/lib/authz.ts` + políticas RLS de isolamento de custo
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SIMULATABLE_ROLES.map((item) => {
              const active = selectedRole === item.role;
              return (
                <Button
                  key={item.role}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() => setSelectedRole(item.role)}
                  className="h-8 text-xs gap-1.5"
                >
                  <LockKeyhole className="h-3 w-3" />
                  {item.label}
                  <span className="font-mono text-[10px] opacity-75">({item.role})</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_390px] gap-6">
        {/* Matriz Efetiva RLS */}
        <Card className="border-border bg-card rounded-xl overflow-hidden">
          <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Matriz de Isolamento por Domínio & Tabela (`{selectedRole}`)
            </CardTitle>
            <Badge variant="outline" className="font-mono text-2xs">
              Postgres RLS Ativo
            </Badge>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-border/60 bg-muted/40 text-2xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3.5">Domínio / Tabela</th>
                  <th className="p-3.5">Decisão Efetiva</th>
                  <th className="p-3.5">Regra Auditada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {simulatedRows.map(({ resource, effectiveOutcome }) => (
                  <tr key={resource.id} className="hover:bg-accent/40">
                    <td className="p-3.5">
                      <p className="font-bold text-foreground">{resource.label}</p>
                      <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                        {resource.tableOrDomain}
                      </p>
                    </td>
                    <td className="p-3.5">
                      {effectiveOutcome === "ACESSO_COMPLETO" && (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Acesso Autorizado
                        </Badge>
                      )}
                      {effectiveOutcome === "FICHA_CEGA_SEM_CUSTO" && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300 gap-1"
                        >
                          <EyeOff className="h-3 w-3" /> Ficha Cega (Sem R$)
                        </Badge>
                      )}
                      {effectiveOutcome === "BLOQUEADO_RLS_0_LINHAS" && (
                        <Badge
                          variant="outline"
                          className="border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-300 gap-1"
                        >
                          <ShieldAlert className="h-3 w-3" /> Bloqueado RLS (0 linhas)
                        </Badge>
                      )}
                    </td>
                    <td className="p-3.5 text-2xs text-muted-foreground leading-relaxed">
                      {resource.rlsPolicyNote}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Coluna Direita: Trilha LGPD + DR Drill */}
        <div className="space-y-5">
          <Card className="border-border bg-card rounded-xl">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Trilha Auditada LGPD
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {filteredAudit.length} registros
                </span>
              </div>
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {filteredAudit.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-foreground">{ev.actor}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {ev.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground/90">{ev.action}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                      <span>Base: {ev.lgpdBasis}</span>
                      <span className="font-mono">
                        {ev.timestampIso.slice(0, 16).replace("T", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card rounded-xl">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <DatabaseBackup className="h-4 w-4 text-primary" />
                Continuidade & Simulação de Restauração (RPO)
              </p>
              <p className="text-xs text-muted-foreground">
                Último teste íntegro verificado em{" "}
                <strong className="font-mono text-foreground">
                  {lastDrDrillIso.slice(0, 19).replace("T", " ")}
                </strong>
                . Executa verificação de checksum dos stores e registra evidência na trilha LGPD.
              </p>
              <Button
                type="button"
                className="w-full text-xs"
                onClick={() => {
                  const ts = runRestoreDrill();
                  toast.success(
                    `Teste de restauração concluído (${ts.slice(11, 19)}) e gravado na auditoria!`,
                  );
                }}
              >
                Executar Teste de Restauração Auditado
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={openLogModal} onOpenChange={setOpenLogModal}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Registrar Evidência Manual · Trilha LGPD</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label>Responsável / Operador</Label>
              <Input
                value={actorName}
                onChange={(e) => setActorName(e.target.value)}
                placeholder="Ex.: DPO / Coordenação TI"
              />
            </div>
            <div className="space-y-1">
              <Label>Descrição da Ação ou Revisão de Acesso</Label>
              <Input
                value={actionDesc}
                onChange={(e) => setActionDesc(e.target.value)}
                placeholder="Ex.: Revisão trimestral de acessos de facções externas"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenLogModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegisterEvent}>Gravar na Auditoria</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
