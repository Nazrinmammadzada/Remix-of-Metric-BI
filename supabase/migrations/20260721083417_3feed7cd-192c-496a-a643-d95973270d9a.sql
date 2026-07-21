
CREATE TABLE public.bonus_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL,
  employee_local_id TEXT,
  employee_name TEXT NOT NULL,
  department TEXT,
  base_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
  weighted_score NUMERIC(7,2) NOT NULL DEFAULT 0,
  achievement_pct NUMERIC(7,2) NOT NULL DEFAULT 0,
  bonus_pct NUMERIC(7,2) NOT NULL DEFAULT 0,
  cap_pct NUMERIC(7,2) NOT NULL DEFAULT 0,
  bonus_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'AZN',
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX bonus_runs_org_period_idx ON public.bonus_runs(organization_id, period_label);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bonus_runs TO authenticated;
GRANT ALL ON public.bonus_runs TO service_role;
ALTER TABLE public.bonus_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage bonus runs" ON public.bonus_runs
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER bonus_runs_updated_at BEFORE UPDATE ON public.bonus_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
