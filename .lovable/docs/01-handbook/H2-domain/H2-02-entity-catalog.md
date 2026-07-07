# H2-02 · Catálogo de entidades canônicas

Este é o mapa vivo das entidades do USE MODA PLM. Antes de qualquer
`CREATE TABLE`, cheque se a entidade já existe aqui.

Legenda: 🟢 existe no banco · 🟡 parcial · 🔴 planejada

## Núcleo de coleção
| Entidade | Tabela | Estado | Fonte primária |
|---|---|---|---|
| Coleção | `collections` | 🔴 | PLM |
| Referência (SKU em desenvolvimento) | `references` | 🟢 | PLM |
| Ficha Técnica | `tech_sheets` | 🟢 | PLM |
| Piloto | `pilotos` | 🟢 | PLM |
| Transição de referência | `reference_transitions` | 🟢 | PLM |

## Núcleo industrial
| Entidade | Tabela | Estado | Fonte primária |
|---|---|---|---|
| Lote de produção | `pcp_lots` | 🟢 | PLM (planejamento) + ERP (execução) |
| Ocorrência de PCP | `pcp_occurrences` | 🟢 | PLM |
| CAPA (qualidade) | `quality_capa` | 🟢 | PLM |
| Evento de CAPA | `capa_events` | 🟢 | PLM |

## Núcleo transversal
| Entidade | Tabela | Estado | Fonte primária |
|---|---|---|---|
| Evento canônico | `entity_events` | 🟢 | PLM (V7) |
| Relação entre entidades | `entity_relations` | 🟢 | PLM (V3) |
| Workflow definition | `workflow_definitions` | 🟢 | PLM (V8) |
| Comentário | `comments` | 🟢 | PLM |
| Anexo de comentário | `comment_attachments` | 🟢 | PLM |
| Revisão de comentário | `comment_revisions` | 🟢 | PLM |
| Notificação | `notifications` | 🟢 | PLM |
| Log de atividade | `activity_log` | 🟢 | PLM |
| Papel de usuário | `user_roles` | 🟢 | PLM |
| Perfil de usuário | `profiles` | 🟢 | PLM |

## Domínio de marketing
| Entidade | Tabela | Estado | Fonte primária |
|---|---|---|---|
| Influencer | `influencers` | 🟢 | PLM |

## Espelhos read-only do ERP (via `ErpAdapter`)
| Entidade | Como acessar | Nunca duplicar |
|---|---|---|
| SKU cadastral | `erp.getSku(erp_id)` | preço, estoque, custo |
| Fornecedor | `erp.getSupplier(erp_id)` | dados fiscais |
| Pedido de compra | `erp.getPurchaseOrder(erp_id)` | status financeiro |
| Ordem de produção fabril | `erp.getWorkOrder(erp_id)` | apontamento real |
| Nota fiscal | `erp.getInvoice(erp_id)` | tudo |

## Entidades planejadas (não criar sem H1)
- `collections` — coleção como agregador
- `moodboards`
- `research_items`
- `color_palettes`
- `bom_items` / `bop_items` (hoje em jsonb de `tech_sheets`)
- `factories` (facções — hoje via texto em `pcp_lots`)
- `design_reviews` (FPEF V13 Onda 2)
- `competitive_notes` (FPEF V14 Onda futura)

Antes de codar qualquer 🔴, passe por H1 (discovery) inteiro.
