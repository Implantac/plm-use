# H6-03 · CAD e PDM

Ferramentas CAD (Audaces, Lectra Modaris, Optitex, Gerber AccuMark) são
fonte de arquivos técnicos: pencas de moldes, planos de corte, marker.

## Padrão
- Adapter `CadAdapter` (a criar em `src/lib/cad/contract.ts`).
- PLM guarda **referência** ao arquivo (URL assinada + hash), nunca o
  arquivo original em coluna JSONB.
- Storage: bucket dedicado (`use-moda-assets/cad/<reference_id>/...`).
- Versionamento: cada upload é nova linha em `tech_sheets` com incremento
  de versão + evento `tech_sheet.version_published`.

## Fluxo
1. Modelista exporta do CAD → arquivo (`.plx`, `.mdl`, `.dxf`).
2. Upload no PLM → server fn grava metadata + hash + `entity_event`.
3. Piloto/lote consomem via `entity_relations` (`derived_from`).

## Regras
- Nunca aceitar upload > tamanho limite sem confirmação.
- Sempre calcular hash — dedupe por conteúdo.
- Preview: gerar thumbnail server-side quando formato permitir.
- Metadata extraída (número de moldes, tamanhos, consumo) fica em coluna
  estruturada, não só no arquivo.

## Anti-padrões
- Armazenar `.dxf` como base64 em coluna text.
- Cliente lê arquivo binário direto do bucket sem URL assinada.
- Versão nova sobrescrevendo antiga.
