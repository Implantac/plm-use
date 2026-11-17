# Onda 99 — transição de referência explica o porquê

## Sintoma (código, confirmado por teste de comportamento)

`useReferences.update` fazia `return !error`: uma falha de permissão/sessão ao
gravar o novo status sumia. Em `/flow`, "Avançar etapa" mostrava
"Não foi possível avançar a referência."; no drawer da entidade, qualquer falha
virava **"Transição não permitida"** — regra de negócio no lugar do motivo real
(mesma classe corrigida no CAPA na Onda 82). O `CapaDrawer` ainda empilhava um
"Falha ao salvar" por cima do motivo que o hook já mostrava (dois toasts por
uma causa). `use-workflow.ts` carregava `validateRemote` morto com
`if (error) return false`.

## Correção

- `use-references.ts`: `ResultadoGravacao = { ok: true } | { ok: false; reason }`.
  `update` → `descreverErroSupabase(error, "salvar a referência")`;
  `transition` → motivo de fluxo ("A transição de Ideia para PCP não é
  permitida pelo fluxo.") ou o motivo do banco; o avanço automático
  APROVACAO → ENGENHARIA, se falhar, avisa ("Piloto aprovado, mas a engenharia
  não foi aberta automaticamente. <motivo>") em vez de seguir calado.
- `/flow` e `EntityDrawer`: `toast.error(res.reason)`.
- `CapaDrawer`: removido o segundo toast genérico.
- `use-workflow.ts`: `validateRemote` removido (sem chamador).

## Prova

- `use-references.transition.test.tsx` (jsdom, Supabase mockado): RLS 42501 →
  "Não foi possível salvar a referência: sua sessão não tem permissão…";
  fora do fluxo → motivo de fluxo; permitida → `{ ok: true }`.
- Trava `onda99-transicao-com-motivo.test.ts` (3).
- Browser: `/flow` com sessão simulada não carrega referências (aviso correto,
  `auditoria/flow99-local.png`) — o clique real exige `PLM_E2E_EMAIL/PASSWORD`.

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 923/923 (154 arquivos)**.

## Publicação

Nenhuma migration.
