# Guia de Aplicação Opcional em Produção — PLM Fluido 2.0 + Fundação Multi-Tenant + CAD

**Arquivo SQL:** `docs/producao/2026-10-30_PLM-FLUIDO-MULTITENANT.sql`  
**Compatibilidade com Karilu (produção atual):** **100% retrocompatível**. O front-end novo sobe e opera integralmente **antes** ou **depois** deste SQL ser aplicado.

## O que já funciona sem rodar SQL nenhum

1. **Cockpit Fluido da Ficha Técnica (`/tech-sheet`)**: armazena `meta`, `colorways`, `medidas` (graduação automática), `etiquetagem` (ABNT/INMETRO), `encaixeCad` e `preCost` (Mark-up Divisor Fiscal BR) dentro do envelope versionado `tech_sheets.bom` (`v: 3`), mantendo leitura total de fichas `v: 1` e `v: 2`.
2. **Ponte Ficha PLM → Catálogo Técnico (`Publicar no Catálogo`)**: grava diretamente nas tabelas já existentes `catalog_products`, `catalog_option_groups` e `catalog_options` (respeitando `kind IN ('tecido','aviamento','linha','embalagem','servico')`).
3. **Correção P0 de Sincronização (`creative-sync.ts`)**: bloqueia push antes de hidratação bem-sucedida e substitui a poda global (`DELETE NOT IN`) por exclusão seletiva apenas das chaves removidas na sessão.
4. **CAD (`/cad`) e Pilotagem (`/prototypes`)**: persistem localmente e sincronizam com `pilotos` (já existente) e oportunisticamente com `cad_markers`.

## O que este SQL habilita quando aplicado no SQL Editor do Lovable Cloud

1. **`public.tenants` + `public.tenant_memberships` + `public.current_tenant_id()`**: cria o tenant padrão (`00000000-0000-0000-0000-000000000001` — _Operação Principal_) e adiciona `tenant_id` com `DEFAULT public.current_tenant_id()` nas tabelas de domínio, sem quebrar nenhuma query legada.
2. **`public.cad_markers`**: persistência em nuvem multiusuário dos moldes `.ADS`/`.DXF`/`.PLT` e percentuais de encaixe/encolhimento com RLS por tenant.
3. **`public.erp_sync_outbox`**: fila idempotente para publicação assíncrona de explosão de SKUs e Ordens de Produção para o UseCloud ERP.

## Como aplicar

1. Abra **Lovable → Cloud → SQL Editor** (ou Supabase SQL Editor).
2. Cole o conteúdo integral de `docs/producao/2026-10-30_PLM-FLUIDO-MULTITENANT.sql` e execute.
3. O script é idempotente: pode ser reexecutado com segurança sem duplicar registros, triggers ou policies.
