import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useUserRoles, type AppRole } from "@/hooks/use-auth";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { ModuleTabs } from "@/components/nav/ModuleTabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ShieldOff, Loader2, Plus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
});

type Row = {
  id: string;
  full_name: string | null;
  job_title: string | null;
  roles: AppRole[];
};

/**
 * Todos os valores do enum `app_role`, na ordem em que fazem sentido para quem
 * administra — não em ordem alfabética.
 *
 * Antes esta lista tinha só os 4 papéis originais (admin, manager, operator,
 * viewer). Os 12 papéis criados depois ficavam impossíveis de conceder pela
 * tela: nem o comercial que o fluxo de pedido exige (can_sell), nem a
 * engenharia de custo (can_cost), nem o PCP (can_plan_pcp). Todo papel novo
 * virava UPDATE no banco.
 */
const ROLE_ORDER: AppRole[] = [
  "admin",
  "manager",
  "diretor_produto",
  "coordenador_produto",
  "comercial",
  "showroom",
  "merchandising",
  "engenharia_custo",
  "estilista",
  "modelagem",
  "pcp",
  "operator",
  "qualidade",
  "almoxarifado",
  "fornecedor_externo",
  "viewer",
];

const ROLE_LABEL: Partial<Record<AppRole, string>> = {
  admin: "Admin — acesso total",
  manager: "Manager — gestão",
  diretor_produto: "Diretor de produto",
  coordenador_produto: "Coordenador de produto",
  comercial: "Comercial — emite pedido",
  showroom: "Showroom",
  merchandising: "Merchandising",
  engenharia_custo: "Engenharia de custo",
  estilista: "Estilista",
  modelagem: "Modelagem",
  pcp: "PCP — programa e libera",
  operator: "Operador de produção",
  qualidade: "Qualidade",
  almoxarifado: "Almoxarifado",
  fornecedor_externo: "Fornecedor externo",
  viewer: "Somente leitura",
};

function AdminUsersPage() {
  const { user } = useAuth();
  const { isAdmin, loading: rolesLoading } = useUserRoles(user?.id);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, job_title"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const rolesByUser = new Map<string, AppRole[]>();
    (rolesRes.data ?? []).forEach((r) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role as AppRole);
      rolesByUser.set(r.user_id, arr);
    });
    setRows(
      (profilesRes.data ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        job_title: p.job_title,
        roles: rolesByUser.get(p.id) ?? [],
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const toggleRole = async (uid: string, role: AppRole, has: boolean) => {
    if (!isAdmin) return toast.error("Apenas admins podem alterar papéis.");
    setBusy(`${uid}:${role}`);

    if (has) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", uid)
        .eq("role", role);
      if (error) toast.error(error.message);
      else toast.success(`Removido: ${role}`);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
      if (error) toast.error(error.message);
      else toast.success(`Concedido: ${role}`);
    }

    setBusy(null);
    await refresh();
  };

  if (rolesLoading) {
    return (
      <ModuleLayout title="Administração de Usuários" subtitle="Carregando" version="ADMIN">
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  if (!isAdmin) {
    return (
      <ModuleLayout title="Administração de Usuários" subtitle="Acesso restrito" version="ADMIN">
        <div className="rounded-md border border-border bg-muted/50 p-10 text-center text-muted-foreground">
          <ShieldOff className="w-10 h-10 mx-auto mb-4 opacity-40" />
          <p className="text-xs uppercase tracking-[0.05em]">Sem permissão de administrador</p>
          <p className="text-xs mt-2 opacity-70">
            Solicite a um admin que conceda o papel <b>admin</b> ao seu usuário.
          </p>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Administração de Usuários"
      subtitle={`${rows.length} usuários · papéis e permissões`}
      version="ADMIN"
    >
      <div className="mb-4">
        <ModuleTabs group="admin" />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-2xs uppercase tracking-[0.04em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Usuário</th>
                <th className="text-left px-4 py-3">Cargo</th>
                <th className="text-left px-4 py-3">Papéis ativos</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const missing = ROLE_ORDER.filter((role) => !r.roles.includes(role));
                return (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-medium">{r.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.job_title ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {r.roles.length === 0 && (
                          <span className="text-muted-foreground text-2xs">sem papéis</span>
                        )}
                        {r.roles.map((role) => (
                          <Badge
                            key={role}
                            variant={role === "admin" ? "default" : "outline"}
                            className="text-2xs uppercase gap-1 pr-1"
                          >
                            {role}
                            <button
                              type="button"
                              aria-label={`Remover papel ${role}`}
                              disabled={busy === `${r.id}:${role}`}
                              onClick={() => void toggleRole(r.id, role, true)}
                              className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 disabled:opacity-30"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-2xs tracking-wider gap-1"
                              disabled={missing.length === 0}
                            >
                              <Plus className="w-3 h-3" /> papel
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                            <DropdownMenuLabel className="text-2xs uppercase tracking-[0.04em]">
                              Conceder papel
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {missing.map((role) => (
                              <DropdownMenuItem
                                key={role}
                                disabled={busy === `${r.id}:${role}`}
                                onSelect={() => void toggleRole(r.id, role, false)}
                                className="text-xs"
                              >
                                {ROLE_LABEL[role] ?? role}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ModuleLayout>
  );
}
