import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { canAnyRole, hasAppRole } from "@/lib/authz";

export type AppRole = Database["public"]["Enums"]["app_role"];

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // CRITICAL: register listener first, then fetch session.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading, isAuthenticated: !!session };
}

export function useUserRoles(userId: string | undefined) {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRoles([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (!active) return;
        setRoles((data ?? []).map((r) => r.role as AppRole));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  // admin e o wildcard de superadmin (docs: src/lib/authz.ts) — hasRole ja o
  // inclui, entao isManager nao precisa mais do "isAdmin ||" manual.
  const hasRole = (r: AppRole) => hasAppRole(roles, r);
  const isAdmin = hasRole("admin");
  const isManager = hasRole("manager");
  const can = (allowed: AppRole[]) => canAnyRole(roles, allowed);

  return { roles, loading, hasRole, isAdmin, isManager, can };
}

export async function signOut() {
  await supabase.auth.signOut();
}
