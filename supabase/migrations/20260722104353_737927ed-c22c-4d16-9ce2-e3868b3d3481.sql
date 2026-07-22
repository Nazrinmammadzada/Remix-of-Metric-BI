ALTER TABLE public.salary_records
  ADD COLUMN IF NOT EXISTS employee_id uuid;

UPDATE public.salary_records sr
SET employee_id = oe.id
FROM public.org_employees oe
WHERE sr.employee_id IS NULL
  AND oe.organization_id = sr.organization_id
  AND oe.id::text = (
    SELECT key
    FROM jsonb_each_text(COALESCE((
      SELECT entries
      FROM public.org_catalogs oc
      WHERE oc.organization_id = sr.organization_id
        AND oc.catalog_key = 'org_idmap'
      LIMIT 1
    ), '{}'::jsonb))
    WHERE value::int = sr.employee_legacy_id
    LIMIT 1
  );

CREATE INDEX IF NOT EXISTS idx_salary_records_org_employee
  ON public.salary_records (organization_id, employee_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_records TO authenticated;
GRANT ALL ON public.salary_records TO service_role;

ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;