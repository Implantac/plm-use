# Documento 06 — Regras de Negócio (Master)

Este é o maior documento do projeto. Descreve **cada tela, cada módulo, cada regra** que rege o comportamento do sistema. Toda regra aqui é **executável**: se um requisito não pode ser traduzido em validação, evento, permissão ou transição, ele não pertence a este documento — pertence ao Documento 01 (Vision) ou 04 (UX).

Este arquivo é o **índice mestre + regras dos módulos-núcleo**. Cada módulo secundário tem seu próprio arquivo (`06.x-<modulo>.md`) para que a leitura seja navegável.

---

## 0. Princípios que valem para TODAS as regras

1. **Nenhuma regra é hardcoded em componente.** Toda transição de estado, toda validação, todo prazo passa pelo Workflow Engine (Doc 07) e é configurável pelo Admin.
2. **Toda ação gera evento.** Nada muda sem entrar na Timeline (Doc 08). Não existe `UPDATE` silencioso.
3. **Toda escrita é permissionada.** RLS + `has_role()` (Doc 20). Ninguém confia no frontend.
4. **Toda regra tem dono.** Cada regra listada aqui indica: `Objetivo`, `Entradas`, `Saídas`, `Validações`, `Eventos`, `Permissões`, `Erros esperados`.
5. **Regras versionadas.** Se uma regra muda (ex.: prazo padrão de piloto), a mudança gera evento de auditoria e a nova regra só vale para entidades criadas depois — histórico não é reescrito.
6. **Zero exceção silenciosa.** Toda regra que possa ser burlada tem "guardrail" no backend (trigger, policy, function). O frontend apenas informa; o backend decide.

---

## 1. Estrutura de cada regra (contrato)

Toda regra deste documento é escrita neste formato canônico:

```
### R.<modulo>.<numero> — <nome curto>
**Objetivo.**  <por que essa regra existe do ponto de vista do negócio>
**Entradas.** <o que a regra recebe: entidades, campos, contexto>
**Saídas.**   <o que a regra produz: nova entidade, transição, evento, alerta>
**Validações.** <lista ordenada; cada item é bloqueante>
**Eventos.**  <lista de eventos emitidos, com nome canônico do Doc 03>
**Permissões.** <papéis autorizados; comportamento para os demais>
**Erros esperados.** <mensagens ao usuário, códigos internos>
**Configurável em.** <caminho no Admin, se aplicável>
```

Uma regra que não cabe nesse contrato é uma feature UX (Doc 04) disfarçada de regra. Move.

---

## 2. Papéis (Doc 20 — referência rápida)

| Papel         | Escopo típico                                                    |
|---------------|------------------------------------------------------------------|
| `admin`       | Tudo. Configura workflows, papéis, empresas, integrações.        |
| `manager`     | Toda escrita de negócio no seu tenant. Aprova e reprova.         |
| `stylist`     | Cria/edita Referências, Coleções, Moodboards.                    |
| `engineer`    | Ficha Técnica, BOM, Operações, versionamento.                    |
| `pcp`         | Lotes, OPs, sequenciamento, apontamentos.                        |
| `quality`     | CAPA, RNC, inspeções.                                            |
| `buyer`       | MRPNecessidade, sugestões de OC, negociação.                     |
| `finance`     | Custos reais, margem, fechamento.                                |
| `viewer`      | Leitura conforme membership. Nunca escreve.                      |
| `guest`       | Read-only em superfícies públicas explicitamente marcadas.       |

Regra global: **membership obrigatório** (Doc 20 §3). Sem pelo menos um papel em `user_roles`, o usuário não lê nada de negócio.

---

## 3. Índice de módulos

| Arquivo                       | Módulo                                | Seção principal             |
|-------------------------------|---------------------------------------|-----------------------------|
| **este arquivo**              | **Núcleo**                            | §4–§8                       |
| `06.1-compras.md`             | Compras                               | R.CO                        |
| `06.2-mrp.md`                 | MRP (necessidades, sugestões OC)      | R.MRP                       |
| `06.3-aps.md`                 | APS (planejamento finito)             | R.APS                       |
| `06.4-qualidade.md`           | Qualidade / CAPA                      | R.QA                        |
| `06.5-faccao.md`              | Facções                               | R.FA                        |
| `06.6-financeiro.md`          | Custos reais, margem                  | R.FI                        |
| `06.7-bi.md`                  | KPIs, indicadores                     | R.BI                        |
| `06.8-ia.md`                  | Copiloto, agentes                     | R.IA                        |
| `06.9-integracao-erp.md`      | Contrato ERP (leitura)                | R.ERP                       |

Este documento cobre os **módulos-núcleo** (§4 a §8):

- §4 Referência
- §5 Coleção
- §6 Ficha Técnica (Engenharia)
- §7 Piloto
- §8 PCP (Lote / OP / Ocorrência / Apontamento)

Estes cinco módulos, juntos, formam o **Digital Thread mínimo** do PLM. Todo o resto é integração ou análise.

---

## 4. Módulo — Referência

Entidade central. Uma Referência representa "um produto em desenvolvimento" (SKU-mãe). Regras completas da entidade em Doc 03 §B.

### R.REF.01 — Criar Referência
**Objetivo.** Registrar uma nova ideia de produto no funil de desenvolvimento.
**Entradas.** `code` (opcional; se vazio, gerado por sequência da coleção), `name`, `collection_id`, `linha_id?`, `tema_id?`, `descricao?`, `imagem_capa?`.
**Saídas.** Entidade `references` no estado `IDEIA`; evento `reference.created`; item aparece na Coleção pai.
**Validações.**
  1. `collection_id` deve existir e estar em estado ≠ `ARQUIVADA`.
  2. `code` único por tenant. Se gerado, formato `<sigla_colecao>-<seq 4d>`.
  3. `name` obrigatório, 3–120 chars.
  4. Usuário deve ter papel `stylist`, `manager` ou `admin`.
**Eventos.** `reference.created`, `entity.linked` (referência ↔ coleção).
**Permissões.** `stylist+`. `viewer` não vê o botão.
**Erros esperados.** `E_REF_CODE_TAKEN`, `E_REF_COLLECTION_ARCHIVED`, `E_REF_NAME_INVALID`.
**Configurável em.** Admin → Coleções → padrão de código.

### R.REF.02 — Transição de estado
**Objetivo.** Só permitir avanços válidos no funil de desenvolvimento.
**Entradas.** `reference_id`, `to_status`.
**Saídas.** `references.status = to_status`; evento `reference.status_changed`.
**Validações.**
  1. Transição existe em `reference_transitions` com `is_active = true` (função `can_transition_reference`).
  2. Requisitos da transição destino atendidos:
     - `PILOTO`: Ficha Técnica anexada em estado ≥ `EM_REVISAO`.
     - `AJUSTE`: pelo menos 1 Piloto reprovado.
     - `APROVACAO`: última Piloto em `APROVADO` e Ficha em `CARIMBADA`.
  3. Papel autorizado para a transição (matriz configurável, default: `stylist` até `PILOTO`, `manager` para `APROVACAO`).
**Eventos.** `reference.status_changed` com `from_status`, `to_status`, `actor`, `payload.reason`.
**Permissões.** Verificada por transição.
**Erros esperados.** `E_REF_TRANSITION_INVALID`, `E_REF_MISSING_PREREQ`, `E_REF_NOT_ALLOWED`.
**Configurável em.** Admin → Workflow → Referência.

### R.REF.03 — Duplicar Referência
**Objetivo.** Reaproveitar um produto anterior como base.
**Entradas.** `reference_id_origem`, `collection_id_destino`.
**Saídas.** Nova Referência em `IDEIA`, com Ficha Técnica copiada em `RASCUNHO` (nova versão v1), cores/grade copiadas, imagens **linkadas** (não duplicadas), evento `reference.duplicated`.
**Validações.**
  1. Origem em qualquer estado ≠ `ARQUIVADA`.
  2. Destino: coleção ativa, papel `stylist+`.
  3. Novo `code` gerado (nunca copiado).
**Eventos.** `reference.duplicated`, `techsheet.created`, `entity.linked` (origem ↔ nova via relação `derived_from`).
**Permissões.** `stylist+`.

### R.REF.04 — Arquivar Referência
**Objetivo.** Remover do funil ativo sem apagar histórico.
**Entradas.** `reference_id`, `motivo` (obrigatório, texto).
**Saídas.** `status = ARQUIVADA`, `soft_deleted_em` **NÃO** setado (arquivar ≠ excluir). Evento `reference.archived`.
**Validações.**
  1. Não pode arquivar Referência com Lote em `EM_PRODUCAO` (barrar até Lote concluir).
  2. `motivo` ≥ 8 chars.
  3. Papel `manager+`.
**Eventos.** `reference.archived`.
**Permissões.** `manager+`.
**Erros esperados.** `E_REF_HAS_ACTIVE_LOTE`.

### R.REF.05 — Anexar imagem/documento
**Entradas.** `reference_id`, arquivo (via `storage.use-moda-assets/<uid>/references/<ref_id>/...`).
**Validações.** Formato ∈ {png, jpg, webp, pdf, ai, psd}; tamanho ≤ 20 MB; RLS de storage por `foldername = auth.uid()` (Doc 20).
**Eventos.** `document.attached`.

### R.REF.06 — Excluir (hard delete) — **PROIBIDO**
Referência nunca é excluída. Só arquivada. Migração/manutenção usa `supabaseAdmin` sob auditoria específica, fora do produto.

---

## 5. Módulo — Coleção

Contêiner de negócio das Referências.

### R.COL.01 — Criar Coleção
**Entradas.** `code`, `name`, `season` (`SS`/`FW` + ano), `data_inicio`, `data_lancamento`, `linha_ids[]?`.
**Validações.** `data_lancamento > data_inicio`; `season` do formato `SS26`, `FW26`, etc.; `code` único; papel `manager+`.
**Eventos.** `collection.created`.

### R.COL.02 — Cronograma da Coleção
**Objetivo.** Marcos-padrão (moodboard, briefing, piloto, aprovação, produção). Deriva de um template configurável.
**Entradas.** `collection_id`, `template_id?`.
**Saídas.** N `milestones` com `data_prevista`. Cada milestone é entidade timeline-first.
**Validações.** Datas dentro do intervalo da coleção; template válido; papel `manager+`.
**Eventos.** `collection.schedule_generated`.
**Configurável em.** Admin → Coleções → Templates de cronograma.

### R.COL.03 — Encerrar Coleção
**Validações.** Toda Referência da coleção em `APROVACAO`, `ARQUIVADA` ou já produzida.
**Eventos.** `collection.closed`.
**Permissões.** `manager+`.

### R.COL.04 — Meta da Coleção (KPI)
Coleção tem meta de nº referências, mix de linhas e prazo de lançamento. Comparação real × meta alimenta BI (Doc 18).
**Eventos.** `collection.kpi_updated` (recomputado por trigger em cada `reference.status_changed`).

---

## 6. Módulo — Ficha Técnica (Engenharia)

Ficha Técnica é **imutável após carimbamento**. Toda mudança pós-carimbamento cria uma **nova versão** e o Lote pai só usa a versão que estava carimbada quando ele nasceu.

### R.FT.01 — Criar Ficha Técnica
**Entradas.** `reference_id`. **Saídas.** Ficha v1 em `RASCUNHO`.
**Validações.** Referência existe; não existe outra Ficha ativa (`status ∈ RASCUNHO | EM_REVISAO`) na mesma Referência. Papel `engineer+`.
**Eventos.** `techsheet.created`.

### R.FT.02 — Editar BOM/BOP
**Entradas.** Itens de BOM (`material`, `consumo`, `unidade`, `perda%`) e BOP (`operacao`, `smv`, `posto`, `sequencia`).
**Validações (bloqueantes).**
  1. Ficha em `RASCUNHO` ou `EM_REVISAO`. `CARIMBADA` **rejeita**.
  2. Todo item BOM tem `consumo > 0` e `unidade` ∈ tabela.
  3. Toda operação BOP tem `smv > 0` e `sequencia` única.
  4. Papel `engineer+`.
**Eventos.** `techsheet.updated`, `techsheet.bom_changed`, `techsheet.bop_changed`.

### R.FT.03 — Submeter à revisão
Transição `RASCUNHO → EM_REVISAO`. Notifica `manager` responsável.
**Validações.** BOM ≥ 1 item; BOP ≥ 1 operação; imagem de referência anexada.
**Eventos.** `techsheet.submitted`, `notification.created` (destinatário: aprovador).

### R.FT.04 — Carimbar (aprovação final)
**Objetivo.** Congelar Ficha para produção.
**Saídas.** `status = CARIMBADA`, `carimbada_em = now()`, `carimbada_por = auth.uid()`; snapshot do JSON completo salvo em `techsheet_versions`.
**Validações.**
  1. Estado `EM_REVISAO`.
  2. Papel `manager+`.
  3. Custo teórico calculado (R.FT.05) e ≥ custo mínimo configurado (senão: warning, não bloqueio).
**Eventos.** `techsheet.stamped` (obrigatório para permitir OP).
**Erros esperados.** `E_FT_NOT_IN_REVIEW`, `E_FT_NO_COST`.

### R.FT.05 — Cálculo de custo teórico
**Trigger.** Após qualquer `techsheet.bom_changed` ou `techsheet.bop_changed`.
**Fórmula.**
  ```
  custo_teorico = Σ (bom.consumo × (1 + bom.perda/100) × material.custo_atual)
                + Σ (bop.smv/60 × posto.custo_hora)
                + rateio_indireto (config)
  ```
**Saídas.** `custos_teoricos` row nova; evento `techsheet.cost_recomputed`.

### R.FT.06 — Nova versão pós-carimbamento
**Regra.** Ficha `CARIMBADA` é imutável. Editar cria **v(n+1)** em `RASCUNHO` derivada da anterior. Lote existente continua ligado à versão que consumiu.
**Eventos.** `techsheet.forked`.

### R.FT.07 — Desfazer carimbamento — **PROIBIDO**
Não existe descarimbar. Somente nova versão. Migrações via `admin` são auditadas.

---

## 7. Módulo — Piloto

Provador físico da Referência antes de ir para produção. Uma Referência pode ter N pilotos até aprovação.

### R.PI.01 — Solicitar Piloto
**Entradas.** `reference_id`, `qtd_pecas` (default 1), `data_prevista`, `observacoes`.
**Saídas.** `pilotos` em `SOLICITADO`; alerta ao papel `engineer` + `pcp`.
**Validações.** Referência em `PILOTO` ou `AJUSTE`; Ficha ≥ `EM_REVISAO`; papel `stylist+`.
**Eventos.** `piloto.requested`, `notification.created`.

### R.PI.02 — Iniciar execução
Transição `SOLICITADO → EM_EXECUCAO`. Registra `iniciado_em`, `responsavel_id`.
**Validações.** Ficha em `EM_REVISAO`+; papel `engineer+`.
**Eventos.** `piloto.started`.

### R.PI.03 — Registrar foto/ajuste
**Entradas.** `piloto_id`, imagens (storage), `ajustes[]` (`campo`, `medida_antes`, `medida_depois`).
**Validações.** Piloto em `EM_EXECUCAO`; formato imagem R.REF.05.
**Eventos.** `piloto.photo_added`, `piloto.adjustment_logged`.

### R.PI.04 — Aprovar / Reprovar / Ajuste
**Aprovar.** `EM_EXECUCAO → APROVADO`. Marca `aprovado_em`. Habilita R.REF.02 para `APROVACAO`.
**Reprovar.** `EM_EXECUCAO → REPROVADO` + `motivo` obrigatório. Sobe Referência para `AJUSTE`.
**Ajuste.** `EM_EXECUCAO → AJUSTE`. Cria checklist de correções; próxima solicitação (R.PI.01) fica automaticamente `v(n+1)`.
**Permissões.** `manager+` para Aprovar; `stylist+` para Reprovar/Ajuste.
**Eventos.** `piloto.approved`, `piloto.rejected`, `piloto.needs_adjustment`.

### R.PI.05 — Timeout de piloto
Piloto em `EM_EXECUCAO` além de N dias (config) gera alerta escalonado ao `manager`. Configurável em Admin → Prazos.

---

## 8. Módulo — PCP (Lote / OP / Ocorrência / Apontamento)

Onde a Referência vira produto real.

### R.PCP.01 — Criar Lote
**Objetivo.** Agrupar N Referências que serão produzidas juntas.
**Entradas.** `code`, `nome`, `referencias[]`, `qtd_total`, `data_prevista_inicio`, `data_prevista_fim`, `faccao_id?`.
**Validações.**
  1. Toda Referência em `APROVACAO` e com Ficha `CARIMBADA` no momento da criação.
  2. `data_prevista_fim > data_prevista_inicio`.
  3. `qtd_total = Σ qtd por Referência`.
  4. Papel `pcp+`.
**Saídas.** `pcp_lots` em `PLANEJADO`; congelamento da versão da Ficha (snapshot ID salvo).
**Eventos.** `lote.created`, `techsheet.snapshotted`.

### R.PCP.02 — Sequenciamento / APS
Lotes entram no APS (Doc 16). Ver `06.3-aps.md` para regras finitas de capacidade. Este módulo apenas garante:
- `data_prevista_inicio` e `data_prevista_fim` recomputadas pelo APS.
- Alteração manual gera evento `lote.rescheduled` com `motivo`.

### R.PCP.03 — Abrir OP
**Objetivo.** Uma OP é a instância operacional de uma Referência dentro de um Lote.
**Entradas.** `lote_id`, `reference_id`, `qtd`.
**Validações.** Lote em `PLANEJADO` ou `EM_PRODUCAO`; Referência pertence ao Lote; papel `pcp+`.
**Saídas.** `ops` em `ABERTA`; evento `op.opened`; MRPNecessidade (Doc `06.2`) calculada.
**Eventos.** `op.opened`, `mrp.recomputed`.

### R.PCP.04 — Iniciar produção do Lote
Transição `PLANEJADO → EM_PRODUCAO`. Requer ≥ 1 OP `ABERTA` e insumos `DISPONIVEL` (integração `06.2`).
**Eventos.** `lote.started`.

### R.PCP.05 — Apontamento de operação
**Entradas.** `op_id`, `operacao_id` (do BOP), `qtd`, `refugo?`, `retrabalho?`, `posto_id`, `operador_id?`.
**Validações.**
  1. OP em `ABERTA`, Lote em `EM_PRODUCAO`.
  2. `qtd + refugo ≤ saldo` da operação.
  3. Papel `pcp` ou `manager`.
**Saídas.** `apontamentos` row; recomputa avanço da OP e do Lote.
**Eventos.** `op.apontamento_added`.

### R.PCP.06 — Ocorrência
**Objetivo.** Registrar problema em produção que não é RNC de qualidade.
**Entradas.** `lote_id | op_id`, `tipo` (ex.: parada, quebra máquina, falta insumo), `descricao`, `duracao_min?`, `severidade`.
**Validações.** Papel `pcp+`.
**Saídas.** `pcp_occurrences`. Se severidade `ALTA`, alerta `manager` imediato.
**Eventos.** `pcp.occurrence_registered`, `notification.created`.
**Escalação.** Se ocorrência = defeito recorrente (Doc 15), sobe CAPA automaticamente (evento `capa.escalated_from_op`).

### R.PCP.07 — Concluir OP
**Validações.** `Σ apontamentos.qtd + refugo = OP.qtd`.
**Eventos.** `op.closed`.
**Regra.** Só o backend fecha; nunca o frontend seta `status = CONCLUIDA` diretamente.

### R.PCP.08 — Concluir Lote
**Validações.** Toda OP do Lote em `CONCLUIDA`; qualidade final `APROVADA` (integração `06.4`).
**Saídas.** `pcp_lots.status = CONCLUIDO`; dispara `06.6-financeiro` para fechar `custo_real`.
**Eventos.** `lote.closed`, `finance.close_requested`.

### R.PCP.09 — Cancelar Lote
Só antes de `EM_PRODUCAO`. Motivo obrigatório. Papel `manager+`. Evento `lote.cancelled`.

---

## 9. Contratos transversais (aplicam a tudo acima)

### 9.1 Timeline
Todo evento listado nas regras acima **deve** entrar em `entity_events` com:
```
entity_type, entity_id, event_type, from_status, to_status, actor, payload jsonb, created_at
```
Sem exceções. Trigger de banco por tabela garante que atualização silenciosa vira evento.

### 9.2 Notificações
Toda transição que exige ação de outro papel gera `notifications`:
- `piloto.requested` → destinatários = `engineer` + `pcp`.
- `techsheet.submitted` → destinatários = `manager` do tenant.
- `pcp.occurrence_registered` severidade ALTA → `manager`.
- `capa.opened` → `quality` + `manager`.
Regras completas: Documento 09.

### 9.3 Comentários
Toda entidade suporta `comments` polimórficos. Comentário não substitui evento — comentário é **conversa**, evento é **fato**.

### 9.4 Auditoria
Toda ação de `manager` ou `admin` é logada em `activity_log` além de `entity_events`, para trilha independente.

### 9.5 Prazos
Cada estado que tem SLA lê `workflow_slas` (config Admin). Vencimento gera `notification.deadline_missed` e badge de status `BLOCKED` (pulse).

---

## 10. Erros — dicionário

Códigos internos, mensagens de usuário (pt-BR), classe HTTP.

| Código                    | HTTP | Mensagem ao usuário                                                        |
|---------------------------|------|----------------------------------------------------------------------------|
| `E_REF_CODE_TAKEN`        | 409  | "Já existe uma referência com este código."                                |
| `E_REF_TRANSITION_INVALID`| 409  | "Esta transição não é permitida no fluxo atual."                           |
| `E_REF_HAS_ACTIVE_LOTE`   | 409  | "Não é possível arquivar: existe lote em produção."                        |
| `E_FT_NOT_IN_REVIEW`      | 409  | "Ficha precisa estar em revisão para ser carimbada."                       |
| `E_FT_CARIMBADA_IMMUTABLE`| 409  | "Ficha carimbada é imutável. Crie uma nova versão."                        |
| `E_PILOTO_STATE_INVALID`  | 409  | "Piloto neste estado não aceita esta ação."                                |
| `E_LOTE_REF_NOT_APPROVED` | 409  | "Só referências aprovadas com ficha carimbada podem entrar em lote."       |
| `E_OP_SALDO_EXCEDIDO`     | 422  | "Apontamento excede o saldo da operação."                                  |
| `E_RBAC_FORBIDDEN`        | 403  | "Você não tem permissão para esta ação."                                   |
| `E_MEMBERSHIP_REQUIRED`   | 403  | "Sua conta ainda não tem papel atribuído. Fale com o administrador."       |

Cada código tem também `hint` em log estruturado (nunca exposto ao usuário).

---

## 11. Definition of Done deste documento (Doc 25)

Este documento só é considerado "pronto" quando:

1. Todas as regras dos módulos-núcleo (§4–§8) têm implementação backend correspondente (trigger, function, policy).
2. Cada `Evento` listado tem `event_type` cadastrado no dicionário do Doc 08.
3. Cada `Erro esperado` tem código no dicionário do §10 e teste automatizado (Doc 22).
4. Cada `Configurável em` existe no Admin (Doc 20 §Admin UI).
5. Módulos `06.1` a `06.9` publicados com o mesmo rigor.

---

## 12. O que NÃO está aqui

- **UX** (drawer, palette, cards): Doc 04.
- **Cores, ícones, densidade**: Doc 05.
- **Motor de workflow (config)**: Doc 07.
- **Notificação (canais, templates)**: Doc 09.
- **RBAC (implementação)**: Doc 20.
- **Contrato ERP**: `06.9`.
- **IA / Copiloto**: `06.8` + Doc 19.

---

## 13. Próximo passo

Sob aprovação, produzir na ordem:

1. `06.4-qualidade.md` (CAPA, RNC — a regra mais crítica depois de PCP).
2. `06.2-mrp.md` + `06.1-compras.md` (par indissociável).
3. `06.3-aps.md`.
4. `06.6-financeiro.md`.
5. `06.5-faccao.md`.
6. `06.7-bi.md`, `06.8-ia.md`, `06.9-integracao-erp.md`.

Nenhum código de regra de negócio deve ser escrito antes deste doc e dos `06.x` correspondentes aprovados.
