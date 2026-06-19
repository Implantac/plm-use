// Helpers para upload de imagens no bucket privado use-moda-assets.
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "use-moda-assets";

export async function uploadAsset(file: File, folder = "uploads"): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id ?? "anon";
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${folder}/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    console.error("upload error", error);
    return null;
  }
  return path;
}

export async function signedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function signedUrls(paths: string[], expiresIn = 3600) {
  if (paths.length === 0) return [] as string[];
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, expiresIn);
  return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
}
