// @vitest-environment jsdom
//
// "E2E" de UI: renderiza AttachmentItem de verdade, clica em prévia e download,
// e valida que o signed-url-cache é reutilizado entre as ações e invalidado
// corretamente quando o anexo é removido pelo callback do painel.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";

const createSignedUrl = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: { from: (_b: string) => ({ createSignedUrl }) },
  },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

// Import after mocks so caches wire to the mocked client.
import { AttachmentItem, clearAttachmentUrlCache } from "@/components/comments/CommentsPanel";

const IMG = {
  id: "att-img-1",
  comment_id: "c1",
  storage_path: "user/comments/c1/pic.png",
  file_name: "pic.png",
  mime_type: "image/png",
  size_bytes: 1234,
  uploaded_by: "u1",
};

const PDF = {
  id: "att-pdf-1",
  comment_id: "c1",
  storage_path: "user/comments/c1/doc.pdf",
  file_name: "doc.pdf",
  mime_type: "application/pdf",
  size_bytes: 4321,
  uploaded_by: "u1",
};

let counter = 0;

beforeEach(() => {
  counter = 0;
  createSignedUrl.mockReset();
  createSignedUrl.mockImplementation(async (path: string) => ({
    data: { signedUrl: `https://signed.test/${path}?v=${++counter}` },
    error: null,
  }));
  clearAttachmentUrlCache();
  // Stub window.open so o clique de download não abre janela real.
  (window.open as unknown) = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("CommentsPanel E2E (prévia + download reutilizam signed-url-cache)", () => {
  it("clicar em prévia (auto-load) e depois em download reusa a URL sem novo fetch de prévia; remover invalida cache", async () => {
    const onRemove = vi.fn();

    const { unmount } = render(<AttachmentItem attachment={IMG} canRemove onRemove={onRemove} />);

    // Prévia carrega automaticamente para imagens (useEffect).
    const img = await screen.findByAltText("pic.png");
    const firstPreviewUrl = img.getAttribute("src");
    expect(firstPreviewUrl).toMatch(/^https:\/\/signed\.test\//);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
    expect(createSignedUrl).toHaveBeenNthCalledWith(1, IMG.storage_path, 3600);

    // Clique em download → gera nova signed URL (download tem key própria).
    fireEvent.click(screen.getByLabelText("Baixar anexo"));
    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(1));
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
    expect(createSignedUrl).toHaveBeenNthCalledWith(2, IMG.storage_path, 60, {
      download: "pic.png",
    });
    const firstDownloadUrl = (window.open as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;

    // Segundo clique em download → reutiliza cache, nenhum novo fetch.
    fireEvent.click(screen.getByLabelText("Baixar anexo"));
    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(2));
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
    expect((window.open as unknown as ReturnType<typeof vi.fn>).mock.calls[1][0]).toBe(
      firstDownloadUrl,
    );

    // Remontagem do item (ex.: re-render após scroll/paginação) reusa prévia do cache.
    unmount();
    render(<AttachmentItem attachment={IMG} canRemove onRemove={onRemove} />);
    const img2 = await screen.findByAltText("pic.png");
    expect(img2.getAttribute("src")).toBe(firstPreviewUrl);
    expect(createSignedUrl).toHaveBeenCalledTimes(2);

    // Simula o fluxo do CommentsPanel.removeAttachment: após deletar o anexo,
    // o painel chama clearAttachmentUrlCache(storage_path). Nova prévia/download
    // devem gerar URLs novas (cache invalidado).
    clearAttachmentUrlCache(IMG.storage_path);
    await flush();

    cleanup();
    render(<AttachmentItem attachment={IMG} canRemove onRemove={onRemove} />);
    const img3 = await screen.findByAltText("pic.png");
    expect(img3.getAttribute("src")).not.toBe(firstPreviewUrl);
    expect(createSignedUrl).toHaveBeenCalledTimes(3);

    fireEvent.click(screen.getByLabelText("Baixar anexo"));
    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(3));
    const thirdDownloadUrl = (window.open as unknown as ReturnType<typeof vi.fn>).mock
      .calls[2][0] as string;
    expect(thirdDownloadUrl).not.toBe(firstDownloadUrl);
    expect(createSignedUrl).toHaveBeenCalledTimes(4);
  });

  it("invalidar um anexo não afeta o cache de outros anexos exibidos no painel", async () => {
    const onRemove = vi.fn();

    // Renderiza dois anexos distintos (imagem + pdf).
    render(<AttachmentItem attachment={IMG} canRemove onRemove={onRemove} />);
    render(<AttachmentItem attachment={PDF} canRemove onRemove={onRemove} />);

    const img = await screen.findByAltText("pic.png");
    const pdfFrame = await screen.findByTitle("doc.pdf");
    const pdfUrlInitial = (pdfFrame.getAttribute("src") ?? "").split("#")[0];
    const imgUrlInitial = img.getAttribute("src");
    expect(createSignedUrl).toHaveBeenCalledTimes(2);

    // Painel remove APENAS o PDF → chama clearAttachmentUrlCache(pdf.storage_path).
    clearAttachmentUrlCache(PDF.storage_path);
    await flush();

    // Re-render da imagem: prévia continua vindo do cache (sem novo fetch).
    cleanup();
    render(<AttachmentItem attachment={IMG} canRemove onRemove={onRemove} />);
    const imgAgain = await screen.findByAltText("pic.png");
    expect(imgAgain.getAttribute("src")).toBe(imgUrlInitial);
    expect(createSignedUrl).toHaveBeenCalledTimes(2);

    // Re-render do PDF: cache invalidado → nova URL assinada.
    render(<AttachmentItem attachment={PDF} canRemove onRemove={onRemove} />);
    const pdfAgain = await screen.findByTitle("doc.pdf");
    const pdfUrlAfter = (pdfAgain.getAttribute("src") ?? "").split("#")[0];
    expect(pdfUrlAfter).not.toBe(pdfUrlInitial);
    expect(createSignedUrl).toHaveBeenCalledTimes(3);
  });
});
