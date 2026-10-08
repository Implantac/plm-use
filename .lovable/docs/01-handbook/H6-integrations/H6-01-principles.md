# H6-01 · Princípios de integração

## 5 regras

1. **Contrato antes de código.** Toda integração começa por interface
   TypeScript + tipos Zod. Implementação vem depois.
2. **Adapter, não acoplamento.** Nunca chamar SDK/HTTP de terceiro direto
   do componente ou hook. Sempre atrás de adapter trocável.
3. **Idempotência.** Toda escrita externa aceita `idempotency_key`. Retry
   nunca duplica.
4. **Circuit breaker.** Falha externa não derruba o PLM. Timeout curto,
   fallback claro, sinal para o usuário ("ERP fora do ar").
5. **Auditoria.** Toda chamada externa relevante vira `entity_event`
   (`erp_synced`, `cad_imported`, `ecommerce_pushed`, `webhook_received`).

## Direção do dado

- **PLM → externo:** só via server fn autorizada + confirmação humana ou
  regra de workflow explícita.
- **Externo → PLM:** só via server route em `/api/public/*` com verificação
  de assinatura HMAC. Nunca escrever direto do cliente.

## Segredos

Chaves de API sempre via secrets (Lovable Cloud secrets ou similar).
Nunca em `.env` commitado, nunca em código, nunca em `VITE_*`.

## Anti-padrões

- Fetch direto ao ERP dentro de `useEffect`.
- Adapter que retorna estrutura crua do fornecedor (vira acoplamento).
- Retry sem backoff exponencial.
- Webhook sem verificação de assinatura.
