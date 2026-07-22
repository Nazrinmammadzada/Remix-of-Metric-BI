REVOKE ALL ON FUNCTION public.dedupe_kpi_set_entries_json(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dedupe_kpi_set_entries_catalog_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dedupe_cascade_tree_json(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dedupe_cascade_tree_catalog_trigger() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dedupe_kpi_set_entries_json(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.dedupe_kpi_set_entries_catalog_trigger() TO service_role;
GRANT EXECUTE ON FUNCTION public.dedupe_cascade_tree_json(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.dedupe_cascade_tree_catalog_trigger() TO service_role;