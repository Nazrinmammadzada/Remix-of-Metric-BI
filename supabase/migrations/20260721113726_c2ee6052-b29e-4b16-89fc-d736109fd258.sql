INSERT INTO public.permissions (code, module, resource, action, description) VALUES
  ('employees.manage','employees','employees','manage','Manage employees'),
  ('structure.manage','structure','structure','manage','Manage org structure'),
  ('kpi.manage','kpi','kpi','manage','Manage KPI cards'),
  ('approval_matrices.manage','approval','approval_matrices','manage','Manage approval matrices'),
  ('lifecycle.manage','lifecycle','lifecycle','manage','Manage lifecycles'),
  ('notifications.manage','notifications','notifications','manage','Manage notifications'),
  ('audit.view','audit','audit_logs','view','View audit logs')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'hr_admin'
  AND p.code IN (
    'employees.manage','structure.manage','kpi.manage',
    'approval_matrices.manage','lifecycle.manage',
    'notifications.manage','audit.view'
  )
ON CONFLICT DO NOTHING;