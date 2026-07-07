# H8-05 · Compliance (LGPD, auditoria, retenção)

## LGPD (aplicável a dados de funcionários, fornecedores, influencers)
- Base legal explícita para cada categoria de dado pessoal armazenado.
- Consentimento registrado quando aplicável (influencers, contatos).
- Direito de acesso: server fn `getMyData(userId)` que exporta tudo em JSON.
- Direito de exclusão: server fn `deleteMyData(userId)` que anonimiza
  (não deleta linhas de auditoria — substitui identificadores por hash).
- DPO responsável identificado.

## Auditoria
- `entity_events` é o log imutável de negócio — nunca DELETE, nunca UPDATE.
- Acessos administrativos privilegiados (uso de `supabaseAdmin`) devem
  gerar evento próprio (`admin_action`).
- Logs de segurança (login, mudança de role) retidos 12 meses.

## Retenção
| Categoria | Retenção | Base |
|---|---|---|
| `entity_events` de negócio | permanente | valor histórico |
| Logs técnicos | 30 dias | operação |
| Webhooks raw | 7 dias | debug |
| Dado pessoal ativo | enquanto contrato vigora | LGPD |
| Dado pessoal após término | 5 anos (fiscal) então anonimizar | legal |

## Anonimização
- Substituir `full_name`, `email`, `phone` por hash + prefixo `anon_`.
- Manter `id` e relações — preserva integridade referencial.
- Registrar evento `user_anonymized`.

## Fornecedores externos
- ERP, e-commerce, IA: contrato + DPA (Data Processing Agreement).
- Mapear que categoria de dado sai da plataforma para cada um.
- Reavaliar anualmente.

## Anti-padrões
- Deletar `entity_events` "para limpar espaço".
- Copiar dado pessoal para planilha fora do sistema.
- Enviar payload com PII para LLM sem redação.
