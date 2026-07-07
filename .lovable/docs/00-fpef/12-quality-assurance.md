# V12 · Quality Assurance — Definition of Done

**Nenhuma tela ou módulo é considerado pronto sem responder SIM às 12 perguntas.**
Uma resposta NÃO = tela incompleta. Ponto.

## Checklist obrigatório

- [ ] **1. Resolve uma dor** identificada em V1 (Product Vision)?
- [ ] **2. Regras de negócio** aplicadas via banco/server, não só client? (V6)
- [ ] **3. Workflow** com estados válidos consultando tabela, não hardcoded? (V8)
- [ ] **4. Timeline** visível via `EntityTimeline` (lê `entity_events`)? (V7)
- [ ] **5. Indicadores** derivados automaticamente do event stream? (V10)
- [ ] **6. Auditoria** — created_by/updated_by populados + evento correspondente?
- [ ] **7. Integração ERP** via `ErpAdapter` quando toca dado do ERP? (V9)
- [ ] **8. Tratamento de erro** — sem tela em branco em falha de rede/RLS?
- [ ] **9. Estados de loading/empty/error** cobertos na UI?
- [ ] **10. Eventos emitidos** em toda mutação relevante? (V7)
- [ ] **11. Documentação** — README do módulo aponta pro volume FPEF correto?
- [ ] **12. UX** — usa `EntityDrawer` quando contexto permite? (V4)

## Perguntas guiadas para módulo novo (antes de codar)
1. Descubra como a confecção realmente trabalha essa etapa (V2)
2. Mapeie regras (V6)
3. Mapeie exceções (V6)
4. Modele entidades — reutilize as de V5, não crie novas sem justificar
5. Modele eventos — declare `event_type`s (V7)
6. Modele workflow — adicione linhas em `entity_workflows` (V8)
7. **Só então** implemente

## Gaps
- Este checklist não é enforçado por PR template nem por lint
- Sem "gate" técnico impedindo merge de tela sem timeline/evento

## Onde vai ser executado
- PR template: `.github/pull_request_template.md` (não existe ainda — futuro)
- Comentário obrigatório em `plan--create` para features novas
- Auditoria manual periódica
