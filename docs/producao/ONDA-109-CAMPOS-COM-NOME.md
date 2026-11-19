# Onda 109 — Campos de formulário têm nome acessível

**Regra:** `Select`/`Input` com rótulo visual fica associado por `htmlFor`/`id`
(ou `aria-label` quando o rótulo não é texto próprio).

## Medição (103ª, produção, Onda 108 no ar)

`scripts/auditoria_campos.py` (variante estrita do auditor da 108: um
combobox **não** se nomeia pelo próprio valor; abre o primeiro botão
"Novo/Adicionar/Criar…" de cada rota e audita o diálogo) nas 45 rotas:

| Rota     | Sem nome | O quê                                               |
| -------- | -------- | --------------------------------------------------- |
| `/looks` | 3        | selects Status, Ocasião (filtros) e Status por look |

Os 56 campos do grep anterior eram, em sua maioria, falsos positivos:
`<label>` envolvente ou `<Label htmlFor>` já presentes (verificado por
varredura estática `Label` sem `htmlFor` → 4, todos rotulados por outro meio).

## Correção

- `looks.tsx`: `htmlFor`/`id` nos filtros; `aria-label="Status do look {nome}"` no select do card.
- `collections.compare.tsx`: `htmlFor`/`id` em Coleção A / Coleção B.
- `AplicacoesPanel.tsx`: `aria-label="Tiragem planejada (peças)"`.

## Prova

- Produção antes: `TOTAL sem nome: 3` reais em `/looks` (`auditoria/campos109-prod-antes.png`).
- Local (vite 5179) em looks, collections/compare, tech-sheet, materials: `TOTAL sem nome: 0` (`auditoria/campos109-local.png`).
- Trava: `src/lib/onboarding/onda109-campos-com-nome.test.ts` (2).
- Gates: `tsc` 0 · `eslint` 0 · `prettier` limpo · vitest **958/958 (166)**.

## Pendente

Publicar; depois `auditoria_campos.py` em produção deve devolver TOTAL 0.
