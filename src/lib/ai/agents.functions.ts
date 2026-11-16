// Agentes IA do PLM — fala direto com Lovable AI Gateway via createServerFn.
// PLM-only: 3 perfis (Fashion, PCP, Marketing) com prompts especializados.
// AUTENTICADO: exige sessão + membro (is_member) para evitar burn de créditos.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { responderAgente } from "./responder-agente";

const AgentInput = z.object({
  agent: z.enum(["fashion", "pcp", "marketing"]),
  message: z.string().trim().min(1).max(8000),
  context: z.string().trim().max(8000).optional(),
});

export const askAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => AgentInput.parse(input))
  .handler(({ data, context }) => responderAgente(data, context));
