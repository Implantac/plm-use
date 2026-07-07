# H4-03 · Design System e tokens semânticos

Fonte de verdade: `src/styles.css` (tokens) + shadcn (componentes) +
`.lovable/docs/05-design-system.md` (guia visual).

## Regras
- **Nunca** cor hardcoded em componente: `bg-white`, `text-black`,
  `bg-[#123456]`, `#gradient-from-purple-to-pink`. Sempre token semântico
  (`bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`).
- **Nunca** fonte genérica default (Inter, Poppins) sem intenção. USE MODA
  tem tipografia própria — herdar do design system.
- Gradientes e shadows: definidos em `styles.css` como utilitário ou token.
- Dark mode: automático via tokens. Se algo quebra no dark, é porque tem
  cor hardcoded.

## Componentes
- Reutilizar shadcn (`Button`, `Dialog`, `DropdownMenu`, `Sheet`).
- Variantes novas: `cva` — nunca CSS overrides pontuais no consumidor.
- Componente de negócio (Drawer de referência, timeline, kanban) mora em
  `src/components/<dominio>/`.

## Ícones
`lucide-react` apenas. Tamanho controlado por prop (`className="h-4 w-4"`).

## Anti-padrões
- Copiar HTML/CSS de PLM concorrente pixel-perfect (V14: nunca clonar UI).
- `style={{ color: '#...' }}` inline.
- Componente que aceita `bgColor` string — sempre variant tipada.
- Reinventar botão. Se falta variante, adicionar via `cva` no shadcn.
