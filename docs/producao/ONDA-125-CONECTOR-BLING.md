# Onda 125 — Conector Bling (ERP) — pedidos de venda → PLM

**Base:** `bd1b633` (Onda 124 no ar). **Migration:** `APLICAR-SQL-ONDA-125.sql`
(tabela `integration_connections`, só `service_role`). **Segredos novos:**
`BLING_CLIENT_ID`, `BLING_CLIENT_SECRET`.

## Por que

Lacuna 2 do comparativo: "conector TOTVS/Bling". A API v1 (leitura, webhooks,
POST pedidos, PATCH OP) já permitia integrar, mas exigia que alguém do lado do
ERP programasse. O Bling é o ERP mais comum nas confecções pequenas/médias e tem
API v3 pública com OAuth — dá para o próprio dono conectar em 2 cliques.

## O que entrou

- **`src/lib/integracoes/bling.ts`** (puro): `urlAutorizacaoBling`,
  `mapearPedidoBling(detalhe)` → `PedidoEntrada` (o mesmo contrato do
  `POST /api/v1/sales-orders`), `dataInicialSync`, `resumoVazio`.
  Regras: `source = bling`, `external_ref = nº do pedido`; cliente por
  CNPJ/CPF (só dígitos) ou `BLING-<id>`; item por **código do produto (SKU)**
  do Bling = código do Catálogo; preço = valor × (1 − desconto%); situação
  **12 Cancelado** é ignorada; `dataPrevista` → `due_date`; parcelas →
  `payment_terms`.
- **`bling.server.ts`**: troca de código / renovação de token (Basic auth,
  `Accept: 1.0`), `obterTokenValido` (renova e persiste se faltar < 2 min),
  `listarPedidosBling` (paginação 100, 350 ms entre páginas — limite 3 req/s),
  `detalharPedidoBling`, `sincronizarPedidosBling` → reaproveita
  `criarPedidoExterno` da Onda 123 (idempotente; webhooks disparam pelos triggers).
  Resumo `{lidos, criados, existentes, ignorados, rejeitados[], erro?}` gravado em
  `last_sync_summary`; `last_sync_at` só avança sem erro; janela = último sync − 1 dia
  (sobreposição) ou N dias.
- **`bling.functions.ts`** (server functions, só admin/manager via sonda RLS em
  `api_keys`): `statusBling`, `iniciarConexaoBling` (state anti-CSRF 10 min),
  `sincronizarBling({dias})`, `desconectarBling`. Tokens nunca saem do servidor.
- **Rota pública** `GET /api/public/integracoes/bling-callback`: confere state,
  troca o código, busca o nome da empresa (`/empresas/me/dados-basicos`), grava e
  redireciona para `/security?bling=ok|erro&motivo=…`.
- **`IntegracaoBlingCard.tsx`** em Segurança (abaixo de Webhooks): instruções
  quando faltam segredos/migration, Conectar, janela (7/30/90/180 dias),
  Sincronizar, Desconectar, resumo da última execução com lista de rejeitados e
  a dica "cadastre o SKU no Catálogo".
- `types.ts`: tabela `integration_connections`.

## Como ligar (dono)

1. Aplicar `APLICAR-SQL-ONDA-125.sql`.
2. No Bling: Cadastros → Aplicativos → novo app; URL de redirecionamento
   `https://plmuse.lovable.app/api/public/integracoes/bling-callback`; escopos
   de pedidos de venda (leitura) e dados da empresa.
3. Segredos do servidor: `BLING_CLIENT_ID`, `BLING_CLIENT_SECRET`; publicar.
4. Segurança → Integração ERP — Bling → **Conectar ao Bling** → autorizar →
   volta com "Bling conectado" → **Sincronizar pedidos**.

## Testes (7, `bling.test.ts`)

Mapeamento completo validado por `validarPedidoEntrada`; sem CNPJ / cancelado /
sem SKU / sem itens; URL + janela + `expiraEm`; troca de código com Basic auth e
renovação persistida; token válido não chama o Bling; sync cria 1, ignora 1,
rejeita 1 (SKU desconhecido) e é idempotente na 2ª rodada; erro 500 vira
`resumo.erro` sem avançar `last_sync_at`.

Gates: prettier limpo · `tsc` 0 · `eslint` 0 erros · **vitest 1036/1036 (183 arquivos)**.

## Limites

- Só **Bling → PLM** (pedidos). O caminho inverso (status da OP → Bling) e
  produtos/estoque ficam para uma onda seguinte, se o piloto pedir.
- Grade por tamanho: o Bling trata variações como SKUs distintos; cada SKU vira
  um item (sem `sizes`). Se o Catálogo usar um código por modelo, cadastre o SKU
  do Bling como código do produto.
- Sincronização manual (botão). Agendamento pode reusar o padrão de cron
  assinado da Onda 122.
