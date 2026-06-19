# Plano de Evolução — USE MODA PLM Enterprise

## Auditoria do que já existe (reaproveitar, não recriar)

**Módulos prontos** (19 rotas, ~7,5k linhas): `dashboard`, `research`, `development`, `prototypes`, `cad`, `tech-sheet`, `collections`, `production`, `suppliers`, `inventory`, `marketing`, `commercial`, `financial`, `analytics`, `ai-center`, `digital-twin`, `feed`, `security`.

**Fundação PCP já entregue** (Ondas 1 e 2 anteriores):
- Tipos `Lote / ReferenciaLote / Passagem / Ocorrencia` em `src/types/pcp.ts`
- Store Zustand em `src/lib/pcp/store.ts` com `registrarPassagem` (integral/parcial, 1ª/2ª linha) e `registrarOcorrencia` (positiva/negativa/neutra) com regras de saldo
- Kanban por setor em `production` (Compras → CAD → Corte → Silk → Costura → Acabamento → Expedição → Terceirizados)
- `ReferenciaDrawer` com tabs Ficha · Layout · 1ª Linha · 2ª Linha · Ocorrências · Histórico
- `FichaTecnicaResumo` reutilizando a Ficha Técnica; link `/tech-sheet?ref=...`

**Não tocar (estável)**: `dashboard`, `cad`, `inventory`, `commercial`, `financial`, `digital-twin`, `feed`, `security`, `prototypes`, `research`.

## O que falta para virar PLM Enterprise (do seu briefing)

1. Timeline da referência (Pesquisa → Sell Out) — fonte única
2. Centro de Desenvolvimento (visão única da coleção)
3. Produção do Dia por setor (operário abre e trabalha)
4. Torre de Controle (lotes atrasados, gargalos, lead time)
5. Smart Production Planner (evolução do relatório de necessidade; score de prioridade; grade real)
6. Influencer Center + envio de peças + ROI + alertas
7. 3 agentes IA operacionais (Fashion · PCP · Marketing) dentro do `ai-center` atual

---

## Onda 3 — Reference Timeline + Centro de Desenvolvimento
**Reaproveita**: `development.tsx`, `tech-sheet.tsx`, `collections.tsx`, `FichaTecnicaResumo`.

- Novo componente `ReferenceTimeline` (puro, isolado em `src/components/reference/`): 12 estágios Pesquisa → Croqui → Modelagem → Piloto → Prova → Ajustes → Engenharia → Liberação PCP → Produção → Marketing → Sell Out, com status, responsável, data, comentário.
- Injetado em:
  - `tech-sheet` (aba "Timeline")
  - `ReferenciaDrawer` do PCP (nova tab "Timeline")
- Tipo único `ReferenceLifecycle` em `src/types/reference.ts`; store leve em `src/lib/reference/store.ts` (mock).
- `development.tsx` recebe **Centro de Desenvolvimento**: filtros rápidos "Pilotos pendentes", "Sem ficha técnica", "Aguardando aprovação", "Liberados PCP", "Atrasados". Sem nova tela — refatora a existente em modo cards/kanban com a mesma estética.

## Onda 4 — Produção do Dia + Torre de Controle
**Reaproveita**: `production.tsx`, store PCP existente.

- Nova rota `/_authenticated/production/today` (sub-rota da Produção, **não duplica** o módulo): "O que produzir hoje" por setor selecionado — lista grande com Foto · Ref · Lote · Qtd · Prioridade · Prazo · Tempo previsto. Dois cliques no máximo (Passagem ou Ocorrência via drawer já existente).
- Nova aba "Torre de Controle" dentro de `production.tsx` (toggle de visão Kanban ↔ Torre): lotes atrasados, gargalos (setor com maior fila), lead time médio, eficiência, capacidade vs demanda. Cards densos, sem novas tabelas.
- Sem novo store: derivações puras sobre `usePCPStore`.

## Onda 5 — Smart Production Planner + Score de Prioridade
**Reaproveita**: `inventory.tsx` (dados de estoque mockados), `collections.tsx`, `analytics.tsx`.

- Nova rota `/_authenticated/planner` integrada ao menu de PCP. Entrega:
  - Tabela inteligente por referência: estoque, reservado, em produção, giro, sell out, lead time, cobertura, curva ABC, **necessidade por grade real** (PP/P/M/G/GG/XG/XXG calculada do giro por tamanho), score 0-100, recomendação ("Produzir 1.200 pç", "Risco de ruptura em 18 dias", "Excesso — não produzir").
  - Filtros: Coleção, Grupo, ABC, Risco.
  - Botão "Gerar Lote" que cria entrada no `usePCPStore` com a grade sugerida.
- Tipos em `src/types/planner.ts`; lógica de score isolada em `src/lib/planner/score.ts` (testável).

## Onda 6 — Influencer Center + 3 IAs operacionais
**Reaproveita**: `marketing.tsx`, `ai-center.tsx`.

- `marketing.tsx`: nova aba **Influencer Center**
  - CRUD influenciador (nome, redes, cidade/UF/região, segmento, engajamento)
  - Envio de peças (coleção, ref, cor, tamanho, data, campanha, valor estimado)
  - Histórico por influenciador (peças, publicações, engajamento, ROI, vendas geradas — mock)
  - Alertas inteligentes ao lançar coleção: "Ana Souza ainda não recebeu peças desta coleção"
  - ROI por produto + Heat Map Brasil (SVG simples por região, sem libs novas)
- `ai-center.tsx`: 3 cards de agente já consumindo dados reais dos stores existentes:
  - **Fashion AI** — produtos atrasados, pilotos pendentes, coleções em risco
  - **PCP AI** — o que produzir hoje, lote parado, gargalo, prioridade
  - **Marketing AI** — produto a investir, influenciador top, coleção a repetir
  - Respostas geradas via Lovable AI Gateway (`google/gemini-3-flash-preview`) através de `createServerFn` em `src/lib/ai/agents.functions.ts`, com o contexto dos stores enviado no prompt.

---

## Regras técnicas para todas as ondas

- **Sem backend novo** salvo o `createServerFn` da IA (Onda 6). Todo o resto vive em stores tipados, prontos para Supabase depois.
- **Sem libs novas**: drag-and-drop nativo, charts/heatmap em SVG.
- **Nada de novo módulo financeiro** — qualquer custo/ROI consome dados já existentes em `marketing.tsx` ou mock.
- **Drawer-first**: nenhuma ação principal abre tela cheia; usa `Sheet` já em uso.
- **Reaproveitar `ModuleLayout`, `ReferenciaDrawer`, `FichaTecnicaResumo`, store PCP, glass-card tokens** — proibido recriar variantes.
- **Cada onda termina utilizável** — sem ondas dependentes "em construção".

## Ordem recomendada

Onda 3 → 4 → 5 → 6, validando uma a uma. Onda 3 é base (timeline alimenta Desenvolvimento e PCP). Onda 5 (Planner) depende da Timeline para usar a fase real da referência.

## Pergunta

Confirma essa divisão e começo pela **Onda 3 (Reference Timeline + Centro de Desenvolvimento)**, ou prefere reordenar (ex.: Influencer/IA primeiro, Planner antes da Torre, etc.)?
