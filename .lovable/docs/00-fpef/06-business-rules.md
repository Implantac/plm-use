# V6 · Business Rules

Regras vivem em **três camadas** — nesta ordem de preferência:

1. **Banco** (triggers, funções SECURITY DEFINER, `reference_transitions`) — regras que **nunca** podem ser burladas
2. **Server functions** (`createServerFn` com `requireSupabaseAuth`) — regras que envolvem IA, ERP ou side-effects
3. **Cliente** (hooks/componentes) — apenas UX (habilitar botão, mostrar aviso)

## O que já existe

- `reference_transitions` — máquina de estados de referência (tabela)
- `log_reference_status_change()` trigger — emite evento ao mudar status
- `can_transition_reference()` — valida transição
- Regras de negócio escritas em `.lovable/docs/06.*.md`

## Exemplos de regras (ainda não codificadas)

- Piloto aprovado → criar Engenharia + notificar Compras + atualizar Timeline
- Fornecedor com atraso > X dias → gerar alerta no Dashboard
- Lote com ocorrência crítica → CAPA obrigatória antes de fechar
- OP atrasada → evento + recomendação da IA (V11)

## Gaps

- Regras dos docs `06.*` não são **executáveis** — nenhum trigger/serverfn as implementa
- Sem catálogo formal `<Quando X → Faça Y>` versionado
- Sem testes de regra de negócio (só temos testes de UI de attachments)
