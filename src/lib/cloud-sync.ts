// Lovable Cloud sync para módulos colaborativos (influencers, quality CAPA, tech sheets).
// Padrão: hidrata uma vez por sessão; subscribes empurram debounced upserts.
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useInfluencersStore, type Influencer, type Envio } from "@/lib/influencers/store";
import { useQualityStore, type CapaAction } from "@/lib/quality/store";
import { useTechSheetStore } from "@/lib/techsheet/store";

// Upsert com rosto: falhas de sync eram silenciosas — o usuário via "salvo"
// na UI local enquanto o banco não recebia nada. Toast marca o conflito
// visível; o store local continua autor da tela (o retry vem no próximo
// change do store, que reempurra a linha inteira).
async function pushOrWarn(
  table: "influencers" | "quality_capa" | "tech_sheets",
  rows: unknown[],
  onConflict: string,
  label: string,
) {
  const { error } = await supabase.from(table).upsert(rows as never, { onConflict });
  if (error) {
    console.error(`[cloud-sync] falha ao salvar ${label}:`, error.message);
    toast.error(`Não foi possível salvar ${label} na nuvem. Tente novamente.`);
  }
}

const debouncers = new Map<string, ReturnType<typeof setTimeout>>();
function debounce(key: string, fn: () => void, ms = 800) {
  const t = debouncers.get(key);
  if (t) clearTimeout(t);
  debouncers.set(key, setTimeout(fn, ms));
}

const hydrated = { inf: false, capa: false, ts: false };

// ---------- INFLUENCERS ----------
async function pushInfluencer(i: Influencer, uid: string) {
  await pushOrWarn(
    "influencers",
    [
      {
        id: i.id.length === 36 ? i.id : undefined,
        nome: i.nome,
        handle: i.handle,
        regiao: i.regiao,
        uf: i.uf,
        seguidores: i.seguidores,
        segmento: i.segmento,
        perfil: i.perfil,
        custo_medio: i.custoMedio,
        vendas_geradas: i.vendasGeradas,
        envios: i.envios as unknown as never,
        created_by: uid,
      },
    ],
    "id",
    "o influenciador",
  );
}

async function hydrateInfluencers() {
  if (hydrated.inf) return;
  hydrated.inf = true;
  const { data, error } = await supabase
    .from("influencers")
    .select("*")
    .order("created_at", { ascending: true });
  if (error || !data || data.length === 0) return;
  const mapped: Influencer[] = data.map((r) => ({
    id: r.id,
    nome: r.nome,
    handle: r.handle,
    regiao: r.regiao ?? "",
    uf: r.uf ?? "",
    seguidores: r.seguidores,
    segmento: r.segmento ?? "",
    perfil: (r.perfil as Influencer["perfil"]) ?? "Micro",
    custoMedio: Number(r.custo_medio),
    vendasGeradas: r.vendas_geradas,
    envios: (r.envios as unknown as Envio[]) ?? [],
  }));
  useInfluencersStore.setState({ influencers: mapped });
}

// ---------- QUALITY CAPA ----------
async function pushCapaAll(uid: string) {
  const items = useQualityStore.getState().capa;
  if (items.length === 0) return;
  const rows = items.map((c) => ({
    id: c.id.length === 36 ? c.id : undefined,
    ref: c.ref ?? null,
    lote: c.lote ?? null,
    defeito: c.defeito,
    setor: c.setor,
    fornecedor: c.fornecedor ?? null,
    tipo: c.tipo,
    responsavel: c.responsavel,
    prazo: c.prazo || null,
    status: c.status,
    criada: c.criada,
    created_by: uid,
  }));
  await pushOrWarn("quality_capa", rows, "id", "as ações CAPA");
}

async function hydrateCapa() {
  if (hydrated.capa) return;
  hydrated.capa = true;
  const { data, error } = await supabase
    .from("quality_capa")
    .select("*")
    .order("created_at", { ascending: true });
  if (error || !data || data.length === 0) return;
  const mapped: CapaAction[] = data.map((r) => ({
    id: r.id,
    ref: r.ref ?? undefined,
    lote: r.lote ?? undefined,
    defeito: r.defeito,
    setor: r.setor,
    fornecedor: r.fornecedor ?? undefined,
    tipo: r.tipo as CapaAction["tipo"],
    responsavel: r.responsavel,
    prazo: r.prazo ?? "",
    status: r.status as CapaAction["status"],
    criada: r.criada,
  }));
  useQualityStore.setState({ capa: mapped });
}

// ---------- TECH SHEETS ----------
async function pushTechSheetsAll(uid: string) {
  const data = useTechSheetStore.getState().data;
  const rows = Object.entries(data).map(([ref, doc]) => ({
    ref,
    bom: doc.bom as unknown as never,
    bop: doc.bop as unknown as never,
    versoes: doc.versoes as unknown as never,
    created_by: uid,
  }));
  if (rows.length === 0) return;
  await pushOrWarn("tech_sheets", rows, "ref", "as fichas técnicas");
}

async function hydrateTechSheets() {
  if (hydrated.ts) return;
  hydrated.ts = true;
  const { data, error } = await supabase.from("tech_sheets").select("*");
  if (error || !data || data.length === 0) return;
  const next: Record<string, { bom: never[]; bop: never[]; versoes: never[] }> = {};
  for (const r of data) {
    next[r.ref] = {
      bom: (r.bom as unknown as never[]) ?? [],
      bop: (r.bop as unknown as never[]) ?? [],
      versoes: (r.versoes as unknown as never[]) ?? [],
    };
  }
  useTechSheetStore.setState({ data: next as never });
}

// ---------- HOOK MASTER ----------
export function useModulesCloudSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const unsubs: Array<() => void> = [];
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid || cancelled) return;
      await Promise.all([hydrateInfluencers(), hydrateCapa(), hydrateTechSheets()]);
      if (cancelled) return;

      unsubs.push(
        useInfluencersStore.subscribe((s, prev) => {
          if (s.influencers === prev.influencers) return;
          debounce("inf", () => {
            // upsert apenas os que mudaram (referência diferente)
            const prevMap = new Map(prev.influencers.map((i) => [i.id, i]));
            for (const i of s.influencers) {
              if (prevMap.get(i.id) !== i) void pushInfluencer(i, uid);
            }
          });
        }),
        useQualityStore.subscribe((s, prev) => {
          if (s.capa === prev.capa) return;
          debounce("capa", () => void pushCapaAll(uid));
        }),
        useTechSheetStore.subscribe((s, prev) => {
          if (s.data === prev.data) return;
          debounce("ts", () => void pushTechSheetsAll(uid));
        }),
      );

      // ---- Realtime: re-hidrata stores em qualquer mudança remota ----
      const channel = supabase
        .channel(`modules-live-${Math.random().toString(36).slice(2, 10)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "influencers" }, () => {
          hydrated.inf = false;
          void hydrateInfluencers();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "quality_capa" }, () => {
          hydrated.capa = false;
          void hydrateCapa();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "tech_sheets" }, () => {
          hydrated.ts = false;
          void hydrateTechSheets();
        })
        .subscribe();
      unsubs.push(() => {
        void supabase.removeChannel(channel);
      });
    })();
    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [enabled]);
}
