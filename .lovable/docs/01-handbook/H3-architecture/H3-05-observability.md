# H3-05 · Observabilidade e erros

Se não é observável, não existe.

## Erros

- Toda rota com loader **obrigatoriamente** define `errorComponent` e
  `notFoundComponent`. Router config define `defaultErrorComponent`.
- Erros em server fn: lançar `Error` com mensagem humana. Middleware
  registra e devolve 500 com detalhe seguro.
- Cliente captura via `src/lib/error-capture.ts` e envia para pipeline de
  telemetria.

## Eventos como observabilidade de negócio

`entity_events` é o **log estruturado** do produto. BI, alertas e IA leem
daqui. Se algo importante acontece e não vira evento, está invisível.

## Métricas mínimas por módulo

- Latência da server fn crítica (p50, p95)
- Taxa de erro por rota
- Contagem de transições de workflow por status
- Backlog de comentários não lidos
- SLA de aprovação (tempo entre `created` e `approved`)

## Logs

- Server fn: `console.log` com prefixo `[fn:<nome>]` — vira Cloud log.
- Nunca logar PII, secret, token, senha, payload de ERP com valor financeiro.

## Alertas (V7 + H7)

- SLA vencido → evento `sla_breached` + notificação.
- Erro repetido na mesma server fn → alerta para squad.
- Transição inválida bloqueada → evento `alert_raised` com contexto.
