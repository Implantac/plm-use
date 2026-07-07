# H8-01 · Ambientes e deploy

## Ambientes
- **Preview** (`project--<id>-dev.lovable.app`) — cada commit do editor
  publica. Sandbox seguro para testar tudo, inclusive migrações.
- **Produção** (`project--<id>.lovable.app` + domínio custom) — publicação
  explícita pelo usuário.

Não existe "staging" separado — o Preview cumpre esse papel. Se o time
precisar de staging real, criar projeto irmão.

## Migrações
- Escritas via `supabase--migration` (aprovação humana).
- Aplicadas primeiro no ambiente do editor → preview.
- Ao publicar, migrações do backend acompanham o deploy.
- Nunca editar schema fora de migração (perde histórico).

## Rollback
- Código: republicar versão anterior via history.
- Banco: preparar migração **inversa** antes de mergear (drop, ou
  revert de default). Se destrutivo, snapshot antes.

## CI mínimo (a implementar)
- Build + typecheck em todo push.
- Lint em todo push.
- `security--run_security_scan` semanal.
- `supabase--linter` a cada migração.

## Anti-padrões
- Rodar SQL direto em produção fora do fluxo de migração.
- "Vou testar em produção rapidinho".
- Rollback sem plano prévio.
