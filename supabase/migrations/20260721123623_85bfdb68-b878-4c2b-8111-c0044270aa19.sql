INSERT INTO public.permissions (code, module, resource, action, description) VALUES
  ('kpi.view_own', 'kpi', 'kpi', 'view_own', 'Öz KPI-larını görmə'),
  ('kpi.view_team', 'kpi', 'kpi', 'view_team', 'Komanda KPI-larını görmə'),
  ('kpi.view_all', 'kpi', 'kpi', 'view_all', 'Bütün KPI-ları görmə'),
  ('employees.view_own', 'employees', 'employees', 'view_own', 'Öz profilini görmə'),
  ('employees.view_team', 'employees', 'employees', 'view_team', 'Komanda əməkdaşlarını görmə'),
  ('employees.view_all', 'employees', 'employees', 'view_all', 'Bütün əməkdaşları görmə'),
  ('approvals.view_own', 'approvals', 'approvals', 'view_own', 'Öz təsdiqlərini görmə'),
  ('approvals.view_team', 'approvals', 'approvals', 'view_team', 'Komanda təsdiqlərini görmə'),
  ('approvals.view_all', 'approvals', 'approvals', 'view_all', 'Bütün təsdiqləri görmə')
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE r RECORD; p RECORD;
BEGIN
  FOR r IN SELECT id, code FROM public.roles WHERE code IN ('hr','manager','user','hr_admin') LOOP
    FOR p IN SELECT id, code FROM public.permissions WHERE code IN (
      'kpi.view_own','kpi.view_team','kpi.view_all',
      'employees.view_own','employees.view_team','employees.view_all',
      'approvals.view_own','approvals.view_team','approvals.view_all'
    ) LOOP
      IF (r.code IN ('hr','hr_admin'))
         OR (r.code='manager' AND p.code IN ('kpi.view_own','kpi.view_team','employees.view_own','employees.view_team','approvals.view_own','approvals.view_team'))
         OR (r.code='user' AND p.code IN ('kpi.view_own','employees.view_own','approvals.view_own'))
      THEN
        INSERT INTO public.role_permissions (role_id, permission_id) VALUES (r.id, p.id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;