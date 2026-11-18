# Onda 107 — remoção bem-sucedida não é erro

## Sintoma medido em produção (`scripts/prova_remocao.py`)

`/financial` → "Ações do item" → Excluir → toast **vermelho** (`data-type=error`)
"Lançamento removido" (`auditoria/remocao107-prod-antes.png`). A ação deu
certo, mas a cor e o papel do toast dizem "falhou". Mesma coisa em sete telas:
Indicador do BI, Lançamento, Coleção, Cliente da carteira, Campanha, Parceiro
homologado, Tabela de medidas.

## Correção

- As sete remoções anunciam com `toast.success("… removido(a).")`.
- `toast.error` fica reservado a falha real; trava global impede voltar.
- Bônus a11y: gatilho do `ModuleActionMenu` com `aria-label="Ações do item"`
  (antes era um botão só com ícone, sem nome).
- Trava `onda107-remocao-nao-e-erro.test.ts` (3).

## Prova

Local: mesmo clique → `('success', 'Lançamento removido.')`, 0 `pageerror`
(`auditoria/remocao107-local.png`).

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 954/954 (164 arquivos)**.

## Publicação

Nenhuma migration. Validação: `prova_remocao.py` em produção → `success`.
