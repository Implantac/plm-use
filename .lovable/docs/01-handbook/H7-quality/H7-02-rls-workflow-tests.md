# H7-02 · Testes de RLS e workflow

O ponto mais crítico do PLM. Falha aqui = vazamento ou fraude.

## RLS — cenários mínimos por tabela

Para cada tabela pública, escrever teste que:

1. Anônimo **não** lê (a menos que policy `TO anon` explícita).
2. Autenticado sem role **não** lê dado de time.
3. Autenticado com role **lê** dado permitido.
4. Owner lê próprio; não-owner **não** lê alheio.
5. Admin lê tudo.
6. INSERT força `created_by = auth.uid()`.
7. UPDATE por não-owner **falha**.
8. DELETE por não-admin **falha** (ou não existe).

Padrão: server fn de teste que impersona (via bearer token de usuário
seed) — nunca via `supabaseAdmin` bypassando RLS.

## Workflow

Para cada `entity_type` com workflow:

1. Toda transição em `workflow_definitions` **funciona** quando role bate.
2. Toda transição fora da tabela **falha** com erro claro.
3. Transição sem role adequada **falha**.
4. Emite `status_changed` em `entity_events` com `from_status` e `to_status`.
5. Reversão só existe se cadastrada — nunca via UPDATE direto.

## Seed de teste

Fixture com 3+ usuários (admin, member, outsider) e dados mínimos de cada
entidade em cada status possível.

## Anti-padrões

- Teste usando `supabaseAdmin` para "acelerar" — mascara falha de RLS.
- Um teste gigante que cria tudo; preferir cenários isolados.
- Assert só no HTTP status; validar o **efeito** no banco também.
