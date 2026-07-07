# H7-04 · Observabilidade

Ver também H3-05 (fundamentos). Este doc foca em **operar** o PLM em produção.

## Três eixos
1. **Logs estruturados** — quem, o quê, quando, com qual id.
2. **Métricas numéricas** — latência, throughput, erro, custo.
3. **Eventos de negócio** — `entity_events` é o log semântico.

## Dashboards mínimos
- **Saúde técnica:** erro por rota, p95 por server fn, uptime do ERP,
  fila de webhooks.
- **Saúde de negócio:** transições/dia por status, SLA médio de aprovação,
  backlog por squad, custo de IA/dia.
- **Uso:** DAU/WAU, retenção por perfil, features mais/menos usadas.

## Alertas
Regra: alerta **acionável**. Se não há o que fazer quando dispara, é ruído.
- Server fn crítica > 3s p95 por 10min → alerta.
- Erro 500 > 1% por 5min → alerta.
- Webhook ERP falhando > 3 vezes → alerta.
- `sla_breached` em CAPA crítica → notificação in-app + email.
- Custo IA > orçamento diário → alerta + circuit breaker.

## Retenção
- Logs técnicos: 30 dias.
- `entity_events`: **permanente** (é a memória do produto).
- Payloads sensíveis (webhook cru): 7 dias, hash mantido.

## Anti-padrões
- Alerta que ninguém entende ("Query X failed").
- Métrica sem dashboard.
- Log com JSON gigante sem estrutura.
- Redigir depois — precisa nascer sem PII.
