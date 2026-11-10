# Onda 44 — Todo aviso de vitrine tem uma saída

**Data:** 06/11/2026 · **Commit:** `030ca6c` · **Antecessor:** `80dd423` (Onda 43 + docs)

---

## 1. O problema que sobrou da Onda 43

A Onda 43 deu ao usuário um **único ponto de partida** no dashboard. Mas assim
que ele navegava para qualquer módulo, caía de novo num aviso âmbar que
explicava muito bem **por que** o número não era apurável — e não dizia **onde
clicar**.

Medição estática antes da correção: **9 avisos de vitrine, 0 com botão de
ação**.

| Tela         | Aviso (`data-testid`)               | Saída antes |
| ------------ | ----------------------------------- | ----------- |
| Fornecedores | `supplier-so-vitrine`               | nenhuma     |
| Scoreboard   | `scoreboard-so-vitrine`             | nenhuma     |
| Pesquisa     | `briefing-so-vitrine`               | nenhuma     |
| Segurança    | `lgpd-so-vitrine`                   | nenhuma     |
| Marketing    | `gtm-so-vitrine`                    | nenhuma     |
| Financeiro   | `dre-provenance` (DRE não apurável) | nenhuma     |
| Book S&OP    | `sop-sem-faccao`                    | nenhuma     |
| Book S&OP    | `sop-sem-pedidos`                   | nenhuma     |
| Book S&OP    | `sop-sem-drops`                     | nenhuma     |

O texto dizia _"Cadastre ou edite um parceiro"_, _"Registre uma ação real no
Trust Center"_, _"sem um pedido cadastrado pela empresa"_ — sempre no imperativo,
sempre sem o botão. O usuário precisava voltar ao dashboard, lembrar do card,
achar a rota e procurar o formulário.

---

## 2. O que mudou

### Um componente, nove saídas

`src/components/onboarding/CtaProximoPasso.tsx` + `usePasso()` em
`src/lib/onboarding/primeiros-passos.ts`.

- **Ação local** (telas que já têm o formulário): o CTA chama o `handleOpenDialog()`
  / `setOpenLogModal(true)` da própria tela — **um clique abre o cadastro**.
- **Sem ação local** (Book S&OP, Scoreboard, Financeiro): o CTA vira um `Link`
  para a rota do passo, com `aria-label` descrevendo o destino.
- **Passo já concluído**: o CTA **desaparece** (`if (p.concluido) return null`).
  Não existe contador paralelo: `usePasso` deriva de `usePrimeirosPassos`, que
  lê os mesmos `operationalCodes`/`pedidosOperacionais`/`parceirosOperacionais`/
  `campanhasOperacionais` das Ondas 38–43.

| Onde                     | CTA                                                              | O que faz                     |
| ------------------------ | ---------------------------------------------------------------- | ----------------------------- |
| `suppliers.tsx`          | "Cadastrar parceiro"                                             | abre o diálogo de homologação |
| `research.tsx`           | "Criar briefing"                                                 | abre o diálogo de briefing    |
| `security.tsx`           | "Registrar evento"                                               | abre o modal do Trust Center  |
| `marketing.tsx`          | "Cadastrar Drop"                                                 | abre o diálogo de campanha    |
| `SupplierScoreboard.tsx` | "Ir para Fornecedores"                                           | navega                        |
| `financial.tsx`          | "Criar ficha técnica"                                            | navega para `/references`     |
| `LiveSopBoard.tsx` ×3    | "Ir para Fornecedores" / "Ir para Pedidos" / "Ir para Marketing" | navega                        |

**Nenhum `data-testid` antigo foi removido.** Os 9 avisos continuam idênticos —
só ganharam um botão dentro. Nenhuma asserção das Ondas 38–43 foi relaxada.

---

## 3. Prova executada no browser

App local em `:8080`, Chromium headless, sessão local simulada (sem escrita no
banco), **6 telas percorridas e 2 tarefas reais com clique**:

```
/suppliers   aviso=1 ctas=2  [cta-supplier-so-vitrine, cta-scoreboard-so-vitrine]
/research    aviso=1 ctas=1  [cta-briefing-so-vitrine]
/security    aviso=1 ctas=1  [cta-lgpd-so-vitrine]
/marketing   aviso=1 ctas=1  [cta-gtm-so-vitrine]
/financial   aviso=1 ctas=1  [cta-dre-sem-ficha]
/analytics   aviso=1 ctas=3  [cta-sop-sem-faccao, cta-sop-sem-pedidos, cta-sop-sem-drops]

TAREFA 1 — clicar em "Cadastrar parceiro":
  dialogo aberto: 1
  titulo: "Homologar Novo Fornecedor / Facção / Lavanderia · RAZÃO SOCIAL · CNPJ"

TAREFA 2 — clicar no CTA de "sop-sem-pedidos":
  URL apos clique: /orders
```

**Antes: 0 de 9 avisos com saída. Depois: 9 de 9.** O clique não é decorativo:
abre o formulário real e navega para a rota real.

---

## 4. O que não mudou

- Os `—` continuam — ausência não é zero apurado.
- Nenhum filtro de vitrine, nenhum número operacional, nenhuma asserção antiga.
- `PASSOS` continua com **4 passos** e as mesmas rotas (teste de regressão da
  Onda 43).
- SQL 163/163 inalterado; banco segue sem as migrações 21/24.
- O `CtaProximoPasso` não usa `localStorage` nem grava progresso.

---

## 5. Gates

| Gate           | Resultado                             |
| -------------- | ------------------------------------- |
| `tsc --noEmit` | ✅ 0 erros                            |
| eslint         | ✅ 0 erros, 20 warnings preexistentes |
| prettier       | ✅ limpo                              |
| vitest         | ✅ **624/624** (eram 610; **+14**)    |

**14 testes novos**: 7 de render do CTA (`jsdom`: callback local, `Link`,
rota derivada do passo, passo concluído → `null`, `data-testid`/`data-passo`,
dica de ação) e 7 guardas de fonte (9 `data-testid` originais preservados, 9
CTAs presentes, 7 arquivos importando o componente, exatamente 9 CTAs, ações
locais vs. navegação, regressão dos 4 passos, ausência de contador paralelo).

---

## 6. Medição das camadas — 21ª (06/11)

O ar avançou **mais uma vez, sem aviso do dono**: saiu `index-D2xvfyGH.js` e
entrou **`index-BuzojJqi.js`** (221 chunks) com `comece-por-aqui` 3×,
`progresso-onboarding` 1×, `páginas neste grupo` 1× e
`fluxo-operacional-detalhes` 1× → **Onda 43 publicada**.

| Camada        | Estado                                                |
| ------------- | ----------------------------------------------------- |
| Repositório   | **Onda 44** (este commit)                             |
| App publicado | **Onda 43** — `index-BuzojJqi.js`, **uma onda** atrás |
| Banco         | sem migrações 21/24 — `PGRST205` + 3× `PGRST202`      |

`cta-supplier-so-vitrine`, `cta-sop-sem-pedidos` e `CtaProximoPasso` = **0** no
bundle. `DEV000006` segue em **27** ocorrências.

---

## 7. Próximos passos sugeridos

1. **Reduzir jargão na primeira dobra** — "Torre Executiva PLM 2.0",
   "SOZINHO", "Cronoanálise GSD", "DPP", "Passaporte Digital ESG". Corretos
   para quem opera, crípticos no primeiro dia.
2. **`/tech-sheet` sem `<h1>`** e varredura de acessibilidade além do `/login`
   (os 6 specs de `tests/e2e` cobrem só a tela de login).
3. **Formulários longos** — `/orders` tem 18 inputs e 62 botões; o padrão de 3
   seções numeradas de "Nova referência" pode ser replicado.
4. **Publicar a Onda 44**, aplicar `APLICAR-ONDA-21-24.sql` (3 NOTICEs) e
   fornecer `PLM_E2E_EMAIL`/`PLM_E2E_PASSWORD` para que os specs autenticados
   deixem de ser `skipped`.
