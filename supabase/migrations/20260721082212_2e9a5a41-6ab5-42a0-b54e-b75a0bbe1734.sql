
CREATE TABLE public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  frequency TEXT,
  send_time TEXT,
  schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, local_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_settings TO authenticated;
GRANT ALL ON public.notification_settings TO service_role;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage notification settings" ON public.notification_settings
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER trg_notification_settings_updated_at BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.salary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  legacy_id INT NOT NULL,
  employee_legacy_id INT NOT NULL,
  operator TEXT,
  periods JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, legacy_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_records TO authenticated;
GRANT ALL ON public.salary_records TO service_role;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage salary records" ON public.salary_records
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER trg_salary_records_updated_at BEFORE UPDATE ON public.salary_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.salary_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  legacy_id INT NOT NULL,
  operator TEXT,
  year INT,
  month TEXT,
  status TEXT,
  total_amount NUMERIC,
  total_rows INT,
  matched INT,
  unmatched INT,
  file_name TEXT,
  uploaded_by TEXT,
  title TEXT,
  details JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, legacy_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_uploads TO authenticated;
GRANT ALL ON public.salary_uploads TO service_role;
ALTER TABLE public.salary_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage salary uploads" ON public.salary_uploads
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER trg_salary_uploads_updated_at BEFORE UPDATE ON public.salary_uploads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
