# Onda 106 — blocos inline mostram o motivo real (não "verifique sua conexão")

## Sintoma medido em produção (`scripts/prova_alertas.py`, sessão inválida)

- `/dashboard`: "Não foi possível atualizar as referências. **Verifique sua
  conexão** e tente novamente mais tarde." + "Não foi possível carregar as
  referências. Tente novamente mais tarde."
- `/flow`: idem + "Não foi possível carregar as referências desta etapa."

A causa era sessão expirada (401), e `useReferences().error` já continha
exatamente isso — as telas descartavam o motivo (`error={Boolean(error)}`)
e escreviam um diagnóstico falso. (`auditoria/alertas106-prod-antes.png`)

## Correção

- `/dashboard`, `/flow`, `ReferenceJourney` (prop `error` aceita string),
  `/development`, `ProductStudio` renderizam o motivo real.
- Um motivo por causa: blocos secundários da mesma página dizem "… — veja o
  aviso no topo da página." em vez de repetir.
- Trava `onda106-motivo-real-no-inline.test.ts` (2).

## Prova

Local: `/dashboard` → "Não foi possível carregar as referências: sua sessão
expirou ou é inválida. Entre novamente e repita a ação." + "Referências
indisponíveis — veja o aviso no topo da página."; `/flow` → um único alerta
com o motivo. 0 `pageerror` (`auditoria/alertas106-local.png`).

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 951/951 (163 arquivos)**.

## Publicação

Nenhuma migration. Validação: `prova_alertas.py` em produção.
