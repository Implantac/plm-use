# Onda 77 — Auditoria estendida de controles interativos: nenhum controle morto

**Data:** 2026-10-21
**Medição de produção:** 71ª (repo = Onda 76 publicada; ar = Onda 76; banco inalterado)

## O que foi encontrado

Depois da Onda 75 (8 botões que prometiam ação e só mostravam toast), o
usuário pediu nova análise ("muitas telas e botões sem ações"). A auditoria
estendida mediu **todos** os tipos de controle interativo em 3 camadas —
estática, ~1.200 cliques reais em 46 rotas (local) e produção:

| Controle             | Medição                                         | Resultado                                                                                                                                 |
| -------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Botões               | 554 handlers classificados; ~1.200 cliques      | **0 mortos** (os 17 "sem onClick" são botões dentro de `DialogTrigger`/`DropdownMenuTrigger`)                                             |
| Abas                 | 44 `TabsTrigger` em 5 rotas, clicadas uma a uma | **todas trocam de painel** (route-engineering 2, supplier-portal 4, launch 4, showroom 5; production dentro de diálogo, mesmo componente) |
| Selects              | todos os `<Select>` do repo                     | **todos com `onValueChange`**                                                                                                             |
| Switches             | todos os `<Switch>` do repo                     | **todos com `onCheckedChange`**                                                                                                           |
| Filtros de busca     | inputs de busca das rotas                       | **ligados ao estado** (ex.: `/references` filtra por código/nome/status)                                                                  |
| Botões desabilitados | ~40 com `disabled`                              | **todos por validação/loading e com explicação próxima** (tech-sheet `!emitivel`, showroom `!refId`, etc.)                                |
| Ações em vitrine     | editar/excluir demo                             | **bloqueadas com aviso** (coleções: editar promove para salvo, Onda 51)                                                                   |

**Nenhum controle morto além dos 8 botões toast-only já corrigidos na Onda 75.** Os únicos "mortos" aparentes nas medições eram falsos positivos
(favorito por classe; botões de `/research` por deslocamento de índice em
cliques sequenciais — re-verificados com página fresca e funcionam).

## O que foi feito

Como não havia controle morto para corrigir, a onda **trava a auditoria
como regressão automática**: o teste
`src/lib/onboarding/onda77-controles-sem-acao.test.ts` verifica
estruturalmente, em todas as rotas e componentes, que

- todo `<Select>` tem `onValueChange`;
- todo `<Switch>` tem `onCheckedChange`;
- todo `<TabsTrigger value="X">` tem `<TabsContent value="X">` correspondente.

Se um controle morto for introduzido no futuro, a suíte falha.

## Prova executada

- Estática: varredura de Button/Select/Switch/Tabs em `src/routes` +
  `src/components` — 0 controles mortos (17 falsos positivos de trigger).
- Dinâmica: abas clicadas uma a uma nas 5 rotas com Tabs — todas trocam de
  painel (`aria-selected=true`, texto muda); busca de `/references` recebe
  valor e filtra (lista vazia na sessão simulada: "Total 0 no núcleo").
- Produção: 0 `pageerror` nas rotas medidas.

## Gates

`tsc` 0 · `eslint` 0 erros · `prettier` limpo · **854/854** (851 + 3 do
teste `onda77-controles-sem-acao.test.ts`).

## Publicação

**Há uma publicação pendente (77).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL. O SQL aplicado desde a 24ª medição
permanece com SHA-256 `382f0f19…`.
