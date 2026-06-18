
# Plano de Evolução — USE MODA PLM AI

Escopo grande (20 focos). Para entregar com qualidade e sem quebrar o que já funciona, proponho dividir em **5 ondas incrementais**. Cada onda é independente, testável e termina com o sistema utilizável.

> ⚠️ Importante: este plano **não recria** módulos existentes. Cada onda revisa as telas atuais (`collections`, `development`, `tech-sheet`, `production`, `suppliers`, `marketing`, `analytics`, `ai-center`) e adiciona apenas o que falta.

---

## Onda 1 — Fundação PCP (Lotes + Passagens + Ocorrências)
**Foco 04, 05, 06, 07, 08, 11, 12**

Refatora `_authenticated.production.tsx` para ter o **Lote como entidade central**:

- Modelo de dados em memória (mock estruturado, pronto para futura conexão com backend):
  - `Lote` { numero, grupo, prioridade, status, setor_atual, referencias[] }
  - `ReferenciaLote` { ref, qtd_programada, qtd_produzida, qtd_perdida, qtd_adicional, saldo, status_por_setor }
  - `Passagem` { tipo: integral|parcial, linha: 1ª|2ª, setor_origem, setor_destino, qtd, responsavel, timestamp }
  - `Ocorrencia` { tipo: positiva|negativa|neutra, qtd, motivo, setor, responsavel, observacao }
- Kanban por setor (Compras, CAD, Corte, Silk, Costura, Acabamento, Expedição, Terceirizados) com cards de **lote** mostrando qtd programada/produzida/saldo, prioridade, % concluído, ocorrências, atraso.
- Cálculo de saldo segundo as regras (positiva soma, negativa reduz, neutra apenas registra; parcial mantém saldo, integral zera).
- Mesma lote pode aparecer em **múltiplos setores** quando referências estão em fases diferentes.

## Onda 2 — Drawer da Referência (Ficha Técnica + Passagens contextuais)
**Foco 03, 10, 11, 12**

- Ao clicar numa referência dentro do lote, abre **drawer lateral** com tabs:
  Imagem | Ficha Técnica | Layout | Passagem 1ª linha | Passagem 2ª linha | Ocorrências | Histórico
- Evolui `_authenticated.tech-sheet.tsx` — não duplica: o drawer **reutiliza** o componente de ficha técnica existente.
- Formulários de passagem parcial/integral e registro de ocorrências (positiva/negativa/neutra) com validação de saldo.

## Onda 3 — Terceirizados + Visão por Setor
**Foco 09, 18**

- Evolui `_authenticated.suppliers.tsx` para gerir lotes enviados a terceiros: envio, retorno integral/parcial, ocorrências, previsão.
- Filtro de visão por setor (usuário do Corte vê só lotes do Corte etc.) — guard simples por role mockada.

## Onda 4 — Coleções + Desenvolvimento + Marketing conectados
**Foco 01, 02, 13**

- `_authenticated.collections.tsx`: mix planejado x realizado, curva ABC, rentabilidade, campeões/baixo desempenho, metas (vendas, margem, rentabilidade, qtd).
- `_authenticated.development.tsx`: fluxo Ideia→Croqui→Modelagem→Piloto→Ajuste→Aprovado→Produção→Lançado com status, responsável, datas e histórico (completar TODO de drag-and-drop).
- `_authenticated.marketing.tsx`: custos (ensaio, conteúdo, influencer, tráfego) por produto/coleção + ROI/ROAS conectado a vendas.

## Onda 5 — BI + IA Operacional + Limpeza técnica
**Foco 14, 15, 16, 19**

- `_authenticated.analytics.tsx`: indicadores reais de PCP (lotes atrasados, gargalos, ocorrências), desenvolvimento, coleções, marketing.
- `_authenticated.ai-center.tsx`: perguntas operacionais com base em dados ("qual lote está parado?", "qual setor é gargalo?", "qual terceirizado atrasa?").
- Revisão técnica: remoção de componentes/hooks duplicados, empty/loading/error states, responsividade tablet.

---

## Detalhes técnicos

- **Sem backend novo nesta fase**: os dados ficam num store (Zustand ou contexto) com mocks realistas, prontos para trocar por chamadas Supabase depois. Isso evita migrações destrutivas e respeita o foco 17 ("preservar dados existentes").
- **Componentização**: criar `src/components/pcp/` com `LoteCard`, `KanbanColumn`, `ReferenciaDrawer`, `PassagemForm`, `OcorrenciaForm` — reutilizáveis entre Produção, Terceirizados e BI.
- **Tipos**: `src/types/pcp.ts` centralizando Lote/Referência/Passagem/Ocorrência.
- **Sem novos pacotes** salvo necessidade (drag-and-drop usa HTML5 nativo como já está no TODO).

---

## Pergunta antes de começar

Quer que eu execute **as 5 ondas em sequência nesta mesma resposta** (entrega grande, mais demorada) **ou começo pela Onda 1 (PCP/Lotes/Passagens/Ocorrências)** e seguimos onda a onda, validando a cada etapa?

Recomendo **começar pela Onda 1**, porque ela é a base de tudo (lote é a entidade central) e permite validar o modelo antes de propagar para terceirizados, marketing e BI.
