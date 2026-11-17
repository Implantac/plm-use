# Onda 101 — mood board honesto (e `OptimizedImage` com motivo)

## Sintoma medido em produção (`scripts/prova_moodboard.py`)

`/research` → colar URL → "Adicionar" → toast **"Referência fixada no Mood
Board"** (`auditoria/moodboard101-prod-antes.png`). Nada é gravado: a URL some
ao recarregar. Além disso, no mesmo componente:

- listar/assinar as imagens **salvas** falhava em silêncio (`const { data } =
…list()`; `signedUrls` descartava o erro) — "minha foto sumiu" sem porquê;
- upload OK + falha ao gerar link de exibição → nada na tela e nenhum toast;
- `OptimizedImage` mostrava "Imagem indisponível" sem o motivo (`signedUrl`
  devolvia `null`).

## Correção

- `lib/storage/assets.ts`: `signedUrl` → `{ url | reason }`; `signedUrls` →
  `{ urls, reason }`; nenhum `if (error) return null/[]`.
- `MoodBoard`: listagem com `descreverErroSupabase(error, "carregar as imagens
salvas do mood board")`; URL de exibição falha → "Imagem salva, mas não foi
  possível exibi-la agora: <motivo> Recarregue a página para vê-la."; URL
  adicionada → **"Referência adicionada só nesta sessão: ela some ao
  recarregar. Para guardar no mood board, use Upload."**
- `OptimizedImage`: "Imagem indisponível: <motivo>" (texto, `title`,
  `aria-label`).
- Trava `onda101-moodboard-honesto.test.ts` (4; inclui comportamento de
  `signedUrl`/`signedUrls` com Supabase mockado).

## Prova

Local (Playwright): "Referência adicionada só nesta sessão…", 0 `pageerror`
(`auditoria/moodboard101-local.png`). Produção antes: "Referência fixada no
Mood Board".

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 934/934 (157 arquivos)**.

## Publicação

Nenhuma migration. Validação: mesma prova em produção.
