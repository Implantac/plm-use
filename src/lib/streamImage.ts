// Client helper: consome SSE de /api/generate-image e entrega frames parciais + final.
export async function streamImage(
  endpoint: string,
  prompt: string,
  onFrame: (dataUrl: string, final: boolean) => void,
): Promise<void> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok || !res.body) throw new Error(`AI image error: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as {
          type?: string;
          b64_json?: string;
          data?: Array<{ b64_json?: string }>;
        };
        const b64 =
          json.b64_json ?? (json.data && json.data[0]?.b64_json) ?? null;
        if (!b64) continue;
        const final = json.type === "image.completed" || json.type === "completed";
        onFrame(`data:image/png;base64,${b64}`, final);
      } catch {
        // ignore malformed frames
      }
    }
  }
}
