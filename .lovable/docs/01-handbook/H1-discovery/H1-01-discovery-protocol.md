# H1-01 · Protocolo de Discovery

Todo discovery começa com uma **dor real** documentada em FPEF V1 (Product
Vision). Sem dor rastreável, para tudo — não é feature, é opinião.

## Fluxo obrigatório

1. **Dor** — qual dor real da confecção estamos matando?
2. **Persona** — quem sente a dor (V1 lista as 13 personas)?
3. **Frequência** — dor diária, semanal, por coleção, por lote?
4. **Custo atual** — o que a confecção gasta hoje para conviver com a dor
   (horas, retrabalho, atraso, planilha, WhatsApp)?
5. **Como resolvem hoje?** — planilha? WhatsApp? verbalmente?
6. **Como concorrência resolve?** (FPEF V14, protocolo de 9 perguntas)
7. **Entidades envolvidas** (FPEF V5) — existentes ou nova (justificar)?
8. **Regras** (FPEF V6) — o que é obrigatório? o que é exceção?
9. **Eventos** (FPEF V7) — quais `event_type` precisam existir?
10. **Workflow** (FPEF V8) — há máquina de estados nova?
11. **ERP** (FPEF V9) — precisa ler dado do ERP? via qual adapter?
12. **KPI** (FPEF V10) — como medimos que a dor foi resolvida?
13. **UX** (FPEF V4) — drawer ou nova rota? por quê?
14. **IA** (FPEF V11) — algum agente responde melhor com essa feature?
15. **QA** (FPEF V12) — como testamos ponta a ponta?

## Saída

Um documento H1-05 (spec funcional) preenchido, aprovado no Design Review
(FPEF V13, 10 perguntas), pronto para H2 modelar dado.

## Anti-padrões

- Discovery começar por tela (mockup antes de dor).
- Discovery pular V14 (concorrência).
- Discovery inventar entidade nova antes de reusar V5.
- Discovery sem KPI de sucesso definido.
