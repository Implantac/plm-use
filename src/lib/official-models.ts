import { supabase } from "@/integrations/supabase/client";

export type OfficialMeasure = { point: string; value: string; tolerance?: string; how?: string };
export type OfficialModel = {
  id: string;
  nome: string;
  categoria: string | null;
  tamanho_base: string;
  medidas: OfficialMeasure[];
  detalhes: string | null;
  sketch_path: string | null;
};

export const OFFICIAL_BUCKET = "official-models";

export async function listOfficialModels(): Promise<OfficialModel[]> {
  const { data, error } = await supabase
    .from("official_models")
    .select("id, nome, categoria, tamanho_base, medidas, detalhes, sketch_path")
    .order("nome");
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, medidas: Array.isArray(r.medidas) ? (r.medidas as OfficialMeasure[]) : [] }));
}

/** Lê CSV/TXT: ponto de medida; valor; tolerância; como medir (separador ; , ou tab). */
export function parseMeasureTable(text: string): OfficialMeasure[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows = lines.map((l) => l.split(/\t|;|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.replace(/^"|"$/g, "").trim()));
  const first = rows[0]?.join(" ").toLowerCase() ?? "";
  const body = /ponto|medida|point|valor/.test(first) && !/\d/.test(rows[0]?.[1] ?? "") ? rows.slice(1) : rows;
  return body
    .filter((r) => r[0])
    .map((r) => ({ point: r[0], value: r[1] ?? "", tolerance: r[2] || undefined, how: r[3] || undefined }));
}

export async function sketchSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(OFFICIAL_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Baixa o desenho oficial e devolve data URL para usar como imagem de referência. */
export async function sketchDataUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(OFFICIAL_BUCKET).download(path);
  if (error || !data) return null;
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(data);
  });
}
