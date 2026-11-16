# Onda 95 — páginas de falha em pt-BR (404, erro de rota, erro catastrófico)

## Sintoma medido em produção

`/rota-que-nao-existe` → **"404 · Page not found · Go home"**
(`auditoria/404-95-prod-antes.png`). O mesmo vale para o `ErrorComponent` da
raiz ("This page didn't load · Try again · Go home") e para a página HTML de
erro catastrófico do servidor (`renderErrorPage`, `lang="en"`). Num app
inteiramente em pt-BR, o único momento em inglês era o pior momento.

## Correção

- `src/lib/error-page.ts`: `lang="pt-BR"`, "Esta página não carregou",
  "Houve uma falha no servidor do PLM. Nada do que você já salvou foi perdido.
  Tente recarregar; se persistir, avise o administrador informando o horário.",
  botões "Tentar novamente" / "Ir para o início".
- `src/routes/__root.tsx`: 404 → "Página não encontrada — O endereço que você
  abriu não existe ou foi movido…", "Ir para o início"; ErrorComponent →
  "Esta página não carregou — Houve uma falha ao montar esta tela. Nada do que
  você já salvou foi perdido…", "Tentar novamente" / "Ir para o início".
- Trava `onda95-paginas-de-falha-pt-br.test.ts` (2): sem `didn't load`,
  `Try again`, `Go home`, `Page not found` em `__root.tsx` nem no HTML.

## Prova (Playwright, `scripts/prova_404.py`)

- Local: status 404, "404 · Página não encontrada", botão "Ir para o início",
  0 `pageerror` (`auditoria/404-95-local.png`).
- Produção antes: "404 · Page not found · Go home".

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 909/909 (149 arquivos)**.

## Publicação

Nenhuma migration. Validação: `/rota-que-nao-existe` em produção →
"Página não encontrada".
