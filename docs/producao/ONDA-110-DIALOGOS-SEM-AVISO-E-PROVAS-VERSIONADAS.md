# Onda 110 — Diálogos sem aviso no console + bateria de provas versionada

## Medição (104ª, produção, Onda 108 no ar — 109 ainda não publicada)

1. **Regressão operacional:** as 16 provas Playwright (`prova_*.py`) rodadas
   contra `https://plmuse.lovable.app`: **16/16 com `pageerror: 0`**, todos os
   fluxos mostram o motivo real (sessão simulada → "sua sessão expirou ou é
   inválida…"), remoção de lançamento → `success`, 404 com página própria.
   Screenshots em `auditoria/regressao110/`.
2. **Console por rota** (`auditoria_console.py`, 45 rotas, abrindo o primeiro
   diálogo de criação): **1 aviso em produção** — `/suppliers`:
   `Warning: Missing Description or aria-describedby={undefined} for {DialogContent}`.
   Varredura estática: **59** `DialogContent`/`SheetContent` sem `Description`
   em 37 arquivos — o aviso se repete em produção em cada um que o usuário abrir.
3. **Risco de perda:** 19 scripts de prova viviam só no sandbox (`/home/user/scripts`),
   que reiniciou duas vezes hoje. Apenas `auditoria_campos.py` estava no repo.

## Correção

- `src/components/ui/described-by.tsx` (novo): contexto em que a `Description`
  se registra ao montar. `DialogContent`/`SheetContent` só deixam o Radix
  escrever `aria-describedby` quando há Description; sem ela passam
  `aria-describedby={undefined}` (opt-out documentado pelo Radix). Um só ponto
  resolve os 59 sites sem tocar neles; diálogos com Description mantêm a
  associação (testado).
- `scripts/provas/` (21 scripts) + `scripts/regressao-producao.sh [BASE] [DIR]`:
  roda as 16 provas, exige `pageerror: 0` em cada uma e fecha com as
  auditorias de nomes e campos. As três auditorias passaram a descobrir as rotas
  em `src/routes` (ou receber uma lista no 3º argumento).

## Prova

- `src/components/ui/onda110-dialog-described-by.test.tsx` (3, jsdom): sem
  Description → nenhum aviso e sem `aria-describedby` pendurado; com
  Description → `aria-describedby` aponta para o texto; Sheet idem.
  **No código anterior, 2 dos 3 falham** (aviso emitido) — a trava mede.
- Dev local não reproduz o aviso (só o bundle de produção o emitiu); a medição
  de ar fica para após publicar: `auditoria_console.py` → TOTAL 0 em `/suppliers`.
- Gates: `tsc` 0 · `eslint` 0 · `prettier` limpo · vitest **961/961 (167)**.

## Pendente

Publicar 109+110; depois `scripts/regressao-producao.sh` completo em produção.
