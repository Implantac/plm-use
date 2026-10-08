// @vitest-environment jsdom
//
// E2E de deduplicação sob pressão de LRU: renderiza múltiplos AttachmentItem
// simultâneos para o MESMO storage_path (equivale a clicar em "preview" em
// paralelo) — mesmo com o cache saturado e sofrendo evicções, a requisição
// concorrente deve ser deduplicada em um único createSignedUrl.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

const createSignedUrl = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: (_b: string) => ({ createSignedUrl }) } },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import {
  AttachmentItem,
  getPreviewUrl,
  clearAttachmentUrlCache,
} from "@/components/comments/CommentsPanel";

const PREVIEW_CACHE_MAX = 200;

const imgAttachment = (path: string, id: string) => ({
  id,
  comment_id: "c1",
  storage_path: path,
  file_name: `${id}.png`,
  mime_type: "image/png",
  size_bytes: 100,
  uploaded_by: "u1",
});

// Fetcher controlado: cada path pode ser "resolvido" manualmente para simular
// concorrência real com o inflight ainda pendente.
type Resolver = { resolve: (url: string) => void; count: number };
const pending = new Map<string, Resolver>();
let counter = 0;

beforeEach(() => {
  counter = 0;
  pending.clear();
  createSignedUrl.mockReset();
  createSignedUrl.mockImplementation((path: string) => {
    const existing = pending.get(path);
    if (existing) {
      existing.count += 1;
      // Se um fetch já está pendente, retorna a MESMA promise (comportamento
      // real do supabase client não faz isso — mas o cache deve deduplicar
      // ANTES de chegar aqui; se chegar duas vezes é bug de dedup).
    }
    return new Promise((resolve) => {
      pending.set(path, {
        resolve: (url: string) => resolve({ data: { signedUrl: url }, error: null } as never),
        count: (existing?.count ?? 0) + 1,
      });
    });
  });
  clearAttachmentUrlCache();
});

afterEach(() => cleanup());

async function flush() {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
}

function resolveAll(path: string) {
  const p = pending.get(path);
  if (!p) throw new Error(`no pending fetch for ${path}`);
  p.resolve(`https://signed.test/${path}?v=${++counter}`);
}

describe("CommentsPanel E2E — dedup concorrente com pressão de LRU", () => {
  it("N cliques simultâneos em preview do mesmo path geram 1 fetch, mesmo com o cache saturado e evictando entradas", async () => {
    // 1) Satura o cache até a capacidade — cada entrada resolve imediatamente
    //    (fluxo sequencial via await), assim `pending` fica vazio ao final.
    for (let i = 0; i < PREVIEW_CACHE_MAX; i++) {
      const path = `bulk/${i}.png`;
      const promise = getPreviewUrl(path);
      resolveAll(path);
      await promise;
    }
    expect(createSignedUrl).toHaveBeenCalledTimes(PREVIEW_CACHE_MAX);

    const HOT_PATH = "hot/shared.png";
    const N_CONCURRENT = 5;

    // 2) Renderiza N AttachmentItems simultâneos com o MESMO path novo (não
    //    está no cache). Todos disparam getPreviewUrl no mount, em paralelo,
    //    enquanto o cache já está cheio e vai evictar o LRU.
    const attachments = Array.from({ length: N_CONCURRENT }, (_, i) =>
      imgAttachment(HOT_PATH, `hot-${i}`),
    );

    for (const a of attachments) {
      render(<AttachmentItem attachment={a} canRemove={false} onRemove={() => {}} />);
    }

    // Deixa os useEffect rodarem sem resolver o fetch ainda.
    await flush();

    // 3) Deve haver EXATAMENTE 1 chamada a createSignedUrl para HOT_PATH,
    //    apesar de N mounts simultâneos — dedup via `inflight` do cache.
    const hotCalls = createSignedUrl.mock.calls.filter(([p]) => p === HOT_PATH);
    expect(hotCalls).toHaveLength(1);
    expect(pending.get(HOT_PATH)?.count).toBe(1);

    // 4) Ao resolver o fetch único, TODOS os N componentes recebem a MESMA URL.
    resolveAll(HOT_PATH);
    await flush();

    const imgs = screen.getAllByAltText(/^hot-\d+\.png$/);
    expect(imgs).toHaveLength(N_CONCURRENT);
    const urls = new Set(imgs.map((el) => el.getAttribute("src")));
    expect(urls.size).toBe(1);
    const [sharedUrl] = urls;
    expect(sharedUrl).toMatch(new RegExp(`^https://signed.test/${HOT_PATH}\\?v=\\d+$`));

    // 5) Novo mount subsequente do MESMO path deve reusar cache (HIT), sem
    //    novo createSignedUrl — confirma que dedup + put(cache) aconteceram
    //    corretamente sob a pressão de LRU.
    const callsAfterHot = createSignedUrl.mock.calls.length;
    render(
      <AttachmentItem
        attachment={imgAttachment(HOT_PATH, "hot-late")}
        canRemove={false}
        onRemove={() => {}}
      />,
    );
    await flush();
    const late = screen.getByAltText("hot-late.png");
    expect(late.getAttribute("src")).toBe(sharedUrl);
    expect(createSignedUrl).toHaveBeenCalledTimes(callsAfterHot);

    // 6) Um path novo (fora do cache) deve continuar disparando fetch — sanidade
    //    de que a inserção do HOT_PATH evictou o LRU e o cache segue funcional.
    const COLD_PATH = "cold/new.png";
    render(
      <AttachmentItem
        attachment={imgAttachment(COLD_PATH, "cold")}
        canRemove={false}
        onRemove={() => {}}
      />,
    );
    await flush();
    expect(createSignedUrl.mock.calls.filter(([p]) => p === COLD_PATH)).toHaveLength(1);
    resolveAll(COLD_PATH);
    await flush();
    expect(screen.getByAltText("cold.png").getAttribute("src")).toMatch(
      /^https:\/\/signed\.test\/cold\/new\.png\?v=\d+$/,
    );
  });
});
