# Fashion PLM Enterprise Engineering Handbook

> Metodologia de engenharia de software para PLM de moda.
> **Independente de tecnologia.** Serve para Lovable, Cursor, Claude Code,
> Windsurf, Copilot, Codex, equipes humanas, consultores, analistas, QA e UX.

O FPEF (`.lovable/docs/00-fpef/`) é a **constituição** — o que é e o que não é
o produto. Este Handbook é o **método** — como se pesquisa, projeta,
implementa, testa, entrega e evolui cada pedaço do produto.

## Organização

~100 documentos em 10 séries. Cada série tem seu próprio índice
(`H0-README.md`, `H1-README.md`, …). Documentos são numerados dentro da série
(`H1-01`, `H1-02`, …) para permitir crescimento sem quebrar referências.

| Série  | Tema                                              | Estado             |
| ------ | ------------------------------------------------- | ------------------ |
| **H0** | Fundamentos e princípios                          | 🟢 pronto          |
| **H1** | Discovery & Product Design                        | 🟢 pronto          |
| **H2** | Domain Modeling & Data                            | 🟢 pronto          |
| **H3** | Architecture & Backend                            | 🟢 pronto          |
| **H4** | Frontend & UX Engineering                         | 🟢 pronto          |
| **H5** | IA Industrial & Agentes                           | 🟢 pronto          |
| **H6** | Integrações (ERP, CAD, e-commerce, terceiros)     | 🟢 pronto          |
| **H7** | Qualidade, testes e observabilidade               | 🟢 pronto          |
| **H8** | Operação, DevOps, segurança e compliance          | 🟢 pronto          |
| **H9** | Playbooks por processo de moda (cadeia produtiva) | 🟡 template pronto |

Legenda: 🟢 pronto · 🟡 parcial · 🔴 planejado

## Índices das séries

- [H0 — Fundamentos](./H0-fundamentals/README.md)
- [H1 — Discovery & Product Design](./H1-discovery/README.md)
- [H2 — Domain Modeling & Data](./H2-domain/README.md)
- H3 — Architecture & Backend _(a criar)_
- H4 — Frontend & UX Engineering _(a criar)_
- H5 — IA Industrial & Agentes _(a criar)_
- H6 — Integrações _(a criar)_
- H7 — Qualidade e observabilidade _(a criar)_
- H8 — Operação, segurança e compliance _(a criar)_
- H9 — Playbooks por processo de moda _(a criar)_

Legenda: 🟢 pronto · 🟡 parcial · 🔴 planejado

## Relação com FPEF

- Handbook **cita** os volumes do FPEF (V1..V14) como fonte de verdade da visão.
- Handbook **detalha** como transformar cada volume em código, teste, doc e KPI.
- Toda decisão do Handbook **precisa** ser rastreável ao volume FPEF que a originou.

## Como usar

- **Novo dev / novo agente IA:** ler H0 inteiro + índice do FPEF antes de tocar código.
- **Nova feature:** começar em H1 (Discovery) → H2 (Modelagem) → H3/H4 (Implementação)
  → H7 (QA) → V12 (checklist final).
- **Novo processo de moda:** começar em H9, escolher o playbook do processo,
  seguir referências para as séries H2–H7.

## Índices das séries

- [H0 — Fundamentos](./H0-fundamentals/README.md)
- H1 — Discovery & Product Design _(a criar)_
- H2 — Domain Modeling & Data _(a criar)_
- H3 — Architecture & Backend _(a criar)_
- H4 — Frontend & UX Engineering _(a criar)_
- H5 — IA Industrial & Agentes _(a criar)_
- H6 — Integrações _(a criar)_
- H7 — Qualidade e observabilidade _(a criar)_
- H8 — Operação, segurança e compliance _(a criar)_
- H9 — Playbooks por processo de moda _(a criar)_

## Roadmap de escrita (ondas)

1. **Onda A (agora):** H0 completo + índices vazios de H1..H9 + FPEF V14.
2. **Onda B:** H1 e H2 completos (discovery + modelagem).
3. **Onda C:** H3, H4, H5.
4. **Onda D:** H6, H7, H8.
5. **Onda E:** H9 (um playbook por processo — ~15 docs).
6. **Onda F:** Revisão cruzada, versionamento SemVer do Handbook, publicação
   como asset independente do código.
