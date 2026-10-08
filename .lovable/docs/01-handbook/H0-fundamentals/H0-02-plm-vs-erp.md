# H0-02 · PLM vs ERP — a linha vermelha

Este é o princípio **inegociável** do USE MODA PLM. Confundir os dois é o
erro mais caro que se pode cometer no projeto.

## Regra de ouro

> **Se o ERP já é dono do dado, o PLM apenas referencia.**

Nunca duplicamos: Produto SKU, Estoque físico, Fornecedor cadastral, Pedido de
compra, Nota Fiscal, Financeiro (AP/AR), Folha, Fiscal, Ordem de Produção
fabril executada.

Referenciamos via `erp_id` + `ErpAdapter` (FPEF V9, `src/lib/erp/`).

## Divisão de responsabilidades

| Área                            | PLM                     | ERP                  |
| ------------------------------- | ----------------------- | -------------------- |
| Pesquisa/moodboard/tendência    | ✅                      | ❌                   |
| Ficha técnica (BOM/BOP)         | ✅                      | ❌ (recebe pronta)   |
| Piloto, aprovação, pilotagem    | ✅                      | ❌                   |
| Engenharia de produto           | ✅                      | ❌ (recebe pronta)   |
| Cadastro de SKU                 | ❌ (referencia)         | ✅                   |
| Estoque físico                  | ❌                      | ✅                   |
| Compras (pedido/NF)             | ❌ (sugere necessidade) | ✅                   |
| PCP planejamento                | ✅ (visão coleção)      | ✅ (execução fabril) |
| Qualidade (CAPA, defeitos)      | ✅                      | ❌                   |
| Comercial (performance coleção) | ✅ (analítico)          | ✅ (transacional)    |
| Financeiro                      | ❌                      | ✅                   |

## Como o PLM aparece "sobre" o ERP

- **Read-only:** consulta via adapter, cacheia por curto período.
- **Sugestão:** cria demandas (necessidade de compra, sugestão de OP) que o
  ERP aceita ou não.
- **Enriquecimento:** anexa ao SKU do ERP o contexto de coleção, ficha,
  pilotos, aprovações que o ERP nunca teria.

## Anti-padrões (nunca fazer)

- Tabela `produtos` no PLM com preço, estoque e custo.
- Emissão de NF, boleto, movimentação financeira.
- Cadastro de fornecedor com dados fiscais.
- Substituir o kanban fabril do ERP.
