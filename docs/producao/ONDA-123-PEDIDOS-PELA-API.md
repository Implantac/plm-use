# Onda 123 — Pedidos criados pela API (loja / ERP → PLM)

**Dor:** o pedido nascia na loja (VTEX) ou no ERP e alguém redigitava no PLM
para virar custo, ficha e OP. Com a Onda 121 (leitura) e a 122 (webhooks +
PATCH de OP) faltava justamente a **entrada**: o sistema de origem criar o
pedido no PLM, com segurança para reenviar sem duplicar.

## O que ficou pronto

| Peça                                                                                                                                                                                                                                                                                                                                                             | Onde                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `sales_orders.external_source` + `external_ref` com índice único parcial (idempotência)                                                                                                                                                                                                                                                                          | `supabase/migrations/20261124120000_sales_orders_external_ref.sql`       |
| Validação pura do corpo, com mensagem apontando o campo                                                                                                                                                                                                                                                                                                          | `src/lib/api/escrita-v1.ts` (`validarPedidoEntrada`)                     |
| Criação: idempotência → produtos do catálogo por `code` (422 lista desconhecidos/inativos) → cliente por `code` (cria/atualiza; novo exige `name`) → número por `next_sales_order_number` → cabeçalho `rascunho` com total → itens (`line_no`, `catalog_product_id`, `reference_code`) → grade; corrida 23505 devolve o existente; falha em item desfaz o pedido | `src/lib/api/pedidos-v1.server.ts`                                       |
| Rota `POST /api/v1/sales-orders` (escopo `write`, 60 req/min) e `GET` no mesmo arquivo                                                                                                                                                                                                                                                                           | `src/routes/api/v1/sales-orders.ts`                                      |
| Leitura paginada extraída para módulo reutilizável                                                                                                                                                                                                                                                                                                               | `src/lib/api/leitura-v1.server.ts` (`$recurso.ts` ficou só o roteamento) |
| Recurso `sales-orders` passa a expor `external_source`/`external_ref`                                                                                                                                                                                                                                                                                            | `recursos-v1.ts`                                                         |
| OpenAPI com o POST completo (schema, exemplos, respostas)                                                                                                                                                                                                                                                                                                        | `recursos-v1.ts` → `/api/v1/openapi.json`                                |
| Texto do card Chaves de API cita criação de pedidos e PATCH de OP                                                                                                                                                                                                                                                                                                | `ChavesApiCard.tsx`                                                      |
| Trava (8 testes)                                                                                                                                                                                                                                                                                                                                                 | `src/lib/api/pedidos-v1.test.ts`                                         |

## Contrato

```http
POST /api/v1/sales-orders
Authorization: Bearer plm_live_…   (chave com escopo write)
Content-Type: application/json

{ "source": "vtex", "external_ref": "1234567-01",
  "customer": { "code": "C-100", "name": "Loja Centro", "tax_id": "12.345.678/0001-90", "state": "SP" },
  "is_quote": false, "due_date": "2026-12-15", "payment_terms": "30/60", "notes": "Entrega na loja",
  "items": [
    { "product_code": "CAM-001", "quantity": 6, "unit_price": 89.9, "color": "Off-white",
      "sizes": [ { "size": "P", "quantity": 2 }, { "size": "M", "quantity": 4 } ] },
    { "product_code": "SAI-010", "quantity": 2, "unit_price": 120 } ] }
```

| Resposta                                                                                                   | Quando                                                   |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **201** `{data:{id, number, status:"rascunho", total_value, customer_id, items[]}, already_existed:false}` | criado                                                   |
| **200** `{data:{…}, already_existed:true}`                                                                 | mesmo `source`+`external_ref` reenviado — nada duplicado |
| 400 `{"error":"items[0].quantity deve ser número > 0."}`                                                   | corpo inválido (campo indicado)                          |
| 401 / 403                                                                                                  | sem chave / chave só leitura                             |
| 422 `{error, product_codes_desconhecidos:[…], product_codes_inativos:[…]}`                                 | produto fora do Catálogo; ou cliente novo sem `name`     |
| 503                                                                                                        | migration `20261124120000` ainda não aplicada            |

O pedido entra em **rascunho**: a equipe comercial segue o fluxo normal
(enviar → custo → aprovar → liberar p/ PCP). O trigger da Onda 122 dispara
`sales_order.created` para os webhooks — a loja recebe de volta o número do PLM.

## Provas

- vitest: 8 testes — validação (9 casos de erro com campo na mensagem), OpenAPI
  GET+POST, criação completa (cliente novo, 2 itens, grade de 2 tamanhos, total
  6×89,90 + 240), idempotência (2º envio → 200, 1 pedido), 422 com listas,
  cliente existente reaproveitado/atualizado, cliente novo sem `name` → 422,
  migration pendente → 503.
- Local (vite): `GET`/`POST /api/v1/sales-orders` sem chave → 401; com chave sem
  banco → 503; `openapi.json` lista `get` e `post`.

## Gates

`tsc` 0 · `eslint` 0 erros · `prettier` limpo · **vitest 1018/1018 (180 arquivos)**.

## Pendente para funcionar em produção

1. Aplicar `APLICAR-SQL-ONDA-123.sql` (2 colunas + índice; segundos).
2. Publicar.
3. Validar: criar chave **com escopo write** em Segurança, cadastrar um produto
   no Catálogo (ex.: `CAM-001`) e enviar o `curl` do contrato; esperado 201 e o
   pedido aparecendo em Pedidos como rascunho com origem nas notas; reenviar → 200.
