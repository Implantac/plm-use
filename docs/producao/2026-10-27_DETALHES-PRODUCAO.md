# Detalhes e consumo por item — ativação e uso

## Fluxo

1. **Comercial:** crie o pedido e cada item com descrição, cor, quantidade, grade, personalizações e observações gerais, se necessário. Ainda no rascunho, abra **Detalhes comerciais** no cartão de cada item. Escolha os grupos à esquerda, escreva a orientação do cliente e clique em **Salvar detalhes** em cada grupo. Depois envie o pedido para custo.
2. **Custo:** abra **Detalhar produção** no item enviado. Os dados comerciais e as orientações do mesmo grupo ficam visíveis; escreva e salve seu **complemento técnico**, separado do texto comercial. Um grupo com texto comercial não pode ser excluído pelo custo. Também é possível criar grupos adicionais.
3. Ainda no detalhamento, em **Consumo dos materiais deste item**, ajuste as linhas existentes ou adicione uma linha: tipo, material, unidade, consumo por peça, perda (%) e custo unitário. A ficha padrão oferece sugestões técnicas, mas selecionar uma sugestão não grava nem define custo: informe o valor e confirme a inclusão. Não adicione a mesma linha duas vezes.
4. Cada gravação ou remoção de consumo recalcula o custo do item na mesma transação. O recálculo pode avançar o pedido para **em custo** e marcar o custo do item como concluído; revise operações, materiais e resultado antes de **Aprovar**. A aprovação e a liberação ao PCP continuam obrigatórias.
5. Confira a **Ficha técnica** do pedido e, após liberação, a aba **Ficha técnica** da OP. Elas mostram os textos comercial e técnico, dados básicos e consumo por peça, perda e total, sem valores financeiros estruturados. O total é `consumo por peça × (1 + perda/100) × quantidade`, arredondado a três casas.

A primeira abertura fotografa uma cópia técnica da ficha padrão pela referência do item ou do produto. Essa base é apenas referência: o consumo válido para o pedido é o das linhas do item. A ficha padrão e os demais pedidos não são alterados. Uma base já encontrada não é atualizada automaticamente; se não foi encontrada, reabrir antes da aprovação permite nova tentativa. A foto é uma URL HTTPS, que pode deixar de funcionar se a original mudar.

Os textos são simples, com quebras de linha; cada grupo deve ser salvo. Edições concorrentes são verificadas por revisão e um conflito preserva a digitação na tela. Copie o texto ou consumo antes de fechar e reabrir para conciliar. Após envio, o comercial não edita; após aprovação do item ou saída da etapa de custo, as novas RPCs de detalhamento e consumo ficam bloqueadas para edição. Pedidos antigos aprovados não são iniciados retroativamente.

## Ativação pelo responsável do banco

1. Confirme o projeto/banco correto e faça o backup previsto para produção. O arquivo anterior `docs/producao/2026-10-27_DETALHES-PRODUCAO.sql` deve já ter sido aplicado com sucesso. O usuário informou sua execução; isso não foi verificado diretamente pelo agente.
2. Em **More → Database → Manage → SQL editor**, execute o arquivo completo `docs/producao/2026-10-27_DETALHES-COMERCIAL-CONSUMO.sql`. Ele verifica pré-requisitos, usa transação e é reexecutável. **Não reaplique o SQL anterior depois deste**, pois ele redefine funções compartilhadas; caso isso aconteça, execute novamente o SQL comercial/consumo em seguida.
3. Confira a linha final: as funções `start_order_item_commercial_details`, `list_order_item_material_consumption` e `save_order_item_material_consumption` devem aparecer, com `coluna_texto_comercial` e `coluna_revisao_consumo` verdadeiras. Se houver erro, guarde a mensagem completa e não considere o recurso ativo.
4. Após o commit estar na `main` e a CI passar, faça **Publish** no Lovable. Banco, push e publicação são ações separadas; testes descartáveis não alteram nem validam produção.
5. Com contas autorizadas e um pedido de teste, salve Costura e Bordado no comercial; envie para custo; confira os textos, acrescente complemento e cadastre consumo, perda e custo. Feche e reabra, confira recálculo e fiche técnica. Aprove e libere ao PCP; confirme textos e consumo na ficha da OP, sem valores financeiros estruturados.

## Permissões e limites importantes

- Comercial precisa de `can_sell` e edita apenas rascunhos do vendedor responsável; usuários que também têm `can_cost` podem editar rascunhos de outros vendedores. O custo precisa de `can_cost` e de item não aprovado nas etapas permitidas. A leitura técnica é para membros; a RPC nova que retorna custos de consumo exige `can_cost`.
- Textos livres, nomes e fotos podem conter informações sensíveis: não digite valores confidenciais neles. A projeção da ficha/OP não inclui campos estruturados de custo, preço ou margem; isso **não garante sigilo global**.
- As telas e permissões legadas do PCP ainda podem expor custos, inclusive no resumo antigo e em acessos a `tech_sheets` e `catalog_options`. Esses acessos foram reproduzidos em banco descartável, não verificados em produção. É necessária uma revisão separada de telas, papéis e integrações.
- O painel de custo anterior continua existindo. O trigger incrementa a revisão quando ele altera uma linha de material, mas suas políticas legadas não foram endurecidas por esta entrega; não trate as novas RPCs como bloqueio global de todas as APIs antigas.
- Falha ao carregar materiais bloqueia a inclusão no novo editor, evitando trabalhar sobre uma lista incompleta. A sugestão da ficha padrão não cria vínculo de estoque; essa integração depende do recurso e das migrações de estoque disponíveis no projeto.
