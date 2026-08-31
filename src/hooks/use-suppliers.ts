// Lista simples de fornecedores/facções ativos para seleção em formulários.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SupplierOption {
  id: string;
  code: string;
  name: string;
  tipo: string;
  status: string;
}

export function useSuppliers() {
  const [items, setItems] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("suppliers")
      .select("id, code, name, tipo, status")
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setItems((data as SupplierOption[] | null) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading };
}
