CREATE OR REPLACE FUNCTION public.dedupe_kpi_set_entries_catalog_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.catalog_key = 'kpi_set_entries' THEN
    SELECT COALESCE(jsonb_agg(elem ORDER BY sort_ts DESC), '[]'::jsonb)
    INTO NEW.entries
    FROM (
      SELECT elem, sort_ts
      FROM (
        SELECT
          elem,
          COALESCE(NULLIF(elem->>'updatedAt', '')::numeric, 0) AS sort_ts,
          row_number() OVER (
            PARTITION BY concat(
              COALESCE(elem->>'cardId', ''), '::',
              COALESCE(elem->>'assigneeId', lower(trim(split_part(COALESCE(elem->>'assigneeName', ''), '—', 1))))
            )
            ORDER BY CASE WHEN elem->>'status' = 'completed' THEN 1 ELSE 0 END DESC,
                     COALESCE(NULLIF(elem->>'updatedAt', '')::numeric, 0) DESC
          ) AS rn
        FROM jsonb_array_elements(COALESCE(NEW.entries, '[]'::jsonb)) elem
      ) ranked
      WHERE rn = 1
    ) kept;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.dedupe_cascade_tree_catalog_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.catalog_key = 'cascade_tree' THEN
    SELECT COALESCE(jsonb_agg(elem ORDER BY sort_ts DESC), '[]'::jsonb)
    INTO NEW.entries
    FROM (
      SELECT elem, sort_ts
      FROM (
        SELECT
          elem,
          COALESCE(NULLIF(elem->>'updatedAt', '')::numeric, NULLIF(elem->>'createdAt', '')::numeric, 0) AS sort_ts,
          row_number() OVER (
            PARTITION BY concat(
              COALESCE(elem->>'parentId', 'root'), '::',
              COALESCE(elem->>'rootId', ''), '::',
              lower(trim(COALESCE(elem->>'cardName', ''))), '::',
              lower(trim(COALESCE(elem->>'goalName', ''))), '::',
              COALESCE(elem->>'assigneeId', lower(trim(COALESCE(elem->>'assigneeName', ''))))
            )
            ORDER BY COALESCE(NULLIF(elem->>'updatedAt', '')::numeric, NULLIF(elem->>'createdAt', '')::numeric, 0) DESC
          ) AS rn
        FROM jsonb_array_elements(COALESCE(NEW.entries, '[]'::jsonb)) elem
      ) ranked
      WHERE rn = 1
    ) kept;
  END IF;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.dedupe_kpi_set_entries_json(jsonb);
DROP FUNCTION IF EXISTS public.dedupe_cascade_tree_json(jsonb);
REVOKE ALL ON FUNCTION public.dedupe_kpi_set_entries_catalog_trigger() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.dedupe_cascade_tree_catalog_trigger() FROM PUBLIC, anon, authenticated, service_role;