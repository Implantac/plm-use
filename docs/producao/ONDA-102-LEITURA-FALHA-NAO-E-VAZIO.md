# Onda 102 — leitura que falha não é lista vazia

## Sintoma medido em produção (`scripts/prova_atividade.py`)

Sessão inválida (401 em `activity_log`) → sino "Atividade do time" mostra
**"0 eventos recentes · Nenhuma atividade ainda"** — a consulta falhou, mas a
tela afirma que não há nada (`auditoria/atividade102-prod-antes.png`). Mesma
classe (`const { data } = await supabase.from(...)`, erro descartado) em:

- `CommentsPanel` — "Seja o primeiro a comentar" com comentários que existem
  mas não puderam ser lidos; anexos idem; histórico "Sem revisões anteriores";
- `ReservationsPanel` (`/inventory`) — "Sem reservas ativas".

## Correção

Cada leitura guarda `descreverErroSupabase(error, "carregar …")` e mostra
inline com `role="alert"`; o texto de vazio só aparece quando **não** houve
erro. `useActivityFeed` passa a devolver `error`.

## Prova

Local: painel de atividade → "Não foi possível carregar a atividade recente:
sua sessão expirou ou é inválida. Entre novamente e repita a ação."
(`auditoria/atividade102-local.png`); 0 `pageerror`.

Trava `onda102-leitura-falha-nao-e-vazio.test.ts` (3).

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 937/937 (158 arquivos)**.

## Publicação

Nenhuma migration. Validação: mesma prova em produção (painel deve mostrar o
motivo, não "Nenhuma atividade ainda").
