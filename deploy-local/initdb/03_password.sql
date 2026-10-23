-- Reconcilia a senha do role postgres com o literal do compose.
-- Volumes criados ANTES da dupla seguranca podem ter senha divergente
-- (ou corrompida por \r de .env editado no Bloco de Notas). Via socket do
-- container a linha 'local all all trust' do Docker vale sempre, entao este
-- ALTER funciona em QUALQUER estado do volume e e a rede de seguranca do sed.
ALTER USER postgres PASSWORD 'PLMLocal2026';
