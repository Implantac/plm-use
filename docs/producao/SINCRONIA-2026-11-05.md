# Sincronia repo × ar × banco — 29ª medição, 06/11/2026

Este documento é uma **medição**, não um plano. Cada linha foi obtida executando
o comando indicado no fim. Se algo divergir do que você vê na tela, refaça a
medição antes de discordar — e lembre que **publicar o app não aplica SQL** e
que **um marco relatado pelo dono precisa ser medido antes de virar fato**.

---

## 1. O quadro (29ª medição, após fechar a Onda 48)

| Camada                                         | Estado medido                      | Como foi medido                     |
| ---------------------------------------------- | ---------------------------------- | ----------------------------------- |
| **Repositório** (`Implantac/plm-use`, `main`)  | **Onda 48** — `5af3964` + docs 29ª | `git log` / `git ls-remote`         |
| **App publicado** (`plmuse.lovable.app`)       | **Onda 47** — `index-CdXaXBJP.js`  | marcadores no bundle (seção 2)      |
| **Banco de produção** (`njmniwsqwohmigroswnl`) | **migrações 21 e 24 APLICADAS**    | `200` na view · `42501` nas funções |

O repo avançou **uma onda** (Onda 48), o ar **não** avançou e o banco **não
precisava** avançar. Não houve novo marco de publicação depois da 28ª: a
medição do ar foi refeita e confirma `index-CdXaXBJP.js` com os marcadores da
Onda 47 e **zero** marcadores da 48. **Repo e ar desalinhados em uma onda —
por publicação pendente, não por defeito de código.**

---

## 2. As duas medições deste dia

### 28ª — o "tudo publicado" do dono foi confirmado

O dono reportou publicação; a medição **não confirmou cegamente**:

- entry saiu de `index-CeAMfFot.js` (Onda 46) para **`index-CdXaXBJP.js`**
  (Onda 47), **227 chunks**, ~3,69 MB de JS; `index-CeAMfFot.js` = **0**.
- `ficha-cega-bloqueada`, `glossario-orders`, `glossario-audit`,
  `glossario-route-engineering`, `glossario-suppliers`, `Ficha Cega indispon` =
  **1** cada; `novo-pedido-cliente` / `novo-cliente-nome` = **2**;
  `DEV000006` **20×** (vitrine declarada, sem literais executáveis).
- **Cliques reais contra produção** (Chromium, sessão local, papel `admin`
  simulado): `/orders` com 18 inputs e **0 sem rótulo**, **2**
  `ficha-cega-bloqueada`, **0** botões "Ficha Cega A4"; clique no aviso →
  **0 popups**; "Clonar Pedido" → `PD-2026-803` + **1** botão; clique →
  **1 popup** com `FICHA DE PRODUÇÃO DO PEDIDO · CEGA DE CUSTO E PREÇO`.
  "Novo pedido": 6 campos com nome acessível, 1 `aria-required`, toast
  `Selecione o cliente.`. Glossários `/audit` (18), `/route-engineering` (6),
  `/suppliers` (10) colapsados, abrindo com 1 clique.
- Banco: view `200 []`, 4 funções `401 42501`. **Repo, ar e banco alinhados
  na Onda 47.**

Capturas: `/home/user/onda48-producao-orders.png`,
`onda48-producao-dialogo.png`, `onda48-producao-audit.png`.

### 29ª — a Onda 48 fechou no repo, o ar segue na 47

Varredura de **44 rotas** e teste de **16 botões emissores de documento** com
clique real em produção revelaram dois emissores ainda nascendo da vitrine:

| Tela              | ANTES (produção)                                                                                                                                                           | DEPOIS (repo, browser local)                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/marketing`      | 3 campanhas `demo: true` com "Media Kit A4" ativo (e no "Visualizar"); A4 com R$ 42.000 de mídia, R$ 18.500 de produção, R$ 218.400 de receita, 38.400 cliques, ROAS 5,20x | 3 `media-kit-bloqueado`, 0 botões, 0 popups; editar promove → 1 botão → 1 popup                                             |
| `/collection-map` | KPIs 6 modelos / 2.985 peças / R$ 1.233.665 / 77%; A4 e `line-sheet-verão-25.csv` com os mesmos números                                                                    | KPIs `—` + aviso/CTA, `line-sheet-bloqueado`, 0 botões, 0 apuráveis; ficha `CR27-101` salva → 1 apurável, A4/CSV só com ela |

Correção: `podeEmitirMediaKit()` (gate nos dois caminhos de UI),
`linhasApuraveis()` / `podeEmitirLineSheet()` (só ficha salva entra em KPI,
CSV e A4), KPIs `—` com `CtaProximoPasso`, e nome da coleção **declarado pelo
usuário** no documento ("Coleção em cadastro" enquanto não declarado). As
funções puras `buildDropMediaKitHtml`, `buildLineSheetPrintableHtml` e
`buildLineSheetCsvPtBr` **não foram alteradas** — nenhuma asserção das Ondas
27/30/33/36/38/47 foi relaxada. Detalhes em
`ONDA-48-A-VITRINE-NAO-IMPORTA-NEM-IMPRIME.md`.

Suíte: **681/681** (673 + 8), `tsc` 0, `eslint` 0 erros, `prettier` limpo.

---

## 3. App publicado — qual onda está no ar

Método: baixar `/`, extrair `assets/index-*.js`, seguir os imports em BFS por
todos os chunks e contar **texto de tela** (nunca comentário) em todo o bundle.

- entry medido nas 28ª e 29ª: **`index-CdXaXBJP.js`** (histórico recente:
  `index-CPZSdWEg.js` = Ondas 44/45, `index-CeAMfFot.js` = Onda 46)
- **227 chunks** visitados, ~3,69 MB de JS lidos
- `DEV000006` **20×**

| Onda   | Marcador procurado                                                                             | Ocorrências | Leitura          |
| ------ | ---------------------------------------------------------------------------------------------- | ----------- | ---------------- |
| 24     | `Dar baixa do material`                                                                        | 1           | ✅               |
| 25     | `Documento com dados de demonstra`                                                             | 2           | ✅               |
| 27     | `Custeio incompleto`                                                                           | 1           | ✅               |
| 27     | `Composição não informada`                                                                     | 5           | ✅               |
| 28     | `sem NCM`                                                                                      | 5           | ✅               |
| 29     | `pedidosSemFicha`                                                                              | 4           | ✅               |
| 29     | `rfq-sem-ficha`                                                                                | 1           | ✅               |
| 29     | `showroom-sem-ficha`                                                                           | 1           | ✅               |
| 30     | `DRE não apurável`                                                                             | 4           | ✅               |
| 30     | `omnichannel-sem-ficha`                                                                        | 1           | ✅               |
| 30     | `kanban-sem-ficha`                                                                             | 1           | ✅               |
| 31     | `cockpit-sem-ficha`                                                                            | 1           | ✅               |
| 31     | `gemeo-sem-ficha`                                                                              | 1           | ✅               |
| 31     | `os-sem-ficha`                                                                                 | 2           | ✅               |
| 32     | `Passaporte ESG`                                                                               | 2           | ✅               |
| 33     | `país de origem declarado`                                                                     | 1           | ✅               |
| 33     | `composição ABNT declarada`                                                                    | 1           | ✅               |
| 34     | `Risco CAD não declarado`                                                                      | 1           | ✅               |
| 34     | `Plano de corte não apurável`                                                                  | 3           | ✅               |
| 35     | `A referência de origem não tem ficha salva`                                                   | 1           | ✅               |
| 36     | `Fichas sem engenharia`                                                                        | 1           | ✅               |
| 36     | `sem engenharia custeada`                                                                      | 3           | ✅               |
| 37     | `reserva-migracao-pendente`                                                                    | 1           | ✅               |
| 38     | `gtm-so-vitrine` / `sop-sem-drops`                                                             | 1           | ✅               |
| 39     | `sop-sem-pedidos`                                                                              | 1           | ✅               |
| 40     | `sop-sem-faccao` / `apuravelFaccao`                                                            | 1           | ✅               |
| 41     | `lgpd-so-vitrine` / `briefing-so-vitrine`                                                      | 1           | ✅               |
| 42     | `supplier-so-vitrine` / `scoreboard-so-vitrine`                                                | 1           | ✅               |
| 43     | `comece-por-aqui` / `progresso-onboarding`                                                     | 1           | ✅               |
| 44     | `cta-supplier-so-vitrine` / `CtaProximoPasso`                                                  | 1           | ✅               |
| 45     | `glossario-termos` / `Ferramentas do produto`                                                  | 1           | ✅               |
| 46     | `cad-so-vitrine` / `prototipo-so-vitrine`                                                      | 1           | ✅               |
| 46     | `studio-sem-ficha` / `Cadastrar meu molde`                                                     | 1           | ✅               |
| 46     | `toaster group`                                                                                | 1           | ✅               |
| 47     | `ficha-cega-bloqueada`                                                                         | **1**       | ✅               |
| 47     | `glossario-orders` / `glossario-audit` / `glossario-route-engineering` / `glossario-suppliers` | **1**       | ✅               |
| 47     | `novo-pedido-cliente` / `novo-cliente-nome`                                                    | **2**       | ✅               |
| **48** | `media-kit-bloqueado`                                                                          | **0**       | ⏳ não publicado |
| **48** | `colecao-so-vitrine` / `line-sheet-bloqueado`                                                  | **0**       | ⏳ não publicado |
| **48** | `cta-colecao-sem-ficha` / `Coleção em cadastro` / `Editar para emitir`                         | **0**       | ⏳ não publicado |

**Conclusão:** o **ar é a Onda 47** e o **repo é a Onda 48**. O bloqueio da
Ficha Cega, os rótulos e os 4 glossários internos já estão no ar; o que
**ainda não está** é o bloqueio do Media Kit, o `—` nos KPIs de coleção e o
nome declarado no Line Sheet. A frase "Consumo e liberação são automáticos"
deixou de ser falsa em produção desde a 24ª medição. O que ainda **não** foi
provado: o fluxo autenticado de ponta a ponta — sem
`PLM_E2E_EMAIL`/`PLM_E2E_PASSWORD` os dois specs de e2e seguem `skipped`.

---

## 4. Banco de produção — aplicado (24ª medição)

`APLICAR-ONDA-21-24.sql` (473 linhas, 163 asserções exit 0) foi aplicado no SQL
Editor do Lovable. Resultado: **view criada, 6 funções, 2 triggers instalados**,
com `GRANT EXECUTE` apenas a `authenticated`/`service_role`. SHA-256 do arquivo
`382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f`, guardado
por teste.

| Sonda (sem sessão, 29ª medição)            | Resposta     | Interpretação                                |
| ------------------------------------------ | ------------ | -------------------------------------------- |
| `GET /stock_reservation_aging?limit=1`     | **`200 []`** | view existe e é legível; sem reservas presas |
| `POST /rpc/op_reserved_materials`          | `401 42501`  | função existe, `anon` barrado                |
| `POST /rpc/record_op_material_consumption` | `401 42501`  | função existe, `anon` barrado                |
| `POST /rpc/cancel_reservations_for_ref`    | `401 42501`  | função existe, `anon` barrado                |
| `POST /rpc/stock_on_hand`                  | `401 42501`  | função existe, `anon` barrado                |

**Não confundir `401` com falha:** com a chave publicável e sem JWT de usuário,
`401 42501` é exatamente o comportamento desejado — RLS/grants funcionando. O
que encerrou foi o `PGRST205`/`PGRST202` de "objeto não encontrado".

---

## 5. O que **não** foi medido (e por quê)

- **Volume de dados em produção.** As tabelas respondem `200` com `[]` para a
  chave publishable — esperado com RLS ligada e indistinguível de tabela vazia.
- **Se há login funcionando.** Exige credencial; `e2e-autenticado` segue
  `skipped` na CI.
- **Se a Onda 48 funciona em produção.** Ainda não foi publicada. A prova com
  cliques reais da 29ª foi **local** (`127.0.0.1:8080`, papel `admin`
  simulado); não é evidência de comportamento do domínio publicado.
- **As 11 rotas com campos sem rótulo** medidas na varredura (`quality` 8,
  `launch` 5, `looks` 5, `inventory` 4, `financial` 2, `showroom` 2,
  `research` 2, `ai-agents`, `display`, `references`). Foram **identificadas**,
  não corrigidas — dívida explicitada na Onda 48.

---

## 6. O que destrava cada lacuna

| Lacuna                                          | Ação                                                                       | Quem faz        |
| ----------------------------------------------- | -------------------------------------------------------------------------- | --------------- |
| ~~Ar duas ondas atrás do repo~~ **zerado**      | ~~republicar~~ concluído na 23ª medição (`index-CPZSdWEg.js`)              | dono do projeto |
| ~~Banco sem as migrações 21 e 24~~ **aplicado** | ~~colar SQL~~ concluído na 24ª medição: view `200 []`, funções `401 42501` | dono do projeto |
| ~~Ar uma onda atrás (46)~~ **zerado**           | ~~republicar~~ concluído na 26ª medição (`index-CeAMfFot.js`)              | dono do projeto |
| ~~Ar uma onda atrás (47)~~ **zerado**           | ~~republicar~~ concluído na **28ª medição** (`index-CdXaXBJP.js`)          | dono do projeto |
| **Ar uma onda atrás do repo (48)**              | **publicar a Onda 48** e refazer BFS + cliques em produção (30ª medição)   | dono do projeto |
| E2E autenticado nunca roda                      | fornecer `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD`                              | dono do projeto |
| Cancelar reservas presas                        | só **depois** da migration, usando `stock_reservation_aging.dias_ativa`    | dono do projeto |

SQL aplicado, Ondas 44/45/46/47 publicadas, Onda 48 fechada no repo. Restam
duas ações que não são código: **publicar a Onda 48** e dar a credencial de
e2e (e, se houver, revisar reservas presas com
`stock_reservation_aging.dias_ativa`).

---

## 7. Como refazer esta medição

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
for m in ['ficha-cega-bloqueada','glossario-orders','media-kit-bloqueado','colecao-so-vitrine',
          'line-sheet-bloqueado','cta-colecao-sem-ficha','Coleção em cadastro','DEV000006']:
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
Marcadores da 48 diferentes de `0` = Onda 48 publicada.
