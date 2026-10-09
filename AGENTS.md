# Project architecture decisions

- Product artwork application sends the generated garment and uploaded artwork together as ordered image-edit references, because preserving both sources is more reliable than describing either one in text.- PCP por OP: saldo por etapa e passagens só mudam pela função register_passages no banco, porque a validação de quantidade e da próxima etapa precisa ser atômica e não pode depender do cliente.

- PCP por OP: planejar (OPs, rotas, troca de rota) exige can_plan_pcp e passagens exigem can_write_pcp no banco; a tela só espelha isso via opPermissions, porque a regra de papel precisa valer mesmo fora da interface.

## GitHub ↔ Lovable (contrato da plataforma — não negociável)

- Este repo é o lado GitHub do sync bidirecional do projeto na branch `main`; o app que os usuários veem é o deploy do Lovable, alimentado por push na `main`. Ver `docs/github-lovable-sync.md`.
- Permanecer no Lovable é decisão do dono (09/10/2026): não introduzir abstrações "para migrar depois" (gateway de IA, OAuth próprio, presets node/docker). O `vite.config.ts` usa `@lovable.dev/vite-tanstack-config` e isso fica.
- `main` aceita apenas push fast-forward: nunca force-push/rewriting; `git pull --rebase` antes de subir (os commits do bot chegam lá). Nunca renomear/transferir o repo.
- Arquivos gerados não se editam: `src/routeTree.gen.ts`, `src/integrations/supabase/client.ts|types.ts`. Rota nova = registrar em `src/lib/nav/routes.ts` (com `icon`; ver `src/lib/nav/routes.test.ts` — ele quebra o build na divergência).
- Migrations novas só em `supabase/migrations/` com timestamp (padrão das 52 existentes; trilha Drizzle abandonada); nunca embutir segredo em migration/seed — segredos vivem em Cloud Secrets/`app_cron_config`.
- Dependências: editar `package.json` exige regenerar `package-lock.json` no mesmo commit (a CI tolera drift com fallback, mas o registro é o par).
