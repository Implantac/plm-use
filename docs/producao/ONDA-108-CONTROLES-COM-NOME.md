# Onda 108 — Todo controle visível tem nome acessível

**Regra:** botão só com ícone leva `aria-label` (continuação da onda 107).

## Medição (101ª, produção, Onda 107 no ar)

`scripts/auditoria_nomes.py` percorreu as 45 rotas autenticadas e contou
controles visíveis (`button`, `[role=button]`, `a`, campos) sem nome acessível:

| Rota            | Sem nome | O quê                                    |
| --------------- | -------- | ---------------------------------------- |
| todas (45)      | 45       | sino de alertas do header (`AlertsBell`) |
| `/materials`    | +12      | Trash2 "remover material" por linha      |
| `/cad`          | +2       | Trash2 "remover molde"                   |
| `/measurements` | +1       | Trash2 "remover tabela"                  |
| `/ai-agents`    | +1       | Send "enviar pergunta"                   |
| **Total**       | **60**   |                                          |

Grep estático acrescentou os botões X de fechar de `EntityDrawer` e
`CapaDrawer` (não visíveis sem abrir o drawer).

## Correção

- `AlertsBell.tsx`: `aria-label` = "Alertas: N não lido(s)" / "Alertas do sistema".
- `materials.tsx`: "Editar material {nome}" / "Remover material {nome}".
- `cad.tsx`: "Remover molde {ref}". `measurements.tsx`: "Remover tabela {código}".
- `ai-agents.tsx`: "Enviar pergunta".
- `EntityDrawer.tsx` / `CapaDrawer.tsx`: "Fechar"; CAPA também "Abrir no painel da entidade".

## Prova

- Local (vite 5179), 45 rotas: `TOTAL sem nome: 0`, `pageerror: 0`
  (`auditoria/nomes108-local.png`).
- Trava: `src/lib/onboarding/onda108-controles-com-nome.test.ts` (2);
  trava da onda 55 ajustada para 13 rótulos no CapaDrawer.
- Gates: `tsc` 0 · `eslint` 0 · `prettier` limpo · vitest **956/956 (165)**.

## Pendente

Publicar; depois `auditoria_nomes.py` em produção deve devolver TOTAL 0.
Candidatos seguintes: 56 campos com `<Label>` visual sem `htmlFor` (looks,
showroom, NovaReferenciaDialog, MovementDialog, NovoPilotoDialog).
