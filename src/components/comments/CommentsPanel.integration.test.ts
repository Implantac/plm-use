import { describe, it, expect, vi, beforeEach } from "vitest";

// Track calls into supabase.storage.createSignedUrl across the whole module.
const createSignedUrl = vi.fn();

vi.mock("@/integrations/supabase/client", () => {
  const storage = {
    from: (_bucket: string) => ({
      createSignedUrl,
    }),
  };
  return { supabase: { storage } };
});

// Silence other imports that CommentsPanel pulls in transitively.
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

// Import AFTER mocks so the module wires cache instances to the mocked client.
import {
  getPreviewUrl,
  getDownloadUrl,
  clearAttachmentUrlCache,
} from "@/components/comments/CommentsPanel";

let counter = 0;

beforeEach(() => {
  counter = 0;
  createSignedUrl.mockReset();
  createSignedUrl.mockImplementation(async (path: string) => ({
    data: { signedUrl: `https://signed/${path}?v=${++counter}` },
    error: null,
  }));
  clearAttachmentUrlCache();
});

describe("CommentsPanel ↔ signed-url-cache integration", () => {
  it("reutiliza a URL de prévia entre chamadas consecutivas", async () => {
    const a = await getPreviewUrl("images/1.png");
    const b = await getPreviewUrl("images/1.png");
    expect(a).toBe(b);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it("dedupa prévias concorrentes para o mesmo caminho", async () => {
    const [a, b, c] = await Promise.all([
      getPreviewUrl("images/2.png"),
      getPreviewUrl("images/2.png"),
      getPreviewUrl("images/2.png"),
    ]);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it("reutiliza a URL de download entre chamadas consecutivas", async () => {
    const a = await getDownloadUrl("files/report.pdf", "report.pdf");
    const b = await getDownloadUrl("files/report.pdf", "report.pdf");
    expect(a).toBe(b);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
    expect(createSignedUrl).toHaveBeenCalledWith("files/report.pdf", 60, {
      download: "report.pdf",
    });
  });

  it("invalida prévia e download ao remover o anexo", async () => {
    const previewA = await getPreviewUrl("files/doc.pdf");
    const downloadA = await getDownloadUrl("files/doc.pdf", "doc.pdf");
    expect(createSignedUrl).toHaveBeenCalledTimes(2);

    clearAttachmentUrlCache("files/doc.pdf");

    const previewB = await getPreviewUrl("files/doc.pdf");
    const downloadB = await getDownloadUrl("files/doc.pdf", "doc.pdf");
    expect(previewB).not.toBe(previewA);
    expect(downloadB).not.toBe(downloadA);
    expect(createSignedUrl).toHaveBeenCalledTimes(4);
  });

  it("invalidação por prefixo não afeta outros anexos", async () => {
    const other = await getPreviewUrl("files/other.pdf");
    await getPreviewUrl("files/doc.pdf");

    clearAttachmentUrlCache("files/doc.pdf");
    const otherAgain = await getPreviewUrl("files/other.pdf");

    expect(otherAgain).toBe(other);
  });
});
