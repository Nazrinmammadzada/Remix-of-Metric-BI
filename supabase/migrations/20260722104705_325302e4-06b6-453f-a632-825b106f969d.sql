DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.salary_records WHERE employee_id IS NULL
  ) THEN
    DELETE FROM public.salary_records WHERE employee_id IS NULL;
  END IF;
END $$;

ALTER TABLE public.salary_records
  ALTER COLUMN employee_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'salary_records_employee_id_fkey'
      AND conrelid = 'public.salary_records'::regclass
  ) THEN
    ALTER TABLE public.salary_records
      ADD CONSTRAINT salary_records_employee_id_fkey
      FOREIGN KEY (employee_id)
      REFERENCES public.org_employees(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'salary_records_org_employee_key'
      AND conrelid = 'public.salary_records'::regclass
  ) THEN
    ALTER TABLE public.salary_records
      ADD CONSTRAINT salary_records_org_employee_key
      UNIQUE (organization_id, employee_id);
  END IF;
END $$;