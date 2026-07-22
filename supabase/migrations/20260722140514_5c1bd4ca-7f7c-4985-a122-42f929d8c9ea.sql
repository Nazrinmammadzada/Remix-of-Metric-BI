-- Clean duplicate KPI target-setting entries stored in org_catalogs JSON payloads
UPDATE public.org_catalogs oc
SET entries = COALESCE(deduped.entries, '[]'::jsonb)
FROM (
  SELECT id, jsonb_agg(elem ORDER BY sort_ts DESC) AS entries
  FROM (
    SELECT
      oc_inner.id,
      elem,
      COALESCE(NULLIF(elem->>'updatedAt', '')::numeric, 0) AS sort_ts,
      row_number() OVER (
        PARTITION BY oc_inner.id,
          concat(
            COALESCE(elem->>'cardId', ''), '::',
            COALESCE(elem->>'assigneeId', lower(trim(split_part(COALESCE(elem->>'assigneeName', ''), '—', 1)))), '::',
            COALESCE(NULLIF(lower(trim(COALESCE(elem->>'subKpiName', ''))), ''), elem->>'subKpiId', '')
          )
        ORDER BY
          CASE WHEN elem->>'status' = 'completed' THEN 1 ELSE 0 END DESC,
          COALESCE(NULLIF(elem->>'updatedAt', '')::numeric, 0) DESC
      ) AS rn
    FROM public.org_catalogs oc_inner
    CROSS JOIN LATERAL jsonb_array_elements(oc_inner.entries::jsonb) elem
    WHERE oc_inner.catalog_key = 'kpi_set_entries'
  ) ranked
  WHERE rn = 1
  GROUP BY id
) deduped
WHERE oc.id = deduped.id
  AND oc.catalog_key = 'kpi_set_entries';

-- Clean duplicate cascade tree nodes stored in org_catalogs JSON payloads
UPDATE public.org_catalogs oc
SET entries = COALESCE(deduped.entries, '[]'::jsonb)
FROM (
  SELECT id, jsonb_agg(elem ORDER BY sort_ts DESC) AS entries
  FROM (
    SELECT
      oc_inner.id,
      elem,
      COALESCE(NULLIF(elem->>'updatedAt', '')::numeric, NULLIF(elem->>'createdAt', '')::numeric, 0) AS sort_ts,
      row_number() OVER (
        PARTITION BY oc_inner.id,
          concat(
            COALESCE(elem->>'parentId', 'root'), '::',
            lower(trim(COALESCE(elem->>'cardName', ''))), '::',
            lower(trim(COALESCE(elem->>'goalName', ''))), '::',
            COALESCE(elem->>'assigneeId', lower(trim(COALESCE(elem->>'assigneeName', ''))))
          )
        ORDER BY COALESCE(NULLIF(elem->>'updatedAt', '')::numeric, NULLIF(elem->>'createdAt', '')::numeric, 0) DESC
      ) AS rn
    FROM public.org_catalogs oc_inner
    CROSS JOIN LATERAL jsonb_array_elements(oc_inner.entries::jsonb) elem
    WHERE oc_inner.catalog_key = 'cascade_tree'
  ) ranked
  WHERE rn = 1
  GROUP BY id
) deduped
WHERE oc.id = deduped.id
  AND oc.catalog_key = 'cascade_tree';

-- Remove repeated KPI card rows inside the same organization, keeping the newest row.
WITH ranked_cards AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY organization_id,
        COALESCE(legacy_numeric_id::text, lower(trim(name)) || '|' || COALESCE(owner_employee_id, '') || '|' || COALESCE(start_date::text, '') || '|' || COALESCE(end_date::text, ''))
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS rn
  FROM public.kpi_cards
), duplicate_cards AS (
  SELECT id FROM ranked_cards WHERE rn > 1
)
DELETE FROM public.kpi_cards kc
USING duplicate_cards d
WHERE kc.id = d.id;

-- Future protection for cards that do not have a legacy numeric id.
CREATE UNIQUE INDEX IF NOT EXISTS ux_kpi_cards_org_natural_when_no_legacy
ON public.kpi_cards (
  organization_id,
  lower(trim(name)),
  COALESCE(owner_employee_id, ''),
  COALESCE(start_date, DATE '0001-01-01'),
  COALESCE(end_date, DATE '0001-01-01')
)
WHERE legacy_numeric_id IS NULL;