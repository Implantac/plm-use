# H9 · Playbooks por elo da cadeia produtiva

Cada playbook cobre **um elo** da cadeia de moda (FPEF V2), ponta a ponta,
usando o template canônico `H9-00-template.md`.

## Como criar um playbook novo

1. Copie `H9-00-template.md` para `H9-<NN>-<slug>.md`.
2. Preencha todas as 17 seções — nenhuma vazia (use "N/A + justificativa").
3. Passe pelo Design Review (FPEF V13) antes de marcar 🟢.
4. Atualize a tabela abaixo.

## Elos previstos (Onda E)

| # | Playbook | Elo (V2) | Estado |
|---|----------|----------|--------|
| 01 | [Coleção](./H9-01-colecao.md) | Briefing → Coleção aprovada | 🟡 |
| 02 | [Desenvolvimento](./H9-02-desenvolvimento.md) | Croqui → Referência → Piloto → Aprovação | 🟡 |
| 03 | [Modelagem](./H9-03-modelagem.md) | Molde-mãe → Grade → Encaixe → Validação | 🟡 |
| 04 | [Corte](./H9-04-corte.md) | Enfesto → Corte → Fardos etiquetados | 🟡 |
| 05 | Engenharia de Produto | Engenharia (BOM/BOP/consumo) | 🔴 |
| 06 | Compras & MRP | Compras | 🔴 |
| 07 | Estoque & Recebimento | Estoque | 🔴 |
| 08 | PCP & APS | Produção — planejamento | 🔴 |
| 09 | Corte | Produção — corte | 🔴 |
| 10 | Costura & Facções | Produção — costura | 🔴 |
| 11 | Lavanderia & Acabamento | Produção — acabamento | 🔴 |
| 12 | Qualidade & CAPA | Qualidade | 🔴 |
| 13 | Mostruário & Comercial | Mostruário → Venda | 🔴 |
| 14 | Expedição & Logística | Expedição | 🔴 |
| 15 | Pós-venda & Aprendizado | Pós-venda + retro para V1 | 🔴 |

Legenda: 🔴 planejado · 🟡 parcial · 🟢 pronto

## Regras

- Um playbook **não** duplica conteúdo do FPEF nem do H0–H8 — ele **cita**.
- Um playbook **não** é manual de UI — ele é o **contrato do elo**.
- Se o mesmo assunto aparece em dois playbooks, um deles está errado.
