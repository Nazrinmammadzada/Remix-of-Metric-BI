CREATE UNIQUE INDEX IF NOT EXISTS org_slots_unique_employee_per_position
  ON public.org_slots (organization_id, position_id, employee_id)
  WHERE employee_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS org_slots_unique_employee_per_org
  ON public.org_slots (organization_id, employee_id)
  WHERE employee_id IS NOT NULL;