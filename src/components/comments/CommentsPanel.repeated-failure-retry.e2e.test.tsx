// @vitest-environment jsdom
//
// E2E: falhas repetidas no MESMO path. Cada clique em "Tentar novamente"
// dispara um NOVO createSignedUrl (nenhuma resposta corrompida é cacheada).
// Só quando uma tentativa finalmente sucede o item passa a exibir a URL
// assinada; a partir daí, novos mounts são cache HIT.
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

const PATH = "repeat/x.png";
const SUCCESS_URL = "https://signed.test/repeat/x.png?v=finally";

const attachment = {
  id: "att-repeat",
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

describe("CommentsPanel E2E — retries repetidos até recuperar", () => {
  it("cada retry após falha gera novo createSignedUrl; sucesso final exibe a URL e passa a servir do cache", async () => {
    // Sequência: falha 1 → falha 2 → falha 3 → sucesso.
    const failures = [
      "erro #1: timeout",
      "erro #2: 500",
      "erro #3: token inválido",
    ];
    for (const msg of failures) queue.push({ data: null, error: { message: msg } });
    queue.push({ data: { signedUrl: SUCCESS_URL }, error: null });

    render(<AttachmentItem attachment={attachment} canRemove={false} onRemove={() => {}} />);
    await flush();

    // Primeira falha visível.
    expect(screen.getByText(failures[0])).toBeDefined();
    expect(screen.queryByAltText("x.png")).toBeNull();
    expect(createSignedUrl.mock.calls.filter(([p]) => p === PATH)).toHaveLength(1);

    // Clique 1 → falha #2.
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    await flush();
    expect(createSignedUrl.mock.calls.filter(([p]) => p === PATH)).toHaveLength(2);
    expect(screen.queryByText(failures[0])).toBeNull();
    expect(screen.getByText(failures[1])).toBeDefined();
    expect(screen.queryByAltText("x.png")).toBeNull();

    // Clique 2 → falha #3.
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    await flush();
    expect(createSignedUrl.mock.calls.filter(([p]) => p === PATH)).toHaveLength(3);
    expect(screen.getByText(failures[2])).toBeDefined();
    expect(screen.queryByAltText("x.png")).toBeNull();

    // Clique 3 → sucesso.
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    await flush();
    expect(createSignedUrl.mock.calls.filter(([p]) => p === PATH)).toHaveLength(4);

    // Erro/retry sumiram; <img> renderizado com a URL de sucesso.
    for (const msg of failures) expect(screen.queryByText(msg)).toBeNull();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).toBeNull();
    expect(screen.getByAltText("x.png").getAttribute("src")).toBe(SUCCESS_URL);

    // Mount subsequente: cache HIT, sem novas chamadas.
    const callsAfterSuccess = createSignedUrl.mock.calls.length;
    render(
      <AttachmentItem
        attachment={{ ...attachment, id: "att-late", file_name: "x-late.png" }}
        canRemove={false}
        onRemove={() => {}}
      />,
    );
    await flush();
    expect(createSignedUrl.mock.calls.length).toBe(callsAfterSuccess);
    expect(screen.getByAltText("x-late.png").getAttribute("src")).toBe(SUCCESS_URL);
  });
});
