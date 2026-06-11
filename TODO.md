# TODO

- [ ] Implementar drag-and-drop no Kanban da tela de Desenvolvimento: `src/routes/_authenticated.development.tsx`
  - [ ] Adicionar estado/handlers: `draggedTask`, `dragOverColumn`, `isDragging`
  - [ ] Implementar HTML5 Drag & Drop (sem dependências novas)
  - [ ] Validar transições permitidas com fluxo: Ideia→Croqui→Modelagem→Piloto→Ajuste→Aprovação→Produção→Lançamento
  - [ ] Adicionar feedback visual do drop (highlight/overlay) e cursor/grab durante drag
  - [ ] Atualizar `columns` ao soltar em coluna válida e atualizar métricas
  - [ ] Emitir toasts de sucesso/erro em moves válidos/inválidos

- [ ] Rodar `npm run lint` e `npm run build`
- [ ] Commit e push no GitHub (caso seja necessário após alterações)
