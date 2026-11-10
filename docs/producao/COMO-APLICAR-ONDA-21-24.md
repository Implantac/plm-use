# Passo a passo — aplicar `APLICAR-ONDA-21-24.sql` no SQL Editor

**Projeto:** `njmniwsqwohmigroswnl` · **Arquivo:** `docs/producao/APLICAR-ONDA-21-24.sql` (473 linhas) · **Duração:** ~1 minuto

> Estado medido **antes** de aplicar (23ª medição e re-medição deste roteiro):
> `stock_reservation_aging` → `404 PGRST205`; `consume_reservations_on_movement`,
> `record_op_material_consumption`, `op_reserved_materials` → `404 PGRST202`.
> Ou seja: **a view e as funções não existem no banco**. O app publicado já está
> na Onda 45 — publicar no Lovable **não** aplica SQL (confirmado 23 vezes).

---

## 0. Antes de começar (30 segundos)

Confirme três coisas:

1. Você está no projeto **certo**: o ID é `njmniwsqwohmigroswnl` (aparece na
   URL do dashboard e na URL da API `https://njmniwsqwohmigroswnl.supabase.co`).
2. O arquivo é o do repositório `Implantac/plm-use`, caminho
   `docs/producao/APLICAR-ONDA-21-24.sql`, **473 linhas**.
3. Você tem permissão de escrita no projeto (quem publicou o app tem).

**O que o SQL faz:** cria 6 funções, 1 view, 2 triggers e ajusta `GRANT/REVOKE`.
**O que NÃO faz:** não há nenhum `DELETE`, `TRUNCATE`, `DROP TABLE` ou
`ALTER TABLE` no arquivo — ele não apaga dado nem altera tabela existente. É
**reexecutável** (`CREATE OR REPLACE`, `DROP TRIGGER IF EXISTS`): colar duas
vezes não quebra.

---

## 1. Abra o SQL Editor — **pode ser direto no Lovable, sim**

O projeto Lovable está conectado ao mesmo Supabase que o app usa: tanto o
`.env` quanto o bundle publicado (`index-CPZSdWEg.js`) apontam para
**`https://njmniwsqwohmigroswnl.supabase.co`**. O SQL Editor do Lovable Cloud
executa nesse banco — não é uma cópia, não é staging. Outros SQLs deste repo
já foram aplicados por esse caminho (ex.:
`docs/producao/2026-10-30_PLM-FLUIDO-MULTITENANT.md`).

**Caminho mais curto (Lovable):** abra o projeto → **More (⋯)** → **Cloud** →
**SQL Editor**. Dependendo da versão da UI o menu aparece como
**More → Database → Manage → SQL editor** — é o mesmo lugar. Clique em
**New query** / **+**.

**Alternativa (Supabase):**
`https://supabase.com/dashboard/project/njmniwsqwohmigroswnl/sql/new` →
**+ New query**. Mesmo banco, mesma execução como papel privilegiado
(`postgres`); você não precisa de `SET ROLE`, de CLI nem de `supabase db push`.

### 1.1 Confirme que está no banco certo (10 segundos)

Antes de colar o arquivo, rode esta query **somente leitura**:

```sql
select to_regclass('public.stock_reservation')       as tabela_base,
       to_regclass('public.stock_reservation_aging') as view_aging;
```

Esperado **antes** de aplicar:

| `tabela_base`              | `view_aging` |
| -------------------------- | ------------ |
| `public.stock_reservation` | `NULL`       |

- Se `tabela_base` vier `NULL`, **pare**: você não está no schema do PLM (ou o
  schema base ainda não foi aplicado). Não crie tabela na mão — me avise.
- Se `view_aging` já vier `public.stock_reservation_aging`, a migration já foi
  aplicada; pule para o passo 5 e me avise para eu re-medir.

> **Resultado real observado no Lovable (Mais → Database → SQL editor):**
> `tabela_base = stock_reservation`, `view_aging = NULL`. Está **correto**. O
> `to_regclass` devolve o tipo `regclass`, que omite o prefixo `public.` quando
> o objeto está no `search_path` — `stock_reservation` **é**
> `public.stock_reservation`. Cruzado com a sonda externa no mesmo instante:
> `404 PGRST205` na view e `PGRST202` nas 3 RPCs, coerentes com o `NULL`.

### 1.2 Cheque os pré-requisitos (opcional, recomendado)

O arquivo cria triggers em `stock_movement` e `production_orders`, lê
`stock_balance` e chama a função de RBAC `has_stock_write_role`. Rode antes de
colar, para não descobrir um `relation does not exist` no meio da execução:

```sql
-- esperado: 6 linhas, NENHUMA com objeto NULL
select nome, to_regclass('public.' || nome) as objeto
  from (values ('stock_reservation'), ('stock_movement'), ('production_orders'),
               ('stock_balance'), ('stock_item'), ('warehouse')) v(nome);

-- esperado: 1 linha
select p.proname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'has_stock_write_role';
```

Se algo vier `NULL`/vazio, **pare e me avise** — o schema base está incompleto.

---

## 2. Copie o arquivo **inteiro**

Três formas, escolha a mais fácil:

```bash
# macOS — a partir da raiz do repositório
pbcopy < docs/producao/APLICAR-ONDA-21-24.sql

# Linux com xclip
xclip -selection clipboard < docs/producao/APLICAR-ONDA-21-24.sql
```

- Ou abra o arquivo no visualizador de arquivos / no GitHub, clique em **Raw**,
  `Ctrl+A` → `Ctrl+C`.

**Conferência rápida antes de executar** (evita o erro mais comum, colar pela
metade):

- 1ª linha: `-- =============================================================================`
- Última linha: `NOTIFY pgrst, 'reload schema';`
- Total: **473 linhas** (o editor do Supabase mostra a contagem).

---

## 3. Cole e execute

1. Clique em **Clear** (ou `Ctrl+A` + `Delete`) para **remover a query de
   verificação** que ficou no editor — ela não deve ir junto com o arquivo.
2. Clique dentro da área do editor e cole (`Ctrl+V` / `Cmd+V`).
3. Confira que a última linha é mesmo `NOTIFY pgrst, 'reload schema';` e que
   a 1ª é o `-- ===...` (473 linhas).
4. Clique em **Run** (ou `Ctrl+Enter` / `Cmd+Enter`).
5. **Aguarde até o fim** — são ~473 linhas, alguns segundos. Não aperte Run
   duas vezes enquanto a primeira ainda está rodando.

> ### ⚠️ Vai aparecer um modal "Confirm destructive operation" — **pode confirmar**
>
> O Lovable exibe: _"This query contains a DROP statement which can modify or
> delete data. Are you sure you want to run it?"_ com **Cancel** / **Run anyway**.
> **Clique em `Run anyway`.** O aviso é disparado por **palavra-chave**, não por
> análise do SQL — ele conta até a palavra `DROP` dentro de um **comentário**.
>
> Medido no arquivo real: **3** ocorrências de `DROP` —
>
> - linha 24: dentro de um comentário (`-- Reexecutável: usa ... DROP TRIGGER IF EXISTS ...`);
> - linhas 112 e 180: os dois únicos comandos executáveis, ambos
>   `DROP TRIGGER IF EXISTS ... ON public.stock_movement` /
>   `... ON public.production_orders`.
>
> Um `DROP TRIGGER` remove **metadado de gatilho**, nunca linha de tabela. E como
> a migration nunca foi aplicada neste banco (`view_aging = NULL`,
> `404 PGRST205`/`PGRST202` re-medidos), esses triggers **não existem** — o
> `IF EXISTS` torna os dois comandos **no-op**. Não há nenhum
> `DROP TABLE`, `DROP VIEW`, `DELETE`, `TRUNCATE` ou `ALTER TABLE` no arquivo.
> Os 9 `CREATE OR REPLACE` também não substituem nada: view e funções estão
> ausentes, logo é criação pura.

> O arquivo termina com o bloco **VERIFICAÇÃO** e o `NOTIFY`, então **uma única
> execução já aplica, verifica e recarrega o schema do PostgREST**. O comentário
> do cabeçalho sugere rodar a verificação "numa nova execução" — isso é
> opcional, só para confirmar de novo (passo 5).

---

## 4. O que você DEVE ver na saída

Na aba de resultados / **Messages** do SQL Editor, exatamente **3 NOTICEs**:

```
ok  view stock_reservation_aging existe
ok  RPC record_op_material_consumption existe
ok  os 2 triggers da reserva estao instalados
```

E nenhuma linha de erro. O `NOTIFY pgrst, 'reload schema'` **não imprime
mensagem** — silêncio ali é normal. `NOTIFY` é um comando Postgres padrão e
funciona tanto no editor do Lovable quanto no do Supabase; se o papel do
Lovable reclamar dele, o PostgREST costuma recarregar sozinho em ~10–30 s
(ou rode só essa linha no Supabase, que é o mesmo banco).

> Se os NOTICEs não aparecerem de primeira, expanda a aba **Messages** /
> **Logs** na parte inferior do resultado. O `DO $$` usa `RAISE NOTICE`, que
> aparece como mensagem, não como linha de tabela. **No SQL Editor do Lovable
> isso é especialmente comum**: alguns wrappers mostram só o resultado da
> última query e ocultam `RAISE NOTICE`. Nesse caso **não presuma falha** —
> rode as queries de catálogo do passo 5; se elas derem 1 view / 6 funções /
> 2 triggers, a migration aplicou com sucesso.

**Se aparecer `FALHOU: ...`**, o próprio bloco lança `RAISE EXCEPTION` com o
motivo. Não continue para o passo 6: vá para o passo 7.

---

## 5. Confirme pelo catálogo (opcional, 15 segundos)

Cole numa **nova query** e rode — é somente leitura, não escreve nada:

```sql
-- 1) view  → esperado: 1 linha
select viewname from pg_views
 where schemaname = 'public' and viewname = 'stock_reservation_aging';

-- 2) funções → esperado: 6 linhas
select p.proname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in (
     'consume_reservations_on_movement', 'cancel_reservations_for_ref',
     'sync_reservations_on_op_status', 'stock_on_hand',
     'record_op_material_consumption', 'op_reserved_materials'
   )
 order by 1;

-- 3) triggers → esperado: 2 linhas
select tgname, tgrelid::regclass as tabela
  from pg_trigger
 where tgname in ('trg_stock_reservation_op_status', 'trg_stock_reservation_consume')
   and not tgisinternal;

-- 4) só para OLHAR as reservas antigas presas (não cancele nada agora)
select * from public.stock_reservation_aging
 order by dias_ativa desc nulls last
 limit 20;
```

A consulta 4 pode voltar **vazia** e está tudo bem — significa que não há
reservas presas. Só **liste**; o cancelamento é uma decisão sua, posterior,
via `cancel_reservations_for_ref`, e não faz parte deste passo a passo.

---

## 6. Valide pela API e me avise

O `NOTIFY pgrst` pode levar **10 a 30 segundos** para o PostgREST recarregar o
schema. Depois disso, o sintoma muda:

| Sonda                              | Antes          | Depois (esperado)                                                             |
| ---------------------------------- | -------------- | ----------------------------------------------------------------------------- |
| `stock_reservation_aging`          | `404 PGRST205` | **não é mais 404** — `200` (possivelmente `[]`) ou `401/403` de permissão/RLS |
| `consume_reservations_on_movement` | `404 PGRST202` | **não é mais 404** — `401/403` sem sessão, ou erro de argumentos              |
| `record_op_material_consumption`   | `404 PGRST202` | idem                                                                          |
| `op_reserved_materials`            | `404 PGRST202` | idem                                                                          |

> **Importante:** com a chave publicável e **sem token de usuário**, um
> `401/403` é o resultado **correto** — significa que o objeto existe e a RLS
> está barrando acesso anônimo. O que importa é o **fim do `PGRST205`/`PGRST202`**,
> que são erros de "objeto não encontrado". Não interprete 401 como falha.

**Você não precisa rodar os `curl`.** É só me dizer _"apliquei"_ (ou colar as 3
NOTICEs) que eu re-meço as 4 sondas por aqui, atualizo
`SINCRONIA-2026-11-05.md` / `ONDE-PAROU.md` para a 24ª medição e empurro.

Se quiser validar você mesmo:

```bash
# use a publishable key do SEU projeto (não é segredo, mas também não precisa colar aqui)
SUPABASE_KEY='sb_publishable_...' bash scripts/check-sync.sh
```

---

## 7. Se der erro — o que fazer

| Mensagem                                             | Causa                                                                   | Ação                                                                                                                                           |
| ---------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `relation "public.stock_reservation" does not exist` | O schema base (migrations `drizzle/0014`) não está aplicado neste banco | **Pare.** Não crie tabela na mão. Me avise que eu levanto o schema real antes de qualquer SQL                                                  |
| `syntax error at or near ...`                        | Colou pela metade ou colou o Markdown em vez do `.sql`                  | Limpe o editor, copie de novo o `.sql` de 473 linhas, confira a última linha                                                                   |
| `permission denied`                                  | Projeto/role errado                                                     | Rode a query 1.1; se `tabela_base` estiver correta e ainda assim falhar, use o SQL Editor do Supabase (roda como `postgres`) — é o mesmo banco |
| `trigger ... already exists`                         | Não deveria ocorrer (`DROP TRIGGER IF EXISTS`)                          | Reexecute o arquivo inteiro; é idempotente                                                                                                     |
| `FALHOU: view ... nao existe`                        | O `DO $$` de verificação rodou sem a parte 1 ter aplicado               | Reexecute o arquivo inteiro e leia os NOTICEs                                                                                                  |
| Os NOTICEs não aparecem                              | Aba de mensagens recolhida                                              | Expanda **Messages/Logs** no resultado; ou rode o bloco da linha 448 separadamente                                                             |

**Não faça:**

- Não use `db-extra-search-path=extensions` nem mexa em `search_path` manualmente
  — as funções já declaram `SET search_path = public` e `SECURITY DEFINER`.
- Não inverta a ordem: a **Onda 24 redefine** a função de trigger da Onda 21,
  por isso vem depois no mesmo arquivo.
- Não cancele reservas presas **antes** da migration (não há view para listar).
- Não aplique em outro projeto Supabase "para testar" — o app publicado aponta
  para `njmniwsqwohmigroswnl`.

---

## 8. Depois que der certo

Restam duas coisas, ambas do seu lado:

1. ~~Publicar as Ondas 44/45~~ — **concluído** (23ª medição, `index-CPZSdWEg.js`).
2. **Este SQL** — o que este roteiro resolve; depois dele repo, ar e banco ficam
   na mesma onda pela primeira vez.
3. **Credencial `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD`** — sem ela os 2 specs de
   e2e seguem `skipped` e não há prova de fluxo autenticado contra produção.
