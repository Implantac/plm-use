// @vitest-environment jsdom
//
// E2E: dois anexos com paths distintos (A e B). Apenas A falha; B tem
// sucesso na primeira tentativa. Ao clicar em "Tentar novamente" em A,
// SOMENTE A dispara um novo createSignedUrl — B não é refeito e continua
// exibindo sua URL original a partir do cache.
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

const PATH_A = "solo/a.png";
const PATH_B = "solo/b.png";
const URL_B_FIRST = "https://signed.test/solo/b.png?v=b1";
const URL_A_RETRY = "https://signed.test/solo/a.png?v=a-retry";

const att = (path: string, id: string, name: string) => ({
  id,
  comment_id: "c1",
  storage_path: path,
  file_name: name,
  mime_type: "image/png",
  size_bytes: 100,
  uploaded_by: "u1",
});

type Res = { data: { signedUrl: string } | null; error: { message: string } | null };
const queued = new Map<string, Res[]>();
function push(path: string, r: Res) {
  const l = queued.get(path) ?? [];
  l.push(r);
  queued.set(path, l);
}

beforeEach(() => {
  queued.clear();
  createSignedUrl.mockReset();
  createSignedUrl.mockImplementation(async (p: string) => {
    const l = queued.get(p);
    if (!l?.length) throw new Error(`no queued response for ${p}`);
    return l.shift()!;
  });
  clearAttachmentUrlCache();
});

afterEach(() => cleanup());

async function flush() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

describe("CommentsPanel E2E — retry isolado por path", () => {
  it("apenas o path que falhou refaz createSignedUrl no retry; o outro path não é refeito", async () => {
    // 1) A falha, B tem sucesso.
    push(PATH_A, { data: null, error: { message: "falha só em A" } });
    push(PATH_B, { data: { signedUrl: URL_B_FIRST }, error: null });

    render(<AttachmentItem attachment={att(PATH_A, "a", "a.png")} canRemove={false} onRemove={() => {}} />);
    render(<AttachmentItem attachment={att(PATH_B, "b", "b.png")} canRemove={false} onRemove={() => {}} />);
    await flush();

    // Estado inicial: 1 chamada por path.
    expect(createSignedUrl.mock.calls.filter(([p]) => p === PATH_A)).toHaveLength(1);
    expect(createSignedUrl.mock.calls.filter(([p]) => p === PATH_B)).toHaveLength(1);
    expect(screen.getByText("falha só em A")).toBeDefined();
    expect(screen.getByAltText("b.png").getAttribute("src")).toBe(URL_B_FIRST);
    const retries = screen.getAllByRole("button", { name: /tentar novamente/i });
    expect(retries).toHaveLength(1); // só A mostra retry

    // 2) Enfileira sucesso para A e clica APENAS no retry de A.
    push(PATH_A, { data: { signedUrl: URL_A_RETRY }, error: null });
    fireEvent.click(retries[0]);
    await flush();

    // 3) Apenas A refez a chamada; B não foi refeito.
    expect(createSignedUrl.mock.calls.filter(([p]) => p === PATH_A)).toHaveLength(2);
    expect(createSignedUrl.mock.calls.filter(([p]) => p === PATH_B)).toHaveLength(1);

    // 4) A agora renderiza a nova URL; B continua com a URL original.
    expect(screen.queryByText("falha só em A")).toBeNull();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).toBeNull();
    expect(screen.getByAltText("a.png").getAttribute("src")).toBe(URL_A_RETRY);
    expect(screen.getByAltText("b.png").getAttribute("src")).toBe(URL_B_FIRST);
  });
});
