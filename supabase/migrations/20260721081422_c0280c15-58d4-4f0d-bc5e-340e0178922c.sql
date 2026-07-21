
-- ============================================================
-- ORG STRUCTURES (nested departments/units)
-- ============================================================
CREATE TABLE public.org_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.org_structures(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'Departament',
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_structures_org ON public.org_structures(organization_id);
CREATE INDEX idx_org_structures_parent ON public.org_structures(parent_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_structures TO authenticated;
GRANT ALL ON public.org_structures TO service_role;
ALTER TABLE public.org_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_structures_select_members" ON public.org_structures
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_platform_super_admin(auth.uid()));

CREATE POLICY "org_structures_manage_hr" ON public.org_structures
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), organization_id, 'structure.manage') OR public.is_platform_super_admin(auth.uid()))
  WITH CHECK (public.has_permission(auth.uid(), organization_id, 'structure.manage') OR public.is_platform_super_admin(auth.uid()));

CREATE TRIGGER trg_org_structures_updated_at
  BEFORE UPDATE ON public.org_structures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ORG EMPLOYEES
-- ============================================================
CREATE TABLE public.org_employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  father_name TEXT,
  fin TEXT,
  phone TEXT,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  salary NUMERIC(14,2),
  is_star_person BOOLEAN NOT NULL DEFAULT false,
  structure_path TEXT,
  position_name TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, fin)
);
CREATE INDEX idx_org_employees_org ON public.org_employees(organization_id);
CREATE INDEX idx_org_employees_auth ON public.org_employees(auth_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_employees TO authenticated;
GRANT ALL ON public.org_employees TO service_role;
ALTER TABLE public.org_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_employees_select_members" ON public.org_employees
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_platform_super_admin(auth.uid()));

CREATE POLICY "org_employees_manage_hr" ON public.org_employees
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), organization_id, 'employees.manage') OR public.is_platform_super_admin(auth.uid()))
  WITH CHECK (public.has_permission(auth.uid(), organization_id, 'employees.manage') OR public.is_platform_super_admin(auth.uid()));

CREATE TRIGGER trg_org_employees_updated_at
  BEFORE UPDATE ON public.org_employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ORG POSITIONS
-- ============================================================
CREATE TABLE public.org_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  structure_id UUID NOT NULL REFERENCES public.org_structures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_positions_org ON public.org_positions(organization_id);
CREATE INDEX idx_org_positions_structure ON public.org_positions(structure_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_positions TO authenticated;
GRANT ALL ON public.org_positions TO service_role;
ALTER TABLE public.org_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_positions_select_members" ON public.org_positions
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_platform_super_admin(auth.uid()));

CREATE POLICY "org_positions_manage_hr" ON public.org_positions
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), organization_id, 'structure.manage') OR public.is_platform_super_admin(auth.uid()))
  WITH CHECK (public.has_permission(auth.uid(), organization_id, 'structure.manage') OR public.is_platform_super_admin(auth.uid()));

CREATE TRIGGER trg_org_positions_updated_at
  BEFORE UPDATE ON public.org_positions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ORG SLOTS (ştat units)
-- ============================================================
CREATE TABLE public.org_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.org_positions(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.org_employees(id) ON DELETE SET NULL,
  salary NUMERIC(14,2),
  fraction NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT org_slots_fraction_chk CHECK (fraction IN (1.00, 0.75, 0.50, 0.25))
);
CREATE INDEX idx_org_slots_org ON public.org_slots(organization_id);
CREATE INDEX idx_org_slots_position ON public.org_slots(position_id);
CREATE INDEX idx_org_slots_employee ON public.org_slots(employee_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_slots TO authenticated;
GRANT ALL ON public.org_slots TO service_role;
ALTER TABLE public.org_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_slots_select_members" ON public.org_slots
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_platform_super_admin(auth.uid()));

CREATE POLICY "org_slots_manage_hr" ON public.org_slots
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), organization_id, 'structure.manage') OR public.is_platform_super_admin(auth.uid()))
  WITH CHECK (public.has_permission(auth.uid(), organization_id, 'structure.manage') OR public.is_platform_super_admin(auth.uid()));

CREATE TRIGGER trg_org_slots_updated_at
  BEFORE UPDATE ON public.org_slots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
