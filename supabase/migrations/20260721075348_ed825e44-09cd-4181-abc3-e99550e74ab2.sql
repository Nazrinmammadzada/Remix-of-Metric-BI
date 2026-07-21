
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Remove obsolete demo table
DROP TABLE IF EXISTS public.kpi_card_status CASCADE;
DROP TYPE IF EXISTS public.kpi_card_status_enum CASCADE;

-- ================== CORE TENANCY ==================
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  email text NOT NULL,
  phone text,
  profile_photo text,
  preferred_language text NOT NULL DEFAULT 'az' CHECK (preferred_language IN ('az','en','ru')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','pending')),
  is_platform_super_admin boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','invited')),
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);

CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid REFERENCES auth.users(id),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  role_ids uuid[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ================== RBAC ==================
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  module text NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  is_system_role boolean NOT NULL DEFAULT false,
  is_platform_role boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_member_id uuid NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (organization_member_id, role_id)
);
CREATE INDEX idx_user_roles_member ON public.user_roles(organization_member_id);

-- ================== AUDIT LOG ==================
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  module text NOT NULL,
  entity_type text,
  entity_id text,
  previous_values jsonb,
  new_values jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_org_created ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_actor ON public.audit_logs(actor_user_id, created_at DESC);

-- ================== SECURITY DEFINER HELPERS ==================
CREATE OR REPLACE FUNCTION public.is_platform_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_platform_super_admin FROM public.profiles WHERE id = _user_id), false);
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND status = 'active');
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = _user_id AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _org_id uuid, _permission_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_super_admin(_user_id)
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    JOIN public.user_roles ur ON ur.organization_member_id = om.id
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE om.user_id = _user_id AND om.organization_id = _org_id
      AND om.status='active' AND ur.is_active=true
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
      AND r.is_active=true AND p.code=_permission_code
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name',''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_org_members_updated BEFORE UPDATE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_roles_updated BEFORE UPDATE ON public.roles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ================== GRANTS ==================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invitations TO authenticated;
GRANT ALL ON public.organization_invitations TO service_role;
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- ================== RLS ==================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgs_select" ON public.organizations FOR SELECT TO authenticated
USING (public.is_platform_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), id));
CREATE POLICY "orgs_super_all" ON public.organizations FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid())) WITH CHECK (public.is_platform_super_admin(auth.uid()));
CREATE POLICY "orgs_admin_update" ON public.organizations FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), id, 'organization.update'))
WITH CHECK (public.has_permission(auth.uid(), id, 'organization.update'));

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_platform_super_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.organization_members om1
    JOIN public.organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid() AND om2.user_id = profiles.id AND om1.status='active'));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_super_all" ON public.profiles FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid())) WITH CHECK (public.is_platform_super_admin(auth.uid()));

CREATE POLICY "om_select" ON public.organization_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_platform_super_admin(auth.uid())
  OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "om_super_all" ON public.organization_members FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid())) WITH CHECK (public.is_platform_super_admin(auth.uid()));
CREATE POLICY "om_admin_manage" ON public.organization_members FOR ALL TO authenticated
USING (public.has_permission(auth.uid(), organization_id, 'users.manage'))
WITH CHECK (public.has_permission(auth.uid(), organization_id, 'users.manage'));

CREATE POLICY "inv_admin" ON public.organization_invitations FOR ALL TO authenticated
USING (public.has_permission(auth.uid(), organization_id, 'users.invite') OR public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.has_permission(auth.uid(), organization_id, 'users.invite') OR public.is_platform_super_admin(auth.uid()));

CREATE POLICY "perms_read" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "perms_super" ON public.permissions FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid())) WITH CHECK (public.is_platform_super_admin(auth.uid()));

CREATE POLICY "roles_select" ON public.roles FOR SELECT TO authenticated
USING (public.is_platform_super_admin(auth.uid()) OR organization_id IS NULL
  OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "roles_manage" ON public.roles FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid())
  OR (organization_id IS NOT NULL AND public.has_permission(auth.uid(), organization_id, 'roles.manage')))
WITH CHECK (public.is_platform_super_admin(auth.uid())
  OR (organization_id IS NOT NULL AND public.has_permission(auth.uid(), organization_id, 'roles.manage')));

CREATE POLICY "rp_select" ON public.role_permissions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_permissions.role_id
    AND (public.is_platform_super_admin(auth.uid()) OR r.organization_id IS NULL
      OR public.is_org_member(auth.uid(), r.organization_id))));
CREATE POLICY "rp_manage" ON public.role_permissions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_permissions.role_id
    AND (public.is_platform_super_admin(auth.uid())
      OR (r.organization_id IS NOT NULL AND public.has_permission(auth.uid(), r.organization_id, 'roles.manage')))))
WITH CHECK (EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_permissions.role_id
  AND (public.is_platform_super_admin(auth.uid())
    OR (r.organization_id IS NOT NULL AND public.has_permission(auth.uid(), r.organization_id, 'roles.manage')))));

CREATE POLICY "ur_select" ON public.user_roles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.id = user_roles.organization_member_id
    AND (om.user_id = auth.uid() OR public.is_platform_super_admin(auth.uid())
      OR public.is_org_member(auth.uid(), om.organization_id))));
CREATE POLICY "ur_manage" ON public.user_roles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.id = user_roles.organization_member_id
    AND (public.is_platform_super_admin(auth.uid())
      OR public.has_permission(auth.uid(), om.organization_id, 'users.assign_roles'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.id = user_roles.organization_member_id
  AND (public.is_platform_super_admin(auth.uid())
    OR public.has_permission(auth.uid(), om.organization_id, 'users.assign_roles'))));

CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT TO authenticated USING (
  public.is_platform_super_admin(auth.uid())
  OR (organization_id IS NOT NULL AND public.has_permission(auth.uid(), organization_id, 'audit.view')));
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (actor_user_id = auth.uid() OR public.is_platform_super_admin(auth.uid()));

-- ================== SEED: PERMISSIONS ==================
INSERT INTO public.permissions (code, module, resource, action, description) VALUES
('organization.view','organization','organization','view','View organization details'),
('organization.update','organization','organization','update','Update organization settings'),
('users.view','users','users','view','View users'),
('users.create','users','users','create','Create users'),
('users.update','users','users','update','Update users'),
('users.deactivate','users','users','deactivate','Deactivate users'),
('users.invite','users','users','invite','Invite users'),
('users.assign_roles','users','users','assign_roles','Assign roles to users'),
('users.manage','users','users','manage','Full user management'),
('roles.view','roles','roles','view','View roles'),
('roles.create','roles','roles','create','Create roles'),
('roles.update','roles','roles','update','Update roles'),
('roles.delete','roles','roles','delete','Delete roles'),
('roles.assign','roles','roles','assign','Assign roles'),
('roles.manage','roles','roles','manage','Full role management'),
('org_structure.view','org_structure','structure','view','View organizational structure'),
('org_structure.create','org_structure','structure','create','Create structure units'),
('org_structure.update','org_structure','structure','update','Update structure units'),
('org_structure.delete','org_structure','structure','delete','Delete structure units'),
('employees.view','employees','employees','view','View employees'),
('employees.create','employees','employees','create','Create employees'),
('employees.update','employees','employees','update','Update employees'),
('employees.delete','employees','employees','delete','Delete employees'),
('teams.view','teams','teams','view','View teams'),
('teams.manage','teams','teams','manage','Manage teams'),
('kpi.view','kpi','kpi','view','View KPIs'),
('kpi.create','kpi','kpi','create','Create KPIs'),
('kpi.update','kpi','kpi','update','Update KPIs'),
('kpi.delete','kpi','kpi','delete','Delete KPIs'),
('kpi.assign','kpi','kpi','assign','Assign KPIs'),
('kpi.evaluate','kpi','kpi','evaluate','Evaluate KPIs'),
('kpi.approve','kpi','kpi','approve','Approve KPIs'),
('evaluation_cycles.view','evaluations','cycles','view','View evaluation cycles'),
('evaluation_cycles.manage','evaluations','cycles','manage','Manage evaluation cycles'),
('evaluation_360.view','evaluations','360','view','View 360 evaluations'),
('evaluation_360.manage','evaluations','360','manage','Manage 360 evaluations'),
('evaluation_360.submit','evaluations','360','submit','Submit 360 evaluations'),
('approval_matrices.view','approvals','matrices','view','View approval matrices'),
('approval_matrices.manage','approvals','matrices','manage','Manage approval matrices'),
('approval_requests.view','approvals','requests','view','View approval requests'),
('approval_requests.action','approvals','requests','action','Act on approval requests'),
('bonus.view','bonus','bonus','view','View bonuses'),
('bonus.configure','bonus','bonus','configure','Configure bonuses'),
('bonus.calculate','bonus','bonus','calculate','Calculate bonuses'),
('bonus.approve','bonus','bonus','approve','Approve bonuses'),
('reports.view','reports','reports','view','View reports'),
('reports.export','reports','reports','export','Export reports'),
('audit.view','audit','audit','view','View audit logs'),
('settings.view','settings','settings','view','View settings'),
('settings.manage','settings','settings','manage','Manage settings'),
('integrations.view','integrations','integrations','view','View integrations'),
('integrations.manage','integrations','integrations','manage','Manage integrations'),
('notifications.view','notifications','notifications','view','View notifications'),
('profile.self_manage','profile','profile','self_manage','Manage own profile');

-- ================== SEED: SYSTEM ROLE TEMPLATES ==================
INSERT INTO public.roles (organization_id, name, code, description, is_system_role, is_platform_role) VALUES
(NULL, 'Platform Super Admin', 'platform_super_admin', 'Full platform administration', true, true),
(NULL, 'HR / Admin (Template)', 'hr_admin_template', 'Organization administrator template', true, false),
(NULL, 'User (Template)', 'user_template', 'Regular user template', true, false);

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.code = 'hr_admin_template';

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'organization.view','profile.self_manage','kpi.view','kpi.evaluate',
  'evaluation_360.submit','evaluation_360.view','approval_requests.view',
  'reports.view','notifications.view','teams.view','employees.view'
)
WHERE r.code = 'user_template';

-- ================== SEED: DEMO ORG + SUPER ADMIN ==================
DO $seed$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_org_id uuid;
  v_member_id uuid;
  v_hr_role_id uuid;
BEGIN
  INSERT INTO public.organizations (name, slug, status)
  VALUES ('Metric BI Demo', 'metric-bi-demo', 'active')
  RETURNING id INTO v_org_id;

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'super.admin@outlook.com',
    crypt('Admin123!', gen_salt('bf')),
    now(), now(), now(),
    jsonb_build_object('provider','email','providers',ARRAY['email']),
    jsonb_build_object('first_name','Super','last_name','Admin'),
    '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', 'super.admin@outlook.com', 'email_verified', true),
    'email', now(), now(), now());

  UPDATE public.profiles
  SET is_platform_super_admin = true, first_name = 'Super', last_name = 'Admin'
  WHERE id = v_user_id;

  INSERT INTO public.organization_members (organization_id, user_id, status)
  VALUES (v_org_id, v_user_id, 'active')
  RETURNING id INTO v_member_id;

  INSERT INTO public.roles (organization_id, name, code, description, is_system_role, is_active)
  VALUES (v_org_id, 'HR / Admin', 'hr_admin', 'Organization administrator', true, true)
  RETURNING id INTO v_hr_role_id;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_hr_role_id, p.id FROM public.permissions p;

  INSERT INTO public.roles (organization_id, name, code, description, is_system_role, is_active)
  VALUES (v_org_id, 'User', 'user', 'Regular user', true, true);

  INSERT INTO public.user_roles (organization_member_id, role_id)
  VALUES (v_member_id, v_hr_role_id);
END $seed$;
