# H6-04 · E-commerce e marketplaces

PLM publica ficha comercial (foto, descrição, grade, atributos) para
canais: Shopify, VTEX, Nuvemshop, Mercado Livre, marketplaces próprios.

## Padrão

- Adapter `EcommerceAdapter` por canal (a criar).
- Publicação **explícita**: usuário aprova, PLM chama `publish(sku, channel)`.
- Idempotente por `sku + channel`.
- Evento `ecommerce_pushed` + resposta do canal (id externo) gravada em
  `entity_relations` (`published_to`).

## Direção

- PLM → canal: catálogo, preço sugerido, estoque disponível (do ERP).
- Canal → PLM: pedidos (via webhook `/api/public/webhooks/<canal>`),
  reviews, retornos, dúvidas de cliente (opcional).

## Regras

- Nunca publicar SKU sem `erp_id` (evita fantasma).
- Preço vem do ERP, nunca do PLM — PLM só sugere.
- Foto e descrição são do PLM (marketing), imagem otimizada antes de push.
- Retirada de canal também é ação explícita — nada de sumir por status.

## Anti-padrões

- Cron publicando "tudo que mudou" sem revisão.
- Preço divergente entre canais por bug de cache.
- Webhook sem HMAC.
