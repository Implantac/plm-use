# Onda 124 — Graduação por faixa, molde DXF e CSV da tabela de medidas

**Base:** `4ea5917` (Onda 123 no ar). **Sem migration** — só código.

## Por que

Na comparação com os PLMs de referência, a lacuna 4 era "graduação automática +
molde (DXF/CLO)". A ficha já graduava linearmente (salto fixo por tamanho), mas:

1. não permitia salto maior nas pontas da grade (GG/XG costumam crescer 1,5× ou 2×);
2. não lia o molde que a modelagem já exporta do Audaces/Lectra/Gerber/CLO
   (DXF-AAMA/ASTM) — o consumo de tecido da BOM era digitado "de cabeça";
3. não exportava a tabela de medidas para a facção/fornecedor.

## O que entrou

### 1. Graduação por faixa (`fatoresSalto`)

- `TechSheetMeasurementSpec.fatoresSalto?: Record<tamanho, fator>`: o salto que
  **leva até** aquele tamanho = `regraGraduacaoCm × fator`. Acumula a partir do
  base, para cima e para baixo. Ausente/1 = linear (fichas antigas não mudam).
- `computeGradedRow(row, tamanhos, base, fatoresSalto?)` reescrita acumulando os
  saltos; `computeGradedMatrix` repassa `spec.fatoresSalto`. Overrides manuais
  por célula continuam vencendo.
- UI: no diálogo **Grade** do painel de medidas aparece uma linha "Fator do
  salto" por tamanho (exceto o base). O botão mostra "· por faixa" quando ativo.

### 2. Molde DXF (`src/lib/techsheet/dxf-molde.ts` + `MoldeDxfPanel.tsx`)

- `parseDxfMolde(texto, arquivo?, unidadeForcada?)` lê o DXF no navegador, sem
  dependência: blocos (AAMA) com `LWPOLYLINE`/`POLYLINE` fechadas e `TEXT`
  (`PIECE NAME:`, `SIZE:`, `QUANTITY:`), layer 1 = contorno, unidade por
  `$INSUNITS` (1 = in, 4 = mm, 5 = cm) ou heurística pela magnitude (com aviso).
  Sem blocos, cada contorno solto vira "Peça N"; sem contornos, aviso e 0 peças.
- Por peça: área (shoelace), perímetro, largura × altura, tudo em cm.
- `estimarConsumoMetros(pecas, larguraCm, eficienciaPct, tamanho?)` =
  Σ(área × qtd) ÷ (largura × aproveitamento) ÷ 100 → metros por peça de roupa.
- UI: no diálogo **Engenharia de Molde / CAD** da ficha, bloco "Molde DXF":
  Importar/Substituir DXF, seletor de unidade (recalcula) e de tamanho, tabela
  de peças, consumo estimado usando a largura do enfesto e a eficiência já
  informadas, e **Usar na BOM** (grava o consumo no 1º item tipo Tecido via
  `updateBomItem`). O resultado fica em `encaixeCad.moldeDxf` (persistido com a
  ficha).

### 3. Exportar CSV

- `gradedMatrixToCsv(spec, ref?)`: `;` como separador, BOM UTF-8, vírgula
  decimal, linha de cabeçalho com referência/base/unidade, campos com `;` ou
  aspas escapados. Abre direto no Excel em pt-BR.
- Botão **Exportar CSV** no painel de medidas (`medidas-<REF>.csv`).

## Testes

- `dxf-molde.test.ts` (6): DXF sintético com 2 blocos AAMA (mm, cm, in), heurística
  sem `$INSUNITS`, `unidadeForcada`, contornos soltos, arquivo vazio, consumo.
- `graduacao-faixa.test.ts` (5): linear sem fatores, acúmulo para cima, descida
  - overrides, matriz, CSV.

Gates: prettier limpo · `tsc` 0 · `eslint` 0 erros · **vitest 1029/1029 (182 arquivos)**.

## Como provar no ar

1. Ficha técnica → painel Medidas → **Grade** → fator 1,5 em GG → células GG
   crescem 1,5× o salto; **Exportar CSV** baixa `medidas-<REF>.csv`.
2. Diálogo CAD → **Importar DXF** com um AAMA do Audaces → tabela de peças e
   "Consumo estimado … m" → **Usar na BOM** altera o consumo do tecido.

## Limites conhecidos

- Só polilinhas; arcos/splines (`ARC`, `SPLINE`) são ignorados — o Audaces/
  Lectra exportam AAMA já poligonizado, mas um DXF de CAD genérico pode vir
  incompleto (a área sai menor; o aviso de unidade cobre só a escala).
- O consumo é **estimativa por área**, não um encaixe real; serve para pré-custo
  e para comparar com o encaixe do CAD.
