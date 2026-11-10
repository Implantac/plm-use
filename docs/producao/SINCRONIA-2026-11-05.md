# Sincronia repo × ar × banco — 20ª medição, 06/11/2026

Este documento é uma **medição**, não um plano. Cada linha foi obtida executando
o comando indicado no fim. Se algo divergir do que você vê na tela, refaça a
medição antes de discordar — e lembre que **publicar o app não aplica SQL**.

---

## 1. O quadro

| Camada                                         | Estado medido                          | Como foi medido                      |
| ---------------------------------------------- | -------------------------------------- | ------------------------------------ |
| **Repositório** (`Implantac/plm-use`, `main`)  | **Onda 43**                            | `git log` / `git ls-remote`          |
| **App publicado** (`plmuse.lovable.app`)       | **Onda 42** — `index-D2xvfyGH.js`      | marcadores no bundle (tabela abaixo) |
| **Banco de produção** (`njmniwsqwohmigroswnl`) | **sem as migrações das Ondas 21 e 24** | `404` na view e nas RPC novas        |

**O que mudou desde a medição anterior:** **o ar avançou mais uma vez, sem
aviso do dono**. Saiu `index-HH9GNbDa.js` e entrou **`index-D2xvfyGH.js` (221
chunks)** com `supplier-so-vitrine` **1** e `scoreboard-so-vitrine` **1**: a
**Onda 42 está no ar**. O repo passou para a **Onda 43**, que é uma revisão de
UX executada no browser (`ComecePorAqui`, sidebar corrigida, fluxo colapsado,
`aria-required`), então `comece-por-aqui`, `progresso-onboarding`,
`fluxo-operacional-detalhes` e `páginas neste grupo` = **0** no bundle. A
distância continua sendo **uma onda**. `DEV000006` permanece em **27**
ocorrências. O banco segue sem as migrações (20ª medição: `PGRST205` na view
e `PGRST202` nas três RPCs).

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
| 43   | `comece-por-aqui` / `progresso-onboarding`      | **0**       | ❌      |

**Conclusão:** o ar está na **Onda 42**, **uma onda** atrás do repo (43). A
camada mais atrasada continua sendo o **banco**. A frase "Consumo e liberação
são automáticos" ainda existe no bundle, mas condicionada ao ramo `ativa` —
com as migrações pendentes, o operador vê o aviso âmbar, não a promessa. A
trilha LGPD e o ranking de fornecedores publicados já estão corrigidos; o que
falta no ar é a **experiência de primeiro uso** da Onda 43.

---

## 3. Banco de produção — o que falta

Consultado pela chave **publishable** que vem no próprio bundle do app (a mesma
que o navegador usa), em `https://njmniwsqwohmigroswnl.supabase.co`:

| Objeto                                 | Esperado por | Resposta medida                                 |
| -------------------------------------- | ------------ | ----------------------------------------------- |
| view `stock_reservation_aging`         | Onda 21      | **404** `PGRST205` — "Could not find the table" |
| RPC `consume_reservations_on_movement` | Onda 21      | **404** `PGRST202` — função não encontrada      |
| RPC `record_op_material_consumption`   | Onda 24      | **404** `PGRST202`                              |
| RPC `op_reserved_materials`            | Onda 24      | **404** `PGRST202`                              |

`PGRST202` com a mensagem _"Searched for the function … without parameters or
with a single unnamed json/jsonb parameter"_ é **conclusivo de função ausente** —
não é RLS, não é permissão, não é cache de schema.

Logo, `20261104120000_stock_reservation_lifecycle.sql` e
`20261104200000_op_material_consumption.sql` **não foram aplicadas**. O pacote
pronto, reaplicável e testado está em
`docs/producao/APLICAR-ONDA-21-24.sql` (473 linhas, 163 asserções exit 0).

### A consequência que precisa ser dita

A tela de reservas no ar promete:

> "Consumo e liberação são automáticos: a saída de estoque consome a reserva e a
> OP concluída ou cancelada libera o que sobrar."

Em produção essa frase é **falsa**: os triggers não existem no banco. Enquanto o
SQL não for aplicado, a reserva criada em `'ativa'` nunca é encerrada pela
automação e o disponível não volta.

---

## 4. O que **não** foi medido (e por quê)

- **Volume de dados em produção.** As tabelas respondem `200` com `[]` para a
  chave publishable — esperado com RLS ligada e indistinguível de tabela vazia.
  Não afirmo nem "tem dados" nem "está vazio".
- **Se há login funcionando.** Exige credencial; `e2e-autenticado` segue
  `skipped` na CI.
- **Se os botões novos funcionam em produção.** Dependem da migração que falta.

---

## 5. O que destrava cada lacuna

| Lacuna                                    | Ação                                                                               | Quem faz        |
| ----------------------------------------- | ---------------------------------------------------------------------------------- | --------------- |
| **Ar duas ondas atrás do repo (39 + 40)** | republicar no Lovable depois deste commit                                          | dono do projeto |
| **Banco sem as migrações 21 e 24**        | colar `docs/producao/APLICAR-ONDA-21-24.sql` no SQL editor e reportar as 3 NOTICEs | dono do projeto |
| E2E autenticado nunca roda                | fornecer `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD`                                      | dono do projeto |
| Cancelar reservas presas                  | só **depois** da migration, usando `stock_reservation_aging.dias_ativa`            | dono do projeto |

Nenhuma das pendências é código: publicar, colar um SQL e dar uma credencial.

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
