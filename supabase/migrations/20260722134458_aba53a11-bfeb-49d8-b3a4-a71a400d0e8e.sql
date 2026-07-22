DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'kpi_cards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kpi_cards;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'kpi_card_targets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kpi_card_targets;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'kpi_card_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kpi_card_history;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'approval_queue'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_queue;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'approval_matrices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_matrices;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'org_catalogs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.org_catalogs;
  END IF;
END $$;