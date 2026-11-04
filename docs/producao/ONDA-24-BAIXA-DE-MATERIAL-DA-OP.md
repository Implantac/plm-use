# Onda 24 — O PCP passa a dar baixa no material da OP

**Data:** 04/11/2026 · **Antecessor:** `f405b06` (Onda 23)

---

## 1. O loop estava aberto no meio

A Onda 21 fez a reserva ter fim: **saída física consome em FIFO**, OP concluída
ou cancelada libera o resto. Mas ninguém dentro do PCP conseguia gerar essa
saída. O caminho real era:

> almoxarife abre `/inventory` → escolhe o insumo no olho → digita a quantidade →
> registra. Item por item, sem relação com a OP, sem saber quanto a OP reservou.

E o `MovementDialog` **nem enviava `ref_type`/`ref_id`**, embora a RPC aceitasse:
a movimentação não aparecia na OP e o consumo não era atribuído a ordem nenhuma.

Resultado prático igual ao da Onda 21: reserva ativa para sempre, disponível
furado, MRP pedindo compra de material que já saiu da prateleira.

## 2. O que a Onda 24 entrega

### `record_op_material_consumption(_order_id)` — migration `20261104200000`

Para cada reserva ativa daquela OP (`ref_type='op'`, `ref_id=_order_id`):

1. lê o saldo físico do par item/armazém (`stock_on_hand`);
2. **com saldo** → registra `stock_movement kind='out'` com `ref_type='op'` e
   `ref_id` da OP, e fecha a reserva (`consumida` + `consumed_at`);
3. **sem saldo** → devolve o item em `curtos` (com `falta` calculada), **não**
   inventa movimento e **mantém a reserva ativa**, porque o MRP precisa continuar
   vendo a necessidade.

Permissão: `has_stock_write_role` (admin, gestor, almoxarifado). PCP planeja, não
dá baixa — é a separação deliberada entre planejamento e almoxarifado.

### O ponto delicado: atribuição por OP, não FIFO

O trigger da Onda 21 consome **FIFO por item/armazém**. Se a OP nova baixa 20 m e
existe uma reserva de 10 m mais antiga de **outra** OP, o FIFO fecharia a reserva
da vizinha e deixaria a desta OP pendurada — atribuição errada, aging mentindo.

A função marca a transação com `app.skip_reservation_consume = 'on'` e fecha
explicitamente a reserva da própria OP; o trigger respeita a marca. Há teste
específico para esse cenário (`a reserva da OP vizinha continua ativa e intacta`).

### `op_reserved_materials(_order_id)`

Leitura para a tela: insumo, quantidade reservada, saldo físico e dias parada.

### Tela — aba **Material** no workspace da OP

`/production` → abrir uma OP → aba **Material**:

- tabela do que está reservado, com saldo físico e selo de dias parada;
- aviso quando algum insumo reservado não tem saldo;
- botão **Dar baixa do material** (desabilitado para quem não é do estoque, com
  explicação em vez de erro seco);
- resumo da última baixa, separando o que saiu do que ficou curto.

### `/inventory` — vínculo com a OP na saída avulsa

O `MovementDialog` ganhou o campo **Vincular a uma OP** (opcional, só em saída),
enviando `ref_type='op'` e `ref_id`. Saída avulsa continua existindo (perda,
transferência, ajuste), mas agora dá para dizer a que OP ela pertence — e o texto
aponta a aba Material para a baixa completa.

## 3. Testes

`supabase/tests/70_consumo_material_op.sql` — **15 asserções**:

- a tela vê os 2 insumos reservados e o saldo físico;
- `operator` (sem papel de estoque) **não** consome;
- baixa dos 2 insumos, movimentos ligados à OP, soma 20 m + 30 un;
- **a reserva fechada é a da própria OP, não a mais antiga da vizinha**;
- a reserva da OP vizinha continua ativa;
- disponível do tecido volta a refletir a realidade (80 − 10 = 70);
- segunda chamada não consome de novo e não duplica movimento;
- insumo sem saldo volta como curto, sem saída registrada, reserva segue ativa;
- OP cancelada libera o que sobrou (Onda 21 continua valendo).

`OpMaterialsTab.test.tsx` — **5 casos** (jsdom, `renderHook`/`render`):
lista reservas, chama a RPC certa na baixa e recarrega, desabilita para quem não
é do estoque, avisa insumo sem saldo, explica quando não há reserva.

Prova de ponta a ponta no banco: saída avulsa de 8 m ligada a uma OP → estoque 50
→ 42, reserva `consumida`, disponível 42.

## 4. Gates

| Gate                           | Resultado                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `certify-db.sh` em banco limpo | ✅ 71 migrations, **163 asserções**, exit 0                                                                |
| `tsc --noEmit`                 | ✅ 0 erros                                                                                                 |
| eslint                         | ✅ 0 erros, 20 warnings preexistentes                                                                      |
| prettier                       | ✅ limpo                                                                                                   |
| vitest                         | ✅ **378/378** (eram 373) — `OrderDetail.test.tsx` falhou 1× e passou na rodada seguinte (flake conhecido) |

## 5. Provado × não provado

| Item                                          | Estado                                            |
| --------------------------------------------- | ------------------------------------------------- |
| Atribuição do consumo à OP certa              | ✅ teste SQL com duas OPs                         |
| Falta de saldo não gera movimento fantasma    | ✅ teste SQL                                      |
| Permissão: PCP não dá baixa                   | ✅ teste SQL + teste de UI                        |
| Aba renderiza e chama a RPC correta           | ✅ teste de componente com `supabase.rpc` mockado |
| Tela real no navegador, com dados de produção | ❌ exige login                                    |
| Migration aplicada no Supabase hospedado      | ❌ precisa de `db push`                           |
| Build publicado tem esta onda                 | ❌ o ar continua na Onda 19                       |

## 6. Resíduo conhecido

- A baixa é **manual por OP** (um clique), não automática na conclusão. Automatizar
  exigiria decidir consumo parcial e sobra de material; o clique explícito deixa o
  almoxarife ver o que vai sair antes de sair.
- `stock_on_hand` usa a view `stock_balance`, que trata `adjust`/`count` conforme a
  view define — não recalcula nada por conta própria.
- Transferência entre armazéns continua **não** consumindo reserva (decisão da
  Onda 21): o material não sai da empresa.
