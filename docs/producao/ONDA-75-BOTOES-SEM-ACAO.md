# Onda 75 — Botões que prometem ação e só mostram toast

**Data:** 2026-10-21
**Medição de produção:** 69ª (repo = Onda 74 publicada; ar = Onda 74; banco inalterado)

## O que foi encontrado

O usuário relatou "muitas telas e botões sem ações". A auditoria foi feita em
três camadas:

1. **Estática** — classificação de todos os handlers `onClick`/`onView`/
   `onEdit`/`onDelete` de rotas e componentes (554 handlers): nenhum vazio,
   nenhum `href="#"`, nenhuma função nomeada toast-only.
2. **Dinâmica** — ~1.200 cliques reais em **46 rotas** (local, Vite +
   Playwright), medindo mudança observável (URL, texto, diálogo, toast,
   classe/HTML do botão): **zero botões mortos**. Os únicos "mortos"
   aparentes eram falsos positivos (favorito por classe; botões de
   `/research` por deslocamento de índice em cliques sequenciais — todos
   re-verificados com página fresca e funcionam).
3. **Produção** — `/analytics`, `/collections`, `/financial`, `/research`
   renderizam com 45–73 botões e **0 `pageerror`**.

O que sobra são os botões que **prometem uma ação e só mostram toast** —
clicar e nada acontecer além de uma mensagem dizendo o que aconteceria:

| Tela           | Botão                                                                                      | O que fazia                                        |
| -------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `/analytics`   | "Adicionar" ×5 (Tráfego pago, Influenciadores, Modelos, Produções fotográficas, Campanhas) | `toast.info("Registrar: X")` — não registrava nada |
| `/analytics`   | "Visualizar" no menu do KPI                                                                | `toast.info("Relatório analítico de X")`           |
| `/collections` | "Visualizar" no menu da coleção                                                            | `toast.info("Abrindo X")`                          |
| `/financial`   | "Visualizar" no menu do item                                                               | `toast.info("label · val (due)")`                  |

## O que foi corrigido

- Os 5 "Adicionar" do painel **Controle de Investimentos** navegam para
  `/marketing`, onde o investimento é de fato registrado como campanha
  (`mediaSpendBrl`/`productionCostBrl`). Não existe entidade "investimento"
  separada — a campanha é o registro.
- Os 3 "Visualizar" saem do `ModuleActionMenu`: o card já exibe a
  informação (KPI, coleção, item financeiro) e o menu fica com
  Editar/Excluir, que são reais. Não há página de detalhe de coleção/KPI/item
  para onde navegar.

## Prova executada (local, Vite + Playwright)

| Tela           | Antes                                                         | Depois                                                       |
| -------------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| `/analytics`   | "Adicionar" → toast "Registrar: Tráfego pago", URL inalterada | "Adicionar" (painel de investimentos) → **URL `/marketing`** |
| `/collections` | menu com "Visualizar" (toast)                                 | menu **sem "Visualizar"**; Editar/Excluir reais              |

0 `pageerror`. Capturas `medicao69-{analytics,collections}-depois.png`.

## Gates

`tsc` 0 · `eslint` 0 erros · `prettier` limpo · **848/848** (846 + 2 do teste
`onda75-botoes-sem-acao.test.ts`).

## Publicação

**Há uma publicação pendente (75).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL. O SQL aplicado desde a 24ª medição
permanece com SHA-256 `382f0f19…`.
