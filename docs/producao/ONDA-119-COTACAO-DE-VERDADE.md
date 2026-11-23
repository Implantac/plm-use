# Onda 119 — Cotação (RFQ) de verdade

## Por que esta onda

Na comparação com os melhores PLMs do mercado (Centric, Kubix Link, WFX,
Bamboo Rose), o RFQ comparativo — preço, prazo e lote mínimo de vários
fornecedores lado a lado, com o fornecedor respondendo pelo portal — é item
"não negociável" do comprador de sourcing. O nosso tinha a aba, mas por dentro:

- mostrava **três fornecedores inventados** ("Têxtil Santa Catarina", "Malharia
  Vale do Itajaí S.A.", …) com **preços inventados** a partir do custo atual;
- tudo em memória: **sumia ao recarregar a página**;
- "Adjudicar" gravava o preço inventado na **BOM real** da ficha.

Ou seja: criava uma dor nova (dados falsos num documento de compra) em vez de
sanar a dor real (comparar propostas e fechar a compra sem planilha/WhatsApp).

## O que mudou

**Banco** — migration `20261121120000_rfq_quotes_persistidas.sql`: tabela
`rfq_quotes` (ficha + item da BOM + fornecedor cadastrado; preço, MOQ, prazo,
OTIF, pagamento; `origem` comprador/fornecedor; `status`
convidada → respondida → adjudicada/perdida; link para a `supplier_orders`
gerada). RLS: interno (compras/PCP/gestão) tudo; **usuário do fornecedor vê e
responde só as cotações do próprio fornecedor**, não cria nem apaga. Única por
item + fornecedor.

**Aba "RFQ & Cotação BOM"** (`supplier-portal`):

- Sem proposta → diz isso e o que fazer; nada é inventado.
- **Convidar pelo portal**: escolhe fornecedor cadastrado → convite fica
  "aguardando resposta".
- **Já tenho a proposta**: o comprador registra o que recebeu por
  telefone/e-mail (preço, lote mínimo, prazo, pagamento, OTIF).
- Comparativo lado a lado com o motor TCO existente (60% preço efetivo com
  MOQ · 25% prazo · 15% OTIF), "Melhor TCO" destacado.
- **Adjudicar e gerar OC**: cria a `supplier_order` (código `OC-REF-MATERIAL-
data`, quantidade = max(necessidade, MOQ), prazo = hoje + lead time), marca
  as demais como perdidas e atualiza fornecedor/custo na BOM da ficha.
- Erro de rede/sessão aparece com motivo (não fica "carregando" para sempre).

**Portal do fornecedor**: painel "Cotações para você responder" no topo da
página para quem pertence a um fornecedor (`supplier_users`): preço, lote
mínimo, prazo, pagamento → "Enviar proposta".

**Removido**: `buildDefaultQuotesForItem` (gerador de propostas de demonstração).

## Prova

- Local (sessão de prova, sem banco): aba carrega, ficha com BOM mostra o painel,
  seletor só lista fornecedores cadastrados, modos Convidar/Registrar, erro de
  sessão explicado. `auditoria/rfq119-local-propostas.png`. 0 pageerror.
- Fluxo completo com banco (convite → resposta do fornecedor → adjudicação →
  OC) só é verificável em produção após aplicar a migration — ver Pendente.
- Travas: `src/lib/suppliers/rfq-quotes.test.ts` (5) + ajuste da Onda 60.
- Gates: `tsc` 0 · `eslint` 0 · `prettier` limpo · vitest **991/991 (176)**.

## Pendente (publicação)

1. **Aplicar a migration** `20261121120000_rfq_quotes_persistidas.sql` no banco
   (primeira mudança de banco desde a Onda 110).
2. Publicar o app.
3. Validar em produção: cadastrar fornecedor → convidar → (como fornecedor)
   responder → adjudicar → conferir OC na aba Ordens e custo na BOM.
