# H7-01 · Estratégia de testes

Pirâmide clássica, com ênfase onde o PLM dói mais.

## Camadas

1. **Unit** — funções puras (cálculo de consumo, aplicador de workflow,
   parsers, formatters). Fast, isolado. Vitest.
2. **Integração** — server fn contra banco de teste (Supabase local ou
   preview). Valida RLS + trigger + transição.
3. **E2E** — Playwright dirigindo o preview. Fluxos completos: criar
   referência → aprovar → gerar piloto → lote → CAPA.
4. **Contract** — adapters ERP/CAD/e-commerce contra mocks fiéis + smoke
   contra sandbox real quando existe.

## O que testar sempre

- Toda **transição de workflow** (permitida e proibida).
- Toda **policy RLS** (owner lê, não-owner não lê, admin lê tudo).
- Toda **server fn com autorização** (sem sessão → 401; sem role → 403).
- Todo **trigger** que emite evento (existe evento com payload esperado).
- Todo **cálculo de negócio** (consumo, custo mínimo, prazo, capacidade).

## O que **não** testar

- Layout pixel-perfect (screenshot diff é ruído).
- Terceiros (SDK do Supabase, biblioteca de UI).
- Estado interno de componente que já é validado pelo E2E.

## Regra

PR que altera regra de negócio sem teste **volta**. Sem exceção.
