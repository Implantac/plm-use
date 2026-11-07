# Onda 37 — A UI não promete o que o banco não tem

**Data:** 06/11/2026 · **Antecessor:** `21df9d6` (Onda 36 + docs)

---

## 1. O marco foi validado, não confirmado

O dono reportou **"projeto publicado"**. Em vez de aceitar, re-medi as três
camadas. Desta vez a publicação foi real:

| Camada        | 13ª medição                               | **14ª medição**                                             |
| ------------- | ----------------------------------------- | ----------------------------------------------------------- |
| Repositório   | Onda 36 (`21df9d6`)                       | Onda 36 (`21df9d6`)                                         |
| App publicado | Onda 29 (`index-1d8-RbIh.js`, 218 chunks) | **Onda 36** — entry **`index-DDU6Ug_A.js`**, **221 chunks** |
| Banco         | sem migrações 21/24                       | **sem migrações 21/24**                                     |

Marcadores de tela contados no bundle novo (todos presentes):

| Onda | Marcador                                                        | Ocorrências |
| ---- | --------------------------------------------------------------- | ----------- |
| 29   | `rfq-sem-ficha`, `showroom-sem-ficha`                           | 1 / 1       |
| 30   | `omnichannel-sem-ficha`, `kanban-sem-ficha`, `DRE não apurável` | 1 / 1 / 4   |
| 31   | `cockpit-sem-ficha`, `gemeo-sem-ficha`, `os-sem-ficha`          | 1 / 1 / 2   |
| 33   | `país de origem declarado`, `composição ABNT declarada`         | 1 / 1       |
| 34   | `Risco CAD não declarado`, `Plano de corte não apurável`        | 1 / 3       |
| 35   | `A referência de origem não tem ficha salva`                    | 1           |
| 36   | `Fichas sem engenharia`, `sem engenharia custeada`              | 1 / 3       |

**Pela primeira vez na série, ar e repo estão na mesma onda.** O banco, não:
`stock_reservation_aging` → `404 PGRST205`; `consume_reservations_on_movement`,
`record_op_material_consumption`, `op_reserved_materials` → `404 PGRST202`.
Publicar app não aplica SQL — confirmado mais uma vez, agora com o app na Onda 36.

---

## 2. O que a publicação revelou

Com as sete ondas finalmente no ar, validei a frase que a série inteira
denunciava. Extraí o contexto direto do bundle publicado:

```js
// _authenticated.inventory-DWVO8C0d.js
"Consumo e liberação são automáticos: a saída de estoque consome a reserva e a
 OP concluída ou cancelada libera o que sobrar. Os botões abaixo são para
 ajuste manual."
```

O texto aparece **1 vez, incondicional**, no card "Reservas ativas". No mesmo
bundle, `stock-lifecycle-CGHgF4FA.js` já detecta `PGRST202`/`PGRST205` e decide
entre `verificando` / `ativa` / `pendente`. Ou seja: **a sonda existe e funciona,
mas o painel não a escutava**.

A causa no repo é quase engraçada: `ReservationsPanel.tsx` já importava
`useStockLifecycle()` e `MENSAGEM_MIGRACAO_PENDENTE` desde a Onda 26, chamava
`const ciclo = useStockLifecycle()` — e **nunca lia `ciclo`**. Código morto. O
operador lia a promessa e esperava um consumo automático que o banco não faz.

---

## 3. A correção

`ReservationsPanel.tsx` passou a ter três estados declarados, com o mesmo
vocabulário visual que a aba Material da OP (`OpMaterialsTab`) já usava:

| `ciclo`       | O que o operador vê                                                                                                                                                          | `data-testid`               |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `verificando` | "Verificando se o ciclo automático da reserva está aplicado neste banco…" — sem promessa e sem acusação                                                                      | `reserva-ciclo-verificando` |
| `pendente`    | Caixa âmbar "Ciclo automático indisponível neste banco" + `MENSAGEM_MIGRACAO_PENDENTE`, que nomeia `APLICAR-ONDA-21-24.sql` e diz que a reserva só muda pelos botões manuais | `reserva-migracao-pendente` |
| `ativa`       | Texto original de automação                                                                                                                                                  | `reserva-ciclo-ativo`       |

Nenhum botão foi removido: com a migration pendente eles são o **único**
caminho, e a mensagem agora diz isso explicitamente.

Escopo deliberado: a aba Material (`OpMaterialsTab`) já tratava
`PGRST202`/`PGRST205` desde a Onda 26, e `OutsourcingServiceOrderPanel` fala de
"apuração automática de glosa", que é cálculo local, não RPC de reserva. Não
havia outro texto de automação ligado ao banco para corrigir.

---

## 4. Prova

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **526/526** (eram 522)             |

**4 testes novos** (`ReservationsPanel.test.tsx`, jsdom, com a sonda mockada nos
três estados): pendente mostra o aviso, cita o SQL e **não** contém a promessa;
verificando não promete nem acusa; ativa é o único estado que anuncia automação;
e uma guarda de fonte exige que o texto da promessa esteja **depois** do ramo
`ciclo === "ativa"`, que `MENSAGEM_MIGRACAO_PENDENTE` esteja no JSX e que o
testid do aviso exista.

---

## 5. Estado depois da Onda 37

| Camada        | Estado                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------ |
| Repositório   | **Onda 37** (este commit)                                                                  |
| App publicado | **Onda 36** — a correção deste painel **ainda não está no ar**; precisa de nova publicação |
| Banco         | sem as migrações 21/24                                                                     |

O ar volta a ficar **uma onda** atrás do repo. Enquanto o SQL não for aplicado,
a UI publicada (Onda 36) continua exibindo a promessa falsa — a Onda 37 só
passa a valer para o operador depois de republicar. A ordem correta continua
sendo: **aplicar `APLICAR-ONDA-21-24.sql` no SQL editor** (reportar as 3
NOTICEs) e **publicar a Onda 37**. São ações distintas.

---

## 6. O que resta

1. **Banco** — `APLICAR-ONDA-21-24.sql` no SQL editor de
   `njmniwsqwohmigroswnl`; só depois cancelar as reservas presas usando
   `stock_reservation_aging.dias_ativa`.
2. **Publicar** a Onda 37.
3. **Credencial** `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` para o e2e autenticado.
4. **`ensure()` como template** — sem chamadores em produção desde a Onda 35,
   mas ainda cria o modelo inteiro; decidir se sai de vez.
5. **Vitrines declaradas** — `ai-agents.tsx` com dois `seedFor()`,
   `INITIAL_GTM_CAMPAIGNS`, `photorealism`. `DEV000006` ainda aparece **29
   vezes** no bundle publicado.
