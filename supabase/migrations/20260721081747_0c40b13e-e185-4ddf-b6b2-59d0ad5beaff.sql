
-- ============================================================
-- KPI CARDS
-- ============================================================
CREATE TABLE public.kpi_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Legacy numeric id used by the wizard-driven UI (per-org unique so
  -- localStorage caches keep referring to the same row after re-hydration).
  legacy_numeric_id BIGINT,
  name TEXT NOT NULL,
  owner_employee_id TEXT,
  matrix_id TEXT,
  status TEXT NOT NULL DEFAULT 'natamam',
  rejected_reason TEXT,
  rejected_by TEXT,
  rejected_at TIMESTAMPTZ,
  use_matrix BOOLEAN NOT NULL DEFAULT false,
  submitted_for_approval BOOLEAN NOT NULL DEFAULT false,
  start_date DATE,
  end_date DATE,
  frequency TEXT,
  scoring_system TEXT,
  -- Loose associations (kept as text arrays until those modules migrate to UUIDs)
  evaluator_ids TEXT[] NOT NULL DEFAULT '{}',
  assignee_ids TEXT[] NOT NULL DEFAULT '{}',
  structure_ids TEXT[] NOT NULL DEFAULT '{}',
  team_ids TEXT[] NOT NULL DEFAULT '{}',
  execution JSONB NOT NULL DEFAULT '{}'::jsonb,
  assignees JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, legacy_numeric_id)
);
CREATE INDEX idx_kpi_cards_org ON public.kpi_cards(organization_id);
CREATE INDEX idx_kpi_cards_status ON public.kpi_cards(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_cards TO authenticated;
GRANT ALL ON public.kpi_cards TO service_role;
ALTER TABLE public.kpi_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kpi_cards_select_members" ON public.kpi_cards
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_platform_super_admin(auth.uid()));

CREATE POLICY "kpi_cards_manage_hr" ON public.kpi_cards
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), organization_id, 'kpi.manage') OR public.is_platform_super_admin(auth.uid()))
  WITH CHECK (public.has_permission(auth.uid(), organization_id, 'kpi.manage') OR public.is_platform_super_admin(auth.uid()));

CREATE TRIGGER trg_kpi_cards_updated_at
  BEFORE UPDATE ON public.kpi_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- KPI CARD TARGETS
-- ============================================================
CREATE TABLE public.kpi_card_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kpi_card_id UUID NOT NULL REFERENCES public.kpi_cards(id) ON DELETE CASCADE,
  legacy_id TEXT,
  name TEXT NOT NULL,
  type TEXT,
  weight NUMERIC(6,2) NOT NULL DEFAULT 0,
  score_limit NUMERIC(6,2),
  target_value TEXT,
  unit TEXT,
  cascading BOOLEAN NOT NULL DEFAULT false,
  created_by_mode TEXT,
  assigner TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_kpi_targets_card ON public.kpi_card_targets(kpi_card_id);
CREATE INDEX idx_kpi_targets_org ON public.kpi_card_targets(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_card_targets TO authenticated;
GRANT ALL ON public.kpi_card_targets TO service_role;
ALTER TABLE public.kpi_card_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kpi_targets_select_members" ON public.kpi_card_targets
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_platform_super_admin(auth.uid()));

CREATE POLICY "kpi_targets_manage_hr" ON public.kpi_card_targets
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), organization_id, 'kpi.manage') OR public.is_platform_super_admin(auth.uid()))
  WITH CHECK (public.has_permission(auth.uid(), organization_id, 'kpi.manage') OR public.is_platform_super_admin(auth.uid()));

CREATE TRIGGER trg_kpi_targets_updated_at
  BEFORE UPDATE ON public.kpi_card_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- KPI CARD HISTORY
-- ============================================================
CREATE TABLE public.kpi_card_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kpi_card_id UUID NOT NULL REFERENCES public.kpi_cards(id) ON DELETE CASCADE,
  actor TEXT,
  action TEXT NOT NULL,
  note TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_kpi_history_card ON public.kpi_card_history(kpi_card_id);
CREATE INDEX idx_kpi_history_org ON public.kpi_card_history(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_card_history TO authenticated;
GRANT ALL ON public.kpi_card_history TO service_role;
ALTER TABLE public.kpi_card_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kpi_history_select_members" ON public.kpi_card_history
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_platform_super_admin(auth.uid()));

CREATE POLICY "kpi_history_manage_hr" ON public.kpi_card_history
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), organization_id, 'kpi.manage') OR public.is_platform_super_admin(auth.uid()))
  WITH CHECK (public.has_permission(auth.uid(), organization_id, 'kpi.manage') OR public.is_platform_super_admin(auth.uid()));
