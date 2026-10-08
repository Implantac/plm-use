# H7-05 · Checklist de release

Antes de publicar (FPEF V12 — Design Review final).

## Código

- [ ] Build passa (`bun run build`).
- [ ] TypeScript sem erro (`tsgo`).
- [ ] Lint sem erro.
- [ ] Testes unit + integração verdes.
- [ ] E2E dos fluxos afetados verdes.
- [ ] Nenhum `console.log` órfão em produção.
- [ ] Nenhum secret em código.

## Banco

- [ ] Migração revisada — GRANTs presentes, RLS habilitada, policies por ação.
- [ ] Índices nas FKs e colunas filtradas.
- [ ] Trigger de `updated_at` e de eventos onde aplicável.
- [ ] `supabase--linter` sem novo warning.
- [ ] Rollback plan documentado.

## Produto

- [ ] Passou pelas 10 perguntas do Design Review (FPEF V13).
- [ ] KPIs de sucesso definidos e mensuráveis.
- [ ] Timeline mostra o novo evento.
- [ ] Workflow (se novo status) cadastrado em `workflow_definitions`.
- [ ] Drawer contextual atualizado quando entidade nova.

## UX

- [ ] Contraste AA validado.
- [ ] Teclado navega tudo.
- [ ] Estados vazio, carregando, erro implementados.
- [ ] Textos em pt-BR, tom coerente com voz do produto.

## IA (se aplicável)

- [ ] Agente com escopo estreito.
- [ ] Contexto redigido (sem PII/financeiro).
- [ ] Custo estimado por request documentado.
- [ ] Auditoria via `ai_suggested` funciona.

## Segurança

- [ ] `security--get_scan_results` sem novo `error`.
- [ ] Warnings novos justificados na `security-memory`.
- [ ] Nenhuma policy `FOR ALL USING (true)`.

Nenhuma release passa com item pendente sem justificativa escrita.
