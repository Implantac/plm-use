# H2-04 · Padrão de eventos (`entity_events`)

Toda mudança relevante do PLM emite evento. Timeline, dashboard, BI e IA
consomem daqui.

## Schema resumido

`entity_events(entity_type text, entity_id uuid, event_type text,
from_status text, to_status text, actor uuid, payload jsonb, created_at)`

## Convenção `event_type`

- `created`
- `updated`
- `status_changed`
- `assigned`
- `commented`
- `approved` / `rejected`
- `published` / `archived` / `deleted`
- Específicos por domínio: `piloto.rodada_added`, `capa.action_completed`,
  `pcp.lote_split`, `tech_sheet.version_published`

Regra: `<domínio>.<verbo_passado>` — sempre passado, sempre em `snake_case`.

## Trigger de referência

Copie de `log_reference_status_change` ou `log_piloto_status_change` (já no
banco). Padrão:

```sql
CREATE OR REPLACE FUNCTION public.log_<entity>_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type,
      from_status, to_status, actor, payload)
    VALUES ('<entity>', NEW.id, 'created', NULL, NEW.status, NEW.created_by,
      jsonb_build_object(<campos relevantes>));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type,
      from_status, to_status, actor, payload)
    VALUES ('<entity>', NEW.id, 'status_changed', OLD.status, NEW.status,
      NEW.updated_by, jsonb_build_object(<campos relevantes>));
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER <entity>_log_change
  AFTER INSERT OR UPDATE ON public.<entity>
  FOR EACH ROW EXECUTE FUNCTION public.log_<entity>_change();
```

## Payload
- Mantenha pequeno. IDs relacionados, código humano-legível, delta relevante.
- **Nunca** copie a linha inteira para `payload`. Isso duplica dado e engorda BI.
- Nada de PII ou secret em `payload`.

## Consumo
- **UI:** `EntityTimeline` (`src/components/entity/EntityTimeline.tsx`).
- **IA:** `src/lib/ai/live-context.functions.ts` já lê 72h de eventos.
- **BI:** views materializadas em cima de `entity_events` (H7 dirá).

## Anti-padrões
- Emitir evento pelo cliente (`supabase.from('entity_events').insert(...)`). Cliente pode mentir.
- Emitir evento **antes** da mutação (o evento vira promessa não cumprida se a mutação falhar).
- Um evento por campo alterado (spam).
- Sem trigger — deixando pro código lembrar.
