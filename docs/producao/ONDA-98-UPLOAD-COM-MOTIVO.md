# Onda 98 — upload de imagem/arquivo nunca falha em silêncio

## Sintoma medido em produção

MoodBoard (`/research`): enviar um PNG de 16 MB → toast **"Falha no upload"**
(`auditoria/upload98-prod-antes.png`). O motivo real ("Arquivo excede 15 MB")
existia, mas ia só para o `console.error`. Mesma classe em
`uploadGeneratedImage`: `return null` com `console.error`, e o
`GarmentSketchStudio` dizia "Foto realista HD gerada…" mesmo quando a foto
**não** ficou salva na ficha.

## Correção

- `lib/storage/assets.ts`: `uploadAsset` e `uploadGeneratedImage` devolvem
  `{ path }` ou `{ path: null, reason }` (`ResultadoUpload`); motivos via
  `descreverErroSupabase`/`motivoDe` ("enviar foto.png", "salvar a imagem no
  armazenamento"); validação local vira `"Não foi possível enviar X: Arquivo
excede 15 MB."`; sem sessão → motivo de sessão; formato não PNG → motivo.
  Zero `console.error` no módulo.
- `MoodBoard`: `toast.error(upload.reason)`.
- `ProductStudio` (2 pontos): "Visual gerado, mas não salvo. <motivo>".
- `GarmentSketchStudio`: sucesso só quando salvou; senão "Foto realista
  gerada, mas não salva na ficha. <motivo>".
- Trava `onda98-upload-com-motivo.test.ts` (4) com mock do Supabase: 15 MB,
  formato, RLS 403 traduzido, sem sessão, não-PNG, erro de storage, sucesso.

## Prova (Playwright, `scripts/prova_upload.py`)

Local: toast "Não foi possível enviar foto.png: Arquivo excede 15 MB.",
0 `pageerror` (`auditoria/upload98-local.png`). Produção antes: "Falha no upload".

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 918/918 (152 arquivos)**.

## Publicação

Nenhuma migration. Validação: mesma prova em produção.
