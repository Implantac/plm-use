import { supabase } from "@/integrations/supabase/client";

type ImageEvent = {
  type?: string;
  b64_json?: string;
  partial_image_b64?: string;
  data?: Array<{ b64_json?: string }>;
  error?: string | { message?: string };
  message?: string;
};

function readError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

export async function streamImage(
  endpoint: string,
  prompt: string,
  onFrame: (dataUrl: string, final: boolean) => void,
): Promise<void> {
  const { data, error: sessionError } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (sessionError || !accessToken) throw new Error("Entre na sua conta para gerar imagens.");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok || !res.body) {
    let message = `Falha ao gerar a imagem (${res.status}).`;
    try {
      message = readError(await res.json(), message);
    } catch {
      // Preserve a useful status-based message when the server returns no JSON.
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedImage = false;

  const consume = (event: string) => {
    const lines = event.split(/\r?\n/);
    const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
    const payload = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (!payload || payload === "[DONE]") return;

    let json: ImageEvent;
    try {
      json = JSON.parse(payload) as ImageEvent;
    } catch {
      return;
    }

    if (json.type === "error" || eventName === "error" || json.error) {
      throw new Error(
        readError(json, json.message ?? "O provedor interrompeu a geração da imagem."),
      );
    }

    const type = json.type ?? eventName;
    const base64 = json.b64_json ?? json.partial_image_b64 ?? json.data?.[0]?.b64_json;
    if (!base64) return;
    receivedImage = true;
    const final =
      type === "image_generation.completed" ||
      type === "image_edit.completed" ||
      type === "image.completed" ||
      type === "completed";
    onFrame(`data:image/png;base64,${base64}`, final);
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? "";
      for (const event of events) consume(event);
      if (done) break;
    }
    if (buffer.trim()) consume(buffer);
    if (!receivedImage) throw new Error("O provedor concluiu sem retornar uma imagem.");
  } finally {
    reader.releaseLock();
  }
}
