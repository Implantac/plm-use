# OPERAÇÃO — o que só acontece no painel do Lovable

Para o dono do produto. Nenhuma linha daqui exige terminal ou git: tudo é clique
no editor do Lovable (ou no GitHub, quando dito). O código chega sozinho até a
`main` via push; o que **não** é automático está neste arquivo.

## O ciclo de uma entrega

1. Commit entra na `main` do GitHub (`Implantac/plm-use`) → CI roda os gates
   (prettier repo, eslint, tsc, vitest, build). Só confie em entrega com o
   check verde na aba Actions.
2. O Lovable sincroniza o repo automaticamente, **mas publicar é manual**:
   editor → **Publish**. Sem esse clique, o mundo continua no bundle antigo —
   os commits "existem" mas ninguém os vê.
3. Conferir se pegou: abrir o app em `/audit` → card **"Mãos do operador"**.
   As três linhas dele são sondas vivas feitas pelo SEU navegador contra o
   deploy real (não texto fixo): publicação, banco do catálogo e segredo do
   cron. Ficaram verdes? Acabou. Estão âmbar? O card diz qual clique falta.
   Botão ↻ re-sonda sem recarregar a página.

## Aplicar uma migration (SQL no banco)

O banco do Cloud NÃO tem dashboard supabase.com — o SQL se cola no próprio
editor do Lovable:

- **More → Cloud → SQL editor**, colar, **Run** (⌘/Ctrl+Enter).
- Comentários em `.sql` são apenas `--` (o `//` quebra o executor; um teste de
  guarda no repo vigia isso).
- Arquivos versionados vivem em `supabase/migrations/` — nunca edite um já
  aplicado; migração nova = arquivo novo com timestamp.

**Pendência atual:** `20261014220000_persist_materials.sql` — a Biblioteca de
Materiais funciona por dispositivo até esse SQL ser aplicado; depois, vira
catálogo compartilhado com realtime. Atalho: o próprio `/audit` tem o botão
**"Copiar SQL do catálogo"**, que copia exatamente o arquivo do repo (nada de
reDigitar). Aplicou → a linha do card vira verde na próxima visita.

## Segredo do cron (curva ABC)

O endpoint `/api/public/cron/abc-classify` responde **503 enquanto não existir
segredo** (fail-closed de propósito) e **401 quando o segredo existe** e a
assinatura HMAC não bate. Para ativar o agendamento:

1. Gerar segredo: `openssl rand -hex 32` (ou qualquer string longa aleatória).
2. Colar em **Settings → Environment Variables** como `ABC_CRON_SECRET`.
3. Alinhar o mesmo valor na linha correspondente de `app_cron_config` (SQL
   editor) — é de lá que o pg_cron assina as chamadas.
4. Conferir: card "Mãos do operador" → linha Cron da curva ABC verde.
   (`LAUNCH_CRON_SECRET` já está configurado — verificado por sonda em 15/10.)

## Se algo parecer "não publicado"

| Sintoma                                      | Causa provável                               | O que fazer                                                        |
| -------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| Função nova não aparece, mas o CI está verde | Publish não clicado                          | Editor → Publish; reabrir o app (hard refresh)                     |
| Card "Catálogo no banco" âmbar               | SQL do materials não aplicado                | Seção "Aplicar uma migration" acima                                |
| Card "Cron" âmbar                            | `ABC_CRON_SECRET` ausente                    | Seção de segredo acima                                             |
| Tela quebrou logo após publish               | Sync do bot + seu push divergiram            | CI da main conta: vermelha → corrigir antes de republicar          |
| `/audit` diz "vitrine"/"parcial" na sua tela | Está certo — aquela área é demo por contrato | O painel não mente para vender; ver `revisao-funcional-plm-use.md` |

## O que NÃO fazer

- Force-push ou reescrever a `main` (quebra o sync bidirecional com o Lovable).
- Renomear/transferir o repo GitHub conectado.
- Editar `src/routeTree.gen.ts`, `client.ts` ou `types.ts` à mão (são gerados).
- Colar segredo em migration/seed — segredo vive em Environment Variables /
  `app_cron_config`.
