# Onda 80 — Dívida `dias_ativa` fechada (semântica confirmada) + varredura demo limpa

**Data:** 2026-10-21
**Medição de produção:** 74ª (repo = Onda 80; ar = **Onda 78** — Onda 79 ainda não publicada; banco inalterado)

## 74ª medição

- **Ar:** entry `index-BrSbSsMk.js` / `index-Xk9-f91r.js` (215 chunks / 3.215.751 bytes, 0 falhas) — **idêntico à 73ª**: a Onda 79 (`49c74cc`) **não foi publicada ainda**.
- **Banco:** view `200 []`, 4 funções `401 42501`, SQL SHA `382f0f19…` inalterado.

## Dívida `dias_ativa` — resolvida sem código

Aberta desde a Onda 77: `date_part('day', now() - r.created_at)` (SQL linhas 198 e 434) poderia subcontar reservas com mais de um mês se o intervalo tivesse componente de meses.

**Confirmado pela documentação oficial do PostgreSQL (§9.9):** `timestamp - timestamp` produz intervalo _justificado em dias_ ("converting 24-hour intervals into days, similarly to `justify_hours()`") — ex.: `'2001-09-29 03:00' - '2001-07-27 12:00'` → **`63 days 15:00:00`**. Só `age()` gera meses. Logo `dias_ativa` é o **total de dias** e o limiar `>= 30` do `OpMaterialsTab` está correto. **O SQL aplicado não precisa mudar.**

Trava de regressão: `src/lib/onboarding/onda80-dias-ativa-semantica.test.ts` (3 testes: subtração de timestamps presente na view e na função; nenhum `age()` no cálculo; limiar de 30 dias no painel).

## Varredura de vazamento de vitrine (demo) — limpa

4 arquivos com `demo` sem helper `*Operacionais()` próprio foram auditados; todos filtram no consumidor:

| Arquivo                       | Onde filtra                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `reference/store.ts`          | `pieces-report.tsx:46` e `development.tsx:630` (`!lc.demo`); `ReferenciaDrawer` só exibe |
| `techsheet/cut-order.ts`      | `FabricRollsShadePanel.tsx:116` (`!r.demo` antes de `evaluateRollShadeBatch`)            |
| `cloud-sync.ts`               | re-marca vitrine por handle (`influencerEhVitrine`, Onda 59)                             |
| `security/rbac-governance.ts` | `e.demo !== true` antes do relatório LGPD                                                |

Nenhum código de produto alterado.

## Gates

`tsc` 0 · `eslint` 0 erros · `prettier` limpo · **861/861** (858 + 3).

## Publicação

**Há publicação pendente (79 + 80).** Nenhuma migration; publicar não aplica SQL.
