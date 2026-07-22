CREATE OR REPLACE FUNCTION public.dedupe_kpi_set_entries_json(_entries jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(elem ORDER BY sort_ts DESC), '[]'::jsonb)
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
          ORDER BY
            CASE WHEN elem->>'status' = 'completed' THEN 1 ELSE 0 END DESC,
            COALESCE(NULLIF(elem->>'updatedAt', '')::numeric, 0) DESC
        ) AS rn
      FROM jsonb_array_elements(COALESCE(_entries, '[]'::jsonb)) elem
    ) ranked
    WHERE rn = 1
  ) kept;
$$;

CREATE OR REPLACE FUNCTION public.dedupe_kpi_set_entries_catalog_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.catalog_key = 'kpi_set_entries' THEN
    NEW.entries := public.dedupe_kpi_set_entries_json(NEW.entries);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dedupe_kpi_set_entries_before_save ON public.org_catalogs;
CREATE TRIGGER dedupe_kpi_set_entries_before_save
BEFORE INSERT OR UPDATE ON public.org_catalogs
FOR EACH ROW
EXECUTE FUNCTION public.dedupe_kpi_set_entries_catalog_trigger();

REVOKE ALL ON FUNCTION public.dedupe_kpi_set_entries_json(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dedupe_kpi_set_entries_catalog_trigger() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dedupe_kpi_set_entries_json(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.dedupe_kpi_set_entries_catalog_trigger() TO service_role;