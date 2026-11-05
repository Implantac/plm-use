# Sincronia repo × ar × banco — medido em 05/11/2026

Este documento substitui a planilha que vivia solta em `/home/user/entrega/`. Ele é
uma **medição**, não um plano: cada linha da tabela foi obtida executando o
comando indicado no fim do arquivo. Se algo aqui divergir do que você vê na tela,
o número deste arquivo é o que foi medido — refaça a medição antes de discordar.

---

## 1. O quadro

| Camada                                         | Estado medido                          | Como foi medido                      |
| ---------------------------------------------- | -------------------------------------- | ------------------------------------ |
| **Repositório** (`Implantac/plm-use`, `main`)  | **Onda 25** + Onda 26 — `908fb60`      | `git ls-remote` / API de commits     |
| **App publicado** (`plmuse.lovable.app`)       | **Onda 25** (republicado em 05/11)     | marcadores no bundle (tabela abaixo) |
| **Banco de produção** (`njmniwsqwohmigroswnl`) | **sem as migrações das Ondas 21 e 24** | `404` na view e na RPC novas         |

Ou seja: **ar e repositório estão alinhados** (Onda 25, medição de 05/11 12h UTC),
mas o **banco continua sem as migrações 21 e 24**. O banco é o único elo atrasado —
e é o que faz a automação existir.

## 2. App publicado — qual onda está no ar

Medição feita baixando o bundle a partir de `/login` e seguindo os imports
relativos entre chunks (**220 chunks**; a medição da Onda 19 tinha 215). O entry
mudou de `index-s84f6ian.js` para `index-CQexDK2k.js` — é build novo, não cache.

| Onda | Marcador procurado (texto de tela, não comentário) | Ocorrências |
| ---- | -------------------------------------------------- | ----------- |
| 19   | `Demonstração — não usar para decidir`             | ✅ 1        |
| 20   | `Ficha de referência`                              | ✅ 1        |
| 21   | `Consumo e liberação são automáticos`              | ✅ 1        |
| 22   | `Ficha criada do modelo padrão`                    | ✅ 1        |
| 23   | `vincular a estampa a uma ficha técnica`           | ✅ 1        |
| 23   | `enviar a cartela de cores para uma ficha`         | ✅ 1        |
| 24   | `Dar baixa do material`                            | ❌ 0        |
| 24   | `op_reserved_materials`                            | ❌ 0        |
| 25   | `Documento com dados de demonstração`              | ❌ 0        |

**Conclusão (05/11, 2ª medição):** o build publicado agora traz os marcadores até a
Onda 25. O `entry` mudou de `index-CQexDK2k.js` para `index-BCX5Of78.js`.

## 3. Banco de produção — o que falta

Consultado pela chave **publishable** que vem no próprio bundle do app (a mesma que
o navegador usa), em `https://njmniwsqwohmigroswnl.supabase.co`:

| Objeto                         | Esperado por | Resposta                                    |
| ------------------------------ | ------------ | ------------------------------------------- |
| view `stock_reservation_aging` | Onda 21      | **404**                                     |
| RPC `op_reserved_materials`    | Onda 24      | **404** (`PGRST202`: função não encontrada) |

Logo, `20261104120000_stock_reservation_lifecycle.sql` e
`20261104200000_op_material_consumption.sql` **não foram aplicadas**. As migrações
das Ondas 0–20 e das 22/23 (que são de UI) não dependem disto.

### A consequência que precisa ser dita

A Onda 21 **está no ar** (tela de reservas) e ela exibe literalmente:

> "Consumo e liberação são automáticos: a saída de estoque consome a reserva e a
> OP concluída ou cancelada libera o que sobrar."

Em produção essa frase é **falsa**: o trigger que consumiria a reserva não existe
no banco. Antes da republicação a tela antiga não prometia nada; agora ela promete
uma automação que não roda. Publicar a UI antes da migração transformou um defeito
silencioso em uma promessa falsa na cara do operador.

Enquanto `db push` não acontecer, o ciclo da reserva continua exatamente como
descrito na Onda 21: reserva criada em `'ativa'` e ninguém a encerra.

## 4. O que **não** foi medido (e por quê)

- **Volume de dados em produção.** As tabelas respondem `200` com `[]` para a chave
  publishable. Isso é o comportamento esperado com RLS ligada (todas as tabelas
  testadas devolveram `[]` para `anon`), então **é indistinguível de tabela vazia**.
  Não afirmo nem "tem dados" nem "está vazio".
- **Se há login funcionando.** Exige credencial; o E2E autenticado segue em `skipped`.
- **Se o botão novo de baixa funciona em produção.** Depende da migração que falta.

## 5. O que destrava cada lacuna

| Lacuna                             | Ação                                                                        | Quem faz        |
| ---------------------------------- | --------------------------------------------------------------------------- | --------------- |
| ~~Ar atrás do repo~~               | ✅ resolvido: republicado na Onda 25 (05/11)                                | —               |
| **Banco sem as migrações 21 e 24** | aplicar `docs/producao/APLICAR-ONDA-21-24.sql` no SQL editor (ou `db push`) | dono do projeto |
| E2E autenticado nunca roda         | fornecer credencial de teste (`PLM_E2E_EMAIL`/`PASSWORD`)                   | dono do projeto |

Nenhuma das duas restantes é código: uma é colar um arquivo (já pronto e testado), a outra é uma credencial.

## 6. Como refazer esta medição

```bash
# 1. repositório
git ls-remote https://github.com/Implantac/plm-use.git main

# 2. ar — baixa o bundle e procura os marcadores (script do repo)
bash scripts/check-sync.sh

# 3. banco — a chave publishable está no bundle; a URL é a do projeto
KEY=$(grep -ahoE 'sb_publishable_[A-Za-z0-9_-]{10,}' /tmp/live6/*.js | head -1)
URL=https://njmniwsqwohmigroswnl.supabase.co
curl -s -o /dev/null -w '%{http_code}\n' -H "apikey: $KEY" "$URL/rest/v1/stock_reservation_aging?select=*&limit=1"
curl -s -X POST -H "apikey: $KEY" -H "Content-Type: application/json" \
     -d '{"_order_id":"00000000-0000-0000-0000-000000000000"}' \
     "$URL/rest/v1/rpc/op_reserved_materials"
```

`404` em ambas = as migrações das Ondas 21 e 24 continuam fora do ar.
