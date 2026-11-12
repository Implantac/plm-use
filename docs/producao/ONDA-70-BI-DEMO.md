# Onda 70 — BI de demonstração fora das métricas e do banco

**Medição:** 64ª. **Repo:** `e0d7579` (Onda 69) local = remoto, limpo, token
0/0. **Ar:** entry novo `index-BAtJAsw_.js` / `index-fMU01YJV.js` (**214
chunks / 3.208.689 bytes**, 0 falhas) com marcadores da 69 = 1/1
(`materials-demo`, "Materiais de demonstração no catálogo"), marcador da
68 = 1, da 67 = 1 e `DEV000006` = 16 — **publicação da Onda 69 relatada
pelo dono e validada por cliques em produção** (`/materials` com o aviso
`materials-demo` e métricas em `—`, 0 `pageerror`; captura
`/home/user/medicao64-prod-materials.png`). **Banco:** view `200 []`, 4
funções `401 42501` (com parâmetros corretos), SQL SHA `382f0f19…`
inalterado.

## Risco medido

A varredura dos seeds restantes mediu o `analyticsKpisSeed` (BI Executivo,
módulo 8 do creative-sync) e o dashboard de marketing hardcoded em
`/analytics`. O seed de 3 KPIs (`Meta de Coleção` R$ 2.4M/4M, `Crescimento
YoY` +24.8%, `Eficiência PCP` 94.2%) era BI de demonstração **sem nenhuma
declaração** — e entrava em número operacional em três lugares:

1. **`/analytics`** — os cards de KPI mostravam os valores fictícios como
   indicadores da empresa; as 5 métricas do topo eram literais
   ("Investimento (real) R$ 84k", "ROI médio 3.4x", "ROAS 5.8x",
   "Ruptura 4.2%", "Giro 7.1x"). Prova antes: "2.4M" e "R$ 84k" visíveis.
2. **Dashboard de Marketing** — 4 produtos com spend/receita/ROI fictícios
   ("Vestido Floral (Ref. 302)" ROI 5.69x, receita R$ 262.000) e
   penetração por região ("Sudeste R$ 1.2M") lidos como marketing real.
   Prova antes: "Vestido Floral (Ref. 302)" visível.
3. **`creative-sync`** — `listAnalyticsKpis` sincronizava o seed inteiro
   para a tabela `analytics_kpis` do Supabase como se fosse cadastro da
   empresa.

## Correção

Mesmo contrato das coleções `demo: true` (Onda 51) e dos creators (Onda 59):

- O seed marca `demo: true` (`AnalyticsKpi.demo?`, helper
  `kpisOperacionais`); as métricas do topo viram **`—`** ("sem campanha
  salva") — nunca número inventado.
- O dashboard de marketing nasce vazio (`marketingMetrics = []`); os
  cards de KPI de demonstração continuam ilustrando o dashboard.
- O engine só sincroniza KPIs operacionais
  (`list: () => kpisOperacionais(listAnalyticsKpis())`) — a vitrine nunca
  sobe para o banco.
- A tela mostra o aviso `analytics-demo` ("BI de demonstração… O PLM não é
  ERP: nenhum ROI, ROAS ou receita de vitrine é apurado como real").

Nenhuma asserção antiga relaxada.

## Prova por cliques (depois)

`/analytics`: aviso `analytics-demo` renderizado; `2.4M` continua
ilustrando os cards; métricas do topo em `—` ("sem campanha salva");
"R$ 84k" e "Vestido Floral (Ref. 302)" ausentes; 0 `pageerror`. Captura
`/home/user/medicao64-analytics-depois.png`.

## Gates

`tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **828/828**
(823 + 5 do teste novo `onda70-bi-demo.test.ts`).

## Publicação

**Há uma publicação pendente (70).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL.
