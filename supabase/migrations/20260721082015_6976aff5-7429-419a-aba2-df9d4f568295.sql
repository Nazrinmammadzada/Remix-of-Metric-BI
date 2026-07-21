
-- Approval matrices
CREATE TABLE public.approval_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mode TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, local_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_matrices TO authenticated;
GRANT ALL ON public.approval_matrices TO service_role;
ALTER TABLE public.approval_matrices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage approval matrices" ON public.approval_matrices
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER trg_approval_matrices_updated_at BEFORE UPDATE ON public.approval_matrices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Deletion matrices
CREATE TABLE public.deletion_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mode TEXT,
  approver JSONB,
  min_approvals INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, local_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deletion_matrices TO authenticated;
GRANT ALL ON public.deletion_matrices TO service_role;
ALTER TABLE public.deletion_matrices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage deletion matrices" ON public.deletion_matrices
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER trg_deletion_matrices_updated_at BEFORE UPDATE ON public.deletion_matrices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cascade matrices
CREATE TABLE public.cascade_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  name TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_name TEXT NOT NULL,
  shared_persons JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, local_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cascade_matrices TO authenticated;
GRANT ALL ON public.cascade_matrices TO service_role;
ALTER TABLE public.cascade_matrices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage cascade matrices" ON public.cascade_matrices
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER trg_cascade_matrices_updated_at BEFORE UPDATE ON public.cascade_matrices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Approval queue (KPI card approval requests)
CREATE TABLE public.approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  kpi_card_local_id TEXT NOT NULL,
  kpi_name TEXT NOT NULL,
  matrix_local_id TEXT,
  approver_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  decisions JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  steps_chain JSONB,
  current_step INT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, local_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_queue TO authenticated;
GRANT ALL ON public.approval_queue TO service_role;
ALTER TABLE public.approval_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage approval queue" ON public.approval_queue
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER trg_approval_queue_updated_at BEFORE UPDATE ON public.approval_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
