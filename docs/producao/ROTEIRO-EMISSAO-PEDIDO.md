# Onde fica a emissão de pedido

Resposta curta: **menu lateral → grupo `Go-to-Market` → `Pedidos`**
(`https://plmuse.lovable.app/orders`).

Não é em **Comercial**. Essa tela (`/commercial`) ainda é painel de demonstração
— mostra "Vendas Brutas Mes", "Ticket Médio" e uma lista fixa de clientes. Não
tem emissão de pedido e não lê o banco. É a confusão mais provável: o vendedor
entra em "Comercial" e conclui que o fluxo não existe.

O fluxo real fica em duas telas:

| Tela                 | Onde no menu               | Rota       |
| -------------------- | -------------------------- | ---------- |
| **Catálogo técnico** | PLM · Produto → Engenharia | `/catalog` |
| **Pedidos**          | Go-to-Market               | `/orders`  |

---

## Por que as opções de emissão não aparecem

São três motivos possíveis, e eles se acumulam. Confira na ordem:

| O que você vê                                                           | Causa                                      | O que fazer                                               |
| ----------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------- |
| Faixa amarela **"Fluxo de pedidos ainda não ativo"** no topo de Pedidos | as tabelas do fluxo não existem no banco   | aplicar `APLICAR-EM-PRODUCAO.sql`                         |
| Tela Pedidos abre, lista vazia, **sem o botão `+ Novo pedido`**         | seu usuário não tem papel comercial        | `DIAGNOSTICO-PEDIDO.sql`, seção 3 e 4                     |
| Botão existe, mas em **"Adicionar item ao pedido"** não há produto      | catálogo vazio — nenhum produto `validado` | `SEED-CATALOGO-DEMO.sql` ou cadastrar no Catálogo técnico |
| **`Pedidos` não aparece no menu**                                       | você não está autenticado                  | `/login`                                                  |

Verificado em 21/10/2026: as 13 tabelas do fluxo continuam **ausentes** em
produção (a API responde `404 PGRST205`). Enquanto isso não mudar, a faixa amarela
vai aparecer — e é o sinal de que você está na tela certa.

O botão `+ Novo pedido` só é renderizado para quem tem um destes papéis em
`user_roles`: `admin`, `manager`, `comercial`, `diretor_produto`. Não é permissão
de menu (todo mundo vê o item "Pedidos"); é o papel que libera o botão e a
escrita no banco.

---

## O caminho completo, passo a passo

| #   | Onde                                           | Ação na tela                                                                                                    | Quem pode                                                     |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | Catálogo técnico `/catalog`                    | `+ Novo produto` → código, nome, mínimo, grade → salvar → **`Validar`**. Só produto `validado` pode ser vendido | `admin`, `manager`, `engenharia_custo`, `coordenador_produto` |
| 2   | Pedidos `/orders`                              | **`+ Novo pedido`** → cliente (ou cadastro rápido no próprio diálogo) → salvar                                  | `admin`, `manager`, `comercial`, `diretor_produto`            |
| 3   | Pedido aberto → **`Adicionar item ao pedido`** | produto validado + quantidade (≥ mínimo do catálogo) + grade + opções + preço unitário                          | idem                                                          |
| 4   | Pedido aberto                                  | **`Enviar para custo`** — o banco explode o catálogo em materiais e operações                                   | idem                                                          |
| 5   | Mesmo pedido, logado como custo                | **`Recalcular`** na aba de custo → confere materiais, operações, setup, margem                                  | `admin`, `manager`, `engenharia_custo`, `coordenador_produto` |
| 6   | Mesmo pedido                                   | **`Aprovar`** por item (margem abaixo do mínimo exige gestor)                                                   | idem                                                          |
| 7   | Mesmo pedido                                   | **`Liberar para PCP`** → a OP nasce em **Programação** (`/planner`) com a rota da configuração                  | `admin`, `manager`, `pcp`                                     |

Filtro útil: em `/orders`, a aba **"Aguardando custo"** é a fila da engenharia —
é ali que o passo 5 começa, sem precisar procurar pedido por pedido.

O vendedor **nunca** vê custo: a RLS devolve zero linhas em
`sales_order_item_costs` para quem não é de custo. Se aparecer valor de custo na
sua tela logado como comercial, é bug — me avise.

---

## Ordem de aplicação (para liberar tudo)

```text
1. APLICAR-EM-PRODUCAO.sql     -> cria as 13 tabelas e 8 funções
   (se o editor cortar: partes/parte1 -> parte2 -> parte3)
2. DIAGNOSTICO-PEDIDO.sql      -> confirma 13/13, 8/8 e mostra os papéis
3. KARILU-SEED.sql             -> os 5 produtos reais da vitrine + opções
4. KARILU-BASE.sql             -> dados-base (estoque, clientes, ficha PLM)
5. KARILU-PEDIDOS.sql          -> pedidos de demonstração para o fluxo
6. KARILU-FIX-NOTIF.sql        -> conserta o gatilho de estoque (severity 'warn')
7. KARILU-ROTAS.sql            -> configurações + rotas PCP dos 5 produtos.
   SEM ISTO O FLUXO MORRE NO ÚLTIMO PASSO: o release exige configuration_id
   com rota default e levanta 'sem rota padrao'. Prova do arquivo: 5 linhas,
   etapas 6/5/5 por perfil (subl+bord / bord / subl).
8. Recarregar o app (F5)

(SEED-CATALOGO-DEMO.sql ficou obsoleto — o KARILU-SEED traz produtos reais.)

> Se o botão `+ Novo pedido` não aparecer depois disso, o bloqueio é papel. Rode
> `CONCEDER-ADMIN.sql` (acesso total) ou a seção 4 do `DIAGNOSTICO-PEDIDO.sql`
> (papel `comercial`). Ver `SINCRONIZAR-PRODUCAO.md`, seção 7.
```

O passo 3 é opcional e cria o produto **`DEMO-CAM-FUT-2026`** — "Camisa futebol
(DEMO)", mínimo 10 peças, grade P–3G, com produção, personalização (bordado,
sublimação) e gola. Serve para você percorrer os 7 passos hoje. No fim do arquivo
há o `DELETE` para apagar quando cadastrar o produto real.

Observação de produto: **o catálogo nasce vazio** e isso não é bug. O desenho é
deliberado — o vendedor não digita especificação técnica; ele escolhe produto que
a engenharia já validou. Sem produto validado, o passo 3 não tem o que listar.
