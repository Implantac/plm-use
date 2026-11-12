# Onda 73 — Indicadores fixos de canal, região, devolução e conector fora das telas

**Data:** 2026-10-21
**Medição de produção:** 67ª (repo = Onda 72 publicada; ar = Onda 72; banco inalterado)

## O que foi encontrado

Depois de fechar os seeds (Ondas 66–72), a varredura mediu o que sobrava **fora dos stores**: números escritos à mão direto no JSX, lidos como realizado.

### `/commercial`

| Bloco                             | Valor fixo                                                                                                  | Lido como                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Card "Taxa de Devolução Fit"      | `2,4%` / `-0,8%`                                                                                            | KPI de logística reversa real                            |
| "Vendas por Canal Omnichannel"    | Atacado `R$ 540k` (45%), E-commerce `R$ 320k` (27%), Marketplaces `R$ 210k` (18%), Franquia `R$ 130k` (10%) | Faturamento rateado por canal                            |
| "Logística Reversa & Caimento"    | `36` trocas abertas, `2,4%` devoluções, `41%` motivo fit                                                    | Operação real de trocas                                  |
| "USE AI · Engenharia de Caimento" | "41% das devoluções concentram-se em folga de cintura no tamanho M"                                         | Diagnóstico de caimento apurado                          |
| "Conectores Fiscais & Canais"     | 4 conectores (SEFAZ NFe 4.00, ERP UseCloud, Showroom Digital B2B, E-commerce VTEX) marcados **Ativo**       | Integração funcionando — sem nenhum código de integração |

### `/analytics`

| Bloco                              | Valor fixo                                                                   | Lido como                                       |
| ---------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| "Penetração de Mercado por Região" | Sudeste `42%` / `R$ 1.2M`, Sul `28%` / `R$ 840k`, Nordeste `15%` / `R$ 450k` | Receita por UF                                  |
| "Mix por canal"                    | Meta Ads `44%`, Google Ads `28%`, Instagram `18%`, TikTok Ads `10%`          | Rateio de mídia realizado                       |
| "Performance por coleção"          | Verão 2027 `R$ 189.000` ROI `5.01x`, Inverno 2026 `R$ 73.000` ROI `2.48x`    | Receita/ROI por coleção                         |
| Barras previsto x realizado        | largura fixa `62%` e `78%`                                                   | Progresso de verba                              |
| Selo do painel                     | **Realizado**                                                                | Painel com campanha, sem nenhuma campanha salva |

## O que foi corrigido

- `/commercial`: `canaisVenda` nasce vazio com aviso `commercial-canais-vazios` + CTA "Ver pedidos salvos"; taxa de devolução vira `—` "sem devolução registrada"; logística reversa com `—` (só "Lojas B2B" continua real, de `clients.length`); texto do USE AI declara a ausência de devolução; conectores passam a **Não conectado** (nenhum está integrado).
- `/analytics`: `regioesVenda`, `mixCanal` e `performanceColecao` nascem vazios com avisos `analytics-regioes-vazias`, `analytics-mix-vazio` e `analytics-performance-vazia` + CTA "Ver pedidos salvos"; as barras usam `pctPrevisto`/`pctRealizado` derivados de `marketingTotals` (0 sem campanha); o selo do painel vira "Sem campanha salva" quando não há campanha.
- Nenhum dos números fictícios é citado no texto novo — eles desaparecem da tela, não viram "valor antigo de exemplo".

## Prova executada (local, Vite + Playwright)

**Antes:** `/commercial` com `R$ 540k`, `2,4%`, `41%`, `36` e os 4 conectores "Ativo"; `/analytics` com `R$ 1.2M`, `R$ 840k`, `R$ 450k`, `42%`, `28%`, `18%`, `10%`, `R$ 189.000`, `Verão 2027`, `META ADS`.
Capturas `medicao67-commercial-antes.png`, `medicao67-analytics-regioes-antes.png`.

**Depois:** `/commercial` — nenhum dos valores fictícios no DOM; `NÃO CONECTADO` presente; aviso `commercial-canais-vazios` renderizado. `/analytics` — nenhum dos valores fictícios no DOM; os três avisos de ausência renderizados; "Sem campanha salva" no painel. **0 `pageerror`** nas duas telas.
Capturas `medicao67-commercial-depois.png`, `medicao67-analytics-regioes-depois.png`.

## Gates

`tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **843/843** (839 + 4 do teste `onda73-indicadores-fixos.test.ts`).

## Publicação

**Há uma publicação pendente (73).** Nenhuma migration foi escrita nem aplicada; publicar o app não aplica SQL. O SQL aplicado desde a 24ª medição permanece com SHA-256 `382f0f19…`.
