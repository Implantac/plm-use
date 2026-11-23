# Onda 120 — Acesso do fornecedor ao portal

## 114ª medição (produção)

Ar = `index-Bxf-kQd-.js`, com as Ondas 117, 118 **e 119** (CSS com os tokens
novos; chunk do portal contém `rfq_quotes`). Validado em produção:

- Onda 117 — axe claro: **43/44 → 3/44** rotas (7 ocorrências, só `/colors`,
  marketing, influencers). ✔
- Onda 118 — axe escuro: **43/44 → 1/44** (só amostras de cor em `/colors`). ✔
- Onda 119 — **código no ar, mas a migration não foi aplicada**:
  `GET /rest/v1/rfq_quotes` → `PGRST205` (tabela inexistente). A aba RFQ em
  produção mostra "a tabela ainda não foi aplicada no banco (migration
  pendente). Avise o admin." — honesto, mas a cotação não funciona até aplicar
  `20261121120000_rfq_quotes_persistidas.sql`.

## A dor desta onda

A 119 prometeu "o fornecedor responde pelo portal". Só que **nenhuma tela
gravava em `supplier_users`**: não havia como dar acesso a um fornecedor. E se
alguém criasse o vínculo à mão, o fornecedor entraria e veria o **menu inteiro
do PLM** (44 rotas), cada uma falhando por RLS — a pior primeira impressão
possível para quem a marca quer que use o sistema em vez do WhatsApp.

## O que mudou

- **`src/lib/suppliers/acesso-portal.functions.ts`** (servidor, service role):
  `listarAcessosFornecedor`, `concederAcessoFornecedor` (convida o e-mail via
  `inviteUserByEmail` — cria a conta e manda o link; se já existe, localiza — e
  faz upsert em `supplier_users`, reativando se estava inativo),
  `revogarAcessoFornecedor` (`is_active=false`, histórico fica). Todas exigem
  papel interno de gestão (`admin/manager/pcp/qualidade/coordenador_produto`).
- **Aba Fornecedores**: botão **"Acesso ao portal"** por fornecedor → diálogo
  com e-mail + Convidar, lista de quem tem acesso e Revogar.
- **Modo fornecedor** (`useModoFornecedor`: sem papel interno e com vínculo
  ativo): menu lateral só com "Portal do Fornecedor"; qualquer outra rota
  redireciona; página sem as abas internas (RFQ/Fornecedores), sem "Nova OP";
  título e subtítulo próprios; painel "Cotações para você responder" no topo.

## Prova

- Local: aba Fornecedores → "Acesso ao portal" → diálogo com e-mail/Convidar/
  lista (servidor local sem service role devolve erro explicado, não trava).
- Local, simulando usuário de fornecedor: `/dashboard` → redireciona para
  `/supplier-portal`; **1 item de menu**; abas `['Ordens de Produção',
'Amostras']`; título "Portal do Fornecedor". 0 pageerror.
  `auditoria/fornecedor120-local-modo-fornecedor.png`.
- Trava `src/lib/suppliers/acesso-portal.test.ts` (3).
- Gates: `tsc` 0 · `eslint` 0 · `prettier` limpo · vitest **994/994 (177)**.

## Pendente

1. **Aplicar a migration da 119** (`rfq_quotes`) — sem ela a cotação não grava.
2. Publicar a 120. `SUPABASE_SERVICE_ROLE_KEY` já é usada por outras funções
   do servidor (cron ABC); nada novo de ambiente.
3. Validar em produção: Fornecedores → Acesso ao portal → convidar um e-mail de
   teste → entrar com ele → ver só o portal → responder uma cotação.
