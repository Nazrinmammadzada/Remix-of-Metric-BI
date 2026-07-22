REVOKE ALL ON FUNCTION public.dedupe_kpi_set_entries_json(jsonb) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.dedupe_kpi_set_entries_catalog_trigger() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.dedupe_cascade_tree_json(jsonb) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.dedupe_cascade_tree_catalog_trigger() FROM anon, authenticated;