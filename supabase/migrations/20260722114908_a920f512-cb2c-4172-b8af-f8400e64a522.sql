GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_card_targets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_card_history TO authenticated;

GRANT ALL ON public.kpi_cards TO service_role;
GRANT ALL ON public.kpi_card_targets TO service_role;
GRANT ALL ON public.kpi_card_history TO service_role;