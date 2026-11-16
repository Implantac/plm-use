# Onda 94 — `/api/generate-image`: motivo em português, nunca HTML nem texto do provedor

## Sintomas medidos

1. Quando o provedor de imagens recusava (400/401/5xx), a rota repassava ao
   usuário o texto cru do provedor (inglês/técnico, podendo citar chave) —
   só 402/429 eram traduzidos.
2. **Prova local:** com token presente, qualquer exceção dentro do handler
   (aqui `createClient` no Node 20) escapava do framework como a página HTML
   em inglês **"This page didn't load"** (500) — o handler não tinha
   `try/catch` externo. Em produção isso vale para qualquer erro inesperado.

## Correção

- `src/lib/ai/motivo-provedor-imagem.ts` → `motivoDoProvedor(status, detalhe)`:
  402 créditos · 429 limite · 401/403 chave recusada · 400 com
  safety/policy/moderation → política de conteúdo · 400/413/422 pedido não
  aceito · 5xx instável (HTTP n) · demais HTTP n. O corpo do provedor vai só
  para `console.warn` (300 chars).
- Handler `POST` envolve `gerarImagem(request)` em `try/catch`: exceção →
  `console.error` + JSON 500 "Não foi possível gerar a imagem agora (erro
  interno do servidor). Tente novamente em instantes."; abort → 499.
- Trava `onda94-provedor-imagem-com-motivo.test.ts` (3).

## Prova local (curl ao Vite dev)

- Sem token → `{"error":"Entre na sua conta…"}` 401 (igual).
- Com token (createClient lança no Node 20): **antes** HTML "This page
  didn't load" 500; **depois** `{"error":"Não foi possível gerar a imagem
agora (erro interno do servidor)…"}` 500; log mostra
  `[generate-image] erro inesperado` em vez de `unhandled`.
- Produção ANTES: sem token 401 traduzido; token inválido 401 traduzido
  (caminhos já cobertos). Caminho do provedor não é exercitável sem chave —
  coberto pelo teste unitário.

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 907/907 (148 arquivos)**.

## Publicação

Nenhuma migration. Validação: `curl -X POST /api/generate-image` sem token e
com token inválido seguem 401 JSON; nenhuma regressão.
