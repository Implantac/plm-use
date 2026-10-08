# Documento 05 — Design System

Tokens, paleta, tipografia, espaçamento, elevação, movimento, ícones e densidade do PLM. Este documento é a fonte da verdade visual. Nenhum componente, tela ou módulo pode declarar cor, fonte, sombra ou raio "no braço" — tudo referencia tokens semânticos definidos aqui e implementados em `src/styles.css` como variáveis CSS + `@theme` do Tailwind v4.

Regra dura: **nenhuma classe utilitária de cor literal** (`text-white`, `bg-black`, `bg-[#...]`, `text-gray-500`) em componente algum. Sempre `bg-surface`, `text-foreground`, `border-border`, etc. Isso é o que garante tema, dark mode, white-label e acessibilidade.

---

## 1. Filosofia visual

- **Industrial silencioso.** Preto profundo, tipografia mono para códigos, acentos vivos apenas onde há decisão a tomar. Nada de gradientes decorativos, glassmorphism ou "vibes de AI genérica".
- **Densidade Linear/Notion.** 11–13px para conteúdo, 14–16px para títulos, muito ar horizontal, pouco ar vertical.
- **Cor = semântica, nunca decoração.** Se um elemento é azul, é porque significa "em revisão". Se algo é vermelho, é porque exige ação.
- **Um único acento primário.** Sem paleta arco-íris. Cada estado tem sua cor, mas o "primary" da marca é único.
- **Dark first.** O produto operacional (PCP, chão de fábrica, salas de reunião) roda em telas grandes com pouca luz. Dark é o default; light é reflexo automático.

---

## 2. Sistema de tokens (3 camadas)

```
Primitivos   →   Semânticos   →   Componentes
(hex/HSL)        (roles)          (shadcn variants)
```

- **Primitivos** — a paleta bruta (`--slate-950`, `--amber-500`). Não referenciados por componentes.
- **Semânticos** — o que os componentes usam (`--background`, `--primary`, `--status-warning`). Trocam entre light/dark.
- **Componentes** — variantes do shadcn (`button.primary`, `badge.warning`) mapeadas 100% aos semânticos.

Regra: **componentes só leem semânticos**. Alterar a paleta = editar primitivos. Mudar significado = editar semânticos. Nada além disso.

---

## 3. Paleta primitiva

Formato canônico: HSL (compatível com o `hsl(var(--x))` do Tailwind v4 configurado no template).

### 3.1 Neutros (base do dark)

| Token        | HSL           | Uso                          |
| ------------ | ------------- | ---------------------------- |
| `--ink-0`    | `0 0% 100%`   | Texto máximo contraste       |
| `--ink-50`   | `220 15% 96%` | Texto principal (light mode) |
| `--ink-200`  | `220 12% 82%` | Texto secundário             |
| `--ink-400`  | `220 10% 62%` | Texto muted                  |
| `--ink-600`  | `220 12% 40%` | Borders sutis (light)        |
| `--ink-800`  | `222 18% 16%` | Superfície elevada (dark)    |
| `--ink-900`  | `222 22% 10%` | Superfície (dark)            |
| `--ink-950`  | `222 30% 6%`  | Background base (dark)       |
| `--ink-1000` | `222 40% 3%`  | Background profundo (dark)   |

### 3.2 Primary (marca — único)

Azul-elétrico industrial. Uma cor, cinco pesos.

| Token         | HSL            |
| ------------- | -------------- |
| `--brand-50`  | `210 100% 96%` |
| `--brand-200` | `210 100% 84%` |
| `--brand-500` | `210 100% 56%` | ← primary |
| `--brand-700` | `210 100% 42%` |
| `--brand-900` | `210 100% 22%` |

### 3.3 Cores de status (semântica de workflow — §7)

| Papel   | Base          | HSL 500       | HSL 700       |
| ------- | ------------- | ------------- | ------------- |
| Info    | Ciano         | `195 90% 50%` | `195 90% 36%` |
| Success | Verde         | `152 68% 44%` | `152 68% 30%` |
| Warning | Âmbar         | `38 92% 52%`  | `38 92% 40%`  |
| Danger  | Vermelho      | `358 78% 56%` | `358 78% 42%` |
| Neutral | Cinza-azulado | `220 12% 50%` | `220 12% 36%` |
| Purple  | Roxo (IA)     | `268 76% 62%` | `268 76% 48%` |

Purple é reservado para superfícies do Copiloto/IA — separar visualmente da operação.

---

## 4. Tokens semânticos

Definidos em `src/styles.css`. Nomes iguais aos que a UI shadcn já usa, para máxima compatibilidade sem reinventar variantes.

### 4.1 Superfície e texto

| Semântico            | Dark (default) | Light         | Uso                          |
| -------------------- | -------------- | ------------- | ---------------------------- |
| `--background`       | `--ink-950`    | `0 0% 100%`   | Fundo da app                 |
| `--foreground`       | `--ink-50`     | `--ink-900`   | Texto padrão                 |
| `--surface`          | `--ink-900`    | `220 20% 98%` | Cards, painéis               |
| `--surface-elevated` | `--ink-800`    | `0 0% 100%`   | Drawer, dialog, popover      |
| `--surface-sunken`   | `--ink-1000`   | `220 20% 96%` | Fundo de listas densas, code |
| `--muted`            | `222 18% 14%`  | `220 20% 94%` | Chip fundo, skeleton         |
| `--muted-foreground` | `--ink-400`    | `--ink-600`   | Legendas, hints              |
| `--border`           | `222 20% 18%`  | `220 15% 88%` | Divisores discretos          |
| `--border-strong`    | `222 20% 28%`  | `220 15% 76%` | Divisores enfáticos, tabelas |
| `--ring`             | `--brand-500`  | `--brand-500` | Foco de teclado              |

### 4.2 Interativos

| Semântico                  | Valor                |
| -------------------------- | -------------------- |
| `--primary`                | `--brand-500`        |
| `--primary-foreground`     | `0 0% 100%`          |
| `--secondary`              | `--surface-elevated` |
| `--secondary-foreground`   | `--foreground`       |
| `--accent`                 | `--muted`            |
| `--accent-foreground`      | `--foreground`       |
| `--destructive`            | `--status-danger`    |
| `--destructive-foreground` | `0 0% 100%`          |

### 4.3 Status (mapeamento único — usado em Badge, Kanban, Timeline)

| Semântico           | Valor                  | Aparece em                       |
| ------------------- | ---------------------- | -------------------------------- |
| `--status-draft`    | `--ink-400`            | Rascunho, Ideia                  |
| `--status-progress` | `--status-warning-500` | Em execução, Em progresso        |
| `--status-review`   | `--status-info-500`    | Em revisão, Aguardando aprovação |
| `--status-approved` | `--status-success-500` | Aprovado, Concluído, Carimbado   |
| `--status-rejected` | `--status-danger-500`  | Reprovado, Cancelado             |
| `--status-blocked`  | `--status-danger-700`  | Bloqueado, Atrasado (pulsante)   |
| `--status-archived` | `--ink-600`            | Arquivado                        |

Cada semântico de status tem também `-foreground` (texto sobre) e `-surface` (fundo suave a 12% de alpha para badges).

### 4.4 Entidades (cores para diferenciar tipos em listas, feed, timeline)

| Semântico             | Base    | Tipo             |
| --------------------- | ------- | ---------------- |
| `--entity-reference`  | brand   | Referência       |
| `--entity-tech-sheet` | purple  | Ficha Técnica    |
| `--entity-piloto`     | info    | Piloto           |
| `--entity-lote`       | warning | Lote / OP        |
| `--entity-capa`       | danger  | CAPA / Qualidade |
| `--entity-faccao`     | success | Facção           |
| `--entity-collection` | neutral | Coleção          |
| `--entity-ai`         | purple  | Copiloto         |

Uso: apenas para ícone e barra lateral do card/linha. **Não pinta o card inteiro.**

---

## 5. Tipografia

### 5.1 Famílias

| Papel                     | Fonte                            | Fallback                  |
| ------------------------- | -------------------------------- | ------------------------- |
| Sans (UI)                 | **Inter Variable**               | `system-ui, sans-serif`   |
| Display                   | **Inter Tight** (weight 600–700) | Inter                     |
| Mono (códigos, SKU, hash) | **JetBrains Mono**               | `ui-monospace, monospace` |

Carregadas via `<link>` no `src/routes/__root.tsx` (Tailwind v4 Lightning CSS não resolve `@import` remoto — regra do template).

### 5.2 Escala (compacta, industrial)

| Token       | Tamanho | Line-height | Uso                                          |
| ----------- | ------- | ----------- | -------------------------------------------- |
| `text-2xs`  | 10px    | 14px        | Uppercase labels, kbd, badges muito pequenos |
| `text-xs`   | 11px    | 16px        | Corpo denso (tabelas, kanban, drawer)        |
| `text-sm`   | 13px    | 18px        | Corpo padrão                                 |
| `text-base` | 15px    | 22px        | Formulários, leitura                         |
| `text-lg`   | 17px    | 24px        | Subtítulos                                   |
| `text-xl`   | 20px    | 28px        | Título de seção                              |
| `text-2xl`  | 24px    | 32px        | Título de página                             |
| `text-3xl`  | 30px    | 38px        | Hero, dashboards                             |

Weights: 400 (body), 500 (ênfase), 600 (subtítulo), 700 (título). Nunca 300 (ilegível em telas pequenas).

### 5.3 Regras

- **Uppercase apenas em labels ≤ 11px**, com `letter-spacing: 0.18em`.
- **Nunca centralizar corpo de texto.** Só títulos hero.
- **Nunca justificar.** Textos ficam ragged-right.
- **Números tabulares** (`font-variant-numeric: tabular-nums`) em toda coluna numérica, KPI e timer.

---

## 6. Espaçamento e grid

Base 4px. Escala Tailwind default (`0, 0.5, 1, 2, 3, 4, 6, 8, 12, 16, 20, 24`).

### 6.1 Densidades

Três densidades globais, comutáveis pelo usuário em Preferências (persistido em `profiles.ui_density`).

| Densidade | Altura de linha em tabela | Padding de card | Uso primário                 |
| --------- | ------------------------- | --------------- | ---------------------------- |
| `compact` | 28px                      | 8px             | PCP torre, Kanban, chão fab. |
| `default` | 36px (padrão)             | 12px            | Uso geral                    |
| `cozy`    | 44px                      | 16px            | Editor, formulários longos   |

Implementado com atributo `data-density` no `<html>` + variáveis `--row-h`, `--card-p`.

### 6.2 Layout global

- Sidebar: **220px** expandida, **56px** recolhida.
- Topbar: **56px** fixa.
- Drawer: **672px** (`sm:max-w-2xl`).
- Container de conteúdo: sem `max-w-*` — o produto ocupa a tela inteira. Marketing/landing têm `max-w-6xl`.

---

## 7. Estados de workflow — do design ao componente

Cada estado do Doc 03 mapeia para um único par (cor semântica, ícone). Sem exceção.

| Estado (Doc 03)                | Cor `--status-*` | Ícone (lucide)         |
| ------------------------------ | ---------------- | ---------------------- |
| IDEIA, RASCUNHO                | draft            | `Circle`               |
| CROQUI, MODELAGEM              | progress         | `PenTool`              |
| EM_REVISAO                     | review           | `Eye`                  |
| EM_EXECUCAO, EM_PRODUCAO       | progress         | `Loader2` (spin)       |
| PILOTO, AJUSTE                 | info             | `Beaker`               |
| APROVADO, CARIMBADA, CONCLUIDA | approved         | `CheckCircle2`         |
| REPROVADO, CANCELADA           | rejected         | `XCircle`              |
| ATRASADO, BLOQUEADO            | blocked          | `AlertOctagon` (pulse) |
| ARQUIVADA                      | archived         | `Archive`              |

Badge padrão: `bg-status-{x}-surface text-status-{x} border-status-{x}/30`. Nunca outros esquemas.

---

## 8. Elevação (shadow) e raios

Elevação parcimoniosa. Dark mode não usa `shadow-xl` — usa **linhas** e **superfícies mais claras**.

| Token                        | Dark                                        | Light                                 |
| ---------------------------- | ------------------------------------------- | ------------------------------------- |
| `--elev-0`                   | superfície base, sem sombra                 | `0 1px 0 rgba(0,0,0,0.03)`            |
| `--elev-1`                   | `inset 0 0 0 1px hsl(var(--border))`        | `0 1px 2px rgba(16,24,40,.06)`        |
| `--elev-2`                   | idem elev-1 + `--surface-elevated`          | `0 4px 8px -2px rgba(16,24,40,.08)`   |
| `--elev-3` (drawer, popover) | elev-1 + `0 24px 48px -12px rgba(0,0,0,.6)` | `0 12px 24px -8px rgba(16,24,40,.14)` |

Raios:

| Token           | Valor | Uso                   |
| --------------- | ----- | --------------------- |
| `--radius-sm`   | 4px   | badge, chip, kbd      |
| `--radius`      | 8px   | button, input, card   |
| `--radius-md`   | 10px  | drawer/dialog         |
| `--radius-lg`   | 14px  | painéis grandes, hero |
| `--radius-pill` | 999px | avatar, tag circular  |

---

## 9. Movimento

Framer Motion + CSS. Duração curta, easing consistente.

| Token            | Duração | Easing                                   | Uso                        |
| ---------------- | ------- | ---------------------------------------- | -------------------------- |
| `--motion-fast`  | 120ms   | `cubic-bezier(0.2, 0, 0, 1)`             | hover, focus               |
| `--motion-base`  | 200ms   | `cubic-bezier(0.2, 0, 0, 1)`             | drawer, dialog, dropdown   |
| `--motion-slow`  | 320ms   | `cubic-bezier(0.16, 1, 0.3, 1)` (spring) | páginas, kanban re-order   |
| `--motion-pulse` | 1600ms  | `ease-in-out infinite`                   | status "blocked", realtime |

Regra: `@media (prefers-reduced-motion: reduce)` zera todas as durações não essenciais.

---

## 10. Ícones

Biblioteca única: **lucide-react**. Tamanhos: `h-3` (12px), `h-3.5` (14px), `h-4` (16px), `h-5` (20px). Nunca outros ícones ou emojis em UI operacional.

- Ícones stroke width **1.5** (mais leve, industrial).
- Todo botão só-ícone tem `aria-label`.
- Ícone de módulo consistente em toda navegação, breadcrumb e drawer.

Mapa oficial módulo → ícone:

| Módulo          | Ícone           |
| --------------- | --------------- |
| Meu Dia         | `Sun`           |
| Coleções        | `Layers`        |
| Desenvolvimento | `Sparkles`      |
| Engenharia      | `Cog`           |
| Piloto          | `Beaker`        |
| PCP             | `Factory`       |
| APS/MRP         | `CalendarRange` |
| Facções         | `Building2`     |
| Qualidade/CAPA  | `ShieldAlert`   |
| Custos          | `DollarSign`    |
| BI              | `BarChart3`     |
| Copiloto        | `Bot`           |
| Admin           | `Settings`      |
| Feed            | `Activity`      |
| Alertas         | `Bell`          |

---

## 11. Componentes shadcn — regras de uso

Todos os componentes shadcn já instalados são a base. Regras:

- **Button** — `variant`: `default` (primary), `secondary`, `outline`, `ghost`, `destructive`, `link`. **Nunca** cores custom via `className`.
- **Badge** — apenas variantes de status (§7). Nunca `bg-purple-500`.
- **Card** — `bg-surface border border-border`. Padding via densidade (§6.1).
- **Input/Textarea** — altura 32px (compact) / 36px (default). `bg-surface-sunken`.
- **Dialog/Sheet** — `bg-surface-elevated`, elev-3.
- **Table** — linhas com altura `--row-h`, hover `bg-muted/50`, borders `--border`.
- **Tabs** — variante horizontal, indicador com `bg-primary`, texto ativo `text-foreground`.
- **Toast (sonner)** — canto inferior direito, elev-3, ícones lucide.

Qualquer variação exige novo token ou nova variant no `components/ui/*` — nunca override inline.

---

## 12. Dark / Light

- Dark é default (`data-theme="dark"` no `<html>` na inicialização).
- Light gerado _invertendo apenas semânticos_. Primitivos não mudam.
- Comutador em Perfil salva `profiles.theme` (`dark|light|system`).
- Nunca condicional de tema em componente (`if (theme === 'dark')`) — apenas semânticos.

---

## 13. Estados de dados na UI

| Estado           | Componente                                    |
| ---------------- | --------------------------------------------- |
| Loading (lista)  | `<Skeleton />` com mesma altura do item final |
| Loading (inline) | `Loader2` (12–14px, spin) + label             |
| Empty            | Ícone (24px) + título + subtítulo + CTA       |
| Error            | Card `border-destructive/40 bg-destructive/5` |
| Realtime update  | Chip discreto "Atualizado agora" no header    |

Nunca "spinner central em tela inteira".

---

## 14. Acessibilidade

- Contraste mínimo **AA**: 4.5:1 texto normal, 3:1 texto grande. Ferramenta de checagem em CI (Doc 22 QA).
- `focus-visible` sempre com `ring-2 ring-ring ring-offset-2 ring-offset-background`.
- Nunca cor sozinha para comunicar (ícone + label acompanham o status).
- Motion respeita `prefers-reduced-motion`.

---

## 15. White-label (roadmap)

O sistema de tokens já suporta troca de marca: um cliente pode redefinir `--brand-*` e `--font-sans` sem tocar em componentes. Implementação real fica para Sprint de Enterprise (Doc 24), mas o design system nasce pronto.

---

## 16. Auditoria hoje vs alvo

| Item                           | Hoje                                        | Alvo                                          |
| ------------------------------ | ------------------------------------------- | --------------------------------------------- |
| `src/styles.css`               | Tema custom parcial, tokens misturados      | Reescrever com 3 camadas §2 e semânticos §4   |
| Uso de `text-white`/`bg-black` | Presente em vários componentes              | Substituir por semânticos (`text-foreground`) |
| Fontes                         | Sistema, sem carregamento explícito         | Inter Variable + JetBrains Mono via `<link>`  |
| Escala tipográfica             | Mistura `text-[10px]`, `text-[11px]` inline | Trocar por tokens `text-2xs`/`text-xs`        |
| Densidade                      | Fixa, apertada em drawer                    | 3 densidades comutáveis (`data-density`)      |
| Cores de status                | Cada tela define                            | Tokens únicos `--status-*` e Badge padrão     |
| Elevação                       | `shadow-lg` em vários lugares               | `--elev-*` tokenizados, uso raro no dark      |
| Ícones                         | Lucide, tamanhos inconsistentes             | Padrão `h-3.5`/`h-4`, stroke 1.5              |
| Dark/Light                     | Só dark, hardcoded                          | Semânticos invertíveis, toggle em Perfil      |

A migração é feita na **Sprint 1 do Doc 24 (Fundação Visual)** — primeira coisa que entra em código depois dos documentos.

---

## 17. Definition of Done deste documento

1. Paleta primitiva §3 aprovada (5 pesos por família, HSL).
2. Semânticos §4 aprovados (superfície, texto, interativo, status, entidade).
3. Tipografia §5 aprovada (Inter + JetBrains Mono, escala 2xs→3xl).
4. Densidades §6.1 aprovadas (compact/default/cozy).
5. Mapeamento estado→cor+ícone §7 aprovado.
6. Ícone oficial por módulo §10 aprovado.
7. Regra "sem cor hardcoded em componente" aceita como bloqueante em CI.

---

## 18. Fronteiras deste documento

Este documento NÃO define:

- Componentes concretos (Button, Badge, Drawer) e suas props → **Doc 07 (Component Library)**.
- Estrutura de pastas e arquivos de código → **Doc 06 (Arquitetura Frontend)**.
- Copy final de tela → **Doc 08 (Content Guide)**.
- Assets de marca (logo, favicon, OG image) → **Doc 09 (Brand Assets)**.

---

**Próximo documento:** aguardando aprovação para produzir **Documento 06 — Arquitetura Frontend** (estrutura de pastas, convenções TanStack Router, hooks vs services vs stores, padrões de data fetching com Query, mapeamento das rotas atuais para as canônicas `/m/*` e `/e/*`). Sem mudanças de código até lá.
