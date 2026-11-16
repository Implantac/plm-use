import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Onda 88: as server functions (almoxarifado, launch, workflow) são endpoints
// RPC same-origin que gravam no banco como o usuário autenticado. Sem esta
// trava, um site de terceiros poderia disparar uma gravação com a sessão da
// vítima (CSRF). Só requisições same-origin (Sec-Fetch-Site/Origin/Referer)
// passam; a navegação normal (`router`) não é afetada.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
  failureResponse: () =>
    new Response(
      JSON.stringify({
        ok: false,
        reason:
          "Requisição recusada: origem não reconhecida. Abra o PLM pelo endereço oficial e repita a ação.",
      }),
      { status: 403, headers: { "content-type": "application/json; charset=utf-8" } },
    ),
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [csrfMiddleware, errorMiddleware],
}));
