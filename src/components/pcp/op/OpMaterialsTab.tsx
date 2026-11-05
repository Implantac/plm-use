// Aba "Material" da OP: o que está reservado e o botão de dar baixa.
//
// Antes desta aba o consumidor de material era o almoxarife abrindo /inventory e
// digitando item por item, sem relação com a OP. A reserva ficava ativa para
// sempre e o consumo nunca era atribuído a uma ordem.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, PackageMinus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserRoles, useAuth } from "@/hooks/use-auth";
import {
  isMissingDatabaseObject,
  MENSAGEM_MIGRACAO_PENDENTE,
} from "@/lib/inventory/stock-lifecycle";

interface ReservedMaterial {
  reservation_id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  unit: string;
  qty: number;
  qty_on_hand: number;
  dias_ativa: number;
}

interface ConsumeResult {
  total_consumido: number;
  total_curto: number;
  consumidos: { item_name: string; qty: number; unit: string }[];
  curtos: { item_name: string; qty: number; unit: string; saldo: number; falta: number }[];
}

/** Papéis que o banco aceita para movimentar estoque (has_stock_write_role). */
const ROLES_ESTOQUE = ["admin", "manager", "almoxarifado"];

export function OpMaterialsTab({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const { user } = useAuth();
  const { roles } = useUserRoles(user?.id);
  const podeBaixar = roles.some((r) => ROLES_ESTOQUE.includes(r));

  const [rows, setRows] = useState<ReservedMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ultimo, setUltimo] = useState<ConsumeResult | null>(null);
  // Erro NÃO é lista vazia. Antes desta separação, um 404 de RPC (migração
  // pendente) caía no estado vazio e a tela dizia "esta OP não tem material
  // reservado" — mentira: não deu para ler.
  const [erro, setErro] = useState<{ pendente: boolean; mensagem: string } | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("op_reserved_materials", { _order_id: orderId });
    setLoading(false);
    if (error) {
      const pendente = isMissingDatabaseObject(error as { code?: string; message?: string });
      setErro({ pendente, mensagem: error.message });
      setRows([]);
      if (!pendente) toast.error(`Não foi possível ler as reservas da OP: ${error.message}`);
      return;
    }
    setErro(null);
    setRows((data ?? []) as ReservedMaterial[]);
  }, [orderId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const totalReservado = rows.length;
  const semSaldo = rows.filter((r) => Number(r.qty_on_hand) < Number(r.qty));

  const baixar = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("record_op_material_consumption", {
      _order_id: orderId,
    });
    setBusy(false);
    if (error) {
      if (isMissingDatabaseObject(error as { code?: string; message?: string })) {
        setErro({ pendente: true, mensagem: error.message });
      } else {
        toast.error(error.message);
      }
      return;
    }
    const res = data as unknown as ConsumeResult;
    setErro(null);
    setUltimo(res);
    if (res.total_consumido > 0) {
      toast.success(
        `Baixa registrada: ${res.total_consumido} insumo(s) consumido(s) pela ${orderNumber}.`,
      );
    }
    if (res.total_curto > 0) {
      toast.warning(
        `${res.total_curto} insumo(s) sem saldo físico — a reserva continua ativa para o MRP.`,
      );
    }
    if (res.total_consumido === 0 && res.total_curto === 0) {
      toast.info("Nada a baixar: a OP não tem material reservado em aberto.");
    }
    await carregar();
  };

  return (
    <div className="space-y-3" data-testid="op-materials">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Material reservado ({totalReservado})
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            A baixa registra a saída no almoxarifado e fecha a reserva desta OP. Insumo sem saldo
            físico não é baixado — a reserva continua ativa para o MRP enxergar a falta.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => void baixar()}
            disabled={busy || totalReservado === 0 || !podeBaixar || Boolean(erro)}
            title={
              podeBaixar
                ? "Registrar a saída dos insumos reservados"
                : "Só o almoxarifado (admin, gestor ou almoxarife) dá baixa de estoque"
            }
          >
            <PackageMinus className="h-3.5 w-3.5" />
            {busy ? "Baixando…" : "Dar baixa do material"}
          </Button>
        </div>
      </div>

      {!podeBaixar && (
        <p className="text-[11px] text-muted-foreground rounded-md border border-border bg-muted/40 px-2 py-1.5">
          Seu perfil planeja a OP, mas não movimenta estoque. A baixa é do almoxarifado — é a
          separação entre PCP e almoxarifado que o sistema assume.
        </p>
      )}

      {erro?.pendente && (
        <div
          data-testid="material-migracao-pendente"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-800 dark:text-amber-300 space-y-1"
        >
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" />
            Baixa de material indisponível neste banco
          </p>
          <p className="leading-snug">{MENSAGEM_MIGRACAO_PENDENTE}</p>
        </div>
      )}

      {erro && !erro.pendente && (
        <div
          data-testid="material-erro-leitura"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-[11px] text-destructive space-y-1"
        >
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" />
            Não foi possível ler as reservas desta OP
          </p>
          <p className="leading-snug font-mono">{erro.mensagem}</p>
          <Button size="sm" variant="outline" onClick={() => void carregar()}>
            Tentar de novo
          </Button>
        </div>
      )}

      {!loading && !erro && totalReservado === 0 && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Esta OP não tem material reservado em aberto. Reservas nascem quando o pedido é liberado
          para o PCP com insumos ligados ao almoxarifado.
        </p>
      )}

      {semSaldo.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
          <span>
            <strong className="font-semibold">{semSaldo.length} insumo(s) sem saldo físico</strong>{" "}
            para atender a reserva: {semSaldo.map((r) => r.item_name).join(", ")}. A baixa vai
            ignorá-los.
          </span>
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-2xs uppercase tracking-[0.04em] text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-3 py-2">Insumo</th>
                <th className="text-right font-medium px-3 py-2">Reservado</th>
                <th className="text-right font-medium px-3 py-2">Saldo físico</th>
                <th className="text-right font-medium px-3 py-2">Parado há</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const falta = Number(r.qty_on_hand) < Number(r.qty);
                return (
                  <tr key={r.reservation_id} className="border-t border-border/60">
                    <td className="px-3 py-2">
                      <span className="font-mono text-2xs text-primary">{r.item_code}</span>{" "}
                      {r.item_name}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {Number(r.qty)} {r.unit}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono ${
                        falta ? "text-amber-600 dark:text-amber-300 font-semibold" : ""
                      }`}
                    >
                      {Number(r.qty_on_hand)} {r.unit}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {Number(r.dias_ativa) >= 30 ? (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]"
                        >
                          {r.dias_ativa}d
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">{r.dias_ativa}d</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {ultimo && (ultimo.total_consumido > 0 || ultimo.total_curto > 0) && (
        <div className="rounded-md border border-border bg-muted/30 p-2.5 text-[11px] space-y-1">
          <p className="font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            Última baixa
          </p>
          {ultimo.consumidos.map((c, i) => (
            <p key={`c${i}`} className="text-status-approved">
              ✓ {c.item_name} — {Number(c.qty)} {c.unit}
            </p>
          ))}
          {ultimo.curtos.map((c, i) => (
            <p key={`k${i}`} className="text-amber-700 dark:text-amber-300">
              ⚠ {c.item_name} — reservado {Number(c.qty)} {c.unit}, saldo {Number(c.saldo)} {c.unit}{" "}
              (falta {Number(c.falta)})
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
