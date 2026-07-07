// Painel de comentários reutilizável, ancorado a qualquer (entity_type, entity_id).
// Realtime via Supabase channel — mensagens novas aparecem ao vivo.
// Suporta @mentions (dispara notificação via trigger) e histórico de edições.
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Trash2, Loader2, MessageSquare, Pencil, History, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

export type CommentRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  user_id: string | null;
  user_name: string;
  message: string;
  mentions: string[];
  edited: boolean;
  created_at: string;
};

type Revision = {
  id: string;
  previous_message: string;
  edited_at: string;
};

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s atrás`;
  if (s < 3600) return `${Math.floor(s / 60)}min atrás`;
  if (s < 86400) return `${Math.floor(s / 3600)}h atrás`;
  return `${Math.floor(s / 86400)}d atrás`;
}

function extractMentions(msg: string): string[] {
  const m = msg.match(/@[\w.-]+/g);
  return m ? Array.from(new Set(m.map((x) => x.slice(1).toLowerCase()))) : [];
}

function renderMessage(msg: string) {
  const parts = msg.split(/(@[\w.-]+)/g);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span key={i} className="text-primary font-semibold">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

interface Props {
  entityType: string;
  entityId: string;
  title?: string;
  className?: string;
}

export function CommentsPanel({ entityType, entityId, title = "Comentários", className }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setItems((data ?? []) as CommentRow[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`comments:${entityType}:${entityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `entity_id=eq.${entityId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as CommentRow;
            if (row.entity_type !== entityType) return;
            setItems((prev) => (prev.some((p) => p.id === row.id) ? prev : [...prev, row]));
          } else if (payload.eventType === "DELETE") {
            const id = (payload.old as { id: string }).id;
            setItems((prev) => prev.filter((p) => p.id !== id));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as CommentRow;
            setItems((prev) => prev.map((p) => (p.id === row.id ? row : p)));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [entityType, entityId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items.length]);

  const userName = useMemo(
    () =>
      (user?.user_metadata?.full_name as string | undefined) ??
      user?.email?.split("@")[0] ??
      "Usuário",
    [user],
  );

  const send = async () => {
    if (!user || !draft.trim()) return;
    setSending(true);
    const { error } = await supabase.from("comments").insert({
      entity_type: entityType,
      entity_id: entityId,
      user_id: user.id,
      user_name: userName,
      user_avatar: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      message: draft.trim(),
      mentions: extractMentions(draft),
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft("");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const startEdit = (c: CommentRow) => {
    setEditingId(c.id);
    setEditDraft(c.message);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };

  const saveEdit = async (id: string) => {
    if (!editDraft.trim()) return;
    const { error } = await supabase
      .from("comments")
      .update({
        message: editDraft.trim(),
        mentions: extractMentions(editDraft),
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    cancelEdit();
  };

  return (
    <div
      className={`rounded-md border border-white/10 bg-white/[0.025] flex flex-col ${className ?? ""}`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white font-bold">
          <MessageSquare className="w-3.5 h-3.5 text-primary" /> {title}
        </div>
        <span className="text-[10px] text-muted-foreground">{items.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[360px] px-4 py-3 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center py-8 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Seja o primeiro a comentar
          </div>
        )}
        {items.map((c) => {
          const mine = user?.id === c.user_id;
          const isEditing = editingId === c.id;
          return (
            <div key={c.id} className="flex gap-3 group">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarFallback className="text-[10px] bg-primary/15 text-primary font-bold">
                  {c.user_name[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-bold text-white">{c.user_name}</span>
                  <span className="text-[9px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                  {c.edited && <HistoryButton commentId={c.id} />}
                </div>
                {isEditing ? (
                  <div className="mt-1 space-y-1.5">
                    <Textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={2}
                      className="resize-none bg-white/5 border-white/10 text-[12px]"
                    />
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-6 px-2 text-[10px]" onClick={() => void saveEdit(c.id)}>
                        <Check className="w-3 h-3 mr-1" /> Salvar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={cancelEdit}>
                        <X className="w-3 h-3 mr-1" /> Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-white/90 leading-snug mt-0.5 whitespace-pre-wrap break-words">
                    {renderMessage(c.message)}
                  </p>
                )}
              </div>
              {mine && !isEditing && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => startEdit(c)}
                    className="text-muted-foreground hover:text-primary"
                    aria-label="Editar comentário"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => void remove(c.id)}
                    className="text-muted-foreground hover:text-rose-400"
                    aria-label="Apagar comentário"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/5 p-3 space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escreva um comentário · use @nome para mencionar"
          rows={2}
          className="resize-none bg-white/5 border-white/10 text-[12px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
            Ctrl/Cmd + Enter para enviar
          </span>
          <Button
            size="sm"
            disabled={sending || !draft.trim() || !user}
            onClick={() => void send()}
            className="h-8 gap-1.5 btn-primary-premium"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}

function HistoryButton({ commentId }: { commentId: string }) {
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (revisions !== null) return;
    setLoading(true);
    const { data } = await supabase
      .from("comment_revisions")
      .select("id, previous_message, edited_at")
      .eq("comment_id", commentId)
      .order("edited_at", { ascending: false });
    setRevisions((data ?? []) as Revision[]);
    setLoading(false);
  };

  return (
    <Popover onOpenChange={(open) => open && void load()}>
      <PopoverTrigger asChild>
        <button
          className="text-[9px] text-muted-foreground italic hover:text-primary inline-flex items-center gap-0.5"
          aria-label="Ver histórico de edições"
        >
          <History className="w-2.5 h-2.5" />
          (editado)
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 bg-background/95 border-white/10">
        <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-white mb-2">
          Histórico
        </div>
        {loading && (
          <div className="flex justify-center py-4 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
        {!loading && revisions && revisions.length === 0 && (
          <div className="text-[11px] text-muted-foreground">Sem revisões anteriores.</div>
        )}
        {!loading && revisions && revisions.length > 0 && (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {revisions.map((r) => (
              <li key={r.id} className="border-l-2 border-white/10 pl-2">
                <div className="text-[9px] text-muted-foreground">{timeAgo(r.edited_at)}</div>
                <div className="text-[11px] text-white/80 whitespace-pre-wrap">{r.previous_message}</div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
