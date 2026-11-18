# Onda 104 — leitura prévia a uma decisão não inventa dado

## Achado (varredura de `const { data: x } = await supabase.from(` sem `error`)

| Onde                                     | Antes                                            | Risco                                                           |
| ---------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| `registerMovement` (saída/transferência) | saldo ilegível → `onHand = 0`                    | **"Saldo insuficiente (0 disponível)"** com saldo real positivo |
| `createLaunchHandoff`                    | itens da wave ilegíveis → payload vazio          | hash e dedupe errados, handoff "ok" sem itens                   |
| `createLaunchHandoff`                    | `existing` ilegível → segue para insert          | dedupe ignorado                                                 |
| `useCreatePiloto`                        | última rodada ilegível → rodada 1                | piloto "R1" por cima de rodadas reais                           |
| `TechSketchPanel`                        | desenho oficial não baixado → `reference = null` | IA gera "a partir do oficial" sem ele, em silêncio              |
| `/official-models`                       | prévia some                                      | sem motivo                                                      |

## Correção

- Server fns devolvem `{ ok: false, reason }` via `descreverErroSupabase`
  ("consultar o saldo", "ler os itens da wave", "verificar se o handoff já
  existia") antes de decidir.
- `useCreatePiloto` avisa e não cria quando não consegue descobrir a rodada.
- `sketchSignedUrl` → `{ url | reason }`, `sketchDataUrl` → `{ dataUrl | reason }`;
  `TechSketchPanel` avisa "O desenho será gerado sem o desenho oficial como
  base. <motivo>"; `/official-models` mostra o motivo da prévia ausente.
- Trava `onda104-leitura-previa-com-motivo.test.ts` (3), com varredura global
  em `src/lib` e `src/hooks`.

## Prova

Contrato de código + gates (server fns não são mockáveis — lição da Onda 89).
Local/produção não têm sessão real para exercer saldo/handoff.

## Gates

`tsc` 0 · `eslint` 0 · `prettier` limpo · **vitest 944/944 (160 arquivos)**.

## Publicação

Nenhuma migration. **Push pendente de token GitHub novo** (o anterior devolve 401).
