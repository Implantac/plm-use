# H8-03 · Backup e disaster recovery

## Backup automático
- Supabase mantém backup diário do Postgres.
- Storage (bucket `use-moda-assets`) mantido pela infra.
- **Não confie apenas nisso** para dado crítico.

## Backup adicional
- Export CSV semanal das tabelas de negócio-chave (`references`,
  `pilotos`, `pcp_lots`, `quality_capa`, `entity_events`) para bucket
  frio ou storage externo do cliente.
- Documentar processo em runbook.

## RPO / RTO alvo
- RPO (perda máxima aceitável): 24h.
- RTO (tempo máximo de restauração): 4h.

## Cenários de DR
1. **Deploy quebrado** — rollback via history (minutos).
2. **Migração destrutiva** — restore do backup diário + replay de eventos
   posteriores via `entity_events` (idealmente).
3. **Bucket corrompido** — restore do backup + reprocessar hashes.
4. **Comprometimento de credencial** — rotação imediata (H8-02) +
   auditoria de eventos suspeitos.
5. **Perda total de projeto** — recriar a partir de migrações versionadas
   + restore de backup externo. **Rode o teste** ao menos 1x/ano.

## Regra de ouro
Backup que não foi restaurado ao menos uma vez não existe. Simular DR
trimestralmente em ambiente descartável.
