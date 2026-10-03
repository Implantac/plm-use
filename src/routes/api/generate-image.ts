import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const ImageRequest = z.object({
  prompt: z.string().trim().min(1).max(4000),
  referenceImage: z.string().max(15_000_000).optional(),
});

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = request.headers.get("authorization");
        const token = authorization?.startsWith("Bearer ")
          ? authorization.slice("Bearer ".length).trim()
          : "";
        if (!token) return jsonError("Entre na sua conta para gerar imagens.", 401);

        const supabaseUrl = process.env.SUPABASE_URL;
        const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !publishableKey) {
          return jsonError("Autenticação indisponível no servidor.", 500);
        }

        const supabase = createClient(supabaseUrl, publishableKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (userError || !userData.user) {
          return jsonError("Sua sessão expirou. Entre novamente para continuar.", 401);
        }
        const { data: isMember, error: memberError } = await supabase.rpc("is_member", {
          _uid: userData.user.id,
        } as never);
        if (memberError) return jsonError("Não foi possível validar seu acesso.", 503);
        if (!isMember) return jsonError("Sua conta não tem acesso à geração de imagens.", 403);

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return jsonError("A solicitação de imagem é inválida.", 400);
        }
        const parsed = ImageRequest.safeParse(payload);
        if (!parsed.success) {
          return jsonError("Descreva a imagem em até 4.000 caracteres.", 400);
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return jsonError("O provedor de imagens não está configurado.", 503);

        const model = "openai/gpt-image-2.5-sunburst";
        const reference = parsed.data.referenceImage;
        let upstream: Response;
        try {
          if (reference) {
            const match = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(reference);
            if (!match) return jsonError("Imagem de referência inválida.", 400);
            const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
            const form = new FormData();
            form.append("model", model);
            form.append("prompt", parsed.data.prompt);
            form.append("quality", "high");
            form.append("background", "transparent");
            form.append("output_format", "png");
            form.append("stream", "true");
            form.append("partial_images", "2");
            form.append("image", new Blob([bytes], { type: match[1] }), "reference.png");
            upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/edits", {
              method: "POST",
              signal: request.signal,
              headers: {
                Authorization: `Bearer ${key}`,
                "Lovable-API-Key": key,
                "X-Lovable-AIG-SDK": "raw",
              },
              body: form,
            });
          } else {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
            method: "POST",
            signal: request.signal,
            headers: {
              Authorization: `Bearer ${key}`,
              "Lovable-API-Key": key,
              "X-Lovable-AIG-SDK": "raw",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              prompt: parsed.data.prompt,
              quality: "high",
              background: "transparent",
              output_format: "png",
              stream: true,
              partial_images: 2,
            }),
          });
          }
        } catch (error) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          console.error("Image provider request failed", error);
          return jsonError("O provedor de imagens não respondeu. Tente novamente.", 502);
        }

        if (!upstream.ok || !upstream.body) {
          const status = upstream.status === 429 ? 429 : upstream.status === 402 ? 402 : 502;
          const message =
            status === 429
              ? "Muitas gerações em pouco tempo. Aguarde e tente novamente."
              : status === 402
                ? "Créditos de IA indisponíveis no momento."
                : "Não foi possível gerar esta imagem. Tente novamente.";
          console.error("Image provider rejected request", upstream.status, await upstream.text());
          return jsonError(message, status);
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
