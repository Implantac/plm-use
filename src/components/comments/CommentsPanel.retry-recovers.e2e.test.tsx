// @vitest-environment jsdom
//
// E2E: createSignedUrl falha uma vez para um anexo; ao clicar em
// "Tentar novamente", uma nova tentativa sucede e o item passa a exibir
// a URL assinada nova. O erro desaparece, o botão de retry some, e o
// <img> renderizado usa EXATAMENTE a URL do segundo fetch — não há
// reaproveitamento de dados corrompidos da tentativa que falhou.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

const createSignedUrl = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: (_b: string) => ({ createSignedUrl }) } },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { AttachmentItem, clearAttachmentUrlCache } from "@/components/comments/CommentsPanel";

const PATH = "recover/x.png";
const SUCCESS_URL = "https://signed.test/recover/x.png?v=recovered";

const attachment = {
  id: "att-1",
  comment_id: "c1",
  storage_path: PATH,
  file_name: "x.png",
  mime_type: "image/png",
  size_bytes: 100,
  uploaded_by: "u1",
};

type Res = { data: { signedUrl: string } | null; error: { message: string } | null };
const responses: Res[] = [];

beforeEach(() => {
  responses.length = 0;
  createSignedUrl.mockReset();
  createSignedUrl.mockImplementation(async (_path: string) => {
    if (responses.length === 0) throw new Error("no queued response");
    return responses.shift()!;
  });
  clearAttachmentUrlCache();
});

afterEach(() => cleanup());

async function flush() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

describe("CommentsPanel E2E — retry após falha recupera com nova URL", () => {
  it("falha inicial exibe erro; clique em 'Tentar novamente' obtém sucesso e renderiza a nova URL sem dados corrompidos", async () => {
    // 1) Enfileira falha, depois sucesso.
    responses.push({ data: null, error: { message: "falha temporária" } });
    responses.push({ data: { signedUrl: SUCCESS_URL }, error: null });

    render(<AttachmentItem attachment={attachment} canRemove={false} onRemove={() => {}} />);
    await flush();

    // 2) Estado de erro: mensagem visível, botão de retry, sem <img>.
    expect(screen.getByText("falha temporária")).toBeDefined();
    const retryBtn = screen.getByRole("button", { name: /tentar novamente/i });
    expect(retryBtn).toBeDefined();
    expect(screen.queryByAltText("x.png")).toBeNull();
    expect(createSignedUrl.mock.calls.filter(([p]) => p === PATH)).toHaveLength(1);

    // 3) Clica em "Tentar novamente" → segundo fetch resolve com sucesso.
    fireEvent.click(retryBtn);
    await flush();

    expect(createSignedUrl.mock.calls.filter(([p]) => p === PATH)).toHaveLength(2);

    // 4) Erro sumiu, botão de retry sumiu, <img> renderizado com a URL nova.
    expect(screen.queryByText("falha temporária")).toBeNull();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).toBeNull();

    const img = screen.getByAltText("x.png");
    expect(img.getAttribute("src")).toBe(SUCCESS_URL);

    // 5) Mount subsequente é cache HIT — reusa exatamente a URL de sucesso,
    //    sem nova chamada de createSignedUrl e sem contaminar com o erro.
    const callsAfterRecovery = createSignedUrl.mock.calls.length;
    render(
      <AttachmentItem
        attachment={{ ...attachment, id: "att-2", file_name: "x2.png" }}
        canRemove={false}
        onRemove={() => {}}
      />,
    );
    await flush();
    expect(createSignedUrl.mock.calls.length).toBe(callsAfterRecovery);
    expect(screen.getByAltText("x2.png").getAttribute("src")).toBe(SUCCESS_URL);
  });
});
