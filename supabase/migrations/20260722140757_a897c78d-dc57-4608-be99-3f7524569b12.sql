CREATE UNIQUE INDEX IF NOT EXISTS ux_kpi_cards_org_legacy_numeric
ON public.kpi_cards (organization_id, legacy_numeric_id)
WHERE legacy_numeric_id IS NOT NULL;