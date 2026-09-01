// Painel de comentários com @mentions, edição, histórico de revisões e anexos.
// Realtime via Supabase channel — mensagens novas aparecem ao vivo.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send, Trash2, Loader2, MessageSquare, Pencil, History, X, Check,
  Paperclip, Download, FileText, Image as ImageIcon, Maximize2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

import { createSignedUrlCache } from "@/lib/attachments/signed-url-cache";

const BUCKET = "use-moda-assets";
const MAX_FILE_MB = 20;
const PREVIEW_TTL = 3600;
const DOWNLOAD_TTL = 60;
const REFRESH_MARGIN_MS = 30_000;
const PREVIEW_CACHE_MAX = 200;
const DOWNLOAD_CACHE_MAX = 100;
const CACHE_SWEEP_INTERVAL_MS = 60_000;

const previewCache = createSignedUrlCache(
  async (storage_path) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storage_path, PREVIEW_TTL);
    if (error || !data?.signedUrl) throw new Error(error?.message ?? "Falha ao carregar prévia");
    return data.signedUrl;
  },
  { ttlMs: PREVIEW_TTL * 1000, max: PREVIEW_CACHE_MAX, refreshMarginMs: REFRESH_MARGIN_MS },
);

const downloadCache = createSignedUrlCache(
  async (key) => {
    const [storage_path, file_name] = key.split("::");
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storage_path, DOWNLOAD_TTL, { download: file_name });
    if (error || !data?.signedUrl) throw new Error(error?.message ?? "Falha ao gerar link de download");
    return data.signedUrl;
  },
  { ttlMs: DOWNLOAD_TTL * 1000, max: DOWNLOAD_CACHE_MAX, refreshMarginMs: REFRESH_MARGIN_MS },
);

export const getPreviewUrl = (storage_path: string) => previewCache.get(storage_path);
export const getDownloadUrl = (storage_path: string, file_name: string) =>
  downloadCache.get(`${storage_path}::${file_name}`);

export function clearAttachmentUrlCache(storage_path?: string) {
  previewCache.invalidate(storage_path);
  downloadCache.invalidate(storage_path);
}

if (typeof window !== "undefined") {
  const w = window as Window & { __attachmentCacheSweeper?: number };
  if (w.__attachmentCacheSweeper !== undefined) {
    window.clearInterval(w.__attachmentCacheSweeper);
  }
  w.__attachmentCacheSweeper = window.setInterval(() => {
    previewCache.sweep();
    downloadCache.sweep();
  }, CACHE_SWEEP_INTERVAL_MS);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      previewCache.sweep();
      downloadCache.sweep();
    }
  });
}

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

type Attachment = {
  id: string;
  comment_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
};

type Revision = {
  id: string;
  previous_message: string;
  previous_attachments: Array<{ file_name: string; storage_path: string }>;
  edited_at: string;
};

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s atrás`;
  if (s < 3600) return `${Math.floor(s / 60)}min atrás`;
  if (s < 86400) return `${Math.floor(s / 3600)}h atrás`;
  return `${Math.floor(s / 86400)}d atrás`;
}

function fmtSize(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function extractMentions(msg: string): string[] {
  const m = msg.match(/@[\w.-]+/g);
  return m ? Array.from(new Set(m.map((x) => x.slice(1).toLowerCase()))) : [];
}

function renderMessage(msg: string) {
  const parts = msg.split(/(@[\w.-]+)/g);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span key={i} className="text-primary font-semibold">{p}</span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function isImageAttachment(a: { mime_type: string | null; file_name: string }) {
  if (a.mime_type?.startsWith("image/")) return true;
  return ["png", "jpg", "jpeg", "webp", "gif", "avif", "svg"].includes(extOf(a.file_name));
}

function isPdfAttachment(a: { mime_type: string | null; file_name: string }) {
  if (a.mime_type === "application/pdf") return true;
  return extOf(a.file_name) === "pdf";
}

async function downloadAttachment(storage_path: string, file_name: string): Promise<string | null> {
  try {
    const url = await getDownloadUrl(storage_path, file_name);
    window.open(url, "_blank");
    return null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao gerar link de download";
    toast.error(msg);
    return msg;
  }
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
  const [attachments, setAttachments] = useState<Record<string, Attachment[]>>({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const { data: rows } = await supabase
        .from("comments")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const list = (rows ?? []) as CommentRow[];
      setItems(list);
      if (list.length > 0) {
        const { data: atts } = await supabase
          .from("comment_attachments")
          .select("*")
          .in("comment_id", list.map((c) => c.id));
        const grouped: Record<string, Attachment[]> = {};
        for (const a of (atts ?? []) as Attachment[]) {
          (grouped[a.comment_id] ??= []).push(a);
        }
        if (!cancelled) setAttachments(grouped);
      }
      setLoading(false);
    })();

    const channel = supabase
      .channel(`comments:${entityType}:${entityId}:${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `entity_id=eq.${entityId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as CommentRow;
            if (row.entity_type !== entityType) return;
            setItems((prev) => (prev.some((p) => p.id === row.id) ? prev : [...prev, row]));
          } else if (payload.eventType === "DELETE") {
            const id = (payload.old as { id: string }).id;
            setItems((prev) => prev.filter((p) => p.id !== id));
            setAttachments((prev) => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as CommentRow;
            setItems((prev) => prev.map((p) => (p.id === row.id ? row : p)));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comment_attachments" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const a = payload.new as Attachment;
            setAttachments((prev) => {
              const list = prev[a.comment_id] ?? [];
              if (list.some((x) => x.id === a.id)) return prev;
              return { ...prev, [a.comment_id]: [...list, a] };
            });
          } else if (payload.eventType === "DELETE") {
            const a = payload.old as Attachment;
            setAttachments((prev) => {
              const list = prev[a.comment_id];
              if (!list) return prev;
              return { ...prev, [a.comment_id]: list.filter((x) => x.id !== a.id) };
            });
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

  const addFiles = (fl: FileList | null) => {
    if (!fl) return;
    const arr = Array.from(fl);
    const over = arr.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (over) {
      toast.error(`Arquivo "${over.name}" excede ${MAX_FILE_MB}MB`);
      return;
    }
    setPendingFiles((prev) => [...prev, ...arr]);
  };

  const uploadAttachments = async (commentId: string, files: File[]) => {
    if (!user || files.length === 0) return;
    for (const file of files) {
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${user.id}/comments/${commentId}/${crypto.randomUUID()}_${safe}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        toast.error(`Falha ao enviar ${file.name}: ${upErr.message}`);
        continue;
      }
      const { error: insErr } = await supabase.from("comment_attachments").insert({
        comment_id: commentId,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: user.id,
      });
      if (insErr) {
        toast.error(insErr.message);
        void supabase.storage.from(BUCKET).remove([path]);
      }
    }
  };

  const send = async () => {
    if (!user || (!draft.trim() && pendingFiles.length === 0)) return;
    setSending(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        user_id: user.id,
        user_name: userName,
        user_avatar: (user.user_metadata?.avatar_url as string | undefined) ?? null,
        message: draft.trim() || "(anexo)",
        mentions: extractMentions(draft),
      })
      .select("id")
      .single();
    if (error || !data) {
      setSending(false);
      toast.error(error?.message ?? "Erro ao enviar");
      return;
    }
    if (pendingFiles.length > 0) {
      await uploadAttachments(data.id, pendingFiles);
    }
    setSending(false);
    setDraft("");
    setPendingFiles([]);
  };

  const remove = async (id: string) => {
    const list = attachments[id] ?? [];
    if (list.length > 0) {
      await supabase.storage.from(BUCKET).remove(list.map((a) => a.storage_path));
    }
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const removeAttachment = async (a: Attachment) => {
    await supabase.storage.from(BUCKET).remove([a.storage_path]);
    const { error } = await supabase.from("comment_attachments").delete().eq("id", a.id);
    if (error) toast.error(error.message);
    clearAttachmentUrlCache(a.storage_path);
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
      .update({ message: editDraft.trim(), mentions: extractMentions(editDraft) })
      .eq("id", id);
    if (error) return toast.error(error.message);
    cancelEdit();
  };

  return (
    <div className={`rounded-md border border-white/10 bg-white/[0.025] flex flex-col ${className ?? ""}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white font-bold">
          <MessageSquare className="w-3.5 h-3.5 text-primary" /> {title}
        </div>
        <span className="text-[10px] text-muted-foreground">{items.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[420px] px-4 py-3 space-y-3">
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
          const atts = attachments[c.id] ?? [];
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
                      className="resize-none text-[12px]"
                    />
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-6 text-[10px]" onClick={() => void saveEdit(c.id)}>
                        <Check className="w-3 h-3 mr-1" /> Salvar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={cancelEdit}>
                        <X className="w-3 h-3 mr-1" /> Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-white/90 leading-snug mt-0.5 whitespace-pre-wrap break-words">
                    {renderMessage(c.message)}
                  </p>
                )}
                {atts.length > 0 && (
                  <ul className="mt-1.5 space-y-1.5">
                    {atts.map((a) => (
                      <AttachmentItem
                        key={a.id}
                        attachment={a}
                        canRemove={a.uploaded_by === user?.id}
                        onRemove={() => void removeAttachment(a)}
                      />
                    ))}
                  </ul>
                )}
              </div>
              {mine && !isEditing && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <Button variant="ghost" size="icon-sm" onClick={() => startEdit(c)} aria-label="Editar comentário" className="text-muted-foreground hover:text-primary">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => void remove(c.id)} aria-label="Apagar comentário" className="text-muted-foreground hover:text-rose-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>

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
          className="resize-none text-[12px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
        />
        {pendingFiles.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {pendingFiles.map((f, i) => (
              <li key={i} className="flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-white/80">
                <FileText className="w-3 h-3 text-primary" />
                <span className="truncate max-w-[160px]">{f.name}</span>
                <span className="text-muted-foreground">{fmtSize(f.size)}</span>
                <button
                  onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-rose-400"
                  aria-label="Remover"
                >
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <Button
 size="sm"
 variant="ghost"
 className="text-[10px] gap-1"
 onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-3.5 h-3.5" /> Anexar
            </Button>
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Ctrl/Cmd + Enter para enviar
            </span>
          </div>
          <Button
 size="sm"
 disabled={sending || (!draft.trim() && pendingFiles.length === 0) || !user}
 onClick={() => void send()}
            className="gap-1.5"
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
      .select("id, previous_message, previous_attachments, edited_at")
      .eq("comment_id", commentId)
      .order("edited_at", { ascending: false });
    setRevisions((data ?? []) as unknown as Revision[]);
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
      <PopoverContent className="w-96 p-3 bg-background/95 border-white/10">
        <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-white mb-2">Histórico</div>
        {loading && (
          <div className="flex justify-center py-4 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
        {!loading && revisions && revisions.length === 0 && (
          <div className="text-[11px] text-muted-foreground">Sem revisões anteriores.</div>
        )}
        {!loading && revisions && revisions.length > 0 && (
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {revisions.map((r) => (
              <li key={r.id} className="border-l-2 border-white/10 pl-2">
                <div className="text-[9px] text-muted-foreground">{timeAgo(r.edited_at)}</div>
                <div className="text-[11px] text-white/80 whitespace-pre-wrap">{r.previous_message}</div>
                {Array.isArray(r.previous_attachments) && r.previous_attachments.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {r.previous_attachments.map((a, i) => (
                      <li key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5" />
                        <button
                          onClick={() => void downloadAttachment(a.storage_path, a.file_name)}
                          className="hover:text-primary underline-offset-2 hover:underline truncate"
                        >
                          {a.file_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function AttachmentItem({
  attachment,
  canRemove,
  onRemove,
}: {
  attachment: Attachment;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const isImage = isImageAttachment(attachment);
  const isPdf = isPdfAttachment(attachment);
  const previewable = isImage || isPdf;

  const loadPreview = () => {
    setError(null);
    setLoading(true);
    getPreviewUrl(attachment.storage_path)
      .then((url) => {
        setSignedUrl(url);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Falha ao carregar prévia");
        setLoading(false);
      });
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    const err = await downloadAttachment(attachment.storage_path, attachment.file_name);
    setDownloading(false);
    if (err) setDownloadError(err);
  };

  useEffect(() => {
    if (!previewable) return;
    let cancelled = false;
    setError(null);
    setLoading(true);
    getPreviewUrl(attachment.storage_path)
      .then((url) => {
        if (cancelled) return;
        setSignedUrl(url);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Falha ao carregar prévia");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attachment.storage_path, previewable]);

  return (
    <li className="rounded border border-white/10 bg-white/[0.03] overflow-hidden">
      {previewable && (
        <div className="relative bg-black/40 border-b border-white/5">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-1.5 h-32 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[9px] uppercase tracking-widest">Carregando prévia…</span>
            </div>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center gap-1.5 h-24 px-3 text-center">
              <span className="text-[10px] text-rose-400">{error}</span>
              <button
                type="button"
                onClick={loadPreview}
                className="text-[10px] uppercase tracking-widest text-primary hover:underline"
              >
                Tentar novamente
              </button>
            </div>
          )}
          {!loading && !error && signedUrl && isImage && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="block w-full group/preview"
              aria-label={expanded ? "Reduzir imagem" : "Expandir imagem"}
            >
              <img
                src={signedUrl}
                alt={attachment.file_name}
                className={`w-full object-contain bg-black/60 transition-all ${
                  expanded ? "max-h-[520px]" : "max-h-48"
                }`}
                loading="lazy"
              />
              <span className="absolute top-1.5 right-1.5 rounded bg-black/60 p-1 opacity-0 group-hover/preview:opacity-100 transition">
                <Maximize2 className="w-3 h-3 text-white" />
              </span>
            </button>
          )}
          {!loading && !error && signedUrl && isPdf && (
            <iframe
              src={`${signedUrl}#toolbar=0&navpanes=0`}
              title={attachment.file_name}
              className={`w-full bg-white transition-all ${expanded ? "h-[560px]" : "h-64"}`}
            />
          )}
          {!loading && !error && signedUrl && isPdf && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="absolute top-1.5 right-1.5 rounded bg-black/60 p-1 hover:bg-black/80"
              aria-label={expanded ? "Reduzir PDF" : "Expandir PDF"}
            >
              <Maximize2 className="w-3 h-3 text-white" />
            </button>
          )}
        </div>
      )}
      <div className="px-2 py-1 space-y-0.5">
        <div className="flex items-center gap-2 text-[11px] text-white/80">
          {isImage ? (
            <ImageIcon className="w-3 h-3 text-primary shrink-0" />
          ) : (
            <FileText className="w-3 h-3 text-primary shrink-0" />
          )}
          <span className="truncate flex-1">{attachment.file_name}</span>
          <span className="text-[9px] text-muted-foreground shrink-0">{fmtSize(attachment.size_bytes)}</span>
          <button
            onClick={() => void handleDownload()}
            disabled={downloading}
            className="text-muted-foreground hover:text-primary disabled:opacity-50"
            aria-label="Baixar anexo"
          >
            {downloading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Download className="w-3 h-3" />
            )}
          </button>
          {canRemove && (
            <button
              onClick={onRemove}
              className="text-muted-foreground hover:text-rose-400"
              aria-label="Remover anexo"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {downloadError && (
          <div className="text-[9px] text-rose-400 pl-5">{downloadError}</div>
        )}
      </div>
    </li>
  );
}
