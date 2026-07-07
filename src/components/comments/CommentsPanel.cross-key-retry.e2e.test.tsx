// @vitest-environment jsdom
//
// E2E: dois anexos DISTINTOS falham a prévia. Cliques SIMULTÂNEOS em
// "Tentar novamente" em itens de paths diferentes NÃO devem compartilhar
// o mesmo inflight — cada path gera seu próprio createSignedUrl com URL
// distinta. Deduplicação é POR chave, nunca cross-key.
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

const PATH_A = "shared/a.png";
const PATH_B = "shared/b.png";

const img = (path: string, id: string) => ({
  id,
  comment_id: "c1",
  storage_path: path,
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
  createSignedUrl.mockImplementation((p: string) => nextDeferred(p).promise);
  clearAttachmentUrlCache();
});

afterEach(() => cleanup());

async function flush() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

describe("CommentsPanel E2E — retries concorrentes em paths distintos", () => {
  it("cada path gera seu próprio createSignedUrl (sem cross-key dedup) e URLs distintas", async () => {
    // 1) Renderiza 1 item para path A e 1 item para path B.
    render(<AttachmentItem attachment={img(PATH_A, "a")} canRemove={false} onRemove={() => {}} />);
    render(<AttachmentItem attachment={img(PATH_B, "b")} canRemove={false} onRemove={() => {}} />);
    await flush();

    // Dois fetches distintos foram registrados (1 por path).
    expect(createSignedUrl.mock.calls.filter(([p]) => p === PATH_A)).toHaveLength(1);
    expect(createSignedUrl.mock.calls.filter(([p]) => p === PATH_B)).toHaveLength(1);

    // 2) Ambos falham → cada item mostra seu botão "Tentar novamente".
    popPending(PATH_A).resolve({ data: null, error: { message: "erro A" } });
    popPending(PATH_B).resolve({ data: null, error: { message: "erro B" } });
    await flush();

    expect(screen.getByText("erro A")).toBeDefined();
    expect(screen.getByText("erro B")).toBeDefined();
    const retries = screen.getAllByRole("button", { name: /tentar novamente/i });
    expect(retries).toHaveLength(2);

    const callsBefore = createSignedUrl.mock.calls.length;

    // 3) Cliques SIMULTÂNEOS em ambos os retries — cada path deve iniciar
    //    seu próprio inflight (sem compartilhar tentativa).
    act(() => {
      for (const btn of retries) fireEvent.click(btn);
    });
    await flush();

    expect(createSignedUrl.mock.calls.length - callsBefore).toBe(2);
    expect(createSignedUrl.mock.calls.filter(([p]) => p === PATH_A)).toHaveLength(2);
    expect(createSignedUrl.mock.calls.filter(([p]) => p === PATH_B)).toHaveLength(2);
    expect(queue.get(PATH_A)?.length).toBe(1);
    expect(queue.get(PATH_B)?.length).toBe(1);

    // 4) Resolve cada path com uma URL diferente — cada item exibe a URL do
    //    SEU próprio path, sem cross-contamination.
    popPending(PATH_A).resolve({
      data: { signedUrl: `https://signed.test/${PATH_A}?v=${++counter}` },
      error: null,
    });
    popPending(PATH_B).resolve({
      data: { signedUrl: `https://signed.test/${PATH_B}?v=${++counter}` },
      error: null,
    });
    await flush();

    const imgA = screen.getByAltText("a.png");
    const imgB = screen.getByAltText("b.png");
    expect(imgA.getAttribute("src")).toMatch(new RegExp(`^https://signed\\.test/${PATH_A}\\?v=1$`));
    expect(imgB.getAttribute("src")).toMatch(new RegExp(`^https://signed\\.test/${PATH_B}\\?v=2$`));
    expect(imgA.getAttribute("src")).not.toBe(imgB.getAttribute("src"));

    const urlA = imgA.getAttribute("src");
    const urlB = imgB.getAttribute("src");
    const callsAfterSuccess = createSignedUrl.mock.calls.length;

    // 5) Novo mount para cada path DEVE ser cache HIT — nenhum createSignedUrl
    //    adicional é chamado e a URL reutilizada é EXATAMENTE a mesma.
    render(<AttachmentItem attachment={img(PATH_A, "a2")} canRemove={false} onRemove={() => {}} />);
    render(<AttachmentItem attachment={img(PATH_B, "b2")} canRemove={false} onRemove={() => {}} />);
    await flush();

    expect(createSignedUrl.mock.calls.length).toBe(callsAfterSuccess);
    expect(queue.get(PATH_A)?.length ?? 0).toBe(0);
    expect(queue.get(PATH_B)?.length ?? 0).toBe(0);

    expect(screen.getByAltText("a2.png").getAttribute("src")).toBe(urlA);
    expect(screen.getByAltText("b2.png").getAttribute("src")).toBe(urlB);
  });
});

