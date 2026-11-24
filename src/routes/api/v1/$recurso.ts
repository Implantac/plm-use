import { createFileRoute } from "@tanstack/react-router";
import { RECURSOS_V1, recursoPorSlug } from "@/lib/api/recursos-v1";
import { erroJson, responderLeituraV1 } from "@/lib/api/leitura-v1.server";

// Onda 121 — API pública v1 (somente leitura).
// GET /api/v1/<recurso>?limit=&updated_since=&cursor=&<filtros>
// Autenticação: Authorization: Bearer plm_live_…  (Segurança → Chaves de API)
// Leitura com service role, mas SÓ colunas do mapa RECURSOS_V1 e com chave válida.
export const Route = createFileRoute("/api/v1/$recurso")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const recurso = recursoPorSlug(params.recurso);
        if (!recurso)
          return erroJson(404, `Recurso desconhecido: ${params.recurso}`, {
            recursos: RECURSOS_V1.map((r) => r.slug),
            docs: "/api/v1/openapi.json",
          });
        return responderLeituraV1(request, recurso);
      },
    },
  },
});
