# Onda 100 — gates, showroom, timeline e vínculos explicam o porquê

## Achado (varredura `return !error` em `src/hooks`, após a Onda 99)

| Hook                                                  | Antes                                          | Tela                                                                                                  |
| ----------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `use-reference-gates.ts` `openGate`/`decide`          | `return !error`                                | `/flow` e `/approvals`: "Não foi possível abrir o gate." / "…registrar a decisão do gate." sem motivo |
| `use-showroom.ts` `transitionSample`/`recordDecision` | `return !error`                                | `/showroom`: **"Transição bloqueada"** e "justificativa obrigatória" — causa inventada                |
| `use-entity-events.ts` `emit`                         | `return !error`, ninguém lê                    | timeline com buraco, em silêncio                                                                      |
| `use-entity-relations.ts` `link`/`unlink`             | erro descartado; `unlink` nem lia o erro       | botão desvincular: vínculo "volta" sem explicação                                                     |
| `NovoPilotoDialog`                                    | "Falha ao criar piloto" sobre o motivo do hook | 2 toasts por 1 causa; sem sessão, mudo                                                                |

## Correção

- Gates: `ResultadoGravacao` (`descreverErroSupabase(error, "abrir o gate" | "registrar a decisão do gate")`); `/flow` e `/approvals` mostram `res.reason`.
- Showroom: hook avisa com motivo ("mover a amostra", "registrar a decisão"); a tela não inventa causa; a justificativa digitada é preservada e há nota inline "A decisão não foi registrada — veja o aviso acima e tente de novo.".
- Timeline: `toast.warning("<motivo> A ação em si foi salva.")`.
- Vínculos: `link`/`unlink` avisam com motivo e devolvem boolean honesto.
- Piloto: hook avisa também sem sessão; diálogo não duplica.
- Trava `onda100-gates-com-motivo.test.ts` (6) — inclui **"nenhum hook em `src/hooks` mantém `return !error`"**.
- Comportamento: `use-reference-gates.motivo.test.tsx` (RLS 42501 → "Não foi possível abrir o gate: sua sessão não tem permissão…").

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 930/930 (156 arquivos)**.

## Publicação

Nenhuma migration. Validação no ar exige login real (`PLM_E2E_EMAIL/PASSWORD`).
