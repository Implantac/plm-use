// Onda 125 — Conector Bling (ERP): conectar via OAuth, sincronizar pedidos de venda, ver resumo.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Plug, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  desconectarBling,
  iniciarConexaoBling,
  sincronizarBling,
  statusBling,
} from "@/lib/integracoes/bling.functions";
import { motivoDe } from "@/lib/supabase/erro-humano";

const fmt = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "nunca";

export function IntegracaoBlingCard() {
  const qc = useQueryClient();
  const status = useServerFn(statusBling);
  const iniciar = useServerFn(iniciarConexaoBling);
  const sincronizar = useServerFn(sincronizarBling);
  const desconectar = useServerFn(desconectarBling);
  const [dias, setDias] = useState(30);

  const q = useQuery({ queryKey: ["bling-status"], queryFn: () => status(), retry: false });
  const invalidar = () => qc.invalidateQueries({ queryKey: ["bling-status"] });

  // Retorno do OAuth (?bling=ok|erro)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const r = p.get("bling");
    if (!r) return;
    if (r === "ok") toast.success("Bling conectado. Clique em “Sincronizar pedidos”.");
    else toast.error(p.get("motivo") || "Não foi possível conectar ao Bling.");
    p.delete("bling");
    p.delete("motivo");
    const limpa = `${window.location.pathname}${p.toString() ? `?${p}` : ""}`;
    window.history.replaceState(null, "", limpa);
    invalidar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mIniciar = useMutation({
    mutationFn: () => iniciar(),
    onSuccess: (r) => {
      window.location.assign(r.url);
    },
    onError: (e) => toast.error(motivoDe(e, "conectar ao Bling")),
  });
  const mSync = useMutation({
    mutationFn: () => sincronizar({ data: { dias } }),
    onSuccess: (r) => {
      invalidar();
      if (r.erro) toast.error(r.erro);
      else
        toast.success(
          `Bling: ${r.lidos} lidos · ${r.criados} criados · ${r.existentes} já existiam · ${r.rejeitados.length} rejeitados.`,
        );
    },
    onError: (e) => toast.error(motivoDe(e, "sincronizar com o Bling")),
  });
  const mDesc = useMutation({
    mutationFn: () => desconectar(),
    onSuccess: () => {
      invalidar();
      toast.success("Bling desconectado.");
    },
    onError: (e) => toast.error(motivoDe(e, "desconectar o Bling")),
  });

  const s = q.data;
  const resumo = s?.last_sync_summary ?? null;

  return (
    <Card className="border-border bg-card rounded-xl mb-6" data-testid="card-bling">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Integração ERP — Bling
            </span>
            {s?.conectado && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-2xs font-semibold text-emerald-600 dark:text-emerald-400">
                conectado{s.account_label ? ` · ${s.account_label}` : ""}
              </span>
            )}
          </div>
          <span className="text-2xs text-muted-foreground">
            Pedidos de venda do Bling → Pedidos do PLM (idempotente: bling + nº do pedido)
          </span>
        </div>

        {q.isError && (
          <p className="text-xs text-destructive">{motivoDe(q.error, "ler o status do Bling")}</p>
        )}
        {s?.migration_pendente && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Aplique <code>APLICAR-SQL-ONDA-125.sql</code> (tabela integration_connections) antes de
            conectar.
          </p>
        )}
        {s && !s.configurado && (
          <p className="text-xs text-muted-foreground">
            Para habilitar: crie um aplicativo em{" "}
            <strong>bling.com.br → Cadastros → Aplicativos</strong> com a URL de redirecionamento{" "}
            <code className="text-2xs">
              {typeof window !== "undefined" ? window.location.origin : ""}
              /api/public/integracoes/bling-callback
            </code>{" "}
            e escopo de pedidos de venda; depois defina <code>BLING_CLIENT_ID</code> e{" "}
            <code>BLING_CLIENT_SECRET</code> nos segredos do servidor e publique.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {!s?.conectado ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5 text-xs"
              disabled={!s?.configurado || s.migration_pendente || mIniciar.isPending}
              onClick={() => mIniciar.mutate()}
            >
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Conectar ao Bling
            </Button>
          ) : (
            <>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                Buscar últimos
                <select
                  aria-label="Janela de busca em dias"
                  value={dias}
                  onChange={(e) => setDias(Number(e.target.value))}
                  className="h-7 rounded border border-input bg-background px-1 text-xs text-foreground"
                >
                  {[7, 30, 90, 180].map((d) => (
                    <option key={d} value={d}>
                      {d} dias
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 text-xs"
                disabled={mSync.isPending}
                onClick={() => mSync.mutate()}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${mSync.isPending ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                {mSync.isPending ? "Sincronizando…" : "Sincronizar pedidos"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                disabled={mDesc.isPending}
                onClick={() => {
                  if (window.confirm("Desconectar o Bling? Os pedidos já importados permanecem."))
                    mDesc.mutate();
                }}
              >
                <Unplug className="h-3.5 w-3.5" aria-hidden="true" /> Desconectar
              </Button>
              <span className="text-2xs text-muted-foreground">
                Conectado em {fmt(s.connected_at)} · última sincronização {fmt(s.last_sync_at)}
              </span>
            </>
          )}
        </div>

        {resumo && (
          <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-xs space-y-1">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Última execução: <strong>{fmt(resumo.inicio)}</strong> (desde {resumo.desde})
              </span>
              <span>Lidos: {resumo.lidos}</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                Criados: {resumo.criados}
              </span>
              <span>Já existiam: {resumo.existentes}</span>
              <span>Ignorados (cancelados): {resumo.ignorados}</span>
              <span
                className={resumo.rejeitados.length ? "text-amber-600 dark:text-amber-400" : ""}
              >
                Rejeitados: {resumo.rejeitados.length}
              </span>
            </div>
            {resumo.erro && <p className="text-destructive">{resumo.erro}</p>}
            {resumo.rejeitados.length > 0 && (
              <ul className="list-disc pl-4 text-2xs text-muted-foreground max-h-32 overflow-y-auto">
                {resumo.rejeitados.slice(0, 20).map((r) => (
                  <li key={`${r.numero}-${r.motivo}`}>
                    <span className="font-mono text-foreground">#{r.numero}</span> — {r.motivo}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-2xs text-muted-foreground">
              Rejeitado por “product_codes_desconhecidos”? Cadastre o SKU no Catálogo (Comercial)
              com o mesmo código do Bling e sincronize de novo.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
