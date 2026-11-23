# Onda 118 — Tema escuro: axe-core (WCAG AA)

## 113ª medição (produção)

Ar passou a ser a **Onda 116** (`index-B0bKkUmL.js`). Validadas em produção:

- Onda 115 — `auditoria_publicas.py`: títulos "Entrar · USE MODA PLM" e
  "Página não encontrada · USE MODA PLM"; `autocomplete` email/current-password. ✔
- Onda 116 — `auditoria_teclado.py`: 1 Tab até o conteúdo em todas as rotas;
  menu off-canvas recebe foco; Escape fecha. ✔
- Onda 117 ainda não publicada (axe claro em prod: 43/44, igual ao antes).

**Tema escuro** (`TEMA=dark auditoria_axe.py`, produção): **43/44 rotas**,
contraste **259** (pior que o claro). Além dos itens da 117, três causas
exclusivas do escuro: botão primário com texto branco sobre azul-petróleo
(2,8:1 — todo CTA "AI Product Studio", "Começar", "Abrir"), verde de status
como texto (3,1–3,8:1) e vermelho de reprovado (2,7:1).

## Correção (`src/styles.css`, bloco `.dark`)

- `--primary-foreground: 200 40% 10%` (texto escuro no botão primário) e
  `--brand-500: 188 50% 56%` (texto primário ≥4,5:1).
- `--success-500: 173 42% 54%`, `--danger-500: 4 70% 66%`.
- `pieces-report`: rótulo `opacity-70` → `text-muted-foreground`; `security`:
  lista rolável com `tabIndex={0}`.

## Prova

- Local, escuro: **43/44 → 3/44** (contraste 259 → 6: amostras de cor em
  `/colors` + 2 em pieces-report antes do último ajuste → 0 na reexecução);
  claro continua 0 nas rotas reconferidas.
  Screenshot `auditoria/tema-escuro118-local-dashboard.png`.
- Trava `src/lib/onboarding/onda118-tema-escuro.test.ts` (3).
- Gates: `tsc` 0 · `eslint` 0 · `prettier` limpo · vitest **986/986 (175)**.

## Pendente

Publicar 117–118; depois `auditoria_axe.py` (claro e `TEMA=dark`) em produção.
