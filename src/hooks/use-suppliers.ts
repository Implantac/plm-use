// Lista simples de fornecedores/facções ativos para seleção em formulários.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { descreverErroSupabase } from "@/lib/supabase/erro-humano";

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
  // Onda 103: lista vazia por falha de leitura não é "nenhum fornecedor cadastrado".
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("suppliers")
      .select("id, code, name, tipo, status")
      .order("name", { ascending: true })
      .then(({ data, error: erro }) => {
        if (cancelled) return;
        if (erro) setError(descreverErroSupabase(erro, "carregar os fornecedores"));
        else {
          setError(null);
          setItems((data as SupplierOption[] | null) ?? []);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading, error };
}
