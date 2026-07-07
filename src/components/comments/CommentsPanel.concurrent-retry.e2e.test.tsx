// @vitest-environment jsdom
//
// E2E focado: após uma falha inicial de prévia, cliques SIMULTÂNEOS em
// "Tentar novamente" em vários itens do MESMO storage_path devem compartilhar
// uma única nova tentativa (inflight dedup) — apenas 1 novo createSignedUrl,
// e todos os itens recebem a mesma URL ao final.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

const createSignedUrl = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: (_b: string) => ({ createSignedUrl }) } },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import {
  AttachmentItem,
  clearAttachmentUrlCache,
} from "@/components/comments/CommentsPanel";

const HOT_PATH = "shared/retry.png";
const N = 5;

const imgAttachment = (id: string) => ({
  id,
  comment_id: "c1",
  storage_path: HOT_PATH,
  file_name: `${id}.png`,
  mime_type: "image/png",
  size_bytes: 100,
  uploaded_by: "u1",
});

type Res = { data: { signedUrl: string } | null; error: { message: string } | null };
type Deferred = { promise: Promise<Res>; resolve: (v: Res) => void };
const queue = new Map<string, Deferred[]>();
let counter = 0;

function nextDeferred(path: string): Deferred {
  let resolve!: Deferred["resolve"];
  const promise = new Promise<Res>((r) => (resolve = r));
  const d = { promise, resolve };
  (queue.get(path) ?? queue.set(path, []).get(path)!).push(d);
  return d;
}

function popPending(path: string): Deferred {
  const list = queue.get(path);
  if (!list?.length) throw new Error(`no pending for ${path}`);
  return list.shift()!;
}

beforeEach(() => {
  counter = 0;
  queue.clear();
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

describe("CommentsPanel E2E — retries concorrentes compartilham 1 fetch", () => {
  it("N cliques simultâneos em 'Tentar novamente' após falha geram exatamente 1 novo createSignedUrl", async () => {
    // 1) Monta N itens do mesmo path — 1 fetch inflight por dedup.
    for (let i = 0; i < N; i++) {
      render(
        <AttachmentItem
          attachment={imgAttachment(`x-${i}`)}
          canRemove={false}
          onRemove={() => {}}
        />,
      );
    }
    await flush();
    expect(createSignedUrl.mock.calls.filter(([p]) => p === HOT_PATH)).toHaveLength(1);

    // 2) Primeira tentativa falha → todos os N itens exibem "Tentar novamente".
    popPending(HOT_PATH).resolve({ data: null, error: { message: "falha assinatura" } });
    await flush();

    const retryButtons = screen.getAllByRole("button", { name: /tentar novamente/i });
    expect(retryButtons).toHaveLength(N);
    expect(queue.get(HOT_PATH)?.length ?? 0).toBe(0);

    const callsBeforeRetry = createSignedUrl.mock.calls.filter(
      ([p]) => p === HOT_PATH,
    ).length;

    // 3) N cliques SIMULTÂNEOS em "Tentar novamente" (sem flush entre eles).
    //    Todos devem cair no mesmo inflight — 1 único novo createSignedUrl.
    act(() => {
      for (const btn of retryButtons) fireEvent.click(btn);
    });
    await flush();

    const callsAfterRetry = createSignedUrl.mock.calls.filter(
      ([p]) => p === HOT_PATH,
    ).length;
    expect(callsAfterRetry - callsBeforeRetry).toBe(1);
    expect(queue.get(HOT_PATH)?.length).toBe(1); // apenas 1 inflight pendente

    // 4) Resolve a tentativa única com sucesso → todos os N itens exibem a
    //    MESMA URL.
    popPending(HOT_PATH).resolve({
      data: { signedUrl: `https://signed.test/${HOT_PATH}?v=${++counter}` },
      error: null,
    });
    await flush();

    const imgs = screen.getAllByAltText(/^x-\d+\.png$/);
    expect(imgs).toHaveLength(N);
    const urls = new Set(imgs.map((el) => el.getAttribute("src")));
    expect(urls.size).toBe(1);
    expect([...urls][0]).toMatch(/\?v=1$/);
  });
});
