// @vitest-environment jsdom
//
// E2E de falha concorrente: N AttachmentItems montados em paralelo para o
// MESMO storage_path compartilham uma única tentativa de createSignedUrl
// (dedup via inflight). Quando essa tentativa falha, nenhuma entrada
// corrompida deve ficar em cache — cliques posteriores em "Tentar novamente"
// disparam um NOVO createSignedUrl.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

const createSignedUrl = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: (_b: string) => ({ createSignedUrl }) } },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { AttachmentItem, clearAttachmentUrlCache } from "@/components/comments/CommentsPanel";

const HOT_PATH = "shared/hot.png";
const N = 4;

const imgAttachment = (id: string) => ({
  id,
  comment_id: "c1",
  storage_path: HOT_PATH,
  file_name: `${id}.png`,
  mime_type: "image/png",
  size_bytes: 100,
  uploaded_by: "u1",
});

type Deferred = {
  promise: Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
  resolve: (v: { data: { signedUrl: string } | null; error: { message: string } | null }) => void;
};
const deferredFor = new Map<string, Deferred[]>();
let counter = 0;

function nextDeferred(path: string): Deferred {
  let resolve!: Deferred["resolve"];
  const promise = new Promise<Awaited<Deferred["promise"]>>((r) => {
    resolve = r;
  });
  const d = { promise, resolve };
  const list = deferredFor.get(path) ?? [];
  list.push(d);
  deferredFor.set(path, list);
  return d;
}

beforeEach(() => {
  counter = 0;
  deferredFor.clear();
  createSignedUrl.mockReset();
  createSignedUrl.mockImplementation((path: string) => nextDeferred(path).promise);
  clearAttachmentUrlCache();
});

afterEach(() => cleanup());

async function flush() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

function firstPending(path: string): Deferred {
  const list = deferredFor.get(path);
  if (!list || list.length === 0) throw new Error(`no pending fetch for ${path}`);
  return list.shift()!;
}

describe("CommentsPanel E2E — falha concorrente e ausência de cache corrompido", () => {
  it("N mounts simultâneos → 1 fetch; falha propaga sem envenenar cache; retry gera novo createSignedUrl", async () => {
    // 1) Monta N AttachmentItems em paralelo para o mesmo path.
    for (let i = 0; i < N; i++) {
      render(
        <AttachmentItem
          attachment={imgAttachment(`hot-${i}`)}
          canRemove={false}
          onRemove={() => {}}
        />,
      );
    }
    await flush();

    // Dedup: apesar de N mounts, só há UMA chamada a createSignedUrl.
    const initialCalls = createSignedUrl.mock.calls.filter(([p]) => p === HOT_PATH);
    expect(initialCalls).toHaveLength(1);
    expect(deferredFor.get(HOT_PATH)?.length).toBe(1);

    // 2) A tentativa única FALHA. Todos os N componentes devem ir para o estado
    //    de erro e nenhuma entrada corrompida deve ser gravada no cache.
    firstPending(HOT_PATH).resolve({
      data: null,
      error: { message: "assinatura expirada" },
    });
    await flush();

    const errors = screen.getAllByText("assinatura expirada");
    expect(errors).toHaveLength(N);
    const retries = screen.getAllByRole("button", { name: /tentar novamente/i });
    expect(retries).toHaveLength(N);
    // Nenhum <img> renderizado (não há signedUrl bem-sucedido).
    expect(screen.queryAllByAltText(/^hot-\d+\.png$/)).toHaveLength(0);

    // 3) Clicar em "Tentar novamente" em UM item deve disparar um NOVO
    //    createSignedUrl (cache não corrompido, sem entrada válida em cache).
    fireEvent.click(retries[0]);
    await flush();

    const secondCalls = createSignedUrl.mock.calls.filter(([p]) => p === HOT_PATH);
    expect(secondCalls).toHaveLength(2);
    // Nova promise pendente registrada.
    expect(deferredFor.get(HOT_PATH)?.length).toBe(1);

    // 4) Cliques concorrentes de "Tentar novamente" nos outros itens durante
    //    essa nova tentativa DEVEM ser deduplicados (mesmo inflight).
    for (let i = 1; i < N; i++) fireEvent.click(retries[i]);
    await flush();
    const afterConcurrentRetries = createSignedUrl.mock.calls.filter(([p]) => p === HOT_PATH);
    expect(afterConcurrentRetries).toHaveLength(2); // ainda 2, não 2+N-1
    expect(deferredFor.get(HOT_PATH)?.length).toBe(1);

    // 5) Segunda tentativa RESOLVE com sucesso — todos os itens exibem a
    //    mesma URL a partir do cache repopulado.
    firstPending(HOT_PATH).resolve({
      data: { signedUrl: `https://signed.test/${HOT_PATH}?v=${++counter}` },
      error: null,
    });
    await flush();

    const imgs = screen.getAllByAltText(/^hot-\d+\.png$/);
    expect(imgs).toHaveLength(N);
    const urls = new Set(imgs.map((el) => el.getAttribute("src")));
    expect(urls.size).toBe(1);
    const [sharedUrl] = urls;
    expect(sharedUrl).toMatch(/\?v=1$/);

    // 6) Sanidade: um mount NOVO subsequente reusa o cache repopulado (HIT).
    const callsAfterSuccess = createSignedUrl.mock.calls.filter(([p]) => p === HOT_PATH).length;
    render(
      <AttachmentItem
        attachment={imgAttachment("hot-late")}
        canRemove={false}
        onRemove={() => {}}
      />,
    );
    await flush();
    expect(createSignedUrl.mock.calls.filter(([p]) => p === HOT_PATH)).toHaveLength(
      callsAfterSuccess,
    );
    expect(screen.getByAltText("hot-late.png").getAttribute("src")).toBe(sharedUrl);
  });
});
