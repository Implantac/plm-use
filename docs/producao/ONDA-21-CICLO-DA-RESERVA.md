# Onda 21 — Ciclo de vida da reserva de estoque

**Data:** 04/11/2026 · **Commit:** (ver `git log -1`) · **Antecessor:** `29ff4c6` (Onda 20)

---

## 1. O defeito

A liberação de pedido para o PCP cria reservas de material:

```
release_sales_order_to_pcp()  →  INSERT INTO stock_reservation (..., 'ativa')
```

E a view `stock_balance` calcula o disponível assim:

```
disponível = qty_on_hand − qty_reserved(ativa)
```

O problema: **nada nunca tirava a reserva de `ativa`**. Os status `consumida` e
`cancelada` existiam no schema, mas o único caminho que os atribuía era o clique
manual nos botões do `ReservationsPanel` em `/inventory`. Nenhuma função, trigger
ou job fazia isso.

Consequência em cadeia:

1. cada liberação de pedido diminuía o disponível e ele **nunca voltava**;
2. a saída física do material (o PCP consumindo o tecido) **não** zerava a reserva,
   então o mesmo material era descontado **duas vezes** — uma pela saída, outra pela
   reserva que continuava presa;
3. como o MRP passou a ler `stock_balance` na Onda 19, o efeito final é **ruptura
   fantasma**: o sistema pede compra de um material que está na prateleira.

## 2. Reprodução — caminho real, antes e depois

`scripts/prova-ciclo-reserva.sql` monta um pedido aprovado de 10 peças (2 m/un =
20 m de tecido), chama a RPC real `release_sales_order_to_pcp`, registra a saída
física de 20 m e conclui a OP. Rodado em dois bancos limpos: um **sem** e outro
**com** a migration desta onda.

| Momento                    | ANTES (disponível) | DEPOIS (disponível) |
| -------------------------- | ------------------ | ------------------- |
| Depois de liberar o pedido | 80 (100 − 20)      | 80 (100 − 20)       |
| PCP consumiu os 20 m       | **60** ❌          | **80** ✅           |
| OP concluída               | **60** ❌ (preso)  | **80** ✅           |

Estado da reserva:

| Momento             | ANTES                         | DEPOIS                                |
| ------------------- | ----------------------------- | ------------------------------------- |
| Após a saída física | `ativa`, `consumed_at = null` | `consumida`, `consumed_at` preenchido |
| Após concluir a OP  | `ativa` (eterna)              | `consumida`                           |

Com estoque físico de 80 m, a versão antiga informava 60 m disponíveis. Cada
pedido liberado cavava um buraco permanente no disponível.

## 3. A correção — `20261104120000_stock_reservation_lifecycle.sql`

Três peças, nenhuma delas apaga dado:

**a) Saída física consome reserva.** Trigger `AFTER INSERT ON stock_movement`:
para `kind='out'`, percorre as reservas `ativa` do mesmo item/armazém em FIFO
(`created_at, id`, `FOR UPDATE`), consumindo inteira (`status='consumida'`,
`consumed_at`) ou parcialmente (reduz `qty` e a reserva segue ativa).

`transfer_out` **não** consome: transferência entre armazéns é movimento interno,
o material continua na empresa. `in`, `adjust` e `count` também não.

**b) OP encerrada libera o resto.** Trigger `AFTER UPDATE OF status ON
production_orders`: OP em `cancelada`/`concluida` chama
`cancel_reservations_for_ref('op', id, motivo)`, que marca `cancelada` +
`cancelled_at` nas reservas ainda ativas daquela OP. A função é
`SECURITY DEFINER` com `REVOKE EXECUTE FROM public, anon, authenticated` — não é
API pública, existe para uso dos triggers (confirmado: `authenticated` e `anon`
não têm EXECUTE).

**c) Visibilidade.** View `stock_reservation_aging` lista as reservas ativas com
`dias_ativa`, para achar reserva parada antes de ela virar ruptura fantasma.

A migration é idempotente (reaplicar não gera erro).

## 4. Teste — `60_reserva_lifecycle.sql` (9 asserções)

Entrada não consome · `transfer_out` não consome · FIFO consome a mais antiga
inteira · consumo parcial 20 → 15 · reserva fora de alcance segue ativa · OP
cancelada libera · OP concluída libera · nenhuma reserva fica presa em `ativa` ·
view de aging responde. Limpa tudo ao final.

**Defeito achado no próprio teste:** as três reservas nasciam num único `INSERT`,
logo com o mesmo `now()`, e o desempate FIFO caía no `uuid` — ordem arbitrária.
O teste passava sozinho e **falhou na suíte completa** (ordem de uuid diferente).
Corrigido dando `created_at` explícito e distinto a cada reserva. Em produção cada
liberação é um `INSERT` próprio, então `created_at` ordena de verdade.

## 5. Tela — `/inventory`

`ReservationsPanel` deixou de ser o "único caminho" e passou a ser o ajuste
manual. O cabeçalho agora explica que consumo e liberação são automáticos, e
reserva ativa há mais de 30 dias ganha um selo **"Xd parada"** (mesma ideia da
view de aging, visível para quem opera).

## 6. Provado × não provado

| Item                                                | Estado                                                        |
| --------------------------------------------------- | ------------------------------------------------------------- |
| Suíte SQL completa em banco limpo (`certify-db.sh`) | ✅ 70 migrations, **148 asserções**, exit 0                   |
| Defeito reproduzido no caminho real da RPC          | ✅ tabela da seção 2                                          |
| Correção no caminho real                            | ✅ idem                                                       |
| Idempotência da migration                           | ✅ reaplicada sem erro                                        |
| `tsc` / eslint / prettier / vitest                  | ✅ 0 erros · 20 warnings preexistentes · limpo · **349/349**  |
| Migration aplicada no Supabase de produção          | ❌ **não aplicada** — precisa de `supabase db push` pelo dono |
| Botão "Xd parada" visto no navegador em produção    | ❌ não provado (exige login)                                  |

## 7. O que falta do lado operacional

1. **Aplicar a migration no Supabase hospedado.** Sem isso o defeito continua
   ativo nos dados reais. As 148 asserções provam que a migration funciona; elas
   não a aplicam.
2. **Reservas antigas já presas**: a migration não apaga nada — reservas `ativa`
   de OPs antigas continuam contando. A `stock_reservation_aging` existe para
   isso: ordenar por `dias_ativa` e cancelar o que já foi consumido na prática.
3. **Republicar o app.** O bundle em `plmuse.lovable.app` ainda é o da Onda 19
   (Ondas 20 e 21 não estão no ar).
