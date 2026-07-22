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
            COALESCE(NULLIF(lower(trim(COALESCE(elem->>'subKpiName', ''))), ''), '__blank_target__')
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