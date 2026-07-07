// @vitest-environment jsdom
//
// E2E: após uma falha inicial, múltiplos cliques RÁPIDOS em "Tentar novamente"
// no mesmo item (enquanto a nova tentativa ainda está em voo) devem disparar
// exatamente 1 novo createSignedUrl — os cliques subsequentes caem no mesmo
// inflight. Só depois que a URL assinada resolve o item passa a exibi-la.
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

const PATH = "rapid/x.png";
const SUCCESS_URL = "https://signed.test/rapid/x.png?v=ok";

const attachment = {
  id: "att-rapid",
  comment_id: "c1",
  storage_path: PATH,
  file_name: "x.png",
  mime_type: "image/png",
  size_bytes: 100,
  uploaded_by: "u1",
};

type Res = { data: { signedUrl: string } | null; error: { message: string } | null };
type Deferred = { promise: Promise<Res>; resolve: (v: Res) => void };
const pending: Deferred[] = [];

function nextDeferred(): Deferred {
  let resolve!: Deferred["resolve"];
  const promise = new Promise<Res>((r) => (resolve = r));
  const d = { promise, resolve };
  pending.push(d);
  return d;
}

beforeEach(() => {
  pending.length = 0;
  createSignedUrl.mockReset();
  createSignedUrl.mockImplementation((_p: string) => nextDeferred().promise);
  clearAttachmentUrlCache();
});

afterEach(() => cleanup());

async function flush() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

describe("CommentsPanel E2E — cliques rápidos em 'Tentar novamente'", () => {
  it("cliques rápidos consecutivos durante inflight geram apenas 1 novo createSignedUrl até a URL sair", async () => {
    render(<AttachmentItem attachment={attachment} canRemove={false} onRemove={() => {}} />);
    await flush();

    // 1) 1ª tentativa em voo — resolve como falha.
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
    pending.shift()!.resolve({ data: null, error: { message: "falha inicial" } });
    await flush();

    expect(screen.getByText("falha inicial")).toBeDefined();
    const callsBefore = createSignedUrl.mock.calls.length;

    // 2) 5 cliques RÁPIDOS em "Tentar novamente" sem flush entre eles.
    //    Apenas o 1º cria um novo inflight; os demais caem no mesmo dedup.
    act(() => {
      const btn = screen.getByRole("button", { name: /tentar novamente/i });
      for (let i = 0; i < 5; i++) fireEvent.click(btn);
    });
    await flush();

    expect(createSignedUrl.mock.calls.length - callsBefore).toBe(1);
    expect(pending.length).toBe(1);

    // 3) Mais 3 cliques ainda durante o inflight — ainda 0 novas chamadas.
    act(() => {
      const btn = screen.queryByRole("button", { name: /tentar novamente/i });
      if (btn) for (let i = 0; i < 3; i++) fireEvent.click(btn);
    });
    await flush();
    expect(createSignedUrl.mock.calls.length - callsBefore).toBe(1);
    expect(pending.length).toBe(1);

    // 4) Resolve com sucesso — item passa a exibir a URL assinada.
    pending.shift()!.resolve({ data: { signedUrl: SUCCESS_URL }, error: null });
    await flush();

    expect(screen.queryByText("falha inicial")).toBeNull();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).toBeNull();
    expect(screen.getByAltText("x.png").getAttribute("src")).toBe(SUCCESS_URL);
  });
});
