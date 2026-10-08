# Aplicação de logos e estampas nas peças

## O que será criado

- Adicionar, na geração visual do AI Product Studio, um campo para enviar uma arte em PNG, JPG ou WEBP, com prévia e opção de remover.
- Permitir escolher a posição da arte na peça, incluindo frente, costas, lateral e posições específicas de boné.
- Permitir escolher a técnica de aplicação: silk, bordado, sublimação ou DTF.
- Usar a peça já gerada e a arte enviada como referências separadas, preservando formato, cores e proporções da peça e da logo.
- Registrar posição e técnica junto aos dados do rascunho salvo.

## Resultado esperado

O usuário gera a peça base, envia uma logo ou estampa, escolhe onde e como aplicá-la e gera uma nova imagem com essa aplicação. O resultado continua disponível no histórico e nos formatos de exportação existentes.

## Detalhes técnicos

- Ampliar o envio de referências da geração de imagem para aceitar a peça e a arte na mesma solicitação, em ordem definida.
- Manter autenticação, transparência PNG, geração progressiva e mensagens de erro existentes.
- Validar tipo e tamanho do arquivo antes de enviar e usar os campos padronizados do design system.
- Conferir compilação e testar o fluxo no navegador em tela real.
