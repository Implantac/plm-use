# Onda 71 — Tabelas de medidas de demonstração fora das métricas, da ficha e do banco

**Data:** 2026-10-21
**Commit:** `74010a1` → (Onda 71, ver `git log`)
**Medição de produção:** 65ª (repo = Onda 70; ar = Onda 70; banco inalterado)

## O que foi encontrado

`measurementsSeed` (`src/lib/measurements/store.ts`) é a biblioteca de tabelas de medidas do sistema, com 3 tabelas fictícias sem nenhuma declaração de demonstração:

- `TM-BLU-01` "Blusas Slim Feminino" — aprovada, linha `Premium Luxe`, 18 refs vinculadas, grade PP–GG com PA/CI/QU/OM/CO;
- `TM-CAL-02` "Calças Alfaiataria Feminino" — aprovada, linha `Basic Chic`, 9 refs, grade 36–44 com CI/QU/GA/CX/EN/BA;
- `TM-VES-01` "Vestidos Longos Premium" — rascunho, 5 refs, grade P–G com PA/CI/QU/CO.

Essas tabelas de vitrine eram tratadas como biblioteca real em quatro lugares:

1. **Métricas de `/measurements`** — "Grades 3", "Aprovadas 2", "Rascunho 1", "Refs vinculadas 32" contavam a vitrine como se fossem tabelas cadastradas.
2. **"Aplicar na Ficha"** — aplicava POMs/medidas fictícias numa ficha salva (`setMedidas` + `linkedRefs + 1`), transformando grade de demonstração em medida de ficha real.
3. **Importação na ficha técnica** — `GradedMeasurementsPanel.tsx` importava a grade de demonstração para a ficha (`importFromChart`).
4. **Sync para o banco** — `creative-sync.ts` sincronizava o seed inteiro para a tabela `measurement_charts`, gravando a vitrine como dado operacional.

## O que foi corrigido

- `src/lib/measurements/store.ts`: `MeasurementChart.demo?: boolean`; as 3 tabelas do seed marcadas com `demo: true`; helper `tabelasOperacionais()` que retorna só tabelas reais.
- `src/routes/_authenticated.measurements.tsx`: métricas calculadas só com tabelas reais (`—` "só demonstração na lista" quando não há tabela real); aviso `data-testid="measurements-demo"` declarando que tabelas de demonstração ilustram a lista mas não entram nas métricas nem podem ser aplicadas; "Aplicar na Ficha" desabilitado para tabelas de demonstração (`disabled={!targetRef || selected.demo}`).
- `src/components/techsheet/GradedMeasurementsPanel.tsx`: importação de tabela de demonstração desabilitada (`disabled={c.demo}`) e rotulada "· demonstração".
- `src/lib/creative-sync.ts`: engine sincroniza só tabelas operacionais (`list: () => tabelasOperacionais(listCharts())`) — a vitrine nunca sobe para `measurement_charts`.
- Teste novo `src/lib/onboarding/onda71-medidas-demo.test.ts` (5 asserções): seed marcado como demonstração, `tabelasOperacionais()` vazio com o seed, página declarando a vitrine, "Aplicar na Ficha" bloqueado para demonstração, engine só sincronizando operacionais.

## Prova executada

- **Antes (local, Vite + Playwright):** `/measurements` exibia `TM-BLU-01`/`Blusas Slim Feminino` sem nenhuma declaração; captura `medicao65-measurements-antes.png`.
- **Depois (local):** aviso `measurements-demo` renderizado; `TM-BLU-01` ilustrando a lista; métricas `—` "só demonstração na lista"; 0 `pageerror`; captura `medicao65-measurements-depois.png`.
- **Gates:** `tsc` 0 erros; `vitest` **833/833** (828 + 5 novos); `eslint` 0 erros; `prettier` limpo.
- **Repo/remoto:** push com token válido; `git ls-remote` conferido; token 0/0 (`.git/config` e arquivos versionados).
- **CI:** `quality`, `smoke-publico` e `db-certification` ✅; 2 e2e `skipped`.

## Regra preservada

Nenhuma asserção antiga foi relaxada. Tabelas de medidas só entram em número operacional quando cadastradas pelo usuário; a vitrine ilustra a lista com declaração, mas não é apurada, aplicada, importada nem sincronizada.

## Descartados

Seeds `looks`, `colors`, `display` e `prints` — vitrine criativa/configuração, sem número operacional apurado como real.
