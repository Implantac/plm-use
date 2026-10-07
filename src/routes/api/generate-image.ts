import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const ImageRequest = z.object({
  prompt: z.string().trim().min(1).max(4000),
  referenceImage: z.string().max(15_000_000).optional(),
  referenceImages: z.array(z.string().max(15_000_000)).min(1).max(2).optional(),
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
        const references = parsed.data.referenceImages ?? (parsed.data.referenceImage ? [parsed.data.referenceImage] : []);
        let upstream: Response;
        try {
          if (references.length) {
            const form = new FormData();
            form.append("model", model);
            form.append("prompt", parsed.data.prompt);
            form.append("quality", "high");
            form.append("background", "transparent");
            form.append("output_format", "png");
            form.append("stream", "true");
            form.append("partial_images", "2");
            for (const [index, reference] of references.entries()) {
              const match = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(reference);
              if (!match) return jsonError("Imagem de referência inválida.", 400);
              const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
              form.append(
                references.length === 1 ? "image" : "image[]",
                new Blob([bytes], { type: match[1] }),
                `reference-${index + 1}.png`,
              );
            }
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
          let safeMessage = "Não foi possível gerar esta imagem. Tente novamente.";
          try {
            const providerBody = await upstream.json() as { error?: { message?: string } | string; message?: string };
            safeMessage = typeof providerBody.error === "string"
              ? providerBody.error
              : providerBody.error?.message ?? providerBody.message ?? safeMessage;
          } catch {
            // Keep the safe local message when the provider did not return JSON.
          }
          if (upstream.status === 402) safeMessage = "Créditos de IA esgotados. Adicione créditos ao workspace para voltar a gerar imagens.";
          if (upstream.status === 429) safeMessage = "Limite temporário de geração. Tente novamente em alguns segundos.";
          return jsonError(safeMessage, upstream.status);
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
