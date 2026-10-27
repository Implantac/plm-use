# Detalhes de produção por item — ativação e uso

## O que muda

O comercial envia o pedido para custo como antes. No cartão de cada item, o custo abre **Detalhar produção**, seleciona um grupo e registra as instruções. Há grupos iniciais para Detalhes, Tecido, Bordado, Costura, Acabamento, Expedição, Estampa, Lavanderia e Corte; outros podem ser criados ou excluídos. Cada grupo deve ser salvo explicitamente. O texto mantém as quebras de linha; não há editor de formatação rica ou cópia entre pedidos nesta versão.

Na primeira abertura, o sistema tira uma **cópia técnica específica do item** da ficha padrão localizada pela referência do item ou, se ela estiver vazia, pela referência do produto no catálogo. A referência precisa corresponder exatamente ao campo `tech_sheets.ref`. Essa cópia não altera a ficha padrão, não cria operações ou materiais de custo e não inclui os campos financeiros da ficha padrão. Ela preserva os dados técnicos de materiais, operações e aplicações e, quando houver, o endereço HTTPS da foto de referência. A foto é acessada por esse endereço e pode deixar de estar disponível se o arquivo original mudar ou for removido. Se não houver ficha correspondente, o editor informa isso e permite registrar os grupos manualmente. A cópia não é atualizada automaticamente se a ficha padrão mudar depois.

As instruções salvas aparecem no botão **Ficha técnica** do pedido e na aba **Ficha técnica** da OP gerada desse pedido. A versão de produção não recebe os campos estruturados de custo/preço/margem. Textos livres da ficha padrão e dos grupos, assim como fotos, não são filtrados quanto ao conteúdo: não inclua neles valores confidenciais que não possam ser mostrados à produção.

As operações e materiais de custo continuam no painel de custo e são calculados separadamente. O pedido continua sujeito à aprovação do custo e à liberação pelo PCP. Após aprovação do item ou saída do pedido da etapa de custo, os detalhes ficam somente para consulta, inclusive no banco.

## Ativação pelo responsável do banco

1. Confirme que está no **projeto/banco correto** do Lovable e faça o backup previsto para produção.
2. Em **More → Database → Manage → SQL editor**, cole e execute o arquivo `docs/producao/2026-10-27_DETALHES-PRODUCAO.sql` completo. O script valida os pré-requisitos, roda em uma transação e é reexecutável. Não foi executado em produção pelo agente.
3. Confira a linha final: `sales_order_item_detail_sheets`, `sales_order_item_detail_groups` e `start_order_item_details(uuid)` devem aparecer. Se houver erro, não publique a interface como se estivesse ativa; guarde a mensagem completa para análise.
4. Depois que o commit estiver na `main` e a CI estiver verde, faça **Publish** no Lovable. A aplicação publicada só passa a usar a funcionalidade após essas duas etapas.
5. Com uma conta autorizada, abra um pedido enviado/em custo, clique em **Detalhar produção** em um item, escolha **Costura**, escreva uma instrução e clique em **Salvar detalhes**. Feche e reabra para verificar persistência. Verifique a **Ficha técnica** do pedido; após aprovação e liberação ao PCP, confirme a aba **Ficha técnica** da OP.

## Permissões e segurança

- A gravação exige `can_cost`: `admin`, `manager`, `engenharia_custo` ou `coordenador_produto`; a RPC também valida o estado do pedido e do item no banco.
- A leitura técnica é para membros, conforme a política existente da ficha técnica do pedido. Nessa ficha e na nova aba da OP, a produção recebe texto e dados técnicos, não as colunas financeiras. Textos livres ou fotos podem, contudo, conter informações que um usuário tenha incluído neles.
- **Limite importante:** isso não corrige a confidencialidade global do sistema. O resumo antigo da ficha no PCP mostra custos e as políticas legadas permitem, entre outros acessos, que PCP leia `tech_sheets` e valores de `catalog_options` diretamente. Esses acessos foram reproduzidos no banco de teste; a configuração de produção não foi verificada. Uma revisão separada de telas, papéis, tabelas e integrações é necessária para garantir sigilo global sem quebrar fluxos existentes.
- Na saída da ficha do pedido, `options.spec` agora preserva apenas `driver_qty` numérico; o JSON original da tabela não é modificado.
- Cada gravação usa revisão otimista: se outro usuário alterou o grupo desde a leitura, o sistema recusa a sobrescrita e preserva o texto que está na tela. Copie o texto antes de fechar/reabrir para conciliar a alteração.
- Dados de teste e SQL foram exercitados em um PostgreSQL isolado; isso não comprova que o SQL foi aplicado ou que permissões reais estão corretas no banco publicado.

## Limitações operacionais

- Se a referência não estiver vinculada a uma ficha padrão na primeira abertura, o editor informa que não encontrou a base e permite preencher os detalhes manualmente. Se a referência ou a ficha for cadastrada depois, reabra o editor antes da aprovação: a base ainda ausente será buscada novamente sem sobrescrever os detalhes. Uma cópia já encontrada não muda automaticamente.
- Pedidos antigos já aprovados não são retroativamente iniciados nem alterados por este script.
- Esta alteração não modifica `tech_sheets`, os valores de custo, as rotas do PCP ou a regra de aprovação.
