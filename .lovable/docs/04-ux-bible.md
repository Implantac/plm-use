# Documento 04 — UX Bible

Este documento fixa os padrões de experiência do PLM. Nenhuma tela pode ser desenhada sem obedecer aos padrões abaixo. Esta bíblia é anterior ao design visual (Doc 05) e anterior a qualquer código de UI. Todo módulo herda estes componentes universais — não há liberdade criativa em navegação, drawer, comando, breadcrumb, timeline ou toasts.

---

## 1. Princípios de UX (inegociáveis)

1. **Tudo é entidade** — toda tela mostra ou lista uma das entidades do Doc 03. Não existem telas "livres".
2. **Um único Drawer Universal** — qualquer clique em uma entidade abre o *mesmo* painel lateral, com as *mesmas* abas (Resumo · Workflow · Timeline · Relações · Comentários · Anexos · IA).
3. **Command Palette antes do menu** — o usuário avançado nunca precisa clicar em menu. `Ctrl/⌘ K` resolve tudo: abrir entidade, criar, transicionar, pesquisar, ir para módulo.
4. **Timeline sempre visível** — nenhuma entidade existe sem histórico. A aba Timeline nunca é ocultada, mesmo vazia.
5. **Realtime silencioso** — a UI se atualiza sozinha. Toasts só aparecem para ações do próprio usuário ou eventos críticos (transição, CAPA, atraso).
6. **Zero modais bloqueantes** — confirmações destrutivas usam AlertDialog, tudo mais é Drawer ou Sheet. Nunca `window.confirm`.
7. **Densidade Linear/Notion** — tipografia pequena (11–13px), espaçamentos compactos, muito conteúdo por viewport, sem "cards-hero" gigantes.
8. **Atalhos são cidadãos primários** — cada ação tem tecla. Cada tecla aparece no tooltip.
9. **Nada é órfão** — toda tela tem breadcrumb, toda entidade tem link permanente (`/e/{tipo}/{id}`), todo evento aponta para sua origem.
10. **Falha explícita** — erros aparecem inline, com causa e ação sugerida. Nunca "algo deu errado".

---

## 2. Hierarquia de Navegação

### 2.1 Estrutura em 3 níveis

```
Workspace  →  Módulo  →  Entidade
```

- **Workspace** = a empresa/tenant. Escolhido no login. Não muda durante a sessão.
- **Módulo** = uma das 15 áreas do Doc 02 (Coleções, Desenvolvimento, PCP, etc.).
- **Entidade** = uma Referência, Lote, Ficha, CAPA, etc.

Não há um 4º nível. Sub-áreas viram *filtros* ou *abas dentro do módulo*, nunca rotas separadas.

### 2.2 Sidebar (esquerda, fixa, 56px recolhida / 220px expandida)

Ordem obrigatória:

1. **Logo** (clique → dashboard)
2. **Command palette** (⌘K, ícone lupa)
3. **Feed** (notificações, atividades)
4. **—**
5. **Meu Dia** (agenda pessoal, pendências)
6. **Coleções**
7. **Desenvolvimento** (Referências, Pesquisa, Pilotos)
8. **Engenharia** (Fichas, CAD)
9. **PCP** (Torre de Controle, Kanban, Gantt)
10. **APS/MRP**
11. **Facções**
12. **Qualidade / CAPA**
13. **Custos & Margem**
14. **BI**
15. **—**
16. **Copiloto** (chat lateral)
17. **Admin** (se `admin`/`manager`)
18. **Perfil** (bottom)

Cada item mostra ícone + label + contagem de pendências (badge numérico só quando > 0).

### 2.3 Topbar (56px)

Da esquerda para a direita:

- **Breadcrumb** (Módulo › Sub-visão › Entidade)
- **Presença** (avatares dos usuários vendo a mesma tela)
- **Busca inline** (`/` para focar)
- **Alertas** (sino, dropdown)
- **Avatar** (menu de usuário)

Nada mais. Não há título de página duplicado (o breadcrumb é o título).

### 2.4 Rotas canônicas

```
/                          → dashboard/meu dia
/m/{modulo}                → tela principal do módulo
/m/{modulo}/{visao}        → visão específica (ex: /m/pcp/gantt)
/e/{tipo}/{id}             → deep link de entidade (abre com Drawer aberto)
/admin/*                   → área administrativa
/login, /audit, /sitemap.xml
```

Regras:
- `_authenticated.*.tsx` continua sendo o layout gate.
- Todas as rotas antigas (`_authenticated.references.tsx`, etc.) serão renomeadas para `_authenticated.m.{modulo}.tsx` na migração do Doc 06.
- URLs são compartilháveis: abrir `/e/reference/uuid` de qualquer lugar restaura a tela + drawer aberto.

---

## 3. Command Palette (⌘K)

Componente único, montado no root. Nunca duplicado por módulo.

### 3.1 Modos

Detectados pelo primeiro caractere digitado:

| Prefixo | Modo               | Exemplo                                |
|---------|--------------------|----------------------------------------|
| (nada)  | Busca global       | `vestido midi`                         |
| `>`     | Ação/comando       | `> criar referência`                   |
| `#`     | Ir para entidade   | `#REF-2401`                            |
| `@`     | Ir para pessoa     | `@ana.silva`                           |
| `/`     | Ir para módulo     | `/pcp`, `/qualidade`                   |
| `?`     | Perguntar Copiloto | `? quais coleções estão atrasadas`     |

### 3.2 Resultado

Cada item tem: ícone da entidade · título · subtítulo · contexto (módulo/status) · atalho (se houver).

Enter abre no Drawer. `⌘+Enter` abre em página cheia (`/e/{tipo}/{id}`).

### 3.3 Recentes & Favoritos

- Últimas 8 entidades abertas viram sugestões quando a palette abre vazia.
- ⭐ marca como favorito (persistido em `profiles.favorites`).
- Favoritos aparecem antes de recentes.

---

## 4. Drawer Universal

O único painel de detalhes do sistema. Todo `openEntity({type, id})` renderiza este componente.

### 4.1 Estrutura

```
┌─────────────────────────────────────────┐
│ [tipo]  Título                    [X]   │  ← Header
│ subtítulo · status · responsável        │
├─────────────────────────────────────────┤
│ Resumo · Workflow · Timeline · Relações │  ← Tabs (fixas)
│ · Comentários · Anexos · IA             │
├─────────────────────────────────────────┤
│                                         │
│  conteúdo da aba ativa                  │
│                                         │
├─────────────────────────────────────────┤
│ [Ação primária]  [Ação secundária]  ⋯   │  ← Footer sticky
└─────────────────────────────────────────┘
```

### 4.2 Regras

- Largura: `sm:max-w-2xl` (672px). Nunca fullscreen — a página de origem continua visível.
- `Esc` fecha. Clique fora fecha (a menos que haja edição não salva → AlertDialog).
- O deep link `/e/{tipo}/{id}` **abre a tela do módulo daquela entidade** e o Drawer sobreposto. Fechar o Drawer volta para a tela do módulo, não para a home.
- As 7 abas são fixas. Módulos podem *adicionar* abas específicas (ex: BOM/BOP em Ficha), nunca *remover*.
- Quando a entidade não tem detalhe específico, o Drawer degrada para modo genérico (Timeline + Relações + Raw ID) — comportamento atual já implementado.

### 4.3 Abas canônicas

| Aba          | Conteúdo mínimo                                                       |
|--------------|-----------------------------------------------------------------------|
| Resumo       | Campos-chave da entidade + KPIs                                       |
| Workflow     | Estado atual + próximas transições permitidas (via WorkflowEngine)    |
| Timeline     | Últimos 200 eventos, filtráveis por tipo                              |
| Relações     | Grafo `entity_relations` in/out, agrupado por tipo                    |
| Comentários  | Thread com menções `@`, anexos leves                                  |
| Anexos       | Arquivos de storage vinculados                                        |
| IA           | Perguntas rápidas do Copiloto sobre esta entidade                     |

---

## 5. Padrões de Tela por Módulo

Todo módulo segue um dos 5 padrões abaixo. Nenhum módulo inventa o próprio layout.

### P1 — Lista + Drawer (padrão default)

Coleções, Fichas, CAPA, Facções, Referências (visão lista).
- Tabela densa com colunas configuráveis.
- Filtros no topo (chips).
- Clique na linha abre Drawer.
- Botão "Novo" no topo direito.

### P2 — Kanban + Drawer

PCP (lotes), Desenvolvimento (referências por status), Qualidade (CAPA por estágio).
- Colunas = estados do workflow.
- Card compacto, drag-and-drop dispara transição (via WorkflowEngine).
- Clique no card abre Drawer.

### P3 — Gantt/Timeline

APS, PCP (visão calendário), Coleção (roadmap).
- Barras horizontais por entidade.
- Linha do tempo com hoje marcado.
- Clique na barra abre Drawer.

### P4 — Torre de Controle (dashboard)

Meu Dia, PCP (torre), BI.
- Grid de widgets configuráveis.
- Cada widget tem título · valor · tendência · link "abrir detalhe".
- Sem interação pesada — é *read-only* que leva para os módulos operacionais.

### P5 — Editor (canvas)

Ficha Técnica, Digital Twin, CAD.
- Área central grande + painéis laterais (props à direita, camadas à esquerda).
- Salva com `⌘S`. Autosave a cada 30s.
- Versões acessíveis pela aba Timeline.

---

## 6. Componentes Transversais

### 6.1 Breadcrumb
`Módulo › Visão › [Entidade]`. Cada nível clicável. Nunca mais de 4 níveis.

### 6.2 Presença (PresenceBar)
Avatares empilhados dos usuários no mesmo `/e/{tipo}/{id}` ou `/m/{modulo}`. Tooltip com nome e "há X min".

### 6.3 Feed (ActivityFeed)
Painel deslizante à esquerda. Filtros por tipo de evento, por entidade, por pessoa. Todo item leva ao Drawer da entidade origem.

### 6.4 Alertas (AlertsBell)
Notificações que exigem ação. Diferente do Feed (que é passivo). Cada alerta tem `[Abrir]` + `[Descartar]`.

### 6.5 Toasts (sonner)
- `success` — verde, 3s, para confirmações da ação do próprio usuário.
- `error` — vermelho, permanente até dismiss, com botão "Detalhes".
- `info` — cinza, 4s, para eventos realtime relevantes ao contexto.
- Máximo 3 empilhados. Novos empurram os antigos.

### 6.6 Empty states
Sempre com: ícone · frase curta · botão de ação primária · link "aprender mais". Nunca uma tela em branco.

### 6.7 Loading
- Skeleton para listas e cards.
- Spinner `Loader2` **apenas** para ações inline (< 2s).
- Nada de "spinner centralizado na tela inteira".

### 6.8 Erros
Card vermelho inline com: causa · o que fazer · botão "Tentar novamente". Nunca stack trace na UI de produção.

---

## 7. Atalhos Globais

| Atalho          | Ação                                                    |
|-----------------|---------------------------------------------------------|
| `⌘K` / `Ctrl+K` | Command palette                                         |
| `/`             | Focar busca da topbar                                   |
| `G` + `D`       | Ir para Dashboard                                       |
| `G` + `P`       | Ir para PCP                                             |
| `G` + `R`       | Ir para Referências                                     |
| `G` + `F`       | Ir para Feed                                            |
| `C`             | Criar (contexto atual — Referência, Lote, CAPA…)        |
| `E`             | Editar entidade aberta no Drawer                        |
| `T`             | Ir para aba Timeline do Drawer                          |
| `?`             | Abrir cheat sheet de atalhos                            |
| `Esc`           | Fechar Drawer / Palette / Dialog                        |

Todos aparecem em tooltips com `kbd`.

---

## 8. Estados de Entidade na UI

Cores canônicas por status (a paleta exata vem no Doc 05 — Design System):

- **Rascunho / Ideia** — neutro (cinza).
- **Em progresso / Em execução** — âmbar.
- **Em revisão / Aguardando aprovação** — azul.
- **Aprovado / Concluído / Carimbado** — verde.
- **Reprovado / Cancelado** — vermelho.
- **Bloqueado / Atraso** — vermelho pulsante.
- **Arquivado** — cinza opaco.

Badges usam os mesmos mapeamentos em toda a UI. Não há status "customizado por módulo" no tratamento visual.

---

## 9. Regras de Interação com Workflow

- Toda mudança de status vai por `WorkflowEngine.transition(entity, to)`.
- Drawer > aba Workflow mostra APENAS transições permitidas para o role do usuário.
- Transições que exigem justificativa abrem um mini-form inline dentro da própria aba (não modal).
- Cada transição gera evento `status_changed` na Timeline — automático, não manual.

---

## 10. Regras de Escrita (microcopy)

- **Português-BR sempre**, tom direto, sem "por favor".
- **Verbos no imperativo** para botões primários: "Aprovar", "Enviar para piloto", "Carimbar ficha".
- **Sem gerúndio** em labels ("Salvar" não "Salvando" salvo em estado de loading).
- **Números com separadores locais**: `1.234,56`.
- **Datas curtas**: `07 jul` na UI compacta; `07/07/2026 14:22` no Timeline.
- **Nunca "clique aqui"** — o texto do link descreve o destino.

---

## 11. Acessibilidade (mínimo aceitável)

- Contraste AA em todo texto sobre fundo.
- Todo controle interativo alcançável por Tab; ordem lógica.
- `aria-label` em todo botão só-ícone.
- Foco visível (ring) em todos os elementos.
- Suporte a `prefers-reduced-motion` — anima­ções não essenciais desligam.
- Command palette totalmente navegável por teclado.

---

## 12. Realtime na UI

- Assinar canal Supabase por rota + por entidade aberta no Drawer.
- Atualizar lista/kanban/gantt sem re-fetch da tela inteira (patch de item).
- Se um evento realtime altera a entidade aberta no Drawer, mostrar um chip discreto `Atualizado agora` no header do Drawer, sem substituir o conteúdo sem consentimento se houver edição em andamento.

---

## 13. Mobile (v1 = read-mostly)

- Sidebar vira drawer superior.
- Módulos operacionais principais (Meu Dia, PCP torre, Feed, Alertas) funcionam em mobile.
- Editores (Ficha, CAD) mostram aviso "melhor no desktop".
- Command palette mantém `⌘K` no desktop; em mobile fica como botão flutuante.

---

## 14. Auditoria da UI atual vs UX Bible

Estado atual (rotas em `src/routes/_authenticated.*.tsx`) versus alvo:

| Item                          | Hoje                              | Alvo                                      |
|-------------------------------|-----------------------------------|-------------------------------------------|
| Drawer Universal              | ✅ existe (`EntityDrawer`)         | Adicionar abas Comentários, Anexos, IA    |
| Command Palette               | Parcial (`GlobalSearch`)           | Expandir para modos `>`, `#`, `@`, `/`, `?` |
| Breadcrumb                    | Ausente                            | Implementar em ModuleLayout               |
| Presença                      | ✅ (`PresenceBar`)                 | Manter                                    |
| Feed                          | ✅ (`ActivityFeedButton`)          | Padronizar itens conforme §6.3            |
| Alertas                       | ✅ (`AlertsBell`)                  | Separar de notificações passivas          |
| Rotas `/e/{tipo}/{id}`        | Ausentes                           | Criar no Doc 06                           |
| Padrões P1–P5                 | Cada módulo é próprio              | Unificar via `ModuleLayout` + templates   |
| Atalhos globais               | Só `⌘K`                            | Implementar tabela §7                     |
| Estados/cores canônicas       | Cada tela define                   | Extrair para tokens no Doc 05             |

Nenhuma tela existente precisa ser "jogada fora" — cada módulo será reencaixado em um dos padrões P1–P5 na sprint correspondente do Doc 24 (Roadmap).

---

## 15. Definition of Done deste documento

1. Hierarquia Workspace → Módulo → Entidade aprovada.
2. Command Palette com 6 modos aprovado.
3. Drawer Universal com 7 abas fixas aprovado.
4. Padrões P1–P5 aprovados (ou reduzir/expandir).
5. Rotas canônicas `/m/*` e `/e/*` aprovadas.
6. Tabela de atalhos §7 aprovada.
7. Cores canônicas de status §8 aprovadas (paleta exata no Doc 05).

---

## 16. Fronteiras deste documento

Este documento NÃO define:
- Paleta de cores exata, tipografia, tokens Tailwind → **Doc 05 (Design System)**.
- Nomes de arquivos de rota, estrutura de pastas → **Doc 06 (Arquitetura Frontend)**.
- Componentes shadcn específicos, variantes → **Doc 07 (Component Library)**.
- Copy final de cada tela → **Doc 08 (Content Guide)**.

---

**Próximo documento:** aguardando aprovação para produzir **Documento 05 — Design System** (tokens de cor, tipografia, espaçamento, elevação, motion, ícones, paleta por status, dark/light, densidade). Sem mudanças de código até lá.
