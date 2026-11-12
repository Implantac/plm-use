# Onda 69 — materiais de demonstração fora das métricas, do BOM e do banco

**Medição:** 63ª. **Repo:** `d78e4dd` (Onda 68) local = remoto, limpo, token
0/0. **Ar:** entry novo `index-B7N3Kx8W.js` / `index-D5RjA1I7.js` (**214
chunks / 3.207.507 bytes**, 0 falhas) com marcadores da 68 = 1/1
(`fabric-rolls-demo`, "Rolos de demonstração na tabela"), marcador da 67
= 1, da 66 = 1 e `DEV000006` = 16 — **publicação da Onda 68 relatada pelo
dono e validada por cliques em produção** (`/inventory` com o aviso
`fabric-rolls-demo`, sem o saldo de 52,2 kg da vitrine, 0 `pageerror`;
captura `/home/user/medicao63-prod-inventory.png`). **Banco:** view
`200 []`, 4 funções `401 42501` (com parâmetros corretos), SQL SHA
`382f0f19…` inalterado.

## Risco medido

A varredura dos seeds restantes mediu o `MoodBoard` (imagens/paleta/tecidos
de referência — vitrine criativa, sem número operacional) e o
`materialsSeed` (biblioteca de materiais, módulo 11 do creative-sync). O
seed de 6 materiais (`Linho Puro Off-White` R$ 42,00/m, `Botão Madre Pérola
18L`, `Linha Poliéster 120`, `Tag Luxury + Polybag`, `Malha Dry Fit UV50+`
R$ 39,80/kg, `Ribana Gola V` R$ 48,50/kg) era catálogo de demonstração
**sem nenhuma declaração** — e entrava em número operacional em três
lugares:

1. **`/materials`** — as 4 métricas do topo ("Materiais 6", "Custo médio
   R$ 22,97", "Tecidos 3") contavam a vitrine como catálogo real. Prova
   antes: métrica "6 / R$ 22,97", 0 menções a demonstração.
2. **`BomBopPanel`** (diálogo "Inserir da Biblioteca") — o botão inseria o
   material de demonstração no BOM de uma ficha salva com custo,
   fornecedor e SKU fictícios.
3. **`creative-sync`** — `listMaterials` sincronizava o seed inteiro para a
   tabela `materials` do Supabase como se fosse cadastro da empresa.

## Correção

Mesmo contrato das coleções `demo: true` (Onda 51) e dos creators (Onda 59):

- O seed marca `demo: true` (`MaterialItem.demo?`, helper
  `materiaisOperacionais`); as métricas do catálogo ignoram `demo` — sem
  material real, viram **`—`** ("só demonstração na lista").
- O botão de inserção no BOM fica desabilitado para demonstração
  (`disabled={m.demo}`, com rótulo "· demonstração").
- O engine só sincroniza materiais operacionais
  (`list: () => materiaisOperacionais(listMaterials())`) — a vitrine nunca
  sobe para o banco.
- A biblioteca mostra o aviso `materials-demo`.

Nenhuma asserção antiga relaxada.

## Prova por cliques (depois)

`/materials`: aviso `materials-demo` renderizado; `Linho Puro Off-White`
continua ilustrando a biblioteca; métricas "Materiais —", "Custo médio —",
"Tecidos —" ("só demonstração na lista"); 0 `pageerror`. Captura
`/home/user/medicao63-materials-depois.png`.

## Gates

`tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **823/823**
(818 + 5 do teste novo `onda69-materiais-demo.test.ts`).

## Publicação

**Há uma publicação pendente (69).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL.
