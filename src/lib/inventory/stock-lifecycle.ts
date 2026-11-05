// O ciclo de vida da reserva (Ondas 21/24) vive no banco, não no bundle. Quando
// o app é republicado antes do `db push`, a tela passa a prometer automação que
// não existe — e o operador acredita.
//
// Medido em 05/11/2026: o app publicado estava na Onda 25 e o banco de produção
// devolvia 404 (PGRST205/PGRST202) para `stock_reservation_aging`,
// `cancel_reservations_for_ref`, `op_reserved_materials` e
// `record_op_material_consumption`. Este módulo existe para a UI não mentir
// nessa situação: ela pergunta uma vez, guarda a resposta e se adapta.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StockLifecycle = "verificando" | "ativa" | "pendente";

/** Erro de "esta função/relação não existe neste banco". */
export function isMissingDatabaseObject(
  error: {
    code?: string | null;
    message?: string | null;
  } | null,
): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  if (code === "PGRST202" || code === "PGRST205" || code === "42883" || code === "42P01") {
    return true;
  }
  return /could not find the function|could not find the table|schema cache|does not exist/i.test(
    error.message ?? "",
  );
}

/** Uma consulta por sessão: a view de aging só existe depois da Onda 21. */
let cache: Promise<boolean> | null = null;

export function stockLifecycleAvailable(): Promise<boolean> {
  if (!cache) {
    cache = (async () => {
      const { error } = await supabase
        .from("stock_reservation_aging" as never)
        .select("id")
        .limit(1);
      return !isMissingDatabaseObject(error as { code?: string } | null);
    })();
  }
  return cache;
}

/** Só para teste: esquece a resposta guardada. */
export function resetStockLifecycleProbe() {
  cache = null;
}

export function useStockLifecycle(): StockLifecycle {
  const [estado, setEstado] = useState<StockLifecycle>("verificando");

  const verificar = useCallback(() => {
    let vivo = true;
    void stockLifecycleAvailable().then((ok) => {
      if (vivo) setEstado(ok ? "ativa" : "pendente");
    });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => verificar(), [verificar]);

  return estado;
}

export const MENSAGEM_MIGRACAO_PENDENTE =
  "O ciclo automático da reserva (Ondas 21 e 24) ainda não está aplicado neste banco. " +
  "Enquanto isso, a reserva só muda pelos botões manuais. Para ativar: aplique " +
  "docs/producao/APLICAR-ONDA-21-24.sql no SQL editor do projeto.";
