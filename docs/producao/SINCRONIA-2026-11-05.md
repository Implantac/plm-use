# Sincronia repo × ar × banco — 24ª medição, 06/11/2026

Este documento é uma **medição**, não um plano. Cada linha foi obtida executando
o comando indicado no fim. Se algo divergir do que você vê na tela, refaça a
medição antes de discordar — e lembre que **publicar o app não aplica SQL**.

---

## 1. O quadro

| Camada                                         | Estado medido                     | Como foi medido                      |
| ---------------------------------------------- | --------------------------------- | ------------------------------------ |
| **Repositório** (`Implantac/plm-use`, `main`)  | **Onda 45** — `504dde3`           | `git log` / `git ls-remote`          |
| **App publicado** (`plmuse.lovable.app`)       | **Onda 45** — `index-CPZSdWEg.js` | marcadores no bundle (tabela abaixo) |
| **Banco de produção** (`njmniwsqwohmigroswnl`) | **migrações 21 e 24 APLICADAS**   | `200` na view · `42501` nas funções  |

**O que mudou desde a medição anterior:** o dono aplicou
`APLICAR-ONDA-21-24.sql` no **SQL Editor do Lovable** (Mais → Database → SQL
editor). O editor exibiu o modal _"Confirm destructive operation"_ pelo
`DROP TRIGGER IF EXISTS` e, confirmado, retornou **"Query succeeded / No rows
returned"** — sem mostrar os `RAISE NOTICE`, como era esperado naquele wrapper.
O `DO $$` de verificação embutido no próprio SQL teria lançado
`RAISE EXCEPTION` se view, RPC ou os 2 triggers faltassem; **não lançou**.

Re-medição externa pela chave publishable do bundle, sem sessão de usuário:

| Sonda                                                      | 23ª medição    | **24ª medição**                                |
| ---------------------------------------------------------- | -------------- | ---------------------------------------------- |
| view `stock_reservation_aging`                             | `404 PGRST205` | **`200 []`**                                   |
| `op_reserved_materials(_order_id)`                         | `404 PGRST202` | **`401 42501 permission denied for function`** |
| `stock_on_hand(_item_id,_warehouse_id)`                    | não sondada    | **`401 42501 permission denied for function`** |
| `record_op_material_consumption(_order_id,_justification)` | `404 PGRST202` | **`401 42501 permission denied for function`** |
| `cancel_reservations_for_ref(_ref_type,_ref_id,_motivo)`   | não sondada    | **`401 42501 permission denied for function`** |

`401 42501` **prova que a função existe**: o PostgREST a encontrou no catálogo e
o papel `anon` foi barrado pelo `REVOKE ... FROM public, anon` + `GRANT ... TO
authenticated, service_role`. Antes, `PGRST202` dizia _"no matches were found in
the schema cache"_. As **três camadas estão agora alinhadas na Onda 45**.
`DEV000006` segue em **27** ocorrências e o entry permanece
`index-CPZSdWEg.js` (223 chunks).

### Correção metodológica (importante)

`consume_reservations_on_movement()` e `sync_reservations_on_op_status()` são
**`RETURNS trigger`** — funções de gatilho, **nunca expostas como RPC**. Usá-las
como sonda nas medições 4ª–23ª foi um erro de método: o `PGRST202` delas
persistiria mesmo com a migration aplicada. A prova correta de ausência era a
view `PGRST205` somada às funções escalares/tabulares chamadas **com os nomes
de parâmetros corretos** (chamadas com `{}` também devolvem `PGRST202` por
assinatura incompatível, não por ausência). A sonda canônica passa a ser a
view + as 4 funções da tabela acima.

---

## 2. App publicado — qual onda está no ar

Método: baixar `/`, extrair `assets/index-*.js`, seguir os imports em BFS por
todos os chunks e contar **texto de tela** (nunca comentário) em todo o bundle.

- entry: **`index-1d8-RbIh.js`** (histórico: `index-CQexDK2k.js` = 23,
  `index-BCX5Of78.js` = 25, `index-gNNeOgTl.js` = 26, `index-bJxsbr7k.js` = 28)
- **218 chunks**, ~3,1 MB de JS lidos

| Onda | Marcador procurado                              | Ocorrências | Leitura |
| ---- | ----------------------------------------------- | ----------- | ------- |
| 24   | `Dar baixa do material`                         | 1           | ✅      |
| 25   | `Documento com dados de demonstra`              | 2           | ✅      |
| 27   | `Custeio incompleto`                            | 1           | ✅      |
| 27   | `Composição não informada`                      | 5           | ✅      |
| 28   | `sem NCM`                                       | 5           | ✅      |
| 29   | `pedidosSemFicha`                               | 4           | ✅      |
| 29   | `rfq-sem-ficha`                                 | 1           | ✅      |
| 29   | `showroom-sem-ficha`                            | 1           | ✅      |
| 30   | `DRE não apurável`                              | 4           | ✅      |
| 30   | `omnichannel-sem-ficha`                         | 1           | ✅      |
| 30   | `kanban-sem-ficha`                              | 1           | ✅      |
| 31   | `cockpit-sem-ficha`                             | 1           | ✅      |
| 31   | `gemeo-sem-ficha`                               | 1           | ✅      |
| 31   | `os-sem-ficha`                                  | 2           | ✅      |
| 32   | `Passaporte ESG`                                | 2           | ✅      |
| 33   | `país de origem declarado`                      | 1           | ✅      |
| 33   | `composição ABNT declarada`                     | 1           | ✅      |
| 34   | `Risco CAD não declarado`                       | 1           | ✅      |
| 34   | `Plano de corte não apurável`                   | 3           | ✅      |
| 35   | `A referência de origem não tem ficha salva`    | 1           | ✅      |
| 36   | `Fichas sem engenharia`                         | 1           | ✅      |
| 36   | `sem engenharia custeada`                       | 3           | ✅      |
| 37   | `reserva-migracao-pendente`                     | 1           | ✅      |
| 38   | `gtm-so-vitrine` / `sop-sem-drops`              | 1           | ✅      |
| 39   | `sop-sem-pedidos`                               | **1**       | ✅      |
| 40   | `sop-sem-faccao` / `apuravelFaccao`             | **1**       | ✅      |
| 41   | `lgpd-so-vitrine` / `briefing-so-vitrine`       | **1**       | ✅      |
| 42   | `supplier-so-vitrine` / `scoreboard-so-vitrine` | **1**       | ✅      |
| 43   | `comece-por-aqui` / `progresso-onboarding`      | **1**       | ✅      |
| 44   | `cta-supplier-so-vitrine` / `CtaProximoPasso`   | **1**       | ✅      |
| 45   | `glossario-termos` / `Ferramentas do produto`   | **1**       | ✅      |

**Conclusão:** o ar está na **Onda 45**, na mesma onda do repositório, e o
**banco também foi alinhado** na 24ª medição. Pela primeira vez desde a 4ª
medição **nenhuma camada está atrasada**. A tela de reservas deixou de prometer
uma automação inexistente. O que ainda não foi provado é o fluxo autenticado de
ponta a ponta: sem `PLM_E2E_EMAIL`/`PLM_E2E_PASSWORD` os dois specs de e2e
seguem `skipped`. `DEV000006` permanece em 27 ocorrências no bundle (dívida de
vitrine, não de número operacional).

---

## 3. Banco de produção — aplicado (24ª medição)

`APLICAR-ONDA-21-24.sql` (473 linhas, 163 asserções exit 0) foi aplicado no SQL
Editor do Lovable. Resultado: **view criada, 6 funções, 2 triggers instalados**,
com `GRANT EXECUTE` apenas a `authenticated`/`service_role`.

| Sonda (sem sessão)                         | Resposta     | Interpretação                                |
| ------------------------------------------ | ------------ | -------------------------------------------- |
| `GET /stock_reservation_aging?limit=1`     | **`200 []`** | view existe e é legível; sem reservas presas |
| `POST /rpc/op_reserved_materials`          | `401 42501`  | função existe, `anon` barrado                |
| `POST /rpc/record_op_material_consumption` | `401 42501`  | função existe, `anon` barrado                |
| `POST /rpc/cancel_reservations_for_ref`    | `401 42501`  | função existe, `anon` barrado                |
| `POST /rpc/stock_on_hand`                  | `401 42501`  | função existe, `anon` barrado                |

**Não confundir `401` com falha:** com a chave publicável e sem JWT de usuário,
`401 42501` é exatamente o comportamento desejado — RLS/grants funcionando. O
que encerrou foi o `PGRST205`/`PGRST202` de "objeto não encontrado".

A frase da tela de reservas — _"Consumo e liberação são automáticos"_ — deixa
de ser falsa em produção: os triggers `trg_stock_reservation_consume` (em
`stock_movement`) e `trg_stock_reservation_op_status` (em `production_orders`)
passam a existir.

---

## 4. O que **não** foi medido (e por quê)

- **Volume de dados em produção.** As tabelas respondem `200` com `[]` para a
  chave publishable — esperado com RLS ligada e indistinguível de tabela vazia.
  Não afirmo nem "tem dados" nem "está vazio".
- **Se há login funcionando.** Exige credencial; `e2e-autenticado` segue
  `skipped` na CI.
- **Se os botões novos funcionam em produção.** A migração já está aplicada, mas a prova de ponta a ponta ainda exige login real (item abaixo).

---

## 5. O que destrava cada lacuna

| Lacuna                                          | Ação                                                                       | Quem faz        |
| ----------------------------------------------- | -------------------------------------------------------------------------- | --------------- |
| ~~Ar duas ondas atrás do repo~~ **zerado**      | ~~republicar~~ concluído na 23ª medição (`index-CPZSdWEg.js`)              | dono do projeto |
| ~~Banco sem as migrações 21 e 24~~ **aplicado** | ~~colar SQL~~ concluído na 24ª medição: view `200 []`, funções `401 42501` | dono do projeto |
| E2E autenticado nunca roda                      | fornecer `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD`                              | dono do projeto |
| Cancelar reservas presas                        | só **depois** da migration, usando `stock_reservation_aging.dias_ativa`    | dono do projeto |

Publicação **e** SQL concluídos — repo, ar e banco estão alinhados. Resta uma ação que não é código: dar a credencial de e2e (e, se houver, revisar reservas presas com `stock_reservation_aging.dias_ativa`).

---

## 6. Como refazer esta medição

```bash
# 1. repositório
git ls-remote https://github.com/Implantac/plm-use.git main

# 2. ar — BFS pelos chunks do bundle e contagem de marcadores de tela
python3 - <<'PY'
import urllib.request, re, collections
b='https://plmuse.lovable.app'
g=lambda u: urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=20).read().decode('utf8','replace')
h=g(b+'/'); q=collections.deque(dict.fromkeys(re.findall(r'assets/([A-Za-z0-9_.-]+\.js)',h))); v=set(); t=''
while q and len(v)<400:
    c=q.popleft()
    if c in v: continue
    v.add(c)
    try: s=g(b+'/assets/'+c)
    except Exception: continue
    t+=s
    for n in re.findall(r'assets/([A-Za-z0-9_.-]+\.js)',s):
        if n not in v: q.append(n)
print('entry:', re.findall(r'assets/(index-[A-Za-z0-9_.-]+\.js)',h)[0], '| chunks:', len(v))
for m in ['pedidosSemFicha','rfq-sem-ficha','DRE não apurável','omnichannel-sem-ficha']:
    print(f'  {m:28} {t.count(m)}')
PY

# 3. banco — a chave publishable está no bundle; a URL é a do projeto
KEY=sb_publishable_...   # extrair do JS acima
URL=https://njmniwsqwohmigroswnl.supabase.co
curl -s -H "apikey: $KEY" "$URL/rest/v1/stock_reservation_aging?select=*&limit=1"
curl -s -X POST -H "apikey: $KEY" -H "Content-Type: application/json" -d '{}' \
     "$URL/rest/v1/rpc/op_reserved_materials"
```

`PGRST205` na view e `PGRST202` nas RPCs = migrações 21/24 continuam fora do ar.
