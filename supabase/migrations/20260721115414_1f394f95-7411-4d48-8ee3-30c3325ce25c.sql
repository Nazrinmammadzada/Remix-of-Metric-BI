DO $$
DECLARE
  org_rec RECORD;
  hr_role_id uuid;
  manager_role_id uuid;
  user_role_id uuid;
BEGIN
  -- Normalize existing HR role code to the requested default code.
  UPDATE public.roles
  SET code = 'hr', name = 'HR', description = COALESCE(description, 'HR rolu — təşkilat, əməkdaş, rol və KPI idarəetməsi')
  WHERE code = 'hr_admin' AND organization_id IS NOT NULL;

  UPDATE public.roles
  SET name = 'USER', description = COALESCE(description, 'User rolu — şəxsi profil, KPI və əsas istifadəçi görünüşləri')
  WHERE code = 'user' AND organization_id IS NOT NULL;

  FOR org_rec IN SELECT id FROM public.organizations LOOP
    -- Ensure HR role exists.
    INSERT INTO public.roles (organization_id, name, code, description, is_system_role, is_platform_role, is_active)
    VALUES (org_rec.id, 'HR', 'hr', 'HR rolu — təşkilat, əməkdaş, rol və KPI idarəetməsi', true, false, true)
    ON CONFLICT (organization_id, code) DO UPDATE
      SET name = 'HR', is_system_role = true, is_active = true,
          description = COALESCE(public.roles.description, EXCLUDED.description);

    -- Ensure Manager role exists.
    INSERT INTO public.roles (organization_id, name, code, description, is_system_role, is_platform_role, is_active)
    VALUES (org_rec.id, 'MANAGER', 'manager', 'Manager rolu — komanda KPI-ları, review və təsdiqlər üzrə idarəetmə', true, false, true)
    ON CONFLICT (organization_id, code) DO UPDATE
      SET name = 'MANAGER', is_system_role = true, is_active = true,
          description = COALESCE(public.roles.description, EXCLUDED.description);

    -- Ensure User role exists.
    INSERT INTO public.roles (organization_id, name, code, description, is_system_role, is_platform_role, is_active)
    VALUES (org_rec.id, 'USER', 'user', 'User rolu — şəxsi profil, KPI və əsas istifadəçi görünüşləri', true, false, true)
    ON CONFLICT (organization_id, code) DO UPDATE
      SET name = 'USER', is_system_role = true, is_active = true,
          description = COALESCE(public.roles.description, EXCLUDED.description);

    SELECT id INTO hr_role_id FROM public.roles WHERE organization_id = org_rec.id AND code = 'hr';
    SELECT id INTO manager_role_id FROM public.roles WHERE organization_id = org_rec.id AND code = 'manager';
    SELECT id INTO user_role_id FROM public.roles WHERE organization_id = org_rec.id AND code = 'user';

    -- HR gets broad org-management permissions, including role/member assignment.
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT hr_role_id, p.id
    FROM public.permissions p
    WHERE p.code IN (
      'organization.view','organization.manage',
      'employees.view','employees.manage',
      'users.view','users.manage','users.invite','users.assign_roles',
      'roles.manage',
      'settings.view','settings.manage',
      'kpi.view','kpi.create','kpi.update','kpi.delete','kpi.assign','kpi.approve','kpi.evaluate',
      'approval_requests.view','approval_requests.action','approval_matrices.view','approval_matrices.manage',
      'reports.view','reports.export',
      'bonus.view','bonus.configure','bonus.calculate','bonus.approve',
      'teams.view','teams.manage',
      'notifications.view','notifications.manage',
      'evaluation_360.view','evaluation_360.manage','evaluation_cycles.view','evaluation_cycles.manage',
      'org_structure.view','org_structure.manage',
      'integrations.view','integrations.manage',
      'audit.view','audit.export'
    )
    ON CONFLICT DO NOTHING;

    -- Manager gets team/KPI/review/approval permissions.
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT manager_role_id, p.id
    FROM public.permissions p
    WHERE p.code IN (
      'profile.self_manage','organization.view',
      'employees.view',
      'teams.view','teams.manage',
      'kpi.view','kpi.create','kpi.update','kpi.assign','kpi.approve','kpi.evaluate',
      'approval_requests.view','approval_requests.action',
      'reports.view','reports.export',
      'bonus.view',
      'notifications.view',
      'evaluation_360.view','evaluation_cycles.view',
      'org_structure.view'
    )
    ON CONFLICT DO NOTHING;

    -- User gets only self-service/basic visibility permissions.
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT user_role_id, p.id
    FROM public.permissions p
    WHERE p.code IN (
      'profile.self_manage','organization.view',
      'kpi.view',
      'approval_requests.view',
      'reports.view',
      'teams.view',
      'notifications.view',
      'evaluation_360.view','evaluation_cycles.view'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Keep template roles aligned for future organizations and employee provisioning.
UPDATE public.roles
SET code = 'hr_template', name = 'HR (Template)', description = COALESCE(description, 'HR default şablonu')
WHERE code = 'hr_admin_template' AND organization_id IS NULL;

INSERT INTO public.roles (organization_id, name, code, description, is_system_role, is_platform_role, is_active)
VALUES (NULL, 'MANAGER (Template)', 'manager_template', 'Manager default şablonu', true, false, true)
ON CONFLICT (organization_id, code) DO NOTHING;

-- Copy default permissions into templates where possible.
WITH tpl AS (
  SELECT id, code FROM public.roles WHERE organization_id IS NULL AND code IN ('hr_template','manager_template','user_template')
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT tpl.id, p.id
FROM tpl
JOIN public.permissions p ON (
  (tpl.code = 'hr_template' AND p.code IN (
    'organization.view','organization.manage','employees.view','employees.manage','users.view','users.manage','users.invite','users.assign_roles','roles.manage','settings.view','settings.manage','kpi.view','kpi.create','kpi.update','kpi.delete','kpi.assign','kpi.approve','kpi.evaluate','approval_requests.view','approval_requests.action','approval_matrices.view','approval_matrices.manage','reports.view','reports.export','bonus.view','bonus.configure','bonus.calculate','bonus.approve','teams.view','teams.manage','notifications.view','notifications.manage','evaluation_360.view','evaluation_360.manage','evaluation_cycles.view','evaluation_cycles.manage','org_structure.view','org_structure.manage','integrations.view','integrations.manage','audit.view','audit.export'
  )) OR
  (tpl.code = 'manager_template' AND p.code IN (
    'profile.self_manage','organization.view','employees.view','teams.view','teams.manage','kpi.view','kpi.create','kpi.update','kpi.assign','kpi.approve','kpi.evaluate','approval_requests.view','approval_requests.action','reports.view','reports.export','bonus.view','notifications.view','evaluation_360.view','evaluation_cycles.view','org_structure.view'
  )) OR
  (tpl.code = 'user_template' AND p.code IN (
    'profile.self_manage','organization.view','kpi.view','approval_requests.view','reports.view','teams.view','notifications.view','evaluation_360.view','evaluation_cycles.view'
  ))
)
ON CONFLICT DO NOTHING;