// @vitest-environment jsdom
//
// E2E de capacidade: satura o signed-url-cache (max=200 no preview cache),
// promove uma entrada específica e valida que a entrada MENOS recentemente
// usada é evictada — o clique em "preview" (auto-load do AttachmentItem)
// para essa entrada dispara um novo createSignedUrl, enquanto a entrada
// promovida permanece no cache e não gera nova assinatura.
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

// Deve refletir PREVIEW_CACHE_MAX em src/components/comments/CommentsPanel.tsx.
const PREVIEW_CACHE_MAX = 200;

const imgAttachment = (path: string, id = path) => ({
  id,
  comment_id: "c1",
  storage_path: path,
  file_name: `${id}.png`,
  mime_type: "image/png",
  size_bytes: 100,
  uploaded_by: "u1",
});

let counter = 0;

beforeEach(() => {
  counter = 0;
  createSignedUrl.mockReset();
  createSignedUrl.mockImplementation(async (path: string) => ({
    data: { signedUrl: `https://signed.test/${path}?v=${++counter}` },
    error: null,
  }));
  clearAttachmentUrlCache();
});

afterEach(() => cleanup());

async function flush() {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
}

describe("CommentsPanel E2E — política LRU do signed-url-cache", () => {
  it("evicta o menos recentemente usado quando excede a capacidade; preview do evictado gera novo fetch, o promovido continua em cache", async () => {
    // 1) Preenche o cache até a capacidade máxima com getPreviewUrl.
    for (let i = 0; i < PREVIEW_CACHE_MAX; i++) {
      await getPreviewUrl(`bulk/${i}.png`);
    }
    expect(createSignedUrl).toHaveBeenCalledTimes(PREVIEW_CACHE_MAX);

    // 2) Promove `bulk/0.png` (mais antigo) para MRU acessando-o novamente.
    //    Agora o mais antigo passa a ser `bulk/1.png`.
    const url0Initial = await getPreviewUrl("bulk/0.png");
    expect(createSignedUrl).toHaveBeenCalledTimes(PREVIEW_CACHE_MAX); // HIT

    // 3) Insere UMA nova entrada além da capacidade → evicta `bulk/1.png`.
    await getPreviewUrl("bulk/new.png");
    expect(createSignedUrl).toHaveBeenCalledTimes(PREVIEW_CACHE_MAX + 1);

    const callsBeforeUI = createSignedUrl.mock.calls.length;

    // 4) "Clique em preview" no anexo EVICTADO (bulk/1.png) — o AttachmentItem
    //    dispara getPreviewUrl no mount; cache MISS → novo createSignedUrl.
    render(<AttachmentItem attachment={imgAttachment("bulk/1.png", "evicted")} canRemove={false} onRemove={() => {}} />);
    await flush();

    const evictedImg = screen.getByAltText("evicted.png");
    const evictedUrl = evictedImg.getAttribute("src");
    expect(createSignedUrl).toHaveBeenCalledTimes(callsBeforeUI + 1);
    expect(createSignedUrl).toHaveBeenLastCalledWith("bulk/1.png", 3600);
    expect(evictedUrl).toMatch(/^https:\/\/signed\.test\/bulk\/1\.png\?v=\d+$/);

    // 5) "Clique em preview" no anexo PROMOVIDO (bulk/0.png) — permanece em
    //    cache; nenhum novo createSignedUrl é chamado e a URL é a mesma.
    cleanup();
    render(<AttachmentItem attachment={imgAttachment("bulk/0.png", "promoted")} canRemove={false} onRemove={() => {}} />);
    await flush();

    const promotedImg = screen.getByAltText("promoted.png");
    expect(promotedImg.getAttribute("src")).toBe(url0Initial);
    expect(createSignedUrl).toHaveBeenCalledTimes(callsBeforeUI + 1);
  });
});
