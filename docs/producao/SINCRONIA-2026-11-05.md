# Sincronia repo × ar × banco — 27ª medição, 06/11/2026

Este documento é uma **medição**, não um plano. Cada linha foi obtida executando
o comando indicado no fim. Se algo divergir do que você vê na tela, refaça a
medição antes de discordar — e lembre que **publicar o app não aplica SQL** e que
**um `ok prossiga` não publica o app**.

---

## 1. O quadro

| Camada                                         | Estado medido                      | Como foi medido                      |
| ---------------------------------------------- | ---------------------------------- | ------------------------------------ |
| **Repositório** (`Implantac/plm-use`, `main`)  | **Onda 47** — `48f05c6` + docs 27ª | `git log` / `git ls-remote`          |
| **App publicado** (`plmuse.lovable.app`)       | **Onda 46** — `index-CeAMfFot.js`  | marcadores no bundle (tabela abaixo) |
| **Banco de produção** (`njmniwsqwohmigroswnl`) | **migrações 21 e 24 APLICADAS**    | `200` na view · `42501` nas funções  |

**O que mudou desde a 26ª medição:** o repo avançou **uma onda** (Onda 47,
`48f05c6` + docs da 27ª medição), o ar **não** avançou e o banco **não** precisava avançar. Não houve
marco de publicação informado pelo dono; portanto a medição do ar foi refeita e
confirma `index-CeAMfFot.js` com todos os marcadores da Onda 46 e **zero**
marcadores da 47. **Repo e ar estão desalinhados em uma onda — por publicação
pendente, não por defeito de código.**

A Onda 47 fechou o último caminho da vitrine até um documento: os 2 pedidos
`demo: true` da fila de custos exibiam badge "Demonstração" mas mantinham
"Ficha Cega A4" ativa, e `buildBlindOrderProductionSheetHtml()` imprimia CNPJ,
referência e grade de um cliente que não existe. Agora há
`podeEmitirFichaCega()`, gate antes de imprimir e o aviso com saída
`ficha-cega-bloqueada` ("clone para emitir"). No mesmo fluxo, `/orders` foi de
**15 inputs sem rótulo acessível para 0**, os diálogos de pedido/cliente ganharam
`id`/`htmlFor`/`aria-required`/`autoComplete`, e o glossário da Onda 45 saiu do
dashboard para 4 telas internas (33 termos). Detalhes e capturas em
`ONDA-47-DOCUMENTO-NAO-NASCE-DA-VITRINE.md`.

Validação local com **cliques reais** (Chromium, sessão simulada com papel
`admin`, sem escrita no banco): clicar no aviso da vitrine abriu **0 popups**;
clicar "Clonar Pedido" gerou `PD-2026-803` e **1** botão "Ficha Cega A4"; clicar
nesse botão abriu **1 popup** com `FICHA DE PRODUÇÃO DO PEDIDO · CEGA DE CUSTO E
PREÇO`. Os toasts de validação (`Selecione o cliente.`, `Informe o nome do
cliente.`) continuam aparecendo. **Isto é prova local, não prova de produção** —
a produção segue na Onda 46.

Banco re-medido, sem mudança: view `stock_reservation_aging` **`200 []`** e as
4 funções **`401 42501`**. `APLICAR-ONDA-21-24.sql` segue intacto, SHA-256
`382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f`.

---

## 2. App publicado — qual onda está no ar

Método: baixar `/`, extrair `assets/index-*.js`, seguir os imports em BFS por
todos os chunks e contar **texto de tela** (nunca comentário) em todo o bundle.

- entry medido na 27ª: **`index-CeAMfFot.js`** (histórico recente:
  `index-CPZSdWEg.js` = Ondas 44/45, 23ª–25ª; `index-CeAMfFot.js` = Onda 46,
  26ª e 27ª)
- **226 chunks** visitados nesta varredura, ~3,68 MB de JS lidos (a 26ª havia
  contado 223 com uma fila de BFS ligeiramente menor; a diferença são 3 chunks
  lazy, não mudança de bundle)
- `DEV000006` **20×** — vitrine declarada (`demo: true`), sem literais
  executáveis nos formulários

| Onda   | Marcador procurado                                    | Ocorrências | Leitura          |
| ------ | ----------------------------------------------------- | ----------- | ---------------- |
| 24     | `Dar baixa do material`                               | 1           | ✅               |
| 25     | `Documento com dados de demonstra`                    | 2           | ✅               |
| 27     | `Custeio incompleto`                                  | 1           | ✅               |
| 27     | `Composição não informada`                            | 5           | ✅               |
| 28     | `sem NCM`                                             | 5           | ✅               |
| 29     | `pedidosSemFicha`                                     | 4           | ✅               |
| 29     | `rfq-sem-ficha`                                       | 1           | ✅               |
| 29     | `showroom-sem-ficha`                                  | 1           | ✅               |
| 30     | `DRE não apurável`                                    | 4           | ✅               |
| 30     | `omnichannel-sem-ficha`                               | 1           | ✅               |
| 30     | `kanban-sem-ficha`                                    | 1           | ✅               |
| 31     | `cockpit-sem-ficha`                                   | 1           | ✅               |
| 31     | `gemeo-sem-ficha`                                     | 1           | ✅               |
| 31     | `os-sem-ficha`                                        | 2           | ✅               |
| 32     | `Passaporte ESG`                                      | 2           | ✅               |
| 33     | `país de origem declarado`                            | 1           | ✅               |
| 33     | `composição ABNT declarada`                           | 1           | ✅               |
| 34     | `Risco CAD não declarado`                             | 1           | ✅               |
| 34     | `Plano de corte não apurável`                         | 3           | ✅               |
| 35     | `A referência de origem não tem ficha salva`          | 1           | ✅               |
| 36     | `Fichas sem engenharia`                               | 1           | ✅               |
| 36     | `sem engenharia custeada`                             | 3           | ✅               |
| 37     | `reserva-migracao-pendente`                           | 1           | ✅               |
| 38     | `gtm-so-vitrine` / `sop-sem-drops`                    | 1           | ✅               |
| 39     | `sop-sem-pedidos`                                     | **1**       | ✅               |
| 40     | `sop-sem-faccao` / `apuravelFaccao`                   | **1**       | ✅               |
| 41     | `lgpd-so-vitrine` / `briefing-so-vitrine`             | **1**       | ✅               |
| 42     | `supplier-so-vitrine` / `scoreboard-so-vitrine`       | **1**       | ✅               |
| 43     | `comece-por-aqui` / `progresso-onboarding`            | **1**       | ✅               |
| 44     | `cta-supplier-so-vitrine` / `CtaProximoPasso`         | **1**       | ✅               |
| 45     | `glossario-termos` / `Ferramentas do produto`         | **1**       | ✅               |
| 46     | `cad-so-vitrine` / `prototipo-so-vitrine`             | **1**       | ✅               |
| 46     | `studio-sem-ficha` / `Cadastrar meu molde`            | **1**       | ✅               |
| 46     | `toaster group`                                       | **1**       | ✅               |
| **47** | `ficha-cega-bloqueada`                                | **0**       | ⏳ não publicado |
| **47** | `glossario-orders` / `glossario-audit`                | **0**       | ⏳ não publicado |
| **47** | `glossario-route-engineering` / `glossario-suppliers` | **0**       | ⏳ não publicado |
| **47** | `novo-pedido-cliente` / `novo-cliente-nome`           | **0**       | ⏳ não publicado |
| **47** | `podeEmitirFichaCega`                                 | **0**       | ⏳ não publicado |

**Conclusão:** o **ar é a Onda 46** e o **repo é a Onda 47**. A vitrine de
CAD/Pilotagem já não apura número no ar, o bloqueio de sync/lacre está
publicado e o toast aparece. O que **ainda não está no ar** é o bloqueio da
Ficha Cega, os rótulos de acessibilidade e os 4 glossários internos. A frase
"Consumo e liberação são automáticos" deixou de ser falsa em produção desde a
24ª medição. O que ainda **não** foi provado: o fluxo autenticado de ponta a
ponta — sem `PLM_E2E_EMAIL`/`PLM_E2E_PASSWORD` os dois specs de e2e seguem
`skipped`.

> Histórico da 26ª medição (para comparação): BFS `index-CeAMfFot.js`/223
> chunks, `cad-so-vitrine`, `prototipo-so-vitrine`, `studio-sem-ficha`,
> `cta-cad-sem-molde`, `cta-prototipo-sem-piloto`, `"Cadastrar meu molde"`,
> `"Cadastrar como meu"`, `"Sync indisponível"`, `"Sem foto do piloto"`,
> `"toaster group"` = **1**, `"Demonstração · não apurado"` = **2**. Browser
> contra produção confirmou `/cad` e `/prototypes` com KPIs `—`, 2 avisos/CTAs,
> 2 syncs bloqueados, formulário zerado e toast de validação; `/ai-center` com
> `studio-sem-ficha`, 1 opção e botão desabilitado. Capturas:
> `/home/user/onda46-producao-cad.png`,
> `/home/user/onda46-producao-prototypes.png`.

---

## 3. Banco de produção — aplicado (24ª medição)

`APLICAR-ONDA-21-24.sql` (473 linhas, 163 asserções exit 0) foi aplicado no SQL
Editor do Lovable. Resultado: **view criada, 6 funções, 2 triggers instalados**,
com `GRANT EXECUTE` apenas a `authenticated`/`service_role`.

| Sonda (sem sessão, 27ª medição)            | Resposta     | Interpretação                                |
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
- **Se a Onda 47 funciona em produção.** Ela ainda não foi publicada. A prova
  com cliques reais desta medição foi **local** (`127.0.0.1:8080`, papel
  `admin` simulado); não é evidência de comportamento do domínio publicado.
- **Se os botões novos da migração funcionam em produção.** Exige login real.

---

## 5. O que destrava cada lacuna

| Lacuna                                          | Ação                                                                       | Quem faz        |
| ----------------------------------------------- | -------------------------------------------------------------------------- | --------------- |
| ~~Ar duas ondas atrás do repo~~ **zerado**      | ~~republicar~~ concluído na 23ª medição (`index-CPZSdWEg.js`)              | dono do projeto |
| ~~Banco sem as migrações 21 e 24~~ **aplicado** | ~~colar SQL~~ concluído na 24ª medição: view `200 []`, funções `401 42501` | dono do projeto |
| ~~Ar uma onda atrás do repo (46)~~ **zerado**   | ~~republicar~~ concluído na 26ª medição (`index-CeAMfFot.js`)              | dono do projeto |
| **Ar uma onda atrás do repo (47)**              | **publicar a Onda 47** e refazer BFS + cliques em produção (28ª medição)   | dono do projeto |
| E2E autenticado nunca roda                      | fornecer `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD`                              | dono do projeto |
| Cancelar reservas presas                        | só **depois** da migration, usando `stock_reservation_aging.dias_ativa`    | dono do projeto |

SQL aplicado, Ondas 44/45/46 publicadas, Onda 47 fechada no repo. Restam duas
ações que não são código: **publicar a Onda 47** e dar a credencial de e2e (e,
se houver, revisar reservas presas com `stock_reservation_aging.dias_ativa`).

---

## 6. Como refazer esta medição

```bash
# 1. repositório
git ls-remote https://github.com/Implantac/plm-use.git main
git ls-tree -r HEAD | wc -l

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
for m in ['cad-so-vitrine','glossario-termos','ficha-cega-bloqueada','glossario-orders',
          'glossario-audit','glossario-route-engineering','glossario-suppliers',
          'novo-pedido-cliente','podeEmitirFichaCega','DEV000006']:
    print(f'  {m:30} {t.count(m)}')
PY

# 3. banco — a chave publishable está no bundle; a URL é a do projeto
KEY=sb_publishable_...   # extrair do JS acima (ou de .env)
URL=https://njmniwsqwohmigroswnl.supabase.co
curl -s -H "apikey: $KEY" "$URL/rest/v1/stock_reservation_aging?select=*&limit=1"
curl -s -X POST -H "apikey: $KEY" -H "Content-Type: application/json" \
     -d '{"_order_id":"00000000-0000-0000-0000-000000000000"}' \
     "$URL/rest/v1/rpc/op_reserved_materials"
```

`PGRST205` na view e `PGRST202` nas RPCs = migrações 21/24 fora do ar.
`200 []` na view e `401 42501` nas RPCs = migrações aplicadas e grants corretos.
Marcadores da 47 diferentes de `0` = Onda 47 publicada.
