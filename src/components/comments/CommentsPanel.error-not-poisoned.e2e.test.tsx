// @vitest-environment jsdom
//
// E2E: simular erro em createSignedUrl para múltiplos anexos distintos e
// verificar que (1) nenhuma entrada corrompida é gravada no cache e
// (2) clicar em "Tentar novamente" nos itens afetados gera URLs novas e
// válidas — sem reaproveitar qualquer resultado do fetch que falhou.
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
  getPreviewUrl,
} from "@/components/comments/CommentsPanel";

const PATHS = ["poison/a.png", "poison/b.png", "poison/c.png"] as const;

const img = (path: string, id: string) => ({
  id,
  comment_id: "c1",
  storage_path: path,
  file_name: `${id}.png`,
  mime_type: "image/png",
  size_bytes: 100,
  uploaded_by: "u1",
});

let counter = 0;
// path -> sequência de respostas para o próximo fetch.
const nextResponses = new Map<
  string,
  Array<{ data: { signedUrl: string } | null; error: { message: string } | null }>
>();

function queueResponse(
  path: string,
  res: { data: { signedUrl: string } | null; error: { message: string } | null },
) {
  const list = nextResponses.get(path) ?? [];
  list.push(res);
  nextResponses.set(path, list);
}

beforeEach(() => {
  counter = 0;
  nextResponses.clear();
  createSignedUrl.mockReset();
  createSignedUrl.mockImplementation(async (path: string) => {
    const list = nextResponses.get(path);
    if (!list || list.length === 0) {
      throw new Error(`no queued response for ${path}`);
    }
    return list.shift()!;
  });
  clearAttachmentUrlCache();
});

afterEach(() => cleanup());

async function flush() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

describe("CommentsPanel E2E — erro em createSignedUrl não envenena o cache", () => {
  it("falha em N paths distintos; retry gera novas URLs válidas e o cache original permanece limpo", async () => {
    // 1) Enfileira UMA falha para cada path e monta um AttachmentItem por path.
    for (const p of PATHS) {
      queueResponse(p, { data: null, error: { message: `falha ${p}` } });
    }
    for (const p of PATHS) {
      render(
        <AttachmentItem attachment={img(p, p.replace("/", "-"))} canRemove={false} onRemove={() => {}} />,
      );
    }
    await flush();

    // 1 fetch por path, todos falhos.
    for (const p of PATHS) {
      expect(createSignedUrl.mock.calls.filter(([x]) => x === p)).toHaveLength(1);
      expect(screen.getByText(`falha ${p}`)).toBeDefined();
    }
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    const retries = screen.getAllByRole("button", { name: /tentar novamente/i });
    expect(retries).toHaveLength(PATHS.length);

    // 2) Cache não envenenado: um getPreviewUrl direto agora dispara NOVO fetch
    //    para o path (não retorna string vazia/URL corrompida cacheada). Antes
    //    disso, enfileira uma resposta de sucesso para servir a chamada.
    const probePath = PATHS[0];
    queueResponse(probePath, {
      data: { signedUrl: `https://signed.test/${probePath}?probe=${++counter}` },
      error: null,
    });
    const callsBeforeProbe = createSignedUrl.mock.calls.filter(
      ([x]) => x === probePath,
    ).length;
    const probeUrl = await getPreviewUrl(probePath);
    expect(probeUrl).toMatch(/\?probe=1$/);
    expect(
      createSignedUrl.mock.calls.filter(([x]) => x === probePath).length -
        callsBeforeProbe,
    ).toBe(1);

    // Reset para o cenário de retry via UI — limpa o cache que a prova acima
    // populou para probePath, mantendo os outros paths (que continuam sem
    // entrada, pois falharam).
    clearAttachmentUrlCache(probePath);

    // 3) Enfileira sucesso distinto para cada path e clica em "Tentar novamente"
    //    em TODOS os itens. Cada item deve gerar uma URL nova e única.
    for (const p of PATHS) {
      queueResponse(p, {
        data: { signedUrl: `https://signed.test/${p}?v=${++counter}` },
        error: null,
      });
    }

    const callsPerPathBefore = new Map(
      PATHS.map((p) => [p, createSignedUrl.mock.calls.filter(([x]) => x === p).length]),
    );

    act(() => {
      for (const btn of retries) fireEvent.click(btn);
    });
    await flush();

    // Cada path gerou EXATAMENTE 1 fetch adicional.
    for (const p of PATHS) {
      const before = callsPerPathBefore.get(p)!;
      const now = createSignedUrl.mock.calls.filter(([x]) => x === p).length;
      expect(now - before).toBe(1);
    }

    // 4) Cada item exibe a URL do seu próprio path — todas distintas.
    const imgs = PATHS.map((p) => screen.getByAltText(`${p.replace("/", "-")}.png`));
    const srcs = imgs.map((el) => el.getAttribute("src"));
    for (let i = 0; i < PATHS.length; i++) {
      expect(srcs[i]).toMatch(new RegExp(`^https://signed\\.test/${PATHS[i]}\\?v=\\d+$`));
    }
    expect(new Set(srcs).size).toBe(PATHS.length);

    // 5) Mount subsequente para qualquer path é cache HIT — sem novos fetches.
    const callsAfterRetry = createSignedUrl.mock.calls.length;
    for (const p of PATHS) {
      render(
        <AttachmentItem attachment={img(p, `${p.replace("/", "-")}-b`)} canRemove={false} onRemove={() => {}} />,
      );
    }
    await flush();
    expect(createSignedUrl.mock.calls.length).toBe(callsAfterRetry);
    for (let i = 0; i < PATHS.length; i++) {
      const late = screen.getByAltText(`${PATHS[i].split("/")[1]}-b`);
      expect(late.getAttribute("src")).toBe(srcs[i]);
    }
  });
});
