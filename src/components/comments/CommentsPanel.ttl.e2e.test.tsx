// @vitest-environment jsdom
//
// E2E de expiração: com fake timers instalados ANTES do import (o cache
// captura Date.now no momento da criação), garante que o signed-url-cache
// reutiliza a URL enquanto está fresca e dispara um novo createSignedUrl
// assim que o TTL (menos a margem de refresh) é ultrapassado.
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";

const createSignedUrl = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: (_b: string) => ({ createSignedUrl }) } },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

// Instala fake timers ANTES de importar o CommentsPanel — o cache captura
// Date.now na construção; se instalarmos depois, seguirá com o Date real.
vi.useFakeTimers();

type CP = typeof import("@/components/comments/CommentsPanel");
let AttachmentItem: CP["AttachmentItem"];
let clearAttachmentUrlCache: CP["clearAttachmentUrlCache"];

beforeAll(async () => {
  const mod = await import("@/components/comments/CommentsPanel");
  AttachmentItem = mod.AttachmentItem;
  clearAttachmentUrlCache = mod.clearAttachmentUrlCache;
});

afterAll(() => {
  vi.useRealTimers();
});

const IMG = {
  id: "att-img-ttl",
  comment_id: "c1",
  storage_path: "user/comments/c1/pic.png",
  file_name: "pic.png",
  mime_type: "image/png",
  size_bytes: 1234,
  uploaded_by: "u1",
};

// Constantes do CommentsPanel replicadas para clareza do teste.
const PREVIEW_TTL_MS = 3600 * 1000;
const REFRESH_MARGIN_MS = 30_000;

let counter = 0;

beforeEach(() => {
  counter = 0;
  createSignedUrl.mockReset();
  createSignedUrl.mockImplementation(async (path: string) => ({
    data: { signedUrl: `https://signed.test/${path}?v=${++counter}` },
    error: null,
  }));
  clearAttachmentUrlCache();
  (window.open as unknown) = vi.fn();
});

afterEach(() => {
  cleanup();
});

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
}


describe("CommentsPanel E2E — expiração do signed-url-cache", () => {
  it("dentro do TTL reutiliza; após TTL - margem, o clique em prévia gera novo createSignedUrl", async () => {
    const onRemove = vi.fn();

    // 1º render: preview auto-load dispara createSignedUrl uma vez.
    const { unmount } = render(
      <AttachmentItem attachment={IMG} canRemove onRemove={onRemove} />,
    );
    await flush();
    const img1 = screen.getByAltText("pic.png");
    const url1 = img1.getAttribute("src");
    expect(url1).toMatch(/\?v=1$/);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);

    // Avança bem menos que o TTL — cache continua fresco.
    await advance(PREVIEW_TTL_MS / 2);

    // Reabre o anexo ("clicar em preview" novamente): cache HIT, mesma URL.
    unmount();
    render(<AttachmentItem attachment={IMG} canRemove onRemove={onRemove} />);
    await flush();
    const img2 = screen.getByAltText("pic.png");
    expect(img2.getAttribute("src")).toBe(url1);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);

    // Avança para além de (TTL - margem) → entrada considerada stale.
    await advance(PREVIEW_TTL_MS - REFRESH_MARGIN_MS + 1_000);

    // Novo "click em preview" (re-mount): cache MISS → novo createSignedUrl.
    cleanup();
    render(<AttachmentItem attachment={IMG} canRemove onRemove={onRemove} />);
    await flush();
    const img3 = screen.getByAltText("pic.png");
    const url3 = img3.getAttribute("src");
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
    expect(url3).not.toBe(url1);
    expect(url3).toMatch(/\?v=2$/);

    // Após novo TTL, força um erro no próximo fetch e valida que o clique
    // explícito em "Tentar novamente" (preview) chama createSignedUrl.
    createSignedUrl.mockImplementationOnce(async () => ({
      data: null,
      error: { message: "boom" },
    }));
    await advance(PREVIEW_TTL_MS);
    cleanup();
    render(<AttachmentItem attachment={IMG} canRemove onRemove={onRemove} />);
    await flush();

    const retry = screen.getByRole("button", { name: /tentar novamente/i });
    expect(createSignedUrl).toHaveBeenCalledTimes(3);

    fireEvent.click(retry);
    await flush();
    expect(createSignedUrl).toHaveBeenCalledTimes(4);
    const img4 = screen.getByAltText("pic.png");
    expect(img4.getAttribute("src")).toMatch(/\?v=3$/);
    expect(img4.getAttribute("src")).not.toBe(url3);


  });
});
