# Sincronia repo × ar × banco — 26ª medição, 06/11/2026

Este documento é uma **medição**, não um plano. Cada linha foi obtida executando
o comando indicado no fim. Se algo divergir do que você vê na tela, refaça a
medição antes de discordar — e lembre que **publicar o app não aplica SQL**.

---

## 1. O quadro

| Camada                                         | Estado medido                     | Como foi medido                      |
| ---------------------------------------------- | --------------------------------- | ------------------------------------ |
| **Repositório** (`Implantac/plm-use`, `main`)  | **Onda 46** — `2ff1647`           | `git log` / `git ls-remote`          |
| **App publicado** (`plmuse.lovable.app`)       | **Onda 46** — `index-CeAMfFot.js` | marcadores no bundle (tabela abaixo) |
| **Banco de produção** (`njmniwsqwohmigroswnl`) | **migrações 21 e 24 APLICADAS**   | `200` na view · `42501` nas funções  |

**O que mudou desde a medição anterior:** o dono reportou **"publicado"** e a
medição **confirmou**. Saiu `index-CPZSdWEg.js` e entrou
**`index-CeAMfFot.js` (223 chunks)**. Marcadores da Onda 46 no bundle:
`cad-so-vitrine` **1**, `prototipo-so-vitrine` **1**, `studio-sem-ficha` **1**,
`cta-cad-sem-molde` **1**, `cta-prototipo-sem-piloto` **1**, `"Cadastrar meu
molde"` **1**, `"Cadastrar como meu"` **1**, `"Sync indisponível"` **1**,
`"Sem foto do piloto"` **1**, `"Demonstração · não apurado"` **2** e
`"toaster group"` **1** (o `<Toaster />` agora entra no bundle).
`glossario-termos` segue **1**, `CtaProximoPasso` **7**, `"Torre Executiva PLM
2.0"` **0**. **`DEV000006` caiu de 27 para 20 ocorrências**: os 7 literais de
código executável/formulário saíram; os 20 restantes são a vitrine declarada
(`demo: true`) nos stores. **Repo, ar e banco alinhados na Onda 46** — a
distância de uma onda zerou.

Além do BFS, houve **validação com cliques reais contra produção**
(Chromium, sessão local sem escrita no banco): `/cad` com `MOLDES ATIVOS —`,
`EFICIÊNCIA MÉDIA —`, `APROVADOS —`, aviso + CTA, 2 `cad-sync-bloqueado`,
formulário `['', '', '', '0', '0', '0', '1', '0', '0', '0', 'on']` e, ao
salvar vazio, o toast **"Informe o código da referência e o nome do arquivo de
molde."**; `/prototypes` com 4 KPIs `—`, aviso + CTA e 2 "Cadastrar como meu";
`/ai-center` com `studio-sem-ficha`, `<select>` de 1 opção e botão
"Carregar Ficha" **desabilitado**. Capturas:
`/home/user/onda46-producao-cad.png`, `/home/user/onda46-producao-prototypes.png`.

Banco re-medido, sem mudança: view `stock_reservation_aging` **`200 []`** e as
4 funções **`401 42501`**.

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
| 46   | `cad-so-vitrine` / `prototipo-so-vitrine`       | **1**       | ✅      |

**Conclusão:** **repo, ar e banco estão na Onda 46** — nenhuma camada atrasada.
A vitrine de CAD/Pilotagem deixou de apurar número também no ar, o bloqueio de
sync/lacre está publicado, os avisos têm CTA e o feedback de toast finalmente
aparece para o usuário. `DEV000006` caiu de 27× para **20×** e o que resta é
vitrine explicitamente rotulada. A frase "Consumo e liberação são automáticos"
deixou de ser falsa em produção desde a 24ª medição. O que ainda **não** foi
provado: o fluxo autenticado de ponta a ponta — sem
`PLM_E2E_EMAIL`/`PLM_E2E_PASSWORD` os dois specs de e2e seguem `skipped`.

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
| ~~Ar uma onda atrás do repo (46)~~ **zerado**   | ~~republicar~~ concluído na 26ª medição (`index-CeAMfFot.js`)              | dono do projeto |
| E2E autenticado nunca roda                      | fornecer `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD`                              | dono do projeto |
| Cancelar reservas presas                        | só **depois** da migration, usando `stock_reservation_aging.dias_ativa`    | dono do projeto |

Publicação das Ondas 44/45/46 e SQL concluídos; as três camadas alinhadas. Resta uma ação que não é código: dar a credencial de e2e (e, se houver, revisar reservas presas com `stock_reservation_aging.dias_ativa`).

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
