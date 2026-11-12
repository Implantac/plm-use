# Onda 72 — Vitrine criativa de demonstração fora das métricas, das fichas e do banco

**Data:** 2026-10-21
**Medição de produção:** 66ª (repo = Onda 71 publicada; ar = Onda 71; banco inalterado)

## O que foi encontrado

Depois da Onda 71 (tabelas de medidas), o que faltava no `creative-sync` eram os quatro módulos criativos com vitrine **sem nenhuma declaração**:

| Seed                                    | Conteúdo                                                                                                               | Entrava em número operacional                                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `palettesSeed` (`colors`)               | 3 cartelas — "Amalfi Sunset" (Premium Luxe, 42 refs), "Botânica Atlântica", "Minimal Off-White"                        | Métricas `/colors`: "Paletas ativas 3", "Cores únicas 13", "Refs vinculadas 131", "Cobertura 67%"                       |
| `printsSeed` (`prints`)                 | 4 estampas — "Floral Amalfi" (Estamparia Zanotti, 12 refs), "Geométrico Riviera", "Listrado Náutico", "Tie-Dye Sunset" | Métricas `/prints`: "Estampas 4", "Em prova 1", "Refs vinculadas 40", "Reutilização 10x"                                |
| `looksSeed` (`looks`)                   | 3 coordenados — "Alfaiataria Fluida", "Resort Amalfi", "Street Utility"                                                | Lista e sync                                                                                                            |
| `boardsSeed` + `refCatalog` (`display`) | 2 painéis + 8 referências com **preço fixo** (R$ 289/429/599/349…)                                                     | Métricas `/display`: "Painéis 2", "Looks montados 6", "Peças/look 3" e **"Total look R$ 1.576"** somando preço fictício |

A vitrine também alimentava **documento operacional**:

- A cartela de demonstração virava **cor de ficha salva** no `GarmentSketchStudio` (atalho "Cartela Pantone TCX" copiava nome/hex/pantone da vitrine para um colorway de ficha real).
- A estampa de demonstração era sugerida como **"arte"** no `AplicacoesPanel` de uma ficha salva.

E `creative-sync` subia os quatro seeds inteiros para `color_palettes`, `print_assets`, `looks` e `display_boards` do Supabase.

## O que foi corrigido

- `src/lib/colors/store.ts`: `ColorPalette.demo?: boolean`, seed com `demo: true`, helper `paletasOperacionais()`.
- `src/lib/prints/store.ts`: `PrintAsset.demo?: boolean`, seed com `demo: true`, helper `estampasOperacionais()`.
- `src/lib/display/store.ts`: `DisplayBoard.demo?` e `BoardItem.demo?` e `RefCatalog.demo?`, seed e catálogo com `demo: true`, helper `pranchasOperacionais()`.
- `src/lib/looks/store.ts`: `Look.demo?: boolean`, seed com `demo: true`, helper `looksOperacionais()`.
- `/colors`, `/prints`, `/display`: métricas só com itens reais (`—` "só demonstração na lista" sem item real, via campo `demo` do `ModuleLayout`); avisos `colors-demo` / `prints-demo` / `display-demo`.
- `/display`: o preço de vitrine **não entra no total do look** — painel de demonstração mostra `Total look — (vitrine ilustrativa, não apurada)` e a paleta mostra "demonstração · sem preço apurado" em vez de `R$ 289`.
- `GarmentSketchStudio`: só cartelas operacionais no atalho de cor de ficha salva.
- `AplicacoesPanel`: só estampas operacionais na sugestão de arte de ficha salva.
- `creative-sync`: os 4 módulos passam a sincronizar só itens operacionais — **todos os 11 módulos do engine agora são operacionais**.

## Prova executada (local, Vite + Playwright)

| Tela       | Antes                                                                                                               | Depois                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/colors`  | "Paletas ativas **3** · Cores únicas **13** · Refs vinculadas **131** · Cobertura **67%**"; "Amalfi Sunset" visível | aviso `colors-demo`; "Amalfi Sunset" ilustrando; **4 métricas em `—`** "só demonstração na lista"                |
| `/prints`  | "Estampas **4** · Em prova **1** · Refs **40** · Reutilização **10x**"                                              | aviso `prints-demo`; estampas ilustrando; **métricas em `—`**                                                    |
| `/display` | "Painéis **2** · Looks montados **6** · Peças/look **3**"; "Total look **R$ 1.576**"                                | aviso `display-demo`; painéis ilustrando; métricas em `—`; "Total look **—** (vitrine ilustrativa, não apurada)" |

0 `pageerror` nas três telas. Capturas: `medicao66-colors-antes/depois.png`, `medicao66-prints-antes/depois.png`, `medicao66-display-antes/depois.png`.

## Gates

`tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **839/839** (833 + 6 do teste `onda72-vitrine-criativa-demo.test.ts`).

## Publicação

**Há uma publicação pendente (72).** Nenhuma migration foi escrita nem aplicada; publicar o app não aplica SQL. O SQL aplicado desde a 24ª medição permanece com SHA-256 `382f0f19…`.
