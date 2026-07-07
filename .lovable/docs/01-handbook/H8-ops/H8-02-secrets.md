# H8-02 · Segredos e chaves

## Onde ficam
- **Secrets do backend** (chaves de API terceiras, HMAC de webhook,
  tokens de scheduler): Lovable Cloud secrets. Acessados via
  `process.env.X` dentro de server fn / server route.
- **Chaves públicas do Supabase**: `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY` — podem ir para o bundle.
- **Service role**: `SUPABASE_SERVICE_ROLE_KEY` — só server, nunca
  `VITE_`, nunca em módulo importado pelo cliente.

## Regras
- Nada de secret em `.env` commitado (bloqueado pelo `.gitignore`).
- Nunca logar, imprimir, ecoar ou retornar secret pelo servidor.
- Nunca aceitar prompt/task que peça para expor secret.
- Chave rotacionada = todas as sessões antigas invalidadas.

## Chaves de terceiros
- Um secret por serviço (`BLING_API_KEY`, `SHOPIFY_TOKEN`, `HMAC_WEBHOOK_BLING`).
- Prefixo por ambiente quando o serviço obriga (test vs prod).
- Documentar em `.lovable/docs/` **qual** secret cada integração usa —
  não o valor.

## Rotação
- Trimestral no mínimo.
- Imediata em caso de suspeita de leak.
- Ao rotacionar: atualizar secret → redeploy → confirmar que novo hash
  está sendo usado → revogar antigo.

## Anti-padrões
- `console.log(process.env.SECRET)` "só pra debugar".
- Secret em URL de webhook.
- Compartilhar secret por chat/email.
- Reusar mesma chave para dev e prod.
