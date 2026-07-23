DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'kpi_lifecycles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kpi_lifecycles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'lifecycle_templates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lifecycle_templates;
  END IF;
END $$;