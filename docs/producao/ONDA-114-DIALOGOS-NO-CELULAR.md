# Onda 114 — Diálogos de cadastro utilizáveis no celular

## Medição (109ª, local com a build 113; ar ainda na 110)

`scripts/provas/auditoria_dialogos_mobile.py` (novo): em 390×844 abre o
primeiro botão "Novo/Adicionar/Criar/Cadastrar/Homologar" de cada rota e mede
o diálogo — cabe na tela ou rola? botão principal alcançável? campos ≥ 16px?

**18 diálogos abertos, 18 com problema:**

- `/inventory` ("Adicionar insumo"): **1244px de altura em 844px de tela, sem
  rolagem — o botão "Cadastrar" ficava em y=971, inalcançável no celular.**
- Todos os 18: campos com fonte < 16px (`text-xs`/`text-sm`) — no iOS o foco
  dispara zoom automático e a tela "pula" a cada campo.

Em produção (menu aberto cobrindo a tela) só o diálogo de fornecedores era
alcançável — mesmo diagnóstico de fonte.

## Correção (dois pontos, cobrem todos os diálogos)

- `src/components/ui/dialog.tsx`: `DialogContent` com
  `max-h-[calc(100dvh-1rem)] overflow-y-auto`.
- `src/styles.css`: em `(max-width: 767px) and (pointer: coarse)`, `input`,
  `textarea`, `select` e `[role=combobox]` ganham `font-size: max(16px, 1em)`
  (fora de `@layer`, para vencer `text-xs`); desktop não muda.

## Prova

- Local, 18 diálogos: **`com problema: 0`**, 0 pageerror. `/inventory`:
  diálogo rola (h=828) e "Cadastrar" visível ao fim
  (`auditoria/dialogo114-inventory-local.png`).
- Trava `src/lib/onboarding/onda114-dialogos-mobile.test.ts` (2).
- Gates: `tsc` 0 · `eslint` 0 · `prettier` limpo · vitest **972/972 (171)**.

## Pendente

Publicar 111–114; depois `auditoria_dialogos_mobile.py` em produção → 0.
