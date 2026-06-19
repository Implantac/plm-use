import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useUserRoles, type AppRole } from "@/hooks/use-auth";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
});

type Row = {
  id: string;
  full_name: string | null;
  job_title: string | null;
  roles: AppRole[];
};

const ALL_ROLES: AppRole[] = ["admin", "manager", "operator", "viewer"];

function AdminUsersPage() {
  const { user } = useAuth();
  const { isAdmin, loading: rolesLoading } = useUserRoles(user?.id);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (has) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", uid)
        .eq("role", role);
      if (error) return toast.error(error.message);
      toast.success(`Removido: ${role}`);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
      if (error) return toast.error(error.message);
      toast.success(`Concedido: ${role}`);
    }
    void refresh();
  };

  if (rolesLoading) {
    return (
      <ModuleLayout title="Administração de Usuários" subtitle="Carregando permissões..." icon={<ShieldCheck className="w-5 h-5" />}>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  if (!isAdmin) {
    return (
      <ModuleLayout title="Administração de Usuários" subtitle="Acesso restrito" icon={<ShieldOff className="w-5 h-5" />}>
        <div className="rounded-md border border-white/10 bg-white/5 p-10 text-center text-muted-foreground">
          <ShieldOff className="w-10 h-10 mx-auto mb-4 opacity-40" />
          <p className="text-xs uppercase tracking-[0.2em]">Sem permissão de administrador</p>
          <p className="text-[11px] mt-2 opacity-70">Solicite a um admin que conceda o papel <b>admin</b> ao seu usuário.</p>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Administração de Usuários"
      subtitle={`${rows.length} usuários · papéis e permissões`}
      icon={<ShieldCheck className="w-5 h-5" />}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <div className="rounded-md border border-white/10 overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-white/5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Usuário</th>
                <th className="text-left px-4 py-3">Cargo</th>
                <th className="text-left px-4 py-3">Papéis ativos</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="px-4 py-3 font-medium">{r.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.job_title ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {r.roles.length === 0 && <span className="text-muted-foreground text-[10px]">sem papéis</span>}
                      {r.roles.map((role) => (
                        <Badge key={role} variant="outline" className="text-[9px] uppercase">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end flex-wrap">
                      {ALL_ROLES.map((role) => {
                        const has = r.roles.includes(role);
                        return (
                          <Button
                            key={role}
                            size="sm"
                            variant={has ? "default" : "outline"}
                            className="h-7 text-[9px] uppercase tracking-wider"
                            onClick={() => toggleRole(r.id, role, has)}
                          >
                            {has ? "−" : "+"} {role}
                          </Button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ModuleLayout>
  );
}
