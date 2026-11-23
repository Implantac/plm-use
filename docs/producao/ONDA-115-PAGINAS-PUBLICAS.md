# Onda 115 — Login, redefinição de senha e 404

## Medição (110ª, produção = Onda 114)

`scripts/provas/auditoria_publicas.py` (novo): `/login`, `/` e `/nao-existe`
em 390px e 1400px — título, `h1`, campos (fonte, `autocomplete`, `inputmode`),
botões, cortes, `lang`, pageerror.

- Layout ok nos dois tamanhos (0 cortados; botão "Entrar" 44px; campos 16px no
  celular pela 114), 0 pageerror.
- **Título genérico** ("USE MODA PLM AI | Next-Gen…") em login, redefinição
  de senha e 404.
- **Campos sem `autocomplete`** no login (e-mail e senha): gerenciadores de
  senha e o preenchimento automático do celular não reconhecem o formulário;
  na redefinição, as duas senhas novas sem `new-password` (o navegador oferece
  a senha antiga e não propõe senha forte).

## Correção

- `login.tsx`: `head()` "Entrar · USE MODA PLM"; e-mail com
  `autoComplete="email"` + `inputMode="email"`; senha com `current-password`
  (entrar) / `new-password` (criar conta); nome com `autoComplete="name"`.
- `reset-password.tsx`: `head()` "Redefinir senha · USE MODA PLM";
  `new-password` nos dois campos.
- `__root.tsx`: o 404 define `document.title` "Página não encontrada · USE MODA PLM"
  (notFoundComponent não tem `head()`).

## Prova

- Local, 390 e 1400: títulos específicos nas três páginas; `ac: email` /
  `current-password`; `/reset-password` → `new-password` ×2; 0 pageerror.
- Trava `src/lib/onboarding/onda115-paginas-publicas.test.ts` (3).
- Gates: `tsc` 0 · `eslint` 0 · `prettier` limpo · vitest **975/975 (172)**.

## Pendente

Publicar; depois `auditoria_publicas.py https://plmuse.lovable.app` → sem `'ac': None` e títulos próprios.
