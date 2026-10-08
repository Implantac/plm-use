import { createFileRoute } from "@tanstack/react-router";

// Health check público e barata — SEM banco, SEM IA, SEM segredo.
//
// Para que serve: uptime probe (Cloudflare/BetterStack/UptimeRobot), gate de
// smoke test pós-deploy e leitura rápida de "o processo respondeu?". Endpoints
// que tocam o banco não pertencem a um health check de liveness (um incidente
// Supabase não deve derrubar o status do app — para dados existe o check
// separado do dashboard admin).
//
// Resposta propositalmente mínima: não versionar aqui nada que ajude a
// enumerar a stack em um ataque. Detalhes de build ficam no CI.
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          { status: "ok", ts: new Date().toISOString() },
          { headers: { "cache-control": "no-store" } },
        ),
    },
  },
});
