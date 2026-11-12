# Onda 66 — referências de demonstração rotuladas e fora das métricas operacionais

**Medição:** 60ª. **Repo:** `ad54a8f` (Onda 65) local = remoto, limpo, token
0/0. **Ar:** entry novo `index-CIimYX9w.js` / `index-CkWW-tU5.js` (**214
chunks / 3.204.381 bytes**, 0 falhas) com marcador da 65 = 1, da 64 = 6,
da 63 = 1, da 62 = 1 e `DEV000006` = 18 — **publicação da Onda 65 relatada
pelo dono e validada por cliques em produção** (`/launch` aba Performance
com o aviso `performance-sellthrough-mock`, 0 `pageerror`; captura
`/home/user/medicao60-prod-launch.png`). **Banco:** view `200 []`, 4
funções `401 42501` (com parâmetros corretos), SQL SHA `382f0f19…`
inalterado.

## Risco medido

A varredura de referências de demonstração mediu `V24-001` (18 ocorrências),
`U25-014` (8) e `I25-088` (5) fora de testes. O achado principal: o seed de
ciclo de vida (`src/lib/reference/store.ts`, 6 referências de demonstração —
`V24-001` "Blusa Linho Amalfi", `CM704`, `VT302`, `V24-005`, `BL220`,
`V24-011`) alimentava três superfícies operacionais **sem nenhuma declaração
de demonstração**:

1. **`/pieces-report`** — as 6 refs entravam nas 4 métricas do topo
   ("Peças em desenvolvimento 6", "Atrasadas", "Em piloto", "Repilotagens")
   como se fossem peças reais da coleção. Prova antes: métrica "6" com
   "no radar", 0 menções a demonstração.
2. **`/development` (Centro de Desenvolvimento)** — as contagens dos filtros
   ("todos", "atrasados", "pilotos pendentes"…) contavam as 6 refs de
   demonstração como referências reais.
3. **Kanban da esteira** — a ref de demonstração podia ser promovida a
   "ficha salva" se existisse documento com o mesmo código (o `doc` vinha de
   `techDocs[code]` sem olhar a marca), e a timeline do `ReferenciaDrawer`
   (PCP) mostrava o progresso da demonstração sem rótulo.

Contrapontos medidos: a rota `/references` usa `useReferences` (Supabase),
não o seed; `collection-map` declara vitrine; `cad/store.ts` marca
`demo: true`. Nenhum emissor de documento sem guarda foi achado.

## Correção

Mesmo contrato das coleções `demo: true` (Onda 51) e dos creators (Onda 59):

- O seed marca `demo: true` (`ReferenceLifecycle.demo?`, `build()` retorna
  `demo: true`); o tipo declara o contrato.
- As métricas de `/pieces-report` e as contagens do Centro de Desenvolvimento
  ignoram `demo` — só referência salva pelo usuário conta como peça real.
- Sem peça real, a métrica vira **`—`** com detalhe "só demonstração na
  lista" (nunca zero apurado) — `ModuleLayout` ganhou o campo `demo` na
  métrica, que renderiza `—` quando marcado. Os filtros do Centro também
  viram `—` quando zerados.
- A demonstração continua ilustrando a lista, mas com aviso visível
  (`pieces-report-demo`, `centro-desenvolvimento-demo`,
  `referencia-drawer-demo`).
- A ref de demonstração nunca vira ficha nem avança de estágio:
  `buildKanbanRefItems` recebe `demo` e força `doc: undefined` para a
  demonstração (sem `doc`, o cartão não é arrastável e `canAdvanceStage` é
  falso). Teste novo em `kanban-items.test.ts` prova a guarda e que, sem a
  marca, a entrada continua com documento (Onda 30 intacta).

Nenhuma asserção antiga relaxada.

## Prova por cliques (depois)

- `/pieces-report`: aviso `pieces-report-demo` renderizado; as 4 métricas
  viram `—` ("só demonstração na lista"); 0 `pageerror`. Captura
  `/home/user/medicao60-pieces-report-depois.png`.
- `/development`: aviso `centro-desenvolvimento-demo` renderizado; filtros
  do Centro viram `—`; `V24-001` continua ilustrando a esteira como cartão
  sem ficha (`kanban-sem-ficha-V24-001`, não arrastável); 0 `pageerror`.
  Captura `/home/user/medicao60-development-depois.png`.

## Gates

`tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **809/809**
(801 + 7 do teste novo `onda66-demo-rotulada.test.ts` + 1 em
`kanban-items.test.ts`).

## Publicação

**Há uma publicação pendente (66).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL.
