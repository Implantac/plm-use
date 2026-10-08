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
  colecao: string | null;
  ativa: boolean;
};

export const OFFICIAL_BUCKET = "official-models";

export async function listOfficialModels(): Promise<OfficialModel[]> {
  const { data, error } = await supabase
    .from("official_models")
    .select("id, nome, categoria, tamanho_base, medidas, detalhes, sketch_path, colecao, ativa")
    .order("colecao", { nullsFirst: false })
    .order("nome");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    medidas: Array.isArray(r.medidas) ? (r.medidas as OfficialMeasure[]) : [],
  }));
}

/** Lê CSV/TXT: ponto de medida; valor; tolerância; como medir (separador ; , ou tab). */
export function parseMeasureTable(text: string): OfficialMeasure[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const rows = lines.map((l) =>
    l.split(/\t|;|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.replace(/^"|"$/g, "").trim()),
  );
  const first = rows[0]?.join(" ").toLowerCase() ?? "";
  const body =
    /ponto|medida|point|valor/.test(first) && !/\d/.test(rows[0]?.[1] ?? "") ? rows.slice(1) : rows;
  return body
    .filter((r) => r[0])
    .map((r) => ({
      point: r[0],
      value: r[1] ?? "",
      tolerance: r[2] || undefined,
      how: r[3] || undefined,
    }));
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

/** Bloco de prompt que obriga a IA a usar a tabela real, sem estimar. */
export function officialMeasuresBlock(m: OfficialModel): string {
  return `MODELO OFICIAL DA EMPRESA "${m.nome}" (tamanho base ${m.tamanho_base}). As medidas abaixo são a tabela REAL e definitiva: não estime, não altere e não invente outras medidas. Baseie silhueta, proporções e detalhes nelas:\n${m.medidas.map((x) => `- ${x.point}: ${x.value}${x.tolerance ? ` (${x.tolerance})` : ""}${x.how ? ` — ${x.how}` : ""}`).join("\n")}${m.detalhes ? `\nDetalhes construtivos oficiais: ${m.detalhes}` : ""}`;
}

/** Define a tabela como a oficial da coleção (desativa as demais da mesma coleção). */
export async function setActiveForCollection(m: OfficialModel) {
  if (!m.colecao) throw new Error("Informe a coleção antes de tornar oficial.");
  const { error: e1 } = await supabase
    .from("official_models")
    .update({ ativa: false })
    .ilike("colecao", m.colecao)
    .neq("id", m.id);
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from("official_models")
    .update({ ativa: true })
    .eq("id", m.id);
  if (e2) throw e2;
}

export function activeForCollection(models: OfficialModel[], colecao?: string | null) {
  const c = colecao?.trim().toLowerCase();
  return c ? models.find((m) => m.ativa && m.colecao?.trim().toLowerCase() === c) : undefined;
}
