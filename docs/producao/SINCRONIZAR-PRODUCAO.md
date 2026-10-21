# Sincronizar o banco de produção com o repositório

**Situação em 21/10/2026:** o sistema está publicado, mas o banco de produção
**não recebeu as migrations do fluxo de pedido**. O PLM (PCP,
perfis, fornecedores, coleções) está íntegro; o que falta é exatamente o caminho
comercial: cliente → pedido → ficha → custo → liberação para o PCP.

Este documento fecha essa lacuna sem apagar nada e sem depender do Supabase CLI.

### Onde o sistema está publicado

| Endereço                     | Estado (21/10)           | Observação                    |
| ---------------------------- | ------------------------ | ----------------------------- |
| `https://plmuse.lovable.app` | **200 — é o PLM**        | URL real do app publicado     |
| `https://usemoda.ai`         | 307 → `www.usemoda.ai`   | redireciona, não serve o app  |
| `https://www.usemoda.ai`     | 308 → `https://moda.dev` | **aponta para outro produto** |

O bundle servido em `plmuse.lovable.app` referencia `njmniwsqwohmigroswnl.supabase.co`
— ou seja, é o mesmo banco auditado aqui, e o front-end já contém as telas de
pedido (`sales_orders`, `order_item_technical_sheet`,
`release_sales_order_to_pcp`). Só o banco está atrás.

> **Pendência de infraestrutura (fora do escopo do SQL):** o domínio próprio
> `usemoda.ai` hoje cai em `moda.dev` (_"Moda — Production monitoring and evals
> for AI agents"_), um produto que não é o PLM. Isso precisa ser corrigido em
> **Lovable → Publicar → Domínios** (reapontar o domínio para
> `plmuse.lovable.app`), ou no DNS. Enquanto isso, divulgue o endereço
> `plmuse.lovable.app`.

---

## 1. Diagnóstico

Consulta feita na API REST do projeto `njmniwsqwohmigroswnl`, comparando as **69
tabelas do repositório** com as que respondem em produção:

- **56 existem** — inclui `profiles`, `user_roles`, `activity_log`, `pcp_lots`,
  `notifications`, `suppliers`, `collections`, `entity_events`, `production_routes`,
  `production_route_steps`, `production_orders`, `production_order_items`,
  `production_item_step_balance`, `production_passages`, `product_configurations`,
  `configuration_routes`.
- **13 faltam** — todas do fluxo de pedido, mais uma dependência dele:

| #   | Tabela                        | Trilha                                           |
| --- | ----------------------------- | ------------------------------------------------ |
| 1   | `materials`                   | dependência (FK de `sales_order_item_materials`) |
| 2   | `customers`                   | cliente do pedido                                |
| 3   | `catalog_products`            | catálogo de produto validado                     |
| 4   | `catalog_option_groups`       | grupos de opção do catálogo                      |
| 5   | `catalog_options`             | opções (cor, tecido, gola…)                      |
| 6   | `sales_orders`                | pedido                                           |
| 7   | `sales_order_items`           | itens                                            |
| 8   | `sales_order_item_sizes`      | grade                                            |
| 9   | `sales_order_item_options`    | opções escolhidas                                |
| 10  | `sales_order_item_materials`  | materiais do item (custo)                        |
| 11  | `sales_order_item_operations` | operações do item (custo)                        |
| 12  | `sales_order_item_costs`      | totais de custo (isolado por papel)              |
| 13  | `cost_settings`               | parâmetros de custo (markup, margem mínima)      |

As funções do fluxo também não existem em produção (`next_sales_order_number`,
`submit_sales_order`, `recalc_sales_order_item`, `approve_sales_order_item`,
`release_sales_order_to_pcp`, `order_item_technical_sheet`, `can_sell`,
`can_cost`).

**Por que aconteceu:** as migrations foram escritas e aplicadas no ambiente de
desenvolvimento, mas o Lovable publica o front-end; o banco de produção só recebe
migration quando alguém a aplica. Não há sincronização automática entre o
repositório e o banco do Lovable — o GitHub conectado ao Lovable é somente leitura
de saída (Lovable → GitHub).

---

## 2. O que aplicar

**Arquivo único:** [`APLICAR-EM-PRODUCAO.sql`](./APLICAR-EM-PRODUCAO.sql) (~88 KB).

Ele é a concatenação, na ordem correta, das 8 migrations:

1. `20261021080000_pcp_baseline.sql`
2. `20261021090000_sales_orders_enums.sql`
3. `20261021090100_sales_orders.sql`
4. `20261021090200_sales_cost_rounding.sql`
5. `20261021090300_sales_order_events_visibility.sql`
6. `20261021090400_sales_suggested_price.sql`
7. `materials` (Drizzle, necessária como FK)
8. `20261021090500_sales_technical_sheet_full.sql` (RPC da ficha técnica do pedido)

### Garantias

- **Não apaga nada.** Nenhum `DROP TABLE`, `TRUNCATE` ou `DELETE`.
- **Não altera tabela existente**, exceto: acrescentar valores de enum
  (`sales_order`, `sales_order_item`, `production_order`… — nenhum é removido) e
  ajustar `total_cost` para `numeric(14,4)` nas duas tabelas de custo criadas por
  ele mesmo.
- **Reexecutável.** Rodar duas ou três vezes seguidas não quebra: policies e
  triggers são recriados, tabelas e índices usam `IF NOT EXISTS`.
- **Falha cedo se o banco for outro.** Abre com uma guarda que exige
  `public.profiles`, `public.entity_events` e `public.production_routes` —
  exatamente o que a produção tem.

### Como foi validado

Não foi validado "lendo o SQL": foi executado numa **réplica fiel de produção**
(PostgreSQL 18.6, as 57 migrations do repositório + Drizzle `0000-0005,0011`,
58 tabelas, sem `materials` e sem `sales_*`). Log completo em
`entrega/fluxo-pedido/LOG-CERTIFICACAO-PRODUCAO.txt` (fora do repo):

| Etapa                                                  | Resultado                              |
| ------------------------------------------------------ | -------------------------------------- |
| Aplicação                                              | `exit=0`, 0 erros, 58 → **71 tabelas** |
| Reaplicação (2ª e 3ª vez)                              | `exit=0`, 0 erros                      |
| Tabelas do pedido                                      | **13 de 13**                           |
| Funções do fluxo                                       | **8 de 8**                             |
| RLS ligada nas tabelas de custo                        | **2 de 2**                             |
| Policies do pedido                                     | **19**                                 |
| Seed de `cost_settings`                                | OK                                     |
| Suíte SQL como usuário real (`SET ROLE authenticated`) | **69/69 asserções**                    |

---

## 3. Passo a passo para aplicar

> Tempo: ~2 minutos. Faça em horário de baixo uso — as tabelas são novas, então
> não há bloqueio de dados existentes.

### 3.1 Aplicar

1. Abra o projeto no **Lovable**.
2. **More (⋯) → Cloud → SQL editor** (ou, se preferir o painel do Supabase:
   **SQL Editor → New query**).
3. Abra o arquivo `docs/producao/APLICAR-EM-PRODUCAO.sql` do repositório.
4. **Copie o arquivo inteiro** e cole no editor.
5. Execute (**Run**).

> ⚠️ Não é preciso colar em partes: o arquivo é um script único. Se o editor
> cortar por limite de tamanho (raro para 88 KB), aplique em 3 blocos, sempre na
> ordem, parando em um comentário `-- ====`. Como o script é reexecutável, repetir
> um bloco não faz mal.

### 3.2 Verificar (obrigatório)

O final do arquivo tem um bloco comentado de **VERIFICAÇÃO**. Selecione-o,
descomente (`--`) e rode em uma execução nova. Esperado:

```
 tabelas do pedido       | 13 de 13
 funcoes do fluxo        | 8 de 8
 RLS ligada (custo)      | 2 de 2
 politicas RLS do pedido | 19 politicas
 settings de custo       | seed OK
```

O mesmo teste por fora, na API (substitua a chave pela publishable do projeto):

```bash
KEY=sb_publishable_...
URL=https://njmniwsqwohmigroswnl.supabase.co

for t in customers sales_orders sales_order_items catalog_products cost_settings; do
  code=$(curl -s -o /dev/null -w '%{http_code}' \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    "$URL/rest/v1/$t?select=id&limit=1")
  # antes: 404 (tabela inexistente). depois: 200/401/403 — qualquer coisa menos 404
  echo "$t -> $code"
done
```

`404` com corpo `PGRST205` = a tabela não existe. `200` com `[]` ou
`401/403` = a tabela existe e o RLS está barrando o acesso anônimo (o esperado).

### 3.3 Teste de fumaça, como usuário real

Com um usuário que tenha papel `comercial` (ou `admin`):

1. **Pedidos → Novo pedido**: escolher cliente, produto do catálogo, grade e
   quantidades. Salvar como rascunho.
2. **Enviar para análise** → status muda para `enviado`.
3. Trocar para um usuário de **engenharia de custo**: abrir o item, revisar
   materiais/operações, **Calcular custo**. Conferir que o custo aparece.
4. **Aprovar** → item aprovado com preço sugerido.
5. **Liberar para o PCP** → surge a ordem de produção em **Programação**.
6. Logar de novo como **comercial** e abrir o mesmo item: **o custo não deve
   aparecer** (RLS `so_costs_read` exige `can_cost`).

Se os 6 passos funcionarem, o fluxo está vivo em produção.

---

## 4. Se algo der errado

- **Guarda disparou** (`Banco inesperado: public.profiles não existe`): você está
  no banco errado. Nada foi criado.
- **Erro no meio**: anote a linha e a mensagem. Como tudo é reexecutável, corrija
  a causa e rode de novo — o que já passou não repete trabalho.
- **Rollback completo**: as 13 tabelas são novas e ninguém mais depende delas.
  ```sql
  DROP TABLE IF EXISTS public.sales_order_item_costs, public.sales_order_item_operations,
    public.sales_order_item_materials, public.sales_order_item_options,
    public.sales_order_item_sizes, public.sales_order_items, public.sales_orders,
    public.catalog_options, public.catalog_option_groups, public.catalog_products,
    public.cost_settings, public.customers, public.materials CASCADE;
  ```
  Os valores de enum acrescentados podem ficar: enum não se remove no Postgres e
  eles são inofensivos.

---

## 5. Depois de aplicar

- **Front-end não precisa de novo deploy** — o app publicado já chama essas
  tabelas e RPCs; ele só estava recebendo 404.
- **Papéis**: para o menu comercial aparecer, o usuário precisa de papel
  `comercial` (ou `admin`/`manager`/`diretor_produto`) em `user_roles`; custo,
  `engenharia_custo`/`coordenador_produto`. Sem papel, a tela abre vazia — é RLS,
  não bug.
- **Migrations futuras**: para não repetir o problema, toda migration nova deve
  ser aplicada em produção no mesmo dia em que entra na `main`. O repositório é a
  fonte de verdade do schema; o banco do Lovable, não.

## 6. Pendências conhecidas (não bloqueiam o pedido)

- `/tech-sheet` ainda é uma tela estática; a ficha real sai da RPC
  `order_item_technical_sheet`.
- Capacidade pç/dia do PCP e `/production.today` continuam com dados derivados;
  `/quality` é estático.

---

## 7. Acessos e papéis

Não existe papel `superadmin` no schema: o topo é **`admin`**, e ele cobre todas
as telas e recursos — as quatro funções de permissão (`can_sell`, `can_cost`,
`can_plan_pcp`, `can_write_pcp`) e todas as políticas RLS que citam papel incluem
`admin`. Não há gate que exclua admin.

Para revisar um usuário e conceder acesso total:

1. **`CONCEDER-ADMIN.sql`** — mostra o usuário, o perfil e os papéis atuais,
   concede `admin` (idempotente), avalia cada gate e lista 14 telas com a
   exigência de cada uma.
2. **`DIAGNOSTICO-PEDIDO.sql`**, seção 3, lista todos os usuários e seus papéis.

### Defeito corrigido: nem admin conseguia conceder papel pela tela

`public.user_roles` tinha apenas `GRANT SELECT` para `authenticated`. A política
RLS "Only admin manages roles" já limitava a escrita a admin, mas o `INSERT`
falhava **antes** de a política ser avaliada, com
`permission denied for table user_roles`. Na prática, a tela `/admin/users` não
conseguia conceder nem revogar papel nenhum.

Correções (ambas já no repositório):

- `supabase/migrations/20261021120000_user_roles_grants.sql` — concede
  `SELECT, INSERT, UPDATE, DELETE` a `authenticated`; a RLS continua exigindo
  admin, então não há escalada de privilégio.
- `/admin/users` passou a oferecer os **16 papéis** do enum (antes só 4:
  admin, manager, operator, viewer). Os papéis do fluxo de pedido — `comercial`,
  `engenharia_custo`, `pcp` — eram impossíveis de atribuir pela interface.

O bloco 3.0 do `CONCEDER-ADMIN.sql` já contém o `GRANT`, para resolver os dois
problemas com uma única colagem.
