# Onda 20 — Ficha confiável e E2E autenticado

**Data:** 04/11/2026 · **Base:** `main` = `ccb54e6` (Onda 19)
**Objetivo:** fechar a segunda frente de "dado que parece real sem ser" —
o fallback `sheetsMap[code] ?? seedFor(code)` — e criar o primeiro teste que
exercita a aplicação **logada**.

---

## 1. O problema que sobrou da Onda 19

A Onda 19 marcou os painéis analíticos (MRP, S&OP, Seeding). Mas o padrão mais
espalhado do sistema é outro:

```ts
const doc = sheetsMap[selectedRef] ?? seedFor(selectedRef);
```

Isso aparece em **13 arquivos**. Quando o usuário ainda não salvou a ficha, a
tela cai no seed e mostra cronoanálise, plano de corte, prontidão omnichannel e
OS cega com números de exemplo — sem dizer que são exemplo. Diferente do MRP, aqui
o fallback é **legítimo** (a tela precisa de algo para renderizar), o que faltava
era **rotular**.

---

## 2. Procedência centralizada

| Arquivo                                            | O que faz                                                                                                                                                                                     |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/techsheet/provenance.ts`                  | `sheetProvenance()` → `"salva" \| "referencia"`; `resolveSheet()` devolve `{ doc, provenance }` sem duplicar a lógica do fallback; `summarizeSheets()` conta quantas fichas da tela são reais |
| `src/components/techsheet/SheetProvenanceNote.tsx` | Aviso âmbar "Ficha de referência (demonstração) · CODE — não há ficha salva", ou linha discreta "Ficha salva · CODE"                                                                          |

Aplicado onde o seed vira **decisão operacional**:

- **Engenharia de Rotas / GSD** (`/route-engineering`) — cronoanálise, Takt, Yamazumi
- **Sala de Corte & Enfesto** (`CuttingRoomPlanPanel`) — plano de mesa/folhas
- **Gate Omnichannel** (`/launch`) — Go/No-Go de prontidão

**Testes:** 5 novos cobrindo salva × referência, fallback chamado só quando
necessário e o resumo por código.

---

## 3. Primeiro E2E autenticado do projeto

`tests/e2e/fluxo-pedido.spec.py` — segue o padrão dos 6 specs existentes
(Python + Playwright, entry point único `scripts/run-e2e.sh`, que já o pega pelo
glob `tests/e2e/*.spec.py`).

| Modo                            | O que faz                                                                                                                       | Segurança                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **Somente leitura** (padrão)    | login → `/orders` sem banner de migration e sem error boundary → `/catalog`, `/planner`, `/production`, `/inventory` renderizam | pode rodar contra produção |
| **Escrita** (`PLM_E2E_WRITE=1`) | abre o diálogo de novo pedido e confirma que ele monta                                                                          | não salva nada por default |

**Sem `PLM_E2E_EMAIL`/`PLM_E2E_PASSWORD` o spec imprime SKIP e sai com código 0.**
Isso é deliberado: a CI sem segredo não fica vermelha por falta de ambiente, e o
runner não quebra na máquina de quem não tem a senha.

### Como rodar de verdade

```bash
PLM_E2E_BASE=https://plmuse.lovable.app \
PLM_E2E_EMAIL=seu.usuario@empresa.com \
PLM_E2E_PASSWORD='...' \
python3 tests/e2e/fluxo-pedido.spec.py
```

Ou na CI: **Actions → CI → Run workflow** após cadastrar os secrets
`PLM_E2E_EMAIL` e `PLM_E2E_PASSWORD` (job `e2e-autenticado`).

### O que foi provado, e o que não

| Verificação                                                                           | Como                          | Resultado            |
| ------------------------------------------------------------------------------------- | ----------------------------- | -------------------- |
| Sem credenciais → SKIP, exit 0                                                        | execução local                | ✅                   |
| Chromium sobe e navega no app publicado                                               | execução local                | ✅                   |
| Os seletores `#email` / `#password` existem no app em produção                        | execução com credencial falsa | ✅                   |
| Credencial inválida → falha limpa com `FALHA login concluiu e saiu de /login`, exit 1 | execução local                | ✅                   |
| **Login válido + navegação autenticada**                                              | precisa de credencial real    | ⏳ **não executado** |

Ou seja: a **mecânica** está provada; o **conteúdo** autenticado depende de uma
credencial que eu não tenho. É a diferença entre "o teste roda" e "o fluxo passa".

---

## 4. Estado

```
tsc          0 erros
eslint       0 erros (20 warnings preexistentes)
prettier     limpo
vitest       349/349 (+5)
smoke público 46 ok
npm audit    12 (0 críticas)
```

CI ganhou o job `e2e-autenticado` (manual, tolerante a ausência de segredo).

---

## 5. O que sobra para a Onda 21

1. **Rodar o E2E autenticado de verdade** — depende de credencial de teste com
   papel `admin` ou `comercial`. É o único item que transforma "mecânica provada"
   em "fluxo provado".
2. **Rotular os 10 pontos restantes de `seedFor`** — `/showroom`,
   `/supplier-portal`, `/development`, `/display`, `/measurements`, `/looks`,
   `/collection-map`, `/approvals`, `/ai-agents`, `/dashboard`. A lib já existe;
   é aplicação mecânica, um arquivo por vez, com o padrão de `resolveSheet`.
3. **`zod@4`** — migração breaking, com o suíte como rede.
4. **Multitenant em produção** — 30 min, SQL validado.
5. **Domínio `usemoda.ai`** — continua entregando `moda.dev`; só resolve no
   painel do Lovable.
