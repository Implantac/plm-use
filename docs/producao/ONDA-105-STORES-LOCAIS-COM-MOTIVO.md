# Onda 105 — stores locais (localStorage) com motivo

## Achado

Restavam três stores de módulo fora do contrato da Onda 97:

| Store                                                    | Leitura               | Gravação                                                                         |
| -------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------- |
| `lib/local-events/store.ts` (histórico local de eventos) | `catch { return [] }` | `catch { /* quota */ }`                                                          |
| `lib/collection-map/store.ts` (filtros salvos do mapa)   | `catch { return [] }` | **sem try** — em modo privado/cota cheia `saveFilter` lançava e derrubava a tela |
| `hooks/use-recent-routes.ts` (rotas recentes/favoritas)  | `catch { return [] }` | **sem try** — idem ao favoritar                                                  |

## Correção

- Novo `src/lib/armazenamento-local.ts`: `lerLocal(chave, oQue, fallback,
valida?)` e `gravarLocal(chave, oQue, valor)` — corrompido → aviso único
  (`motivoArmazenamentoLocal` + `avisoUnico`) e fallback; gravação bloqueada →
  aviso único com motivo (cota/privado/política), devolve `false`, nunca lança.
  O aviso é adiado um tick para funcionar na carga do módulo.
- Os três stores passam a usar o helper; zero `localStorage.getItem/setItem`
  cru neles.
- `ReservationsPanel`: OPs sem número resolvido explicam o porquê.
- Testes: `armazenamento-local.test.ts` (jsdom, 2) + trava
  `onda105-stores-locais-com-motivo.test.ts` (3).

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 949/949 (162 arquivos)**.

## Publicação

Nenhuma migration.
