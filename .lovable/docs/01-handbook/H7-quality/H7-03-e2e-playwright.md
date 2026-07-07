# H7-03 · E2E com Playwright

Fluxos ponta-a-ponta contra o preview rodando. Único teste que prova que
a "coisa toda" funciona.

## Setup
- Playwright já instalado no sandbox.
- Preview em `http://localhost:8080` (Vite).
- Sessão Supabase injetável via env `LOVABLE_BROWSER_SUPABASE_*` — usar
  para pular login em fluxos que já testam login em outro cenário.

## Fluxos canônicos (mínimo)
1. **Login → dashboard** (smoke).
2. **Criar referência → preencher ficha → aprovar** (workflow completo).
3. **Referência → piloto → aprovar piloto**.
4. **Piloto → lote → PCP → apontar produção**.
5. **CAPA: abrir ocorrência → plano de ação → fechar**.
6. **Comentário com menção → notificação chega no destinatário**.
7. **Drawer contextual: abrir referência da lista, ver timeline, fechar,
   scroll da lista preservado**.

## Regras
- Seletor por role/aria-label — nunca por classe CSS.
- Screenshot a cada passo crítico (`page.screenshot`).
- Nunca `full_page=True`.
- Nunca logar/screenshot tokens ou dados de PII.
- Falha do E2E é **bloqueante** — não merga.

## Anti-padrões
- `page.waitForTimeout(5000)` — usar `waitFor` de condição real.
- Rodar tudo com login manual — impossível repetir.
- Assert só no visível — validar também via server fn que o banco mudou.
