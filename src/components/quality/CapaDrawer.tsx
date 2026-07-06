// Drawer completo de CAPA — workflow real com estados, 5 Porquês, causa-raiz,
// ações imediata/corretiva/preventiva, evidências e timeline imutável.
import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  History,
  ListChecks,
  Paperclip,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  CAPA_SEVERIDADES,
  isOverdue,
  nextStatuses,
  useCapa,
  type Capa,
  type CapaSeveridade,
  type CapaStatus,
} from "@/hooks/use-capa";
import { useEntityDrawer } from "@/components/entity/EntityContext";
import { Network } from "lucide-react";

const STATUS_STYLES: Record<CapaStatus, string> = {
  Aberta: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  "Investigação": "bg-violet-500/15 text-violet-300 border-violet-400/30",
  "Ação": "bg-amber-500/15 text-amber-300 border-amber-400/30",
  "Verificação": "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  "Concluída": "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  Reprovada: "bg-rose-500/15 text-rose-300 border-rose-400/30",
};

const SEV_STYLES: Record<CapaSeveridade, string> = {
  Baixa: "bg-white/5 text-white/70 border-white/10",
  "Média": "bg-sky-500/10 text-sky-300 border-sky-400/25",
  Alta: "bg-amber-500/10 text-amber-300 border-amber-400/25",
  "Crítica": "bg-rose-500/15 text-rose-300 border-rose-400/40",
};

const STEPS: CapaStatus[] = [
  "Aberta",
  "Investigação",
  "Ação",
  "Verificação",
  "Concluída",
];

interface Props {
  capa: Capa | null;
  open: boolean;
  onClose(): void;
}

export function CapaDrawer({ capa, open, onClose }: Props) {
  const { transition, update, remove, eventsOf } = useCapa();
  const [note, setNote] = useState("");
  const [porqueDraft, setPorqueDraft] = useState("");
  const [evUrl, setEvUrl] = useState("");
  const [evLabel, setEvLabel] = useState("");

  const [local, setLocal] = useState<Capa | null>(capa);
  useEffect(() => setLocal(capa), [capa]);

  const events = useMemo(
    () => (local ? eventsOf(local.id) : []),
    [local, eventsOf],
  );

  const { openEntity } = useEntityDrawer();

  if (!local) return null;
  const overdue = isOverdue(local);
  const currentIdx = STEPS.indexOf(local.status);

  async function doTransition(to: CapaStatus) {
    const ok = await transition(local!, to, note || undefined);
    if (!ok) return toast.error("Transição não permitida");
    toast.success(`Movido para ${to}`);
    setNote("");
  }

  async function persistPatch(patch: Partial<Capa>, msg?: string) {
    const ok = await update(local!.id, patch, msg);
    if (!ok) return toast.error("Falha ao salvar");
    setLocal({ ...local!, ...patch });
    toast.success("Salvo");
  }

  function addPorque() {
    if (!porqueDraft.trim()) return;
    const arr = [...local!.cinco_porques, porqueDraft.trim()].slice(0, 5);
    setLocal({ ...local!, cinco_porques: arr });
    setPorqueDraft("");
  }
  function removePorque(i: number) {
    const arr = local!.cinco_porques.filter((_, idx) => idx !== i);
    setLocal({ ...local!, cinco_porques: arr });
  }
  function addEvidencia() {
    if (!evUrl.trim()) return;
    const arr = [
      ...local!.evidencias,
      { url: evUrl.trim(), label: evLabel.trim() || evUrl.trim() },
    ];
    setLocal({ ...local!, evidencias: arr });
    setEvUrl("");
    setEvLabel("");
  }
  function removeEvidencia(i: number) {
    const arr = local!.evidencias.filter((_, idx) => idx !== i);
    setLocal({ ...local!, evidencias: arr });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl bg-black/95 border-white/10 text-white overflow-y-auto"
      >
        <SheetHeader className="pb-3 border-b border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                CAPA · {local.tipo}
                {local.ref && <> · {local.ref}</>}
                {local.lote && <> · {local.lote}</>}
              </p>
              <SheetTitle className="mt-1 text-white text-lg leading-snug">
                {local.defeito}
              </SheetTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${STATUS_STYLES[local.status]}`}
                >
                  {local.status}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${SEV_STYLES[local.severidade]}`}
                >
                  {local.severidade}
                </Badge>
                <Badge variant="outline" className="text-[10px] border-white/20">
                  {local.setor}
                </Badge>
                {overdue && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-rose-500/15 text-rose-300 border-rose-400/40 gap-1"
                  >
                    <AlertTriangle className="h-3 w-3" /> Atrasada
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                title="Abrir na visão universal"
                onClick={() =>
                  openEntity({
                    type: "capa",
                    id: local.id,
                    title: local.defeito,
                    subtitle: `CAPA · ${local.setor}`,
                  })
                }
                className="text-muted-foreground"
              >
                <Network className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Workflow stepper */}
          <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-1">
            {STEPS.map((s, i) => {
              const done = i < currentIdx || local.status === "Concluída";
              const active = i === currentIdx && local.status !== "Reprovada";
              return (
                <div key={s} className="flex items-center gap-1 shrink-0">
                  <div
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] uppercase tracking-wider ${
                      active
                        ? STATUS_STYLES[s]
                        : done
                          ? "border-emerald-400/30 text-emerald-300"
                          : "border-white/10 text-white/40"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-3 w-3" /> : <span>{i + 1}</span>}
                    {s}
                  </div>
                  {i < STEPS.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-white/20" />
                  )}
                </div>
              );
            })}
          </div>
        </SheetHeader>

        <Tabs defaultValue="investigacao" className="mt-4">
          <TabsList className="grid w-full grid-cols-4 bg-white/5 h-auto">
            <TabsTrigger value="investigacao" className="text-[10px] gap-1">
              <FileText className="h-3 w-3" /> Investigação
            </TabsTrigger>
            <TabsTrigger value="acoes" className="text-[10px] gap-1">
              <ListChecks className="h-3 w-3" /> Ações
            </TabsTrigger>
            <TabsTrigger value="evidencias" className="text-[10px] gap-1">
              <Paperclip className="h-3 w-3" /> Evidências
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-[10px] gap-1">
              <History className="h-3 w-3" /> Timeline
            </TabsTrigger>
          </TabsList>

          {/* Investigação */}
          <TabsContent value="investigacao" className="mt-4 space-y-4">
            <MetaRow local={local} onSave={persistPatch} />
            <Field label="Causa-raiz">
              <Textarea
                value={local.causa_raiz ?? ""}
                onChange={(e) =>
                  setLocal({ ...local, causa_raiz: e.target.value })
                }
                onBlur={() =>
                  local.causa_raiz !== capa?.causa_raiz &&
                  persistPatch({ causa_raiz: local.causa_raiz }, "Causa-raiz atualizada")
                }
                placeholder="Descreva a causa-raiz identificada"
                className="min-h-[80px] bg-white/5 border-white/10 text-[12px]"
              />
            </Field>
            <Field label={`5 Porquês (${local.cinco_porques.length}/5)`}>
              <div className="space-y-2">
                {local.cinco_porques.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2 text-[11px]"
                  >
                    <span className="text-primary font-bold w-5 shrink-0">
                      {i + 1}.
                    </span>
                    <span className="flex-1">{p}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        removePorque(i);
                        persistPatch(
                          {
                            cinco_porques: local.cinco_porques.filter(
                              (_, x) => x !== i,
                            ),
                          },
                          "Porquê removido",
                        );
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-rose-400" />
                    </Button>
                  </div>
                ))}
                {local.cinco_porques.length < 5 && (
                  <div className="flex gap-2">
                    <Input
                      value={porqueDraft}
                      onChange={(e) => setPorqueDraft(e.target.value)}
                      placeholder={`Porquê #${local.cinco_porques.length + 1}`}
                      className="h-8 bg-white/5 border-white/10 text-[11px]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const arr = [
                            ...local.cinco_porques,
                            porqueDraft.trim(),
                          ].filter(Boolean);
                          setPorqueDraft("");
                          persistPatch(
                            { cinco_porques: arr },
                            "Porquê adicionado",
                          );
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-8 btn-primary-premium"
                      onClick={() => {
                        if (!porqueDraft.trim()) return;
                        const arr = [
                          ...local.cinco_porques,
                          porqueDraft.trim(),
                        ];
                        setPorqueDraft("");
                        persistPatch(
                          { cinco_porques: arr },
                          "Porquê adicionado",
                        );
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </Field>
          </TabsContent>

          {/* Ações */}
          <TabsContent value="acoes" className="mt-4 space-y-4">
            <ActionField
              label="Ação imediata (contenção)"
              value={local.acao_imediata}
              onSave={(v) => persistPatch({ acao_imediata: v }, "Ação imediata")}
            />
            <ActionField
              label="Ação corretiva"
              value={local.acao_corretiva}
              onSave={(v) => persistPatch({ acao_corretiva: v }, "Ação corretiva")}
            />
            <ActionField
              label="Ação preventiva"
              value={local.acao_preventiva}
              onSave={(v) =>
                persistPatch({ acao_preventiva: v }, "Ação preventiva")
              }
            />
            <Field label="Eficácia verificada">
              <select
                value={local.eficacia ?? ""}
                onChange={(e) => {
                  const v = (e.target.value || null) as Capa["eficacia"];
                  setLocal({ ...local, eficacia: v });
                  persistPatch({ eficacia: v }, "Eficácia atualizada");
                }}
                className="h-8 w-full bg-white/5 border border-white/10 rounded-md text-[11px] px-2"
              >
                <option value="">— não avaliada —</option>
                <option>Eficaz</option>
                <option>Não eficaz</option>
                <option>Pendente</option>
              </select>
            </Field>
          </TabsContent>

          {/* Evidências */}
          <TabsContent value="evidencias" className="mt-4 space-y-3">
            {local.evidencias.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                Nenhuma evidência anexada.
              </p>
            )}
            {local.evidencias.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2 text-[11px]"
              >
                <Paperclip className="h-3 w-3 text-primary" />
                <a
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 truncate hover:text-primary"
                >
                  {e.label}
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    const arr = local.evidencias.filter((_, x) => x !== i);
                    removeEvidencia(i);
                    persistPatch({ evidencias: arr }, "Evidência removida");
                  }}
                >
                  <Trash2 className="h-3 w-3 text-rose-400" />
                </Button>
              </div>
            ))}
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 space-y-2">
              <Input
                value={evUrl}
                onChange={(e) => setEvUrl(e.target.value)}
                placeholder="URL da evidência (foto, laudo, doc)"
                className="h-8 bg-white/5 border-white/10 text-[11px]"
              />
              <div className="flex gap-2">
                <Input
                  value={evLabel}
                  onChange={(e) => setEvLabel(e.target.value)}
                  placeholder="Descrição (opcional)"
                  className="h-8 bg-white/5 border-white/10 text-[11px] flex-1"
                />
                <Button
                  size="sm"
                  className="h-8 btn-primary-premium"
                  onClick={() => {
                    if (!evUrl.trim()) return;
                    const arr = [
                      ...local.evidencias,
                      {
                        url: evUrl.trim(),
                        label: evLabel.trim() || evUrl.trim(),
                      },
                    ];
                    addEvidencia();
                    persistPatch({ evidencias: arr }, "Evidência adicionada");
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Timeline */}
          <TabsContent value="timeline" className="mt-4 space-y-2">
            {events.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Nenhum evento registrado ainda.
              </p>
            ) : (
              events.map((e) => (
                <div
                  key={e.id}
                  className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-[11px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-primary">
                      {e.event}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(e.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {e.from_status && e.to_status && (
                    <p className="mt-1 text-white/70">
                      {e.from_status} → <span className="text-white">{e.to_status}</span>
                    </p>
                  )}
                  {e.note && <p className="mt-1 text-white">{e.note}</p>}
                  {e.actor_name && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      por {e.actor_name}
                    </p>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Footer com transições */}
        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota da transição (opcional)"
            className="min-h-[52px] bg-white/5 border-white/10 text-[11px]"
          />
          <div className="flex flex-wrap gap-2">
            {nextStatuses(local.status).map((to) => (
              <Button
                key={to}
                size="sm"
                variant={to === "Reprovada" ? "outline" : "default"}
                className={
                  to === "Reprovada"
                    ? "h-8 border-rose-400/40 text-rose-300 hover:bg-rose-500/10"
                    : "h-8 btn-primary-premium"
                }
                onClick={() => doTransition(to)}
              >
                <ArrowRight className="h-3 w-3 mr-1" /> {to}
              </Button>
            ))}
            {nextStatuses(local.status).length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                Fluxo encerrado.
              </p>
            )}
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-rose-400 hover:bg-rose-500/10"
              onClick={async () => {
                await remove(local.id);
                toast.success("CAPA removida");
                onClose();
              }}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Excluir
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function ActionField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string | null;
  onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <Field label={label}>
      <Textarea
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          if (v !== (value ?? "")) onSave(v);
        }}
        placeholder="Descreva a ação, responsável e prazo"
        className="min-h-[64px] bg-white/5 border-white/10 text-[11px]"
      />
    </Field>
  );
}

function MetaRow({
  local,
  onSave,
}: {
  local: Capa;
  onSave: (patch: Partial<Capa>, msg?: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Responsável">
        <Input
          defaultValue={local.responsavel}
          onBlur={(e) =>
            e.target.value !== local.responsavel &&
            onSave({ responsavel: e.target.value }, "Responsável atualizado")
          }
          className="h-8 bg-white/5 border-white/10 text-[11px]"
        />
      </Field>
      <Field label="Prazo">
        <Input
          type="date"
          defaultValue={local.prazo ?? ""}
          onBlur={(e) =>
            e.target.value !== (local.prazo ?? "") &&
            onSave({ prazo: e.target.value || null }, "Prazo atualizado")
          }
          className="h-8 bg-white/5 border-white/10 text-[11px]"
        />
      </Field>
      <Field label="Severidade">
        <select
          defaultValue={local.severidade}
          onChange={(e) =>
            onSave(
              { severidade: e.target.value as CapaSeveridade },
              "Severidade",
            )
          }
          className="h-8 w-full bg-white/5 border border-white/10 rounded-md text-[11px] px-2"
        >
          {CAPA_SEVERIDADES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Fornecedor">
        <Input
          defaultValue={local.fornecedor ?? ""}
          onBlur={(e) =>
            e.target.value !== (local.fornecedor ?? "") &&
            onSave({ fornecedor: e.target.value || null }, "Fornecedor")
          }
          placeholder="—"
          className="h-8 bg-white/5 border-white/10 text-[11px]"
        />
      </Field>
    </div>
  );
}
