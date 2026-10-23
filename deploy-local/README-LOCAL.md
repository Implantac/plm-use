# PLM USE — espelho local (Docker + Postgres), instalação em 1 clique

## O que é isto

Um pacote que sobe o sistema **inteiro na sua máquina** — banco Postgres com o
schema real do projeto (as 67 migrations do histórico Lovable + as drizzle,
reexecutadas na ordem), autenticação (GoTrue), API REST (PostgREST), storage de
anexos e o app (build de produção SSR) atrás de um único endereço:
`http://localhost:18080`.

## Pré-requisitos (única instalação manual)

1. **Docker Desktop** para Windows, com WSL2 habilitado (padrão da instalação),
   e **rodando** antes do clique (ícone de baleia no tray).
2. Porta **18080 livre** (se conflitar, edite `APP_PORT` **e** `APP_URL` em `deploy-local/.env`
   — o app e as URLs acompanham automaticamente).
3. ~2 GB livres (imagens + volume do banco).

## Instalação

Extraia o pacote e dê **duplo clique em `deploy-local/plm-local.bat`**. Ele:

- monta a stack (`docker compose up -d --build` — o build do frontend roda
  dentro do contêiner; **não precisa de Node no host**);
- espera o banco replayar migrations e a API responder;
- cria o usuário `admin@plm.local` / `PlmLocal!2026`;
- roda as sementes de demonstração já aceitas em produção (catálogo Karilu com
  os 5 produtos, dados-base, pedidos de exemplo, configurações+rotas PCP);
- abre o navegador.

Primeira execução: 5–15 min (download ~1 GB + build). Reexecuções: ~15 s.
Rodar o `.bat` de novo depois de atualizar o código = rebuild + rerun das
sementes (todas idempotentes — nada é duplicado nem pisado).

## Acesso

- App: `http://localhost:18080` · login `admin@plm.local` senha `PlmLocal!2026`
- O seed `KARILU-BASE` concede admin a todos os usuários locais; cadastro
  próprio na tela de login funciona (auto-confirm).
- Banco: `docker compose -f deploy-local/docker-compose.yml exec db psql -U postgres`
- Logs: `... logs -f db` (replay de migrations roda ali no primeiro boot)

## Utilitários

| Arquivo               | Faz                                                  |
| --------------------- | ---------------------------------------------------- |
| `plm-parar.bat`       | derruba a stack, **mantém** os dados                 |
| `plm-zerar-dados.bat` | derruba e **apaga** os volumes (próximo boot = zero) |

## Deu ruim? Um clique de diagnóstico

Rode **`plm-status.bat`** (nesta pasta): ele mostra Docker, contêineres, porta,
HTTP e os logs finais de `db`/`gateway`/`web` — copie a janela inteira e mande
no chat. `ERR_CONNECTION_REFUSED` na porta = a stack está parada: rode o
`plm-local.bat` (o `plm-zerar-dados.bat` agora a re-sobe sozinho no final).

## Se o `db` nascer "unhealthy" (corrigido em 23/10)

Na primeira versão o bootstrap exigia que **todas** as migrations corressem
antes do GoTrue subir — mas ~75 delas fazem FK para `auth.users`, que só
existe depois que o GoTrue cria o schema canônico. Agora o initdb roda em
**duas fases**: o que depende de `auth.*`/`storage.*` é adiado (tudo-ou-nada,
zero estado parcial) e o `.bat` reaplica essa lista após a stack ficar sadia
(passos `[2/6]` e `[3/6]`). Se viu isso na tela, basta: `plm-parar.bat`,
extrair o zip novo por cima, e `plm-local.bat` de novo.
**Mudou o initdb? Use o `plm-zerar-dados.bat`** (o replay só roda com o
volume vazio; o `02_finish.sh` sozinho cuida de instalações já iniciadas).

## Limitações conhecidas (espelho local, honestas)

- **Realtime**: o serviço de realtime do Supabase não está no pacote. O painel
  de comentários funciona, só não atualiza ao vivo entre abas.
- **IA**: recursos que chamam a API do Lovable ficam inertes (sem
  `LOVABLE_API_KEY` local) — tudo o mais opera.
- **Crons** (ABC/sync agendado): só disparam se você chamar os endpoints com o
  secret do `.env` do repo.
- As chaves JWT deste pacote são **consts de demonstração localhost** (o
  segredo está no `.env` do próprio deploy-local) — não reutilize em lugar
  nenhum que exista fora da sua máquina.

## Relação com o Lovable (importante)

Este pacote é um **espelho de desenvolvimento/demonstração**. A publicação do
sistema continua sendo do Lovable via push na `main` do GitHub; nada aqui
escreve em Lovable ou produção. Migrations novas que você criar aqui só valem
para o espelho — para o mundo real, o caminho continua sendo o SQL em
`docs/producao/` + aplicação pelo editor do Lovable.
