
CREATE TABLE public.kpi_lifecycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  card_local_id INT NOT NULL,
  card_name TEXT NOT NULL,
  assignment JSONB,
  evaluation JSONB,
  bonus JSONB,
  reviews JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, card_local_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_lifecycles TO authenticated;
GRANT ALL ON public.kpi_lifecycles TO service_role;
ALTER TABLE public.kpi_lifecycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage lifecycles" ON public.kpi_lifecycles
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER kpi_lifecycles_updated_at BEFORE UPDATE ON public.kpi_lifecycles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lifecycle_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, local_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lifecycle_templates TO authenticated;
GRANT ALL ON public.lifecycle_templates TO service_role;
ALTER TABLE public.lifecycle_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage lifecycle templates" ON public.lifecycle_templates
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER lifecycle_templates_updated_at BEFORE UPDATE ON public.lifecycle_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
