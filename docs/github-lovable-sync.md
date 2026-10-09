# Contrato GitHub ↔ Lovable (fonte da verdade = `main` no GitHub)

> **Decisão do dono (09/10/2026):** o sistema **permanece no Lovable** — é lá
> que a interface roda e é para lá que todo commit deve refletir. Um plano de
> desacoplamento chegou a ser rascunhado e foi **retirado**: as seções
> "migrar para fora" não são TODO, são explicitly _não-fazer_. Este doc define
> como trabalhar sem quebrar o elo.

## Como o elo funciona (estado real deste repo)

O projeto está conectado ao GitHub com **sync bidirecional na branch `main`**
(o histórico tem 1100+ commits de `gpt-engineer-app[bot]`, o bot do Lovable).
Na prática:

| Ação                                      | Efeito                                                                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Editar no Lovable                         | bot commita em `main` → push no GitHub                                                                                 |
| **Fazer push em `main` no GitHub**        | **Lovable puxa o commit, o editor reflete e o app é redeployado** — é por aqui que os lotes desta sessão chegaram à UI |
| Push em branch que não é `main`           | invisível ao Lovable até ser merged na `main` (útil para experimentar sem tocar na UI)                                 |
| Forçar push (rewriting history) em `main` | **quebra o sync** — nunca. Rebase/merge normal com `git pull` antes do push                                            |
| Renomear/mover/deletar o repo             | quebra o sync sem recuperação automática                                                                               |

Ou seja: `git push origin main` **é** o "deploy para o Lovable". Nada precisa
ser reconfigurado — precisa ser respeitado.

## Regras de convivência (o elo é frágil exatamente aqui)

1. **Uma mão por vez.** Evitar editar o mesmo arquivo no Lovable e no GitHub
   ao mesmo tempo. Sequência segura: terminar o lote no GitHub → deixar o
   Lovable puxar → só então mexer no editor (e vice-versa).
2. **`main` é anexável, não reescrita.** Só fast-forward. Antes de push:
   `git pull --rebase origin main` (os commits do bot chegam lá). Conflito?
   resolve no GitHub, commita — o Lovable puxa a resolução.
3. **Nunca renomear/transferir o repo** `Implantac/plm-use` enquanto conectado.
4. **Dependências:** quem adiciona libs é o fluxo do Lovable (bun → atualiza
   `package-lock.json`). Se um push nosso mudar `package.json` sem o lock, a
   CI tolera via `npm ci || npm install` — mas o correto é commitar os dois
   juntos (visto nesta sessão: lock regenerado com o patch).
5. **Arquivos gerados não se editam** (`src/routeTree.gen.ts`,
   `src/integrations/supabase/{client,types}.ts`): o import do Lovable e os
   codegen da plataforma reescrevem essas áreas; editar à mão convida conflito.
6. **CI do GitHub é portão, não deploy.** O `quality` roda a cada commit
   (incluindo os do bot — se o bot quebrar lint/tipos, o vermelho é sinal para
   o próximo prompt no Lovable consertar). O `e2e-staging` é opt-in.

## O que o Lovable continua fornecendo (e por que fica)

- **Env no runtime:** o build do Lovable injeta `VITE_SUPABASE_*` (Cloud); os
  segredos de servidor ficam nos Secrets da plataforma. O `.env` local
  (gitignored) serve para clonar fora; `.env.example` é o contrato.
- **AI gateway** (`ai.gateway.lovable.dev`, `LOVABLE_API_KEY`): usado por
  `generate-image` e `ai-agents`. Permanece como está.
- **OAuth** via `@lovable.dev/cloud-auth-js` (`login.tsx`): permanece; o
  login por e-mail/senha já é Supabase puro.
- **Preview host broker** (`previewAuthStorage`) e error reporting
  (`window.__lovableEvents`): condicionados por host — no-op fora do Lovable,
  úteis dentro. Intocados.
- **Build tooling:** `@lovable.dev/vite-tanstack-config` (preset nitro
  cloudflare). Permanece — é o que a plataforma espera.

Nada disso é dívida a pagar hoje; são os serviços que o piloto usa. Se um dia
o contexto mudar (preço/ToS/incidente no gateway), o histórico de decisões
desta sessão (README + `TODO.md` + relatórios em `/home/user` na época) documenta
que cada ponto tinha rota de saída conhecida — sem custo nenhum hoje.

## Loop de trabalho recomendado (humano ou agente no sandbox)

```bash
git fetch origin                       # traz commits do bot
git rebase origin/main                 # nosso lote em cima do estado atual
# …código + gates (tsc / vitest / eslint / prettier)…
git push origin main                   # → Lovable puxa e redeploya
```

Se o push for rejeitado (bot commitou no meio): repetir `fetch` + `rebase`.
Push **nunca** com `--force`.
