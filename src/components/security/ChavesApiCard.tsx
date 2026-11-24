// Onda 121 — Chaves da API pública v1 (Segurança). A chave completa aparece uma única vez.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarChaveApi, listarChavesApi, revogarChaveApi } from "@/lib/api/api-keys.functions";
import { RECURSOS_V1 } from "@/lib/api/recursos-v1";
import { motivoDe } from "@/lib/supabase/erro-humano";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "nunca";

export function ChavesApiCard() {
  const qc = useQueryClient();
  const listar = useServerFn(listarChavesApi);
  const criar = useServerFn(criarChaveApi);
  const revogar = useServerFn(revogarChaveApi);
  const [nome, setNome] = useState("");
  const [novaChave, setNovaChave] = useState<string | null>(null);
  const [escrita, setEscrita] = useState(false);

  const chaves = useQuery({ queryKey: ["api-keys"], queryFn: () => listar(), retry: false });

  const mCriar = useMutation({
    mutationFn: () => criar({ data: { name: nome, write: escrita } }),
    onSuccess: (r) => {
      setNovaChave(r.chave);
      setNome("");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("Chave criada. Copie agora: ela não será mostrada de novo.");
    },
    onError: (e) => toast.error(motivoDe(e, "criar a chave de API")),
  });
  const mRevogar = useMutation({
    mutationFn: (id: string) => revogar({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("Chave revogada. Integrações que a usavam param de funcionar agora.");
    },
    onError: (e) => toast.error(motivoDe(e, "revogar a chave de API")),
  });

  const copiar = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      toast.success("Copiado.");
    } catch {
      toast.error("Não foi possível copiar; selecione o texto manualmente.");
    }
  };

  const origem = typeof window !== "undefined" ? window.location.origin : "";
  const exemplo = `curl -H "Authorization: Bearer ${novaChave ?? "plm_live_…"}" "${origem}/api/v1/references?limit=50"`;

  return (
    <Card className="border-border bg-card rounded-xl mb-6" data-testid="card-chaves-api">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Chaves de API (integração ERP / e-commerce / BI)
            </h2>
          </div>
          <a
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="text-2xs underline underline-offset-2 text-foreground hover:text-primary"
          >
            Contrato OpenAPI (/api/v1/openapi.json)
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          Leitura dos recursos{" "}
          <span className="text-foreground">{RECURSOS_V1.map((r) => r.slug).join(", ")}</span> via{" "}
          <code className="text-foreground">GET /api/v1/&lt;recurso&gt;</code>, com paginação por
          cursor e <code className="text-foreground">updated_since</code> para sincronização
          incremental. Só administração e gestão criam chaves; guardamos apenas o hash.
        </p>

        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (nome.trim().length >= 2) mCriar.mutate();
          }}
        >
          <div className="space-y-1 min-w-[220px] flex-1">
            <Label htmlFor="api-key-nome">Nome da chave</Label>
            <Input
              id="api-key-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: ERP TOTVS, Loja VTEX, Power BI"
              maxLength={80}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-foreground pb-2">
            <input
              type="checkbox"
              checked={escrita}
              onChange={(e) => setEscrita(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Permitir escrita (PATCH de OPs pelo ERP)
          </label>
          <Button type="submit" size="sm" disabled={nome.trim().length < 2 || mCriar.isPending}>
            {mCriar.isPending ? "Criando…" : "Criar chave"}
          </Button>
        </form>

        {novaChave && (
          <div
            role="status"
            className="rounded-md border border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2"
          >
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              Copie agora — esta chave não será exibida novamente.
            </p>
            <div className="flex items-center gap-2">
              <code className="text-xs break-all text-foreground flex-1" data-testid="nova-chave">
                {novaChave}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copiar(novaChave)}
                aria-label="Copiar chave"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
            <div className="text-2xs text-muted-foreground">
              Exemplo: <code className="break-all text-foreground">{exemplo}</code>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setNovaChave(null)}>
              Já copiei
            </Button>
          </div>
        )}

        <div className="space-y-1" aria-live="polite">
          {chaves.isLoading && <p className="text-xs text-muted-foreground">Carregando chaves…</p>}
          {chaves.isError && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {motivoDe(chaves.error, "listar as chaves de API")}
            </p>
          )}
          {chaves.data && chaves.data.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma chave criada ainda.</p>
          )}
          {chaves.data && chaves.data.length > 0 && (
            <div className="overflow-x-auto" tabIndex={0}>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/60">
                    <th className="py-1.5 pr-3 font-medium">Nome</th>
                    <th className="py-1.5 pr-3 font-medium">Prefixo</th>
                    <th className="py-1.5 pr-3 font-medium">Escopo</th>
                    <th className="py-1.5 pr-3 font-medium">Último uso</th>
                    <th className="py-1.5 pr-3 font-medium">Criada</th>
                    <th className="py-1.5 pr-3 font-medium">Status</th>
                    <th className="py-1.5 font-medium">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chaves.data.map((k) => (
                    <tr key={k.id} className="border-b border-border/40 last:border-0">
                      <td className="py-1.5 pr-3 text-foreground">{k.name}</td>
                      <td className="py-1.5 pr-3">
                        <code className="text-foreground">{k.key_prefix}…</code>
                      </td>
                      <td className="py-1.5 pr-3 text-foreground">
                        {k.scopes?.includes("write") ? "leitura + escrita" : "leitura"}
                      </td>
                      <td className="py-1.5 pr-3 text-foreground">{fmt(k.last_used_at)}</td>
                      <td className="py-1.5 pr-3 text-foreground">{fmt(k.created_at)}</td>
                      <td className="py-1.5 pr-3">
                        {k.revoked_at ? (
                          <span className="text-muted-foreground">revogada</span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400">ativa</span>
                        )}
                      </td>
                      <td className="py-1.5 text-right">
                        {!k.revoked_at && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => {
                              if (
                                confirm(
                                  `Revogar a chave "${k.name}"? As integrações que a usam vão parar.`,
                                )
                              )
                                mRevogar.mutate(k.id);
                            }}
                            aria-label={`Revogar chave ${k.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Revogar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
