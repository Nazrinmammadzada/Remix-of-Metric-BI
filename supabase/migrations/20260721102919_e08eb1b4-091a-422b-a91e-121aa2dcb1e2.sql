
-- ── Reusable updated_at trigger (already exists in project, but idempotent) ──
CREATE OR REPLACE FUNCTION public.set_updated_at_v2()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. org_matrices
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.org_matrices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  matrix_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, matrix_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_matrices TO authenticated;
GRANT ALL ON public.org_matrices TO service_role;
ALTER TABLE public.org_matrices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read matrices" ON public.org_matrices FOR SELECT TO authenticated
  USING (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members write matrices" ON public.org_matrices FOR ALL TO authenticated
  USING (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER org_matrices_updated_at BEFORE UPDATE ON public.org_matrices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_v2();

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. org_teams
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.org_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  structure_id UUID REFERENCES public.org_structures(id) ON DELETE SET NULL,
  members JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX org_teams_org_idx ON public.org_teams(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_teams TO authenticated;
GRANT ALL ON public.org_teams TO service_role;
ALTER TABLE public.org_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read teams" ON public.org_teams FOR SELECT TO authenticated
  USING (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members write teams" ON public.org_teams FOR ALL TO authenticated
  USING (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER org_teams_updated_at BEFORE UPDATE ON public.org_teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_v2();

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. org_salaries
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.org_salaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.org_employees(id) ON DELETE CASCADE,
  employee_email TEXT,
  base_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'AZN',
  effective_date DATE,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX org_salaries_org_idx ON public.org_salaries(organization_id);
CREATE INDEX org_salaries_employee_idx ON public.org_salaries(employee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_salaries TO authenticated;
GRANT ALL ON public.org_salaries TO service_role;
ALTER TABLE public.org_salaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read salaries" ON public.org_salaries FOR SELECT TO authenticated
  USING (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members write salaries" ON public.org_salaries FOR ALL TO authenticated
  USING (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER org_salaries_updated_at BEFORE UPDATE ON public.org_salaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_v2();

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. org_salary_uploads
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.org_salary_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_file TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  rows_total INTEGER NOT NULL DEFAULT 0,
  rows_success INTEGER NOT NULL DEFAULT 0,
  rows_failed INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX org_salary_uploads_org_idx ON public.org_salary_uploads(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_salary_uploads TO authenticated;
GRANT ALL ON public.org_salary_uploads TO service_role;
ALTER TABLE public.org_salary_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read salary uploads" ON public.org_salary_uploads FOR SELECT TO authenticated
  USING (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members write salary uploads" ON public.org_salary_uploads FOR ALL TO authenticated
  USING (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER org_salary_uploads_updated_at BEFORE UPDATE ON public.org_salary_uploads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_v2();

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. org_formulas
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.org_formulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  expression TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX org_formulas_org_idx ON public.org_formulas(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_formulas TO authenticated;
GRANT ALL ON public.org_formulas TO service_role;
ALTER TABLE public.org_formulas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read formulas" ON public.org_formulas FOR SELECT TO authenticated
  USING (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members write formulas" ON public.org_formulas FOR ALL TO authenticated
  USING (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER org_formulas_updated_at BEFORE UPDATE ON public.org_formulas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_v2();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. org_formula_assignments
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.org_formula_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  formula_id UUID NOT NULL REFERENCES public.org_formulas(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, formula_id, target_type, target_id)
);
CREATE INDEX org_formula_assignments_org_idx ON public.org_formula_assignments(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_formula_assignments TO authenticated;
GRANT ALL ON public.org_formula_assignments TO service_role;
ALTER TABLE public.org_formula_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read formula assignments" ON public.org_formula_assignments FOR SELECT TO authenticated
  USING (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members write formula assignments" ON public.org_formula_assignments FOR ALL TO authenticated
  USING (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER org_formula_assignments_updated_at BEFORE UPDATE ON public.org_formula_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_v2();

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. org_catalogs
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.org_catalogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  catalog_key TEXT NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, catalog_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_catalogs TO authenticated;
GRANT ALL ON public.org_catalogs TO service_role;
ALTER TABLE public.org_catalogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read catalogs" ON public.org_catalogs FOR SELECT TO authenticated
  USING (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members write catalogs" ON public.org_catalogs FOR ALL TO authenticated
  USING (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER org_catalogs_updated_at BEFORE UPDATE ON public.org_catalogs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_v2();

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. org_dropdown_catalogs
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.org_dropdown_catalogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dropdown_key TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, dropdown_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_dropdown_catalogs TO authenticated;
GRANT ALL ON public.org_dropdown_catalogs TO service_role;
ALTER TABLE public.org_dropdown_catalogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read dropdown catalogs" ON public.org_dropdown_catalogs FOR SELECT TO authenticated
  USING (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members write dropdown catalogs" ON public.org_dropdown_catalogs FOR ALL TO authenticated
  USING (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER org_dropdown_catalogs_updated_at BEFORE UPDATE ON public.org_dropdown_catalogs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_v2();
