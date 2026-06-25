
CREATE TYPE public.kpi_card_status_enum AS ENUM ('natamam', 'tesdiq_gozlenilir', 'imtina', 'aktiv');

CREATE TABLE public.kpi_card_status (
  card_id BIGINT PRIMARY KEY,
  status public.kpi_card_status_enum NOT NULL DEFAULT 'natamam',
  use_matrix BOOLEAN NOT NULL DEFAULT false,
  submitted_for_approval BOOLEAN NOT NULL DEFAULT false,
  rejected_by TEXT,
  rejected_at TIMESTAMPTZ,
  assignees JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_card_status TO authenticated;
GRANT SELECT ON public.kpi_card_status TO anon;
GRANT ALL ON public.kpi_card_status TO service_role;

ALTER TABLE public.kpi_card_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view KPI card statuses"
  ON public.kpi_card_status FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert KPI card statuses"
  ON public.kpi_card_status FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update KPI card statuses"
  ON public.kpi_card_status FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete KPI card statuses"
  ON public.kpi_card_status FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_kpi_card_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_kpi_card_status_updated_at
  BEFORE UPDATE ON public.kpi_card_status
  FOR EACH ROW EXECUTE FUNCTION public.set_kpi_card_status_updated_at();
