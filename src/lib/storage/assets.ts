// Helpers para upload de imagens no bucket privado use-moda-assets.
import { supabase } from "@/integrations/supabase/client";
import { descreverErroSupabase, motivoDe } from "@/lib/supabase/erro-humano";

// Onda 98 — upload nunca falha em silêncio: devolve o caminho ou o motivo.
export type ResultadoUpload = { path: string; reason?: undefined } | { path: null; reason: string };

const BUCKET = "use-moda-assets";

export async function uploadGeneratedImage(dataUrl: string): Promise<ResultadoUpload> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId)
      return {
        path: null,
        reason:
          "Não foi possível salvar a imagem: sua sessão expirou ou é inválida. Entre novamente e repita a ação.",
      };
    if (!dataUrl.startsWith("data:image/png;base64,"))
      return {
        path: null,
        reason:
          "Não foi possível salvar a imagem: o provedor devolveu um formato inesperado (não PNG).",
      };

    const base64 = dataUrl.slice("data:image/png;base64,".length);
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const file = new File([bytes], "generated-product.png", { type: "image/png" });
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `${userId}/ai-product-studio/${suffix}.png`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "31536000",
      contentType: "image/png",
      upsert: false,
    });
    if (error)
      return {
        path: null,
        reason: descreverErroSupabase(error, "salvar a imagem no armazenamento"),
      };
    return { path };
  } catch (error) {
    return { path: null, reason: motivoDe(error, "salvar a imagem no armazenamento") };
  }
}

export function storageAssetSource(path: string): string {
  return `storage://${BUCKET}/${path}`;
}

export async function uploadAsset(file: File, folder = "uploads"): Promise<ResultadoUpload> {
  const invalid = validateAssetFile(file);
  if (invalid) return { path: null, reason: `Não foi possível enviar ${file.name}: ${invalid}` };
  folder = sanitizeAssetFolder(folder);
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id ?? "anon";
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${folder}/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { path: null, reason: descreverErroSupabase(error, `enviar ${file.name}`) };
  return { path };
}

export async function signedUrl(
  path: string,
  expiresIn = 3600,
  bucket = BUCKET,
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function signedUrls(paths: string[], expiresIn = 3600) {
  if (paths.length === 0) return [] as string[];
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, expiresIn);
  return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
}

// ---------------------------------------------------------------------------
// Validação de upload — o bucket privado é a última barreira, não a primeira.
// Sem isto, qualquer File do navegador virava objeto no storage (tamanho,
// tipo declarado vs extensão e pasta controlados pelo cliente).
// ---------------------------------------------------------------------------
export const MAX_ASSET_BYTES = 15 * 1024 * 1024;

const ASSET_KINDS: Record<string, string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "application/pdf": ["pdf"],
};

/** Retorna a mensagem de erro ou null quando o arquivo é aceitável. */
export function validateAssetFile(file: {
  name: string;
  size: number;
  type: string;
}): string | null {
  if (file.size <= 0) return "Arquivo vazio.";
  if (file.size > MAX_ASSET_BYTES) return "Arquivo excede 15 MB.";
  const exts = ASSET_KINDS[file.type];
  if (!exts) return "Formato não suportado — envie PNG, JPG, WebP, GIF ou PDF.";
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!exts.includes(ext)) return "Extensão do arquivo não corresponde ao conteúdo.";
  return null;
}

/** Pasta do caminho de storage: whitelist curta (era string livre do chamador). */
export function sanitizeAssetFolder(folder: string): string {
  return /^[a-z0-9][a-z0-9-]{0,23}$/.test(folder) ? folder : "uploads";
}
