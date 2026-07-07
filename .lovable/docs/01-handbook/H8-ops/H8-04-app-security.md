# H8-04 · Segurança da aplicação

## Ameaças principais no PLM
- Vazamento de coleção não lançada (competitor advantage).
- Fraude em aprovação (workflow burlado).
- Acesso indevido a custo/preço via ERP.
- Injeção via campo livre (comentário, descrição) em prompt de IA.
- Broadcast realtime sem escopo (usuário assina canal alheio).

## Defesas por camada
### Banco
- RLS em toda tabela pública (H2-03).
- `SECURITY DEFINER` apenas onde necessário e **sem GRANT EXECUTE** para
  `authenticated` quando for função interna.
- Realtime broadcast policies com escopo (`is_member` + validação de
  ownership do tópico, não só wildcard).

### Server
- Todo endpoint autenticado valida bearer via `requireSupabaseAuth`.
- Todo endpoint público `/api/public/*` valida assinatura/secret.
- Zod em toda entrada. Nada de `any`.
- Redação de PII em prompts IA.

### Cliente
- Nenhuma decisão de autorização no cliente.
- CSP restritivo (a configurar).
- Nenhum `dangerouslySetInnerHTML` sem sanitização.

## Fluxo de descoberta de vulnerabilidade
1. Reproduzir em preview.
2. Registrar como finding via `security--manage_security_finding`.
3. Patch → teste → migração se banco.
4. Atualizar `security-memory` para o scanner aprender.
5. Comunicar impacto ao time.

## Anti-padrões
- Confiar em obscuridade de URL para proteger dado.
- Policy "FOR ALL USING (true)" temporária que vira permanente.
- Broadcast realtime em canal público com dado sensível no payload.
