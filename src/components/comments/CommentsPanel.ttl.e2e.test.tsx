// @vitest-environment jsdom
//
// E2E de expiração: com fake timers, garante que o signed-url-cache reutiliza
// a URL enquanto está fresca e dispara um novo createSignedUrl assim que o
// TTL (menos a margem de refresh) é ultrapassado.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";

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
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("CommentsPanel E2E — expiração do signed-url-cache", () => {
  it("dentro do TTL reutiliza; após TTL - margem, o clique em prévia gera novo createSignedUrl", async () => {
    const onRemove = vi.fn();

    // 1º render: preview auto-load dispara createSignedUrl uma vez.
    const { unmount } = render(
      <AttachmentItem attachment={IMG} canRemove onRemove={onRemove} />,
    );
    const img1 = await screen.findByAltText("pic.png");
    const url1 = img1.getAttribute("src");
    expect(url1).toMatch(/\?v=1$/);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);

    // Avança um tempo bem menor que o TTL — cache continua fresco.
    await advance(PREVIEW_TTL_MS / 2);

    // Reabre o anexo (equivalente a "clicar em preview" novamente):
    // useEffect chama getPreviewUrl → cache HIT, mesma URL, sem novo fetch.
    unmount();
    render(<AttachmentItem attachment={IMG} canRemove onRemove={onRemove} />);
    const img2 = await screen.findByAltText("pic.png");
    expect(img2.getAttribute("src")).toBe(url1);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);

    // Avança para além do (TTL - margem de refresh) → entrada considerada stale.
    await advance(PREVIEW_TTL_MS - REFRESH_MARGIN_MS + 1_000);

    // Novo "click em preview" (re-mount): cache MISS → novo createSignedUrl.
    cleanup();
    render(<AttachmentItem attachment={IMG} canRemove onRemove={onRemove} />);
    const img3 = await screen.findByAltText("pic.png");
    const url3 = img3.getAttribute("src");
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
    expect(url3).not.toBe(url1);
    expect(url3).toMatch(/\?v=2$/);

    // A URL renovada é reutilizada imediatamente em novos acessos (ex.: download
    // via retry de prévia). Aqui exercitamos o botão "Tentar novamente" após
    // forçar um erro para provar que o clique em preview passa pelo cache.
    createSignedUrl.mockImplementationOnce(async () => ({
      data: null,
      error: { message: "boom" },
    }));

    // Avança novamente para invalidar → force nova busca que agora falha.
    await advance(PREVIEW_TTL_MS);
    cleanup();
    render(<AttachmentItem attachment={IMG} canRemove onRemove={onRemove} />);

    const retry = await screen.findByRole("button", { name: /tentar novamente/i });
    expect(createSignedUrl).toHaveBeenCalledTimes(3);

    // Clique em "Tentar novamente" = clique explícito em preview → novo fetch bem-sucedido.
    fireEvent.click(retry);
    await waitFor(() => expect(createSignedUrl).toHaveBeenCalledTimes(4));
    const img4 = await screen.findByAltText("pic.png");
    expect(img4.getAttribute("src")).toMatch(/\?v=4$/);
  });
});
