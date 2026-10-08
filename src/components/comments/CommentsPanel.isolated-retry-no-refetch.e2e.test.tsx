// @vitest-environment jsdom
//
// E2E: um item com falha convive com vários itens que já exibem URL
// assinada com sucesso. Ao clicar em "Tentar novamente" no item com
// falha, APENAS o path daquele item dispara nova chamada de
// createSignedUrl — os demais paths não são refeitos e seguem exibindo
// suas URLs originais.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

const createSignedUrl = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: (_b: string) => ({ createSignedUrl }) } },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { AttachmentItem, clearAttachmentUrlCache } from "@/components/comments/CommentsPanel";

const FAIL_PATH = "iso/fail.png";
const OK_PATHS = ["iso/ok-1.png", "iso/ok-2.png", "iso/ok-3.png"];
const OK_URLS = Object.fromEntries(
  OK_PATHS.map((p, i) => [p, `https://signed.test/${p}?v=${i + 1}`]),
) as Record<string, string>;
const FAIL_RETRY_URL = "https://signed.test/iso/fail.png?v=retry";

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

describe("CommentsPanel E2E — retry isolado não afeta outros items OK", () => {
  it("clicar em 'Tentar novamente' no item com falha não dispara createSignedUrl para os demais paths", async () => {
    // Enfileira: FAIL_PATH falha, OK_PATHS resolvem com URLs distintas.
    push(FAIL_PATH, { data: null, error: { message: "falha isolada" } });
    for (const p of OK_PATHS) push(p, { data: { signedUrl: OK_URLS[p] }, error: null });

    // Renderiza 1 item com falha + 3 itens OK.
    render(
      <AttachmentItem
        attachment={att(FAIL_PATH, "fail", "fail.png")}
        canRemove={false}
        onRemove={() => {}}
      />,
    );
    OK_PATHS.forEach((p, i) =>
      render(
        <AttachmentItem
          attachment={att(p, `ok-${i}`, `ok-${i + 1}.png`)}
          canRemove={false}
          onRemove={() => {}}
        />,
      ),
    );
    await flush();

    // Estado inicial: 1 chamada por path (fail + 3 ok).
    expect(createSignedUrl.mock.calls.filter(([p]) => p === FAIL_PATH)).toHaveLength(1);
    for (const p of OK_PATHS) {
      expect(createSignedUrl.mock.calls.filter(([q]) => q === p)).toHaveLength(1);
    }
    expect(screen.getByText("falha isolada")).toBeDefined();
    for (let i = 0; i < OK_PATHS.length; i++) {
      expect(screen.getByAltText(`ok-${i + 1}.png`).getAttribute("src")).toBe(OK_URLS[OK_PATHS[i]]);
    }

    // Só o item com falha exibe retry.
    const retries = screen.getAllByRole("button", { name: /tentar novamente/i });
    expect(retries).toHaveLength(1);

    // Enfileira sucesso para o retry e clica.
    push(FAIL_PATH, { data: { signedUrl: FAIL_RETRY_URL }, error: null });
    const callsBefore = createSignedUrl.mock.calls.length;
    fireEvent.click(retries[0]);
    await flush();

    // Apenas FAIL_PATH refez a chamada; nenhum OK_PATHS foi refeito.
    const delta = createSignedUrl.mock.calls.slice(callsBefore);
    expect(delta).toHaveLength(1);
    expect(delta[0][0]).toBe(FAIL_PATH);
    for (const p of OK_PATHS) {
      expect(createSignedUrl.mock.calls.filter(([q]) => q === p)).toHaveLength(1);
    }

    // Estado final: item que falhou agora exibe a nova URL; OK inalterados.
    expect(screen.queryByText("falha isolada")).toBeNull();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).toBeNull();
    expect(screen.getByAltText("fail.png").getAttribute("src")).toBe(FAIL_RETRY_URL);
    for (let i = 0; i < OK_PATHS.length; i++) {
      expect(screen.getByAltText(`ok-${i + 1}.png`).getAttribute("src")).toBe(OK_URLS[OK_PATHS[i]]);
    }
  });
});
