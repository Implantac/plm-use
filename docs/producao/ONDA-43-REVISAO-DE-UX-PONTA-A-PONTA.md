# Onda 43 — Revisão de UX ponta a ponta: o usuário no centro

**Data:** 06/11/2026 · **Commit:** `ee97e4f` · **Antecessor:** `04c6759` (Onda 42 + docs)

> Pedido do dono: _"revise o projeto de ponta a ponta, teste como usuário, sinta
> a complexidade e dificuldade do usuário em usar o sistema e melhore a
> experiência do usuário"_.

---

## 1. Como foi testado (executado, não inferido)

| Etapa     | Como                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| App       | `npm run dev -- --host 0.0.0.0 --port 8080`, Vite 7.3.7                                                                                               |
| Browser   | Chromium headless 158 via Playwright (instalado no turno)                                                                                             |
| Sessão    | sessão **local simulada** injetada no `localStorage` do Supabase — sem login real, **sem nenhuma escrita no banco**                                   |
| Varredura | **17 rotas** percorridas com medição de texto, `—`, botões, inputs, `h1` e erros de console                                                           |
| Tarefas   | "criar a primeira referência", "chegar à Ficha Técnica", "abrir o formulário", "entender por que os números estão vazios" — cliques e campos contados |
| Evidência | screenshots `/tmp/ux_login.png`, `/tmp/ux_dashboard.png`, `/tmp/ux_dashboard_depois.png`                                                              |

Os `401`/`403` vistos no console são esperados: o token é local e o banco o
rejeita. Eles **não** representam o comportamento de um usuário autenticado de
verdade — e justamente por isso o banner "Verifique sua conexão" aparece no
print abaixo. Não foi mexido no tratamento de erro do cloud-sync.

---

## 2. O que o usuário sente

O sistema é **profundo e correto**, mas a primeira experiência é de um
**painel quebrado**. As Ondas 35–42 fizeram o trabalho certo: dado de fábrica
não entra em número, documento ou trilha de auditoria. O efeito colateral é que
quem abre o PLM pela primeira vez encontra:

- **~100 ocorrências de `—`** nas 17 telas medidas — 30 em `/suppliers`, 21 em
  `/financial`, 15 em `/flow`, 10 no `/dashboard`;
- avisos âmbar e selos "Demonstração" em quase toda tela, cada um explicando
  **a sua própria** ausência, nenhum explicando **o todo**;
- um banner vermelho "Não foi possível atualizar as referências" no meio do
  dashboard;
- um selo `"DEMONSTRAÇÃO — NÃO USAR PARA DECIDIR · DEV000006"` colado na
  primeira dobra;
- o "Fluxo operacional — do pedido à OP" com **6 etapas** ocupando a tela
  inteira antes de qualquer ação possível;
- e, para piorar, **a sidebar só mostrava 4 das 42 rotas**.

A pergunta que ninguém respondia era simples: **"está vazio porque quebrou, ou
porque sou novo? E o que eu faço agora?"**. O usuário não tem um ponto de
partida — ele tem 42 destinos escondidos e cem avisos.

### Achado raiz (bug, não opinião)

`src/routes/_authenticated.tsx` inicializava `openSections` com chaves
**obsoletas**: `inicio`, `criar`, `colecoes`, `produtos`, `industrial`… O
registry atual usa `geral`, `plm-criacao`, `plm-engenharia`, `pcp`, `supply`,
`gtm`, `insights`, `admin`. Nenhuma chave batia → **todos os grupos nasciam
fechados**; só `geral` abria porque o `useEffect` de rota ativa forçava. O
usuário precisava adivinhar que títulos em caixa alta eram botões.

Outros achados medidos:

| Achado                        | Medição                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| Formulário "Nova referência"  | 7 campos, 2 obrigatórios marcados só com `*` visual, **0** `required`/`aria-required`   |
| `/tech-sheet`                 | sem nenhum `<h1>`                                                                       |
| Navegação até "Ficha Técnica" | **2 cliques** (expandir Engenharia + clicar)                                            |
| Complexidade de telas         | `/orders` 62 botões e 18 inputs; `/research` 58 botões; `/suppliers` 18 botões e 30 `—` |
| Jargão na primeira dobra      | "Torre Executiva PLM 2.0", "SOZINHO", "Cronoanálise GSD", "DPP"                         |

---

## 3. O que foi melhorado

### 3.1 Um único ponto de partida — `ComecePorAqui`

`src/lib/onboarding/primeiros-passos.ts` + `src/components/onboarding/ComecePorAqui.tsx`.

O card responde, em linguagem simples, **por que** os números são `—` ("o
sistema não mistura exemplos de demonstração com a operação real") e dá **4
passos concretos**, cada um com a rota e o nome exato do botão a clicar:

1. Crie sua primeira ficha técnica → `/references` → "Nova referência"
2. Registre um pedido B2B → `/orders` → "Novo pedido"
3. Cadastre uma facção ou fornecedor → `/suppliers` → "Novo parceiro"
4. Lance um drop ou campanha → `/marketing` → "Nova campanha"

Há barra de progresso acessível (`role="progressbar"`), destaque do **próximo**
passo com botão "Começar" e `role="status"` quando tudo está pronto. O card
**se desfaz sozinho** conforme o usuário cria dados.

O estado **não é um contador paralelo**: `computarPrimeirosPassos()` é uma
função pura alimentada por `operationalCodes`, `pedidosOperacionais`,
`parceirosOperacionais` e `campanhasOperacionais` — os mesmos filtros das Ondas
38–42. Se uma vitrine voltar a contar como dado real, o onboarding mente e os
testes caem juntos. Sem `localStorage`, sem progresso inventado.

### 3.2 Sidebar descoberta de verdade

Default derivado de `Object.keys(NAV_GROUPS)` (fim do bug das chaves obsoletas),
com `geral`, `plm-criacao` e `plm-engenharia` abertos no primeiro uso. Grupos
fechados agora mostram **quantas páginas escondem** (`6`, `9`…), com
`aria-label`. A preferência salva do usuário continua valendo.

### 3.3 Primeira dobra mais leve

As 6 etapas do fluxo do pedido viraram um `<details>` colapsado
(`data-testid="fluxo-operacional-detalhes"`) rotulado _"Como funciona o fluxo
do pedido · 6 etapas · Ver etapas"_. A informação continua a um clique, mas
deixa de competir com a ação. O guia entra **antes** dela.

### 3.4 Acessibilidade do primeiro formulário

`Código` e `Nome da peça` ganharam `required` + `aria-required="true"` (antes
só um `*` visual). Leitores de tela agora sabem o que é obrigatório.

---

## 4. Antes / depois — medido no browser, contexto limpo

| Métrica                               | Antes                    | **Depois**           |
| ------------------------------------- | ------------------------ | -------------------- |
| Links visíveis na sidebar no 1º uso   | **4** de 42              | **19** de 42         |
| Grupos fechados com pista de conteúdo | 0                        | **6**                |
| Cliques até "Ficha Técnica"           | 2                        | **1**                |
| `aria-required` em "Nova referência"  | 0                        | **2**                |
| Resposta para "por que está vazio?"   | espalhada em ~100 avisos | **1 card**, no topo  |
| 6 etapas do fluxo na 1ª dobra         | sempre abertas           | colapsadas, 1 clique |
| Passos com botão de destino           | 0                        | **4**                |

---

## 5. O que **não** foi mexido (e por quê)

- **Os `—` continuam.** Eles são a conquista das Ondas 35–42: ausência não é
  zero apurado. O problema não eram os traços, era a falta de **orquestração**.
- **Nenhum filtro de vitrine foi afrouxado**, nenhuma asserção antiga removida.
- **Nenhum número operacional mudou** — S&OP, DRE, MRP, LGPD e governança
  seguem idênticos.
- **O banner "Verifique sua conexão"** do print é artefato da sessão simulada
  (401 do token local). Trocar a mensagem de erro de rede sem reproduzir a
  falha real seria chutar.
- **SQL 163/163** inalterado; banco segue sem as migrações 21/24.

---

## 6. Prova

| Gate                | Resultado                                          |
| ------------------- | -------------------------------------------------- |
| `tsc --noEmit`      | ✅ 0 erros                                         |
| eslint              | ✅ 0 erros, 20 warnings preexistentes              |
| prettier            | ✅ limpo                                           |
| vitest              | ✅ **610/610** (eram 586; **+24**)                 |
| Re-teste no browser | ✅ todas as 6 métricas da tabela acima confirmadas |

**24 testes novos**: 9 da função pura/`contarDadosOperacionais` (incluindo
"modelo de demonstração não conta" e "edição promovida conta"), 7 de render do
card (explicação, progresso, 4 rotas, próximo passo, estado concluído,
instruções) e 8 guardas de fonte (chaves obsoletas banidas, contador, detalhes
colapsados, `aria-required`, uma única fonte de verdade).

---

## 7. Medição das camadas — 20ª (06/11)

O ar avançou **mais uma vez, sem aviso do dono**: saiu `index-HH9GNbDa.js` e
entrou **`index-D2xvfyGH.js`** (221 chunks), com `supplier-so-vitrine` e
`scoreboard-so-vitrine` presentes → **Onda 42 publicada**.

| Camada        | Estado                                                |
| ------------- | ----------------------------------------------------- |
| Repositório   | **Onda 43** (este commit)                             |
| App publicado | **Onda 42** — `index-D2xvfyGH.js`, **uma onda** atrás |
| Banco         | sem migrações 21/24 — `PGRST205` + 3× `PGRST202`      |

`comece-por-aqui`, `progresso-onboarding` e `páginas neste grupo` = **0** no
bundle. `DEV000006` segue em **27** ocorrências.

---

## 8. Próximos passos sugeridos (não implementados nesta onda)

Ordenados por impacto no usuário, para as próximas rodadas:

1. **Empty states com CTA em cada tela.** Hoje o dashboard orienta, mas
   `/suppliers` (30 `—`), `/financial` (21) e `/flow` (15) ainda só explicam a
   própria ausência. Um componente único `EstadoVazio` com link para o passo
   correspondente reduz o ruído sem esconder a verdade.
2. **Reduzir jargão na primeira dobra.** "Torre Executiva PLM 2.0",
   "SOZINHO", "Cronoanálise GSD", "DPP" e "Passaporte Digital ESG" são
   precisos para quem já opera, mas crípticos no primeiro dia.
3. **`/tech-sheet` sem `<h1>`** e demais telas sem hierarquia de título —
   varredura de acessibilidade completa (os 6 specs de `tests/e2e` cobrem só
   `/login`).
4. **Formulários longos.** `/orders` com 18 inputs e 62 botões merece
   seccionamento/wizard; "Nova referência" já tem 3 seções numeradas, o que é
   um bom padrão a replicar.
5. **Publicar a Onda 43**, aplicar `APLICAR-ONDA-21-24.sql` (3 NOTICEs) e
   fornecer `PLM_E2E_EMAIL`/`PLM_E2E_PASSWORD` para que os specs autenticados
   deixem de ser `skipped` e esta revisão de UX possa ser repetida com sessão
   real, sem os `401` da simulação.
