# Onda 97 — nenhum `catch {}` silencioso em gravação/sincronização

## Sintoma medido

Varredura por `catch {}` vazios (ou só com comentário) em `src`: 9. Sete
escondiam falha de **gravação**:

- `lib/cad/store.ts`: rede caída ao sincronizar o molde na nuvem → nada dito;
  o usuário acha que o molde subiu.
- `localStorage` em `/financial`, `/commercial` e `FabricRollsShadePanel`
  (3 pares leitura/gravação): leitura corrompida → ignorada em silêncio;
  gravação falha (cota cheia / modo privado) → o que está na tela some ao
  recarregar, sem aviso. **Prova em produção:** chave
  `use-moda:financial-cfo-v2` corrompida → `/financial` abre sem nenhum
  toast (`auditoria/storage97-prod-antes.png`).

Os 2 restantes (`streamImage`, `api/generate-image`) são fallback de parse de
corpo HTTP com mensagem por status já preservada — permanecem, listados como
exceção explícita na trava.

## Correção

- `motivoArmazenamentoLocal(oQue, "ler"|"gravar", erro)` em `erro-humano.ts`:
  leitura → "Os dados do X guardados neste navegador estavam corrompidos e
  foram ignorados. Confira o que está na tela…"; gravação → "Não foi possível
  guardar X neste navegador: o armazenamento está cheio / o navegador bloqueou
  o armazenamento local. Os dados continuam na tela, mas serão perdidos ao
  recarregar." Sempre `avisoUnico`.
- `cad/store.ts`: `motivoDe(e, "sincronizar o molde na nuvem") + "O molde
continua salvo neste navegador."`, aviso único.
- Trava `onda97-catch-silencioso-zero.test.ts` (3): só os 2 fallbacks de
  parse podem ter catch vazio; os 3 painéis avisam leitura e gravação; o
  helper distingue cota/bloqueio/leitura.

## Prova (Playwright, `scripts/prova_storage.py`)

Local: `/financial` com chave corrompida → toast "Os dados do painel
financeiro guardados neste navegador estavam corrompidos e foram ignorados…",
0 `pageerror` (`auditoria/storage97-local.png`). Produção antes: nenhum toast.

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 914/914 (151 arquivos)**.

## Publicação

Nenhuma migration. Validação: mesma prova em produção → toast.
