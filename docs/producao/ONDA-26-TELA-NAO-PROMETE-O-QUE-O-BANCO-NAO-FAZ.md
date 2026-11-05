# Onda 26 — A tela não promete o que o banco não faz

**Data:** 05/11/2026 · **Antecessor:** `c6a4acc` (medição de sincronia)

---

## 1. O que a publicação revelou

O app foi republicado: `/login` agora serve o build **Onda 25** (entry
`index-BCX5Of78.js`, marcadores das Ondas 20 a 25 presentes). O banco, porém,
continua sem as migrações que mudam dados.

Medição com a chave publishable que o próprio bundle carrega, em
`https://njmniwsqwohmigroswnl.supabase.co`:

| Objeto                               | Esperado por | Resposta           |
| ------------------------------------ | ------------ | ------------------ |
| view `stock_reservation_aging`       | Onda 21      | **404** `PGRST205` |
| RPC `cancel_reservations_for_ref`    | Onda 21      | **404** `PGRST202` |
| RPC `op_reserved_materials`          | Onda 24      | **404** `PGRST202` |
| RPC `record_op_material_consumption` | Onda 24      | **404** `PGRST202` |

Consequência direta: **duas telas no ar mentem**.

1. `/inventory` → painel de reservas diz _"consumo e liberação são automáticos"_.
   Não são: o trigger não existe no banco.
2. `/production` → aba Material da OP oferece **"Dar baixa do material"**. A RPC
   responde 404.

## 2. O bug que eu mesmo introduzi na Onda 24

`OpMaterialsTab` tratava qualquer erro da RPC como lista vazia. Com a RPC
inexistente, a tela caía no estado vazio e exibia:

> "Esta OP não tem material reservado em aberto."

Isso é **pior** que mostrar erro: o operador conclui que a OP está abastecida
quando na verdade não foi possível ler nada.

## 3. Correção

**`src/lib/inventory/stock-lifecycle.ts`**

- `isMissingDatabaseObject(error)` reconhece `PGRST202`, `PGRST205`, `42883`,
  `42P01` e as mensagens de schema cache — sem confundir com erro real
  (`08006`, `23505`, …).
- `stockLifecycleAvailable()` sonda `stock_reservation_aging` **uma vez por
  sessão** (promessa em cache, sem enxurrada de requisições).
- `useStockLifecycle()` devolve `verificando | ativa | pendente`.

**`OpMaterialsTab`** — três estados agora distintos:

| Situação                      | O que a tela mostra                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| migração ausente (`PGRST202`) | aviso âmbar "Baixa de material indisponível neste banco" + como aplicar; botão desabilitado |
| erro real (rede, permissão)   | bloco vermelho com a mensagem **e** botão "Tentar de novo"                                  |
| leitura ok e nada reservado   | explicação de que reservas nascem na liberação do pedido                                    |

**`ReservationsPanel`** — o texto sobre automação só aparece quando a view de
aging existe. Sem ela, entra um aviso âmbar com o caminho de correção.

O mesmo padrão já existia para o fluxo de pedido (`isMissingTable` +
`MIGRATION_HINT` em `src/lib/sales/api.ts`); agora está aplicado ao estoque.

## 4. Pacote de aplicação — `docs/producao/APLICAR-ONDA-21-24.sql`

As duas migrations que mudam o banco, na ordem (a Onda 24 redefine a função de
trigger da 21), com:

- cabeçalho explicando o diagnóstico medido;
- bloco **VERIFICAÇÃO** ao final: 3 assertivas (view, RPC, os 2 triggers) e
  `NOTIFY pgrst, 'reload schema'` para a API enxergar o que foi criado.

Validado em Postgres 18.6 com o schema do repositório:

| Cenário                                    | Resultado                    |
| ------------------------------------------ | ---------------------------- |
| Banco limpo, aplicar 1×                    | ✅ 3/3 na verificação        |
| Aplicar 2× (reexecução)                    | ✅ 3/3, sem erro             |
| Suíte SQL completa sobre o pacote aplicado | ✅ **163 asserções**, exit 0 |

## 5. Gates

| Gate           | Resultado                                                |
| -------------- | -------------------------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                                               |
| eslint         | ✅ 0 erros, 20 warnings preexistentes                    |
| prettier       | ✅ limpo                                                 |
| vitest         | ✅ **395/395** (eram 384; +8 da sonda, +3 do componente) |
| Suíte SQL      | 163 asserções (inalterada; o pacote não muda schema)     |

## 6. Provado × não provado

| Item                                               | Estado                                        |
| -------------------------------------------------- | --------------------------------------------- |
| Tela distingue "migração ausente" de "lista vazia" | ✅ teste de componente com `PGRST202`         |
| Sonda pergunta uma vez por sessão                  | ✅ teste                                      |
| Pacote aplica, reaplica e sustenta a suíte         | ✅ Postgres local                             |
| Aviso aparece no navegador em produção hoje        | ❌ não verificado (exige login)               |
| Banco de produção migrado                          | ❌ **continua pendente** — é a ação que falta |

## 7. O que continua sem solução

Nada do que eu escrever aqui resolve o fato de que **a ordem de publicação está
invertida**: o app saiu antes do banco. A correção já está no repositório e
deixa a UI honesta, mas a automação só passa a existir com o pacote aplicado.

Próximo passo, em ordem: aplicar `APLICAR-ONDA-21-24.sql` → rodar o bloco de
verificação → recarregar a página (o aviso âmbar desaparece sozinho, porque a
sonda é por sessão).
