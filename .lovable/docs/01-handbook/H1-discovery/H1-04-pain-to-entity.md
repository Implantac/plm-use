# H1-04 · Mapeamento Dor → Entidade → Evento

Toda dor válida vira **exatamente** um triângulo: entidade envolvida,
evento(s) que a resolvem, KPI que mede o alívio.

## Template

```
DOR:
  "Estilo perde 2h por dia procurando última versão de ficha técnica."
  (fonte: entrevista H1-02 com coord. Estilo em 2026-06-15)

ENTIDADE:
  tech_sheet (FPEF V5 — já existe)
  reference (FPEF V5 — já existe)

RELAÇÕES (FPEF V3):
  reference --has_current--> tech_sheet
  tech_sheet --version_of--> tech_sheet (histórico)

EVENTOS (FPEF V7):
  tech_sheet.created
  tech_sheet.updated
  tech_sheet.published (nova versão vira "atual")
  tech_sheet.rolled_back

WORKFLOW (FPEF V8):
  draft → in_review → published → archived

KPI (FPEF V10):
  tempo_medio_entre_publicacoes por coleção
  % de acessos à versão "atual" vs "antiga"

INTEGRAÇÃO ERP (FPEF V9):
  Nenhuma — ficha técnica é 100% PLM.

UX (FPEF V4):
  Drawer da referência → tab "Ficha Técnica" com histórico de versões.
  Nova rota SÓ para diff visual (H4 dirá).

IA (FPEF V11):
  Agente Fashion consegue responder "qual referência tem ficha desatualizada?"
  via queryEntityEvents(entity_type='tech_sheet', event='updated', since=X).
```

## Regras

- **Nunca** invente entidade nova sem antes tentar reusar V5.
- **Sempre** liste eventos antes de campo. Evento é a espinha, campo é osso.
- **Nunca** salte KPI. Sem KPI, sem prova de valor.
- **Sempre** derive UX depois. UX é consequência, não causa.

## Anti-padrões

- "Vamos criar uma tabela `historico`" → não. Timeline vem de
  `entity_events`.
- "Vamos criar `status_ficha_tecnica` com strings livres" → não. Workflow em
  `workflow_definitions`.
- "Vamos ler direto do ERP na tela" → não. Passa por `ErpAdapter`.
