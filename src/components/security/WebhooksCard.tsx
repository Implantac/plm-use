// Onda 122 — Webhooks (Segurança): cadastrar URL, escolher eventos, testar, ver entregas.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Send, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EVENTOS_WEBHOOK } from "@/lib/api/webhooks-eventos";
import {
  alternarWebhook,
  criarWebhook,
  despacharWebhooksAgora,
  entregasRecentes,
  excluirWebhook,
  listarWebhooks,
  testarWebhook,
} from "@/lib/api/webhooks.functions";
import { motivoDe } from "@/lib/supabase/erro-humano";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "nunca";

export function WebhooksCard() {
  const qc = useQueryClient();
  const listar = useServerFn(listarWebhooks);
  const criar = useServerFn(criarWebhook);
  const alternar = useServerFn(alternarWebhook);
  const excluir = useServerFn(excluirWebhook);
  const testar = useServerFn(testarWebhook);
  const despachar = useServerFn(despacharWebhooksAgora);
  const entregas = useServerFn(entregasRecentes);

  const [nome, setNome] = useState("");
  const [url, setUrl] = useState("");
  const [todos, setTodos] = useState(true);
  const [eventos, setEventos] = useState<string[]>([]);
  const [segredo, setSegredo] = useState<string | null>(null);

  const subs = useQuery({ queryKey: ["webhooks"], queryFn: () => listar(), retry: false });
  const ent = useQuery({ queryKey: ["webhook-entregas"], queryFn: () => entregas(), retry: false });
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["webhooks"] });
    qc.invalidateQueries({ queryKey: ["webhook-entregas"] });
  };

  const mCriar = useMutation({
    mutationFn: () =>
      criar({
        data: {
          name: nome,
          url,
          events: todos ? "*" : (eventos as (typeof EVENTOS_WEBHOOK)[number]["id"][]),
        },
      }),
    onSuccess: (r) => {
      setSegredo(r.secret);
      setNome("");
      setUrl("");
      invalidar();
      toast.success("Webhook criado. Copie o segredo agora: ele não será mostrado de novo.");
    },
    onError: (e) => toast.error(motivoDe(e, "criar o webhook")),
  });
  const mTestar = useMutation({
    mutationFn: (id: string) => testar({ data: { id } }),
    onSuccess: (r) => {
      invalidar();
      toast[r.entregues > 0 ? "success" : "warning"](
        r.entregues > 0
          ? "Ping entregue (2xx)."
          : "Ping não foi aceito; veja o erro na lista de entregas (reenvio automático em 1 min).",
      );
    },
    onError: (e) => toast.error(motivoDe(e, "testar o webhook")),
  });
  const mDespachar = useMutation({
    mutationFn: () => despachar(),
    onSuccess: (r) => {
      invalidar();
      toast.success(
        `Fila processada: ${r.entregues} entregues, ${r.reagendadas} reagendadas, ${r.falhas} falhas.`,
      );
    },
    onError: (e) => toast.error(motivoDe(e, "despachar webhooks")),
  });
  const mAlternar = useMutation({
    mutationFn: (p: { id: string; active: boolean }) => alternar({ data: p }),
    onSuccess: invalidar,
    onError: (e) => toast.error(motivoDe(e, "alterar o webhook")),
  });
  const mExcluir = useMutation({
    mutationFn: (id: string) => excluir({ data: { id } }),
    onSuccess: () => {
      invalidar();
      toast.success("Webhook excluído.");
    },
    onError: (e) => toast.error(motivoDe(e, "excluir o webhook")),
  });

  const copiar = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      toast.success("Copiado.");
    } catch {
      toast.error("Não foi possível copiar; selecione o texto manualmente.");
    }
  };
  const podeCriar =
    nome.trim().length >= 2 && /^https?:\/\//.test(url) && (todos || eventos.length > 0);

  return (
    <Card className="border-border bg-card rounded-xl mb-6" data-testid="card-webhooks">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Webhooks (avisar ERP / loja em tempo real)
            </h2>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => mDespachar.mutate()}
            disabled={mDespachar.isPending}
          >
            <Send className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            {mDespachar.isPending ? "Enviando…" : "Enviar pendentes agora"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Quando um pedido, OP ou ficha técnica muda, o PLM faz um{" "}
          <code className="text-foreground">POST</code> JSON na sua URL, assinado em{" "}
          <code className="text-foreground">X-PLM-Signature</code> (HMAC-SHA256 com o segredo).
          Responda 2xx em até 10 s; se falhar, reenviamos em 1 min, 5 min, 30 min, 2 h e 12 h.
        </p>

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (podeCriar) mCriar.mutate();
          }}
        >
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1 min-w-[160px]">
              <Label htmlFor="wh-nome">Nome</Label>
              <Input
                id="wh-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: ERP TOTVS"
                maxLength={80}
              />
            </div>
            <div className="space-y-1 min-w-[280px] flex-1">
              <Label htmlFor="wh-url">URL de destino (https)</Label>
              <Input
                id="wh-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://erp.suaempresa.com.br/plm/webhook"
              />
            </div>
            <Button type="submit" size="sm" disabled={!podeCriar || mCriar.isPending}>
              {mCriar.isPending ? "Criando…" : "Criar webhook"}
            </Button>
          </div>
          <fieldset className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <legend className="sr-only">Eventos</legend>
            <label className="flex items-center gap-1.5 text-foreground">
              <input
                type="checkbox"
                className="h-3.5 w-3.5"
                checked={todos}
                onChange={(e) => setTodos(e.target.checked)}
              />
              Todos os eventos
            </label>
            {!todos &&
              EVENTOS_WEBHOOK.filter((ev) => ev.id !== "ping").map((ev) => (
                <label
                  key={ev.id}
                  className="flex items-center gap-1.5 text-foreground"
                  title={ev.descricao}
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5"
                    checked={eventos.includes(ev.id)}
                    onChange={(e) =>
                      setEventos((prev) =>
                        e.target.checked ? [...prev, ev.id] : prev.filter((x) => x !== ev.id),
                      )
                    }
                  />
                  <code>{ev.id}</code>
                </label>
              ))}
          </fieldset>
        </form>

        {segredo && (
          <div
            role="status"
            className="rounded-md border border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2"
          >
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              Segredo do webhook — copie agora, não será exibido novamente. Use-o para validar a
              assinatura.
            </p>
            <div className="flex items-center gap-2">
              <code className="text-xs break-all text-foreground flex-1" data-testid="novo-segredo">
                {segredo}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copiar(segredo)}
                aria-label="Copiar segredo"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSegredo(null)}>
              Já copiei
            </Button>
          </div>
        )}

        <div className="space-y-1" aria-live="polite">
          {subs.isLoading && <p className="text-xs text-muted-foreground">Carregando webhooks…</p>}
          {subs.isError && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {motivoDe(subs.error, "listar os webhooks")}
            </p>
          )}
          {subs.data && subs.data.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum webhook cadastrado.</p>
          )}
          {subs.data && subs.data.length > 0 && (
            <div className="overflow-x-auto" tabIndex={0}>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/60">
                    <th className="py-1.5 pr-3 font-medium">Nome</th>
                    <th className="py-1.5 pr-3 font-medium">URL</th>
                    <th className="py-1.5 pr-3 font-medium">Eventos</th>
                    <th className="py-1.5 pr-3 font-medium">Última entrega</th>
                    <th className="py-1.5 pr-3 font-medium">Status</th>
                    <th className="py-1.5 font-medium">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subs.data.map((w) => (
                    <tr key={w.id} className="border-b border-border/40 last:border-0">
                      <td className="py-1.5 pr-3 text-foreground">{w.name}</td>
                      <td
                        className="py-1.5 pr-3 text-foreground max-w-[260px] truncate"
                        title={w.url}
                      >
                        {w.url}
                      </td>
                      <td className="py-1.5 pr-3 text-foreground">
                        {w.events.includes("*") ? "todos" : w.events.length}
                      </td>
                      <td className="py-1.5 pr-3 text-foreground">
                        {fmt(w.last_delivery_at)}
                        {w.last_status != null && (
                          <span
                            className={
                              w.last_status >= 200 && w.last_status < 300
                                ? " text-emerald-700 dark:text-emerald-400"
                                : " text-red-700 dark:text-red-400"
                            }
                          >
                            {" "}
                            · HTTP {w.last_status}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3">
                        <button
                          type="button"
                          className="underline underline-offset-2 text-foreground"
                          onClick={() => mAlternar.mutate({ id: w.id, active: !w.active })}
                          aria-label={`${w.active ? "Pausar" : "Ativar"} webhook ${w.name}`}
                        >
                          {w.active ? "ativo" : "pausado"}
                        </button>
                      </td>
                      <td className="py-1.5 text-right whitespace-nowrap">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => mTestar.mutate(w.id)}
                          disabled={mTestar.isPending}
                          aria-label={`Testar webhook ${w.name}`}
                        >
                          <Send className="h-3.5 w-3.5" aria-hidden="true" /> Testar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => {
                            if (confirm(`Excluir o webhook "${w.name}"?`)) mExcluir.mutate(w.id);
                          }}
                          aria-label={`Excluir webhook ${w.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {ent.data && ent.data.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-foreground">
              Últimas {ent.data.length} entregas
            </summary>
            <div className="overflow-x-auto mt-2" tabIndex={0}>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/60">
                    <th className="py-1 pr-3 font-medium">Quando</th>
                    <th className="py-1 pr-3 font-medium">Evento</th>
                    <th className="py-1 pr-3 font-medium">Status</th>
                    <th className="py-1 pr-3 font-medium">Tentativas</th>
                    <th className="py-1 font-medium">Resposta</th>
                  </tr>
                </thead>
                <tbody>
                  {ent.data.map((d) => (
                    <tr key={d.id} className="border-b border-border/40 last:border-0">
                      <td className="py-1 pr-3 text-foreground">{fmt(d.created_at)}</td>
                      <td className="py-1 pr-3">
                        <code className="text-foreground">{d.event}</code>
                      </td>
                      <td
                        className={
                          "py-1 pr-3 " +
                          (d.status === "delivered"
                            ? "text-emerald-700 dark:text-emerald-400"
                            : d.status === "failed"
                              ? "text-red-700 dark:text-red-400"
                              : "text-amber-600 dark:text-amber-400")
                        }
                      >
                        {d.status === "delivered"
                          ? "entregue"
                          : d.status === "failed"
                            ? "falhou"
                            : "pendente"}
                      </td>
                      <td className="py-1 pr-3 text-foreground">{d.attempts}</td>
                      <td className="py-1 text-foreground">
                        {d.response_status ?? "—"}
                        {d.last_error ? ` · ${d.last_error}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
