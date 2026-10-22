# Project architecture decisions

- Product artwork application sends the generated garment and uploaded artwork together as ordered image-edit references, because preserving both sources is more reliable than describing either one in text.- PCP por OP: saldo por etapa e passagens só mudam pela função register_passages no banco, porque a validação de quantidade e da próxima etapa precisa ser atômica e não pode depender do cliente.

- PCP por OP: planejar (OPs, rotas, troca de rota) exige can_plan_pcp e passagens exigem can_write_pcp no banco; a tela só espelha isso via opPermissions, porque a regra de papel precisa valer mesmo fora da interface.

## Dois mundos de "ficha técnica" — não fundir sem decisão do dono (22/10)

- `tech_sheets` (este repo, `src/lib/techsheet/`) é a **definição reutilizável do produto**: BOM, BOP, pré-custo, versões com instantâneo, PDF e `aplicacoes` (posições de bordado/silk por peça). Vive no envelope jsonb `bom = {v:2, items, preCost, aplicacoes}` — campos novos entram NO envelope, nunca por coluna nova (ambiente Lovable).
- `sales_order_items_*` (fase 2, `src/lib/sales/` + migrations 20261021090xxx) é o **job transacional do pedido**: operations com `driver` (peca/mil_pontos/m2/cor/minuto/lote), waste %, grade por tamanho e setup amortizado pela quantidade do pedido, com paridade TS↔SQL vigiada por pgTAP.
- A ligação é por **convenção de texto**: `catalog_products.reference_code` ↔ `tech_sheets.ref`. Sem FK entre os mundos, de propósito — não adicionar FK/trigger entre eles sem o dono decidir a direção do herdeiro (pedido herda da ficha? catálogo nasce da ficha?).
- Convenções que os DOIS lados compartilham e o teste tranca: arredondamento round2 no dinheiro por peça, round4 em quantidades de driver, setup é custo ÚNICO diluído na tiragem e tiragem inválida NUNCA esconde o setup. Ao mudar uma em um lado, espelhar no outro (`aplicacao-order-bridge.test.ts` é o lacre) e manter `src/lib/sales/` intocável por este lado — o bot o mantém ativamente.

## Painel de custo do pedido (sales) — exceção de fronteira, 2026-10-22

A pedido explícito do dono, `src/components/sales/OrderDetail.tsx` ganhou
edição pelo custo: linhas de operação corrigíveis in place via `updateOperation()`
(função antes órfã do `lib/sales/api.ts`) e botões "Nova operação"/"Novo
material" gravando `source='custo'`. Gatilho de visibilidade: `canCost` +
status do pedido em enviado/em_custo/custo_concluido + item ainda não aprovado.
Quem mexer em `lib/sales/api.ts` deve tratar `addOperation`/`addMaterial` como
superfície pública. Cobertura: três casos novos em `OrderDetail.test.tsx`.

### Extensão do change (mesma ordem de 2026-10-22): remoção/edição de materiais

O dono autorizou o mesmo escopo para: `updateMaterial` + lápis na linha de material, `deleteOperation`/`deleteMaterial` com guard `source='custo'` (linhas do catálogo só mudam trocando a opção do item, que reexplode a ficha — os números continuam editáveis em qualquer linha; nome/setor/driver são da ficha PLM por design), e o checkbox `terceirizada` / campo `observações` nos formulários de adição. A RLS já cobria DELETE (`so_ops_cost_delete`/`so_materials_cost_delete`) — a UI apenas espelha o que o banco garante. A migration `20260708131912` (gatilho de estoque baixo) foi corrigida no repo de `'warn'` para `'warning'` para alinhar recriações do banco com o fix vivo (KARILU-FIX-NOTIF); banco em produção não precisa de nada.

## GitHub ↔ Lovable (contrato da plataforma — não negociável)

- Este repo é o lado GitHub do sync bidirecional do projeto na branch `main`; o app que os usuários veem é o deploy do Lovable, alimentado por push na `main`. Ver `docs/github-lovable-sync.md`.
- Permanecer no Lovable é decisão do dono (09/10/2026): não introduzir abstrações "para migrar depois" (gateway de IA, OAuth próprio, presets node/docker). O `vite.config.ts` usa `@lovable.dev/vite-tanstack-config` e isso fica.
- `main` aceita apenas push fast-forward: nunca force-push/rewriting; `git pull --rebase` antes de subir (os commits do bot chegam lá). Nunca renomear/transferir o repo.
- Arquivos gerados não se editam: `src/routeTree.gen.ts`, `src/integrations/supabase/client.ts|types.ts`. Rota nova = registrar em `src/lib/nav/routes.ts` (com `icon`; ver `src/lib/nav/routes.test.ts` — ele quebra o build na divergência).
- Migrations novas só em `supabase/migrations/` com timestamp (padrão das 52 existentes; trilha Drizzle abandonada); nunca embutir segredo em migration/seed — segredos vivem em Cloud Secrets/`app_cron_config`.
- Dependências: editar `package.json` exige regenerar `package-lock.json` no mesmo commit (a CI tolera drift com fallback, mas o registro é o par).

- O `.env` gerado pelo Lovable Cloud é versionado (só chaves públicas), porque o build publicado lê as variáveis VITE_ dele; ignorá-lo deixa o site publicado sem conexão com o backend.
