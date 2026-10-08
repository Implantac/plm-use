// @vitest-environment jsdom
//
// E2E: após uma falha inicial seguida de sucesso no "Tentar novamente",
// o botão "Tentar novamente" desaparece e o item passa a servir a URL
// assinada do cache. Novos mounts do mesmo path NÃO disparam novas chamadas
// de createSignedUrl (cache HIT), e como o botão de retry não existe mais,
// não há como o usuário forçar novas chamadas para o mesmo item.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

const createSignedUrl = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: (_b: string) => ({ createSignedUrl }) } },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { AttachmentItem, clearAttachmentUrlCache } from "@/components/comments/CommentsPanel";

const PATH = "post-success/x.png";
const SUCCESS_URL = "https://signed.test/post-success/x.png?v=ok";

const attachment = {
  id: "att-ps",
  comment_id: "c1",
  storage_path: PATH,
  file_name: "x.png",
  mime_type: "image/png",
  size_bytes: 100,
  uploaded_by: "u1",
};

type Res = { data: { signedUrl: string } | null; error: { message: string } | null };
const queue: Res[] = [];

beforeEach(() => {
  queue.length = 0;
  createSignedUrl.mockReset();
  createSignedUrl.mockImplementation(async (_p: string) => {
    if (!queue.length) throw new Error("no queued response");
    return queue.shift()!;
  });
  clearAttachmentUrlCache();
});

afterEach(() => cleanup());

async function flush() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

describe("CommentsPanel E2E — pós-sucesso não gera novas chamadas", () => {
  it("após retry bem-sucedido, o botão some e novos mounts do mesmo path servem do cache sem novas chamadas", async () => {
    queue.push({ data: null, error: { message: "falha inicial" } });
    queue.push({ data: { signedUrl: SUCCESS_URL }, error: null });

    render(<AttachmentItem attachment={attachment} canRemove={false} onRemove={() => {}} />);
    await flush();

    // 1) Falha inicial visível — 1 chamada.
    expect(screen.getByText("falha inicial")).toBeDefined();
    expect(createSignedUrl.mock.calls.filter(([p]) => p === PATH)).toHaveLength(1);

    // 2) Clique em "Tentar novamente" → sucesso.
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    await flush();

    expect(createSignedUrl.mock.calls.filter(([p]) => p === PATH)).toHaveLength(2);
    expect(screen.queryByText("falha inicial")).toBeNull();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).toBeNull();
    expect(screen.getByAltText("x.png").getAttribute("src")).toBe(SUCCESS_URL);

    const callsAfterSuccess = createSignedUrl.mock.calls.length;

    // 3) Como o botão sumiu, não há como clicar de novo neste item.
    //    Qualquer tentativa de interação re-renderizando o mesmo componente
    //    não deve disparar novas chamadas — o cache serve a URL.
    for (let i = 0; i < 5; i++) {
      const btn = screen.queryByRole("button", { name: /tentar novamente/i });
      expect(btn).toBeNull();
    }
    await flush();
    expect(createSignedUrl.mock.calls.length).toBe(callsAfterSuccess);

    // 4) Novos mounts do MESMO path (outros ids/filenames) — cache HIT.
    for (let i = 0; i < 3; i++) {
      render(
        <AttachmentItem
          attachment={{ ...attachment, id: `late-${i}`, file_name: `late-${i}.png` }}
          canRemove={false}
          onRemove={() => {}}
        />,
      );
    }
    await flush();

    expect(createSignedUrl.mock.calls.length).toBe(callsAfterSuccess);
    for (let i = 0; i < 3; i++) {
      expect(screen.getByAltText(`late-${i}.png`).getAttribute("src")).toBe(SUCCESS_URL);
    }
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).toBeNull();
  });
});
