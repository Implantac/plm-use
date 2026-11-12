# Onda 67 — carteira B2B, fluxo de caixa e sacola nascem vazios

**Medição:** 61ª. **Repo:** `478df53` (Onda 66) local = remoto, limpo, token
0/0. **Ar:** entry novo `index--0psZgO_.js` / `index-DXm9SpcR.js` (**214
chunks / 3.206.452 bytes**, 0 falhas) com marcadores da 66 = 1/1/1
(`pieces-report-demo`, `centro-desenvolvimento-demo`,
`referencia-drawer-demo`), "só demonstração na lista" = 4, marcador da 65
= 1 e `DEV000006` = 18 — **publicação da Onda 66 relatada pelo dono e
validada por cliques em produção** (`/pieces-report` com as 4 métricas em
`—`, `/development` com filtros em `—`, 0 `pageerror`; capturas
`/home/user/medicao61-prod-pieces-report.png` e
`/home/user/medicao61-prod-development.png`). **Banco:** view `200 []`, 4
funções `401 42501` (com parâmetros corretos), SQL SHA `382f0f19…`
inalterado.

## Risco medido

A varredura das outras referências de demonstração mediu `U25-014` (8
ocorrências) e `I25-088` (5) fora de testes. Nas camadas de cálculo elas já
estavam cobertas (campanhas GTM `demo: true`, OS de outsourcing
`demo: true`, `cfo-dre` MODELO_REFS fora dos acumuladores,
`resolveReferenceTechSheet` sem ficha inventada desde a Onda 32). Mas a
varredura de **formulários pré-preenchidos** — o mesmo padrão das Ondas 64
e 66 — achou três vazamentos restantes, provados por cliques antes de
corrigir:

1. **`/commercial`** — `DEFAULT_CLIENTS` com 4 lojistas fictícios ("Luxury
   Boutique SP" CNPJ 18.420.119/0001-44, 24 pedidos, "R$ 124k" de
   faturamento) + `qtyByRef` pré-preenchido com `DEV000006: 72,
V24-001: 48, U25-014: 24` peças. Dava para exportar romaneio e pré-XML
   NFe para cliente que não existe. Prova antes: "Luxury Boutique SP" e
   "R$ 124k" visíveis, 0 menções a demonstração.
2. **`/financial`** — `DEFAULT_TRANSACTIONS` com 3 títulos fictícios
   ("Contas a Receber (B2B) R$ 342k", "Contas a Pagar (Suppliers) R$ 124k",
   "Impostos/Fiscal R$ 42k") lidos como fluxo de caixa real. Prova antes:
   os três títulos visíveis.
3. **`/showroom`** (aba B2B) — sacola com pack de `DEV000006` pré-preenchido
   e comprador "Boutique Multimarcas Jardins" com CNPJ fictício no
   formulário do espelho B2B. Prova antes: inputs com os valores fictícios.

## Correção

Mesmo contrato das Ondas 64/66 — carteira, títulos, sacola e comprador
nascem vazios:

- `/commercial`: `DEFAULT_CLIENTS = []`, `qtyByRef = {}`, formulário de
  novo lojista neutro (sem CNPJ/`R$ 18k` fictícios); sem lojista
  cadastrado, romaneio e pré-NFe não são emitidos (guardas com toast);
  aviso `commercial-carteira-vazia` ("Carteira B2B vazia… O PLM não é
  ERP"). `activeClient` pode ser `undefined` sem quebrar (fallbacks já
  existiam).
- `/financial`: `DEFAULT_TRANSACTIONS = []`; aviso `financial-fluxo-vazio`
  ("Nenhum título lançado… O PLM não é ERP").
- `/showroom`: `packsByKey = {}`, `buyerName`/`buyerCnpj` vazios; sem
  lojista digitado, o espelho B2B não é emitido (guarda com toast).

Nenhuma asserção antiga relaxada.

## Prova por cliques (depois)

- `/commercial`: aviso `commercial-carteira-vazia` renderizado; "Luxury
  Boutique SP" e "R$ 124k" ausentes; 0 `pageerror`. Captura
  `/home/user/medicao61-commercial-depois.png`.
- `/financial`: aviso `financial-fluxo-vazio` renderizado; títulos fictícios
  ausentes; 0 `pageerror`. Captura `/home/user/medicao61-financial-depois.png`.
- `/showroom` (aba B2B): inputs de lojista/CNPJ vazios; 0 `pageerror`.
  Captura `/home/user/medicao61-showroom-depois.png`.

## Gates

`tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **814/814**
(809 + 5 do teste novo `onda67-carteira-vazia.test.ts`).

## Publicação

**Há uma publicação pendente (67).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL.
