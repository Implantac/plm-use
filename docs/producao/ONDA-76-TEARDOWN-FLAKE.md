# Onda 76 — Flake de CI: importação dinâmica puxava o React para fora do ambiente de teste

**Data:** 2026-10-21
**Medição de produção:** 70ª (repo = Onda 75 publicada; ar = Onda 75; banco inalterado)

## O que foi encontrado

O CI da Onda 75 falhou na primeira execução no job `quality`:

```
EnvironmentTeardownError: Cannot load '/node_modules/react/index.js'
imported from src/lib/activity/log.ts after the environment was torn down.
```

Os **848 testes passaram** (129 arquivos), mas a rejeição não tratada derrubou
o exit code. A re-execução dos jobs falhos passou — é flake, mas a causa
raiz é real e pode voltar a qualquer momento.

### Causa raiz

`src/lib/pcp/store.ts` (ação de ocorrência) e `src/lib/quality/store.ts`
(ação de CAPA) chamam, dentro de ações do store:

```ts
void import("@/lib/activity/log").then(({ logActivity }) => logActivity({...}));
```

`src/lib/activity/log.ts` importava `react` no nível do módulo (para o hook
`useActivityFeed`). Quando um teste terminava antes de a importação dinâmica
resolver, o Vitest desmontava o ambiente e a carga tardia do React virava
rejeição não tratada — `EnvironmentTeardownError`. O caminho do erro no CI:

```
onda40-chao-de-fabrica.test.ts → src/test/chao-de-fabrica-salvo.ts
  → pcp/store.ts → (import dinâmico) → activity/log.ts → react
```

## O que foi corrigido

1. **O hook saiu de `log.ts`.** `useActivityFeed` mora agora em
   `src/lib/activity/use-activity-feed.ts`; `log.ts` ficou só com
   `logActivity` + tipo `ActivityEntry`, **sem import de `react`**.
   `ActivityFeedButton.tsx` passou a importar o hook do módulo novo.
2. **`.catch()` nas duas importações dinâmicas** (`pcp/store.ts`,
   `quality/store.ts`). O log de atividade é efeito colateral best-effort:
   se o módulo não carregar (ex.: ambiente já desmontado), a rejeição é
   tratada e não derruba a suíte.

Nenhum comportamento muda: o log continua sendo escrito quando há usuário
logado; o feed de atividade continua funcionando (verificado em runtime).

## Prova executada

- `onda40-chao-de-fabrica.test.ts` rodado **5× seguidas**: 12/12 em todas.
- Suíte completa: **851/851** (848 + 3 do teste
  `onda76-teardown-flake.test.ts`).
- Runtime (Vite + Playwright): botão de atividade no header abre o
  popover; 0 `pageerror`. Captura `medicao70-dashboard-depois.png`.

## Gates

`tsc` 0 · `eslint` 0 erros · `prettier` limpo · **851/851** (130 arquivos).

## Publicação

**Há uma publicação pendente (76).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL. O SQL aplicado desde a 24ª medição
permanece com SHA-256 `382f0f19…`.
