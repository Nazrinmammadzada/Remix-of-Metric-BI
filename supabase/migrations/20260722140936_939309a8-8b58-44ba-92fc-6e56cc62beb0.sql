UPDATE public.org_catalogs
SET entries = entries
WHERE catalog_key IN ('kpi_set_entries', 'cascade_tree');