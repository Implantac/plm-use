# Onda 92 — zero toasts crus: `motivoDe(erro, ação)` em 21 pontos

## Sintoma medido

Varredura após a Onda 91: **21** `toast.error(e instanceof Error ? e.message : "Falha…")`
em 13 arquivos (prints, supplier-portal ×4, official-models ×2, digital-twin,
looks, AiCroquiPanel, OpMaterialsTab, NovaOpDialog, OpWorkspace ×2,
ProductStudio ×2, CommentsPanel ×3, GarmentSketchStudio, ImageExportMenu).
Na prova por clique ("Cadastrar fornecedor" com sessão inválida) apareceu um
problema pior: a mutation lança o **objeto** de erro do PostgREST, não um
`Error` → o padrão caía em `"Falha"` (escondendo o motivo) e, numa primeira
versão desta onda, em `[object Object]`.

## Correção

- `motivoDe(erro: unknown, acao)` em `erro-humano.ts`: normaliza `Error`,
  objeto `{code,message,status,details}` do PostgREST/Storage, string, null →
  `descreverErroSupabase`. Nunca `[object Object]`.
- 21 pontos → `toast.error(motivoDe(e, "ação real"))` ou
  `descreverErroSupabase(error, "ação")` quando o erro já é do Supabase. Ações:
  "gerar a variante IA", "cadastrar o fornecedor", "criar o pedido ao
  fornecedor", "mover o pedido", "registrar a decisão da amostra", "trocar a
  tabela", "salvar o modelo oficial", "renderizar o Gêmeo IA", "renderizar o
  look", "gerar o croqui", "ler as reservas da OP", "criar a OP", "registrar a
  passagem", "trocar a rota", "gerar a imagem", "aplicar a arte", "enviar o
  anexo X", "registrar o anexo X", "enviar o comentário", "renderizar a foto
  realista", "exportar a imagem".
- Trava `onda92-toasts-crus-zero.test.ts` (3): varredura de `src` sem
  `toast.*(…\.message…)` fora de `descreverErroSupabase`; os pontos citam a
  ação; `motivoDe` cobre RLS, sessão, rede, objeto sem message, string, null.

## Prova local (Vite dev, Playwright, `/supplier-portal` → Fornecedores → Cadastrar)

Antes: `[object Object]` (1ª versão) / "Falha" (produção hoje). Depois:
**"Não foi possível cadastrar o fornecedor: sua sessão expirou ou é inválida.
Entre novamente e repita a ação."**, diálogo mantido, 0 `pageerror`
(`auditoria/fornecedor92-local.png`). Script `scripts/prova_fornecedor.py`.

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 902/902 (146 arquivos)**.

## Publicação

Nenhuma migration. Validação: mesmo clique em produção → toast com motivo.
