# Competitive Note · Coleção.Moda

Fonte: https://www.colecao.moda/fashion-plm · https://www.colecao.moda/donna · https://www.colecao.moda/conecta · https://www.colecao.moda/integracoes
Data da pesquisa: 2026-07-08
Protocolo: H1-03 (FPEF V14)

## Portfólio

- **Fashion PLM** — SaaS de gestão de coleção (nuvem, sem trial, onboarding pago).
- **Donna** — IA criativa (moodboard, croqui→imagem realista, variação estética de peça).
- **Conecta** — canal empresa↔fornecedor integrado ao PLM.
- **Integrações** — ERPs nacionais + Adobe Illustrator.

## Módulos observados no PLM

Organização por coordenados · Ficha técnica automatizada · Dashboard de etapas ·
Fluxo e etapas (leadtime + responsáveis configuráveis) · Pré-custo e precificação ·
Mapa de coleção · Relatório de peças · Gerenciamento de times · Anotações ·
Gestão de variantes · Característica de produtos · Tabela de medidas múltiplas ·
Kanban · Sequência operacional · Cartela de cores · Cartela de estampas ·
Painel de displayagem/catálogo · Reserva de tecidos e aviamentos.

## Posicionamento (das FAQs)

- **Não tem controle de estoque** — confirma linha PLM ≠ ERP (H0-02).
- Não tem financeiro; pré-custo apenas na fase criativa.
- Ficha técnica customizada é serviço pago à parte.
- **Notificações só na plataforma** (não por email) — atacam WhatsApp/email como ruído.
- Armazenamento ilimitado.
- Sem trial; Basic vs Enterprise (mais módulos).

## Padrão mental comum (também em Centric/FlexPLM/Kubix)

Coleção → Ficha técnica → Fluxo com etapas/responsáveis → Kanban de piloto → Pré-custo → BOM/BOP → Mapa/painel de coleção.

## Limitação comum

- Portal de fornecedor separado do PLM (produto à parte).
- IA restrita à criação; sem uso em previsão de atraso, ruptura ou defeito.
- Sem cronoanálise/SAM real.
- Sem digital thread até vendas/margem.

## Como superamos (aderente à confecção BR + FPEF)

1. **IA industrial (V11)** — não só criativa: prever atraso de lote, ruptura de insumo, defeito por facção.
2. **Digital Thread completo (V3)** — piloto→lote→facção→qualidade→vendas com `entity_events`/`entity_relations`.
3. **Drawer contextual (V4)** — abrir referência = tudo, sem "outra tela".
4. **Adapter ERP read-only (V9)** com sugestão de necessidade, sem duplicar SKU/estoque.
5. **Timeline auditável (V7)** — toda ação vira evento.

## Gaps nossos revelados pela pesquisa

- IA de imagem criativa (moodboard→croqui→imagem realista→variação).
- Pré-custo dentro da ficha técnica antes do piloto (com alerta de target).
- Portal de fornecedor (equivalente ao Conecta).
- Painel livre de composição de coleção (drag-drop de displayagem).
- Cronoanálise / SAM por operação.
- Integração Adobe Illustrator (importar .ai como croqui base da ficha).
