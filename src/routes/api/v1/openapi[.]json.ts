import { createFileRoute } from "@tanstack/react-router";
import { gerarOpenApi } from "@/lib/api/recursos-v1";

// Onda 121 — contrato público da API v1 (sem autenticação: é documentação).
export const Route = createFileRoute("/api/v1/openapi.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        return Response.json(gerarOpenApi(`${url.protocol}//${url.host}`), {
          headers: { "cache-control": "public, max-age=300", "access-control-allow-origin": "*" },
        });
      },
    },
  },
});
