# Onda 81 — Falha de gravação no Supabase explica o porquê

**Data:** 2026-10-21 · **Medição:** 75ª (repo = Onda 81; ar = Ondas 79+80 publicadas; banco inalterado)

## Risco escolhido

Na Onda 79, em produção, a criação de referência falhou com o toast **"Falha ao criar referência"** — sem motivo. Era um 401/JWT inválido da sessão, mas o usuário não tinha como saber se faltava papel, se a sessão caiu, se o código estava duplicado ou se a rede caiu. Regra vigente: controle que falha explica o porquê próximo ao controle, e o motivo **nunca é inventado**.

Varredura: 94 `toast.error("…")` estáticos no app — 92 são validação de formulário (já dizem o porquê); os dois `catch` genéricos restantes (`ProductStudio` gerar proposta IA, `prints` ler arquivo) são de leitura/IA, não de gravação. **Nenhum tratamento humano de erro do Supabase existia** (`42501`, `PGRST301`, `23505` não aparecem no código).

## O que foi feito

- **`src/lib/supabase/erro-humano.ts`** — `descreverErroSupabase(erro, acao)`: `42501`/`401`/`403`/RLS → permissão (solicite o papel ou entre de novo); `PGRST301`/JWT → sessão expirou; `23505` → código duplicado; `23503` → vínculo inexistente; `23502` → campo obrigatório; `Failed to fetch` → sem conexão; desconhecido → **repassa a mensagem original** (nunca esconde).
- **`use-references.ts` `create`** — emite um único toast com o motivo real; chamadores (`NovaReferenciaDialog`, `ProductStudio`) deixam de repetir o toast genérico. O diálogo continua aberto para não perder o preenchido.
- Trava: `onda81-erro-com-motivo.test.ts` (3 testes: mapeamento de códigos; repasse de mensagem desconhecida; hook usa o helper e chamadores não repetem).

## Prova (Vite local + Playwright, sessão simulada)

`/references` → "Nova referência" → código + nome → "Criar": toast **"Não foi possível criar a referência: sua sessão expirou. Entre novamente e repita a ação."**, diálogo aberto, 0 `pageerror`. Captura `auditoria/ref81-motivo.png`. (Antes: "Falha ao criar referência".)

## Gates

`tsc` 0 · `eslint` 0 erros (1 warning pré-existente em `ProductStudio.tsx:305`) · `prettier` limpo · **864/864** (861 + 3).

## Publicação

**Há uma publicação pendente (81)** — desta vez com código de produto, logo o hash do entry **vai mudar**. Nenhuma migration; publicar não aplica SQL.
