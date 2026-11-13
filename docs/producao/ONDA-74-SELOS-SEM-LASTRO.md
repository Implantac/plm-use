# Onda 74 — Selos de integração e status sem lastro fora das telas

**Data:** 2026-10-21
**Medição de produção:** 68ª (repo = Onda 73 publicada; ar = Onda 73; banco inalterado)

## O que foi encontrado

Depois da Onda 73 (indicadores fixos de canal/região/devolução), a varredura mediu a mesma classe de defeito na forma de **selo de homologação e conexão** — afirmação de integração que o código não sustenta.

### `/cad`

O painel "Ecossistema CAD **Homologado**" listava 4 softwares com ícone verde de check:

| Software                   | Formato declarado        | Selo que aparecia |
| -------------------------- | ------------------------ | ----------------- |
| Audaces Vestuário / Moldes | `.ADS · Risco & Encaixe` | **Homologado**    |
| Lectra Modaris / Diamino   | `.DXF / .MDL · Encaixe`  | **Homologado**    |
| Gerber AccuMark            | `.DXF / .PLT · Plotter`  | **Homologado**    |
| CLO3D / Browzwear          | Prova 3D & Gêmeo Têxtil  | **Conectado**     |

Não existe conector no código: `grep` de `audaces|lectra|gerber|clo3d|browzwear` fora de `cad.tsx` encontra apenas o **tipo** `CadFormat`/`sistemaCad` (o nome do sistema é um campo do molde) e o texto de ajuda do campo. Não há sessão, API nem importação de arquivo CAD.

### `/marketing`

"Integrações de Mídia & Atribuição" listava três conectores com status **Ativo**:

- Meta Ads & Catálogo Dinâmico
- TikTok Shop & Creators
- Google Analytics 4 / ROAS

`grep` de `graph.facebook`, `facebook.com/v`, `tiktok.*api`, `gtag`, `analytics.google`, `measurement_id` no repositório: **zero**. `src/routes/api` só tem `generate-image.ts`, `health.ts` e `public/`.

### `/inventory`

A métrica "Rastreabilidade **100%** · por lote" era literal — mesmo com a própria tela medindo "Insumos ativos **0** · de 0 cadastrados" (o store de inventário nasce vazio desde a Onda 67).

## O que foi corrigido

- `/cad`: o painel vira **"Formatos CAD registrados por molde"**; cada item mostra "Formato registrado · sem conector" em vez do selo verde; aviso `cad-formatos-aviso` declara que o PLM **não** abre sessão com Audaces, Lectra, Gerber ou CLO3D; o check verde sai (ícone neutro).
- `/marketing`: os três conectores passam a **"Não conectado"**, em cor neutra (não `status-approved`).
- `/inventory`: "Rastreabilidade" vira `—` ("sem insumo cadastrado") quando não há insumo cadastrado, via campo `demo` do `ModuleLayout`; `100%` só aparece com insumo real na lista.

## Prova executada (local, Vite + Playwright)

| Tela         | Antes                                                                    | Depois                                                                                                                          |
| ------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `/cad`       | "ECOSSISTEMA CAD HOMOLOGADO" + 4 selos (`Homologado` ×3, `Conectado` ×1) | "FORMATOS CAD REGISTRADOS POR MOLDE", aviso "Sem conector CAD.", "sem conector" em cada item, **0 ocorrências de "HOMOLOGADO"** |
| `/marketing` | 3 conectores "Ativo" em verde                                            | 3 conectores "Não conectado" em cor neutra                                                                                      |
| `/inventory` | "RASTREABILIDADE · 100% · por lote" com 0 insumos                        | "RASTREABILIDADE · — · sem insumo cadastrado"                                                                                   |

0 `pageerror` nas três telas. Capturas `medicao68-{cad,marketing,inventory}-{antes,depois}.png`.

## Gates

`tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **846/846** (843 + 3 do teste `onda74-selos-sem-lastro.test.ts`).

## Publicação

**Há uma publicação pendente (74).** Nenhuma migration foi escrita nem aplicada; publicar o app não aplica SQL. O SQL aplicado desde a 24ª medição permanece com SHA-256 `382f0f19…`.
