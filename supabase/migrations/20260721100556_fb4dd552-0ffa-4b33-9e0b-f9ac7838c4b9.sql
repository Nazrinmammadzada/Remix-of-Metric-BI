
-- 1. Add missing permission codes
INSERT INTO public.permissions (code, module, resource, action, description) VALUES
  ('salary.manage', 'salary', 'salary', 'manage', 'Maaş məlumatlarını idarə et'),
  ('lifecycle.manage', 'lifecycle', 'lifecycle', 'manage', 'KPI həyat dövrünü idarə et'),
  ('notifications.manage', 'notifications', 'notifications', 'manage', 'Bildiriş sazlamalarını idarə et'),
  ('approval.request', 'approvals', 'approval', 'request', 'Təsdiq sorğusu yarat')
ON CONFLICT (code) DO NOTHING;

-- 2. Grant new codes to HR role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'HR'
  AND p.code IN ('salary.manage','lifecycle.manage','notifications.manage','approval.request')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code IN ('USER','MANAGER')
  AND p.code = 'approval.request'
ON CONFLICT DO NOTHING;

-- 3. approval_matrices
DROP POLICY IF EXISTS "org members manage approval matrices" ON public.approval_matrices;
CREATE POLICY "approval_matrices_select" ON public.approval_matrices FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id) OR is_platform_super_admin(auth.uid()));
CREATE POLICY "approval_matrices_insert" ON public.approval_matrices FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), organization_id, 'approval_matrices.manage'));
CREATE POLICY "approval_matrices_update" ON public.approval_matrices FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'approval_matrices.manage'))
  WITH CHECK (has_permission(auth.uid(), organization_id, 'approval_matrices.manage'));
CREATE POLICY "approval_matrices_delete" ON public.approval_matrices FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'approval_matrices.manage'));

-- 4. deletion_matrices
DROP POLICY IF EXISTS "org members manage deletion matrices" ON public.deletion_matrices;
CREATE POLICY "deletion_matrices_select" ON public.deletion_matrices FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id) OR is_platform_super_admin(auth.uid()));
CREATE POLICY "deletion_matrices_insert" ON public.deletion_matrices FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), organization_id, 'approval_matrices.manage'));
CREATE POLICY "deletion_matrices_update" ON public.deletion_matrices FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'approval_matrices.manage'))
  WITH CHECK (has_permission(auth.uid(), organization_id, 'approval_matrices.manage'));
CREATE POLICY "deletion_matrices_delete" ON public.deletion_matrices FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'approval_matrices.manage'));

-- 5. cascade_matrices
DROP POLICY IF EXISTS "org members manage cascade matrices" ON public.cascade_matrices;
CREATE POLICY "cascade_matrices_select" ON public.cascade_matrices FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id) OR is_platform_super_admin(auth.uid()));
CREATE POLICY "cascade_matrices_insert" ON public.cascade_matrices FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), organization_id, 'approval_matrices.manage'));
CREATE POLICY "cascade_matrices_update" ON public.cascade_matrices FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'approval_matrices.manage'))
  WITH CHECK (has_permission(auth.uid(), organization_id, 'approval_matrices.manage'));
CREATE POLICY "cascade_matrices_delete" ON public.cascade_matrices FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'approval_matrices.manage'));

-- 6. salary_records
DROP POLICY IF EXISTS "org members manage salary records" ON public.salary_records;
CREATE POLICY "salary_records_select" ON public.salary_records FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id) OR is_platform_super_admin(auth.uid()));
CREATE POLICY "salary_records_insert" ON public.salary_records FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), organization_id, 'salary.manage'));
CREATE POLICY "salary_records_update" ON public.salary_records FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'salary.manage'))
  WITH CHECK (has_permission(auth.uid(), organization_id, 'salary.manage'));
CREATE POLICY "salary_records_delete" ON public.salary_records FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'salary.manage'));

-- 7. salary_uploads
DROP POLICY IF EXISTS "org members manage salary uploads" ON public.salary_uploads;
CREATE POLICY "salary_uploads_select" ON public.salary_uploads FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id) OR is_platform_super_admin(auth.uid()));
CREATE POLICY "salary_uploads_insert" ON public.salary_uploads FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), organization_id, 'salary.manage'));
CREATE POLICY "salary_uploads_update" ON public.salary_uploads FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'salary.manage'))
  WITH CHECK (has_permission(auth.uid(), organization_id, 'salary.manage'));
CREATE POLICY "salary_uploads_delete" ON public.salary_uploads FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'salary.manage'));

-- 8. bonus_runs
DROP POLICY IF EXISTS "org members manage bonus runs" ON public.bonus_runs;
CREATE POLICY "bonus_runs_select" ON public.bonus_runs FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id) OR is_platform_super_admin(auth.uid()));
CREATE POLICY "bonus_runs_insert" ON public.bonus_runs FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), organization_id, 'bonus.configure'));
CREATE POLICY "bonus_runs_update" ON public.bonus_runs FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'bonus.configure'))
  WITH CHECK (has_permission(auth.uid(), organization_id, 'bonus.configure'));
CREATE POLICY "bonus_runs_delete" ON public.bonus_runs FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'bonus.configure'));

-- 9. kpi_lifecycles
DROP POLICY IF EXISTS "org members manage lifecycles" ON public.kpi_lifecycles;
CREATE POLICY "kpi_lifecycles_select" ON public.kpi_lifecycles FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id) OR is_platform_super_admin(auth.uid()));
CREATE POLICY "kpi_lifecycles_insert" ON public.kpi_lifecycles FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), organization_id, 'lifecycle.manage'));
CREATE POLICY "kpi_lifecycles_update" ON public.kpi_lifecycles FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'lifecycle.manage'))
  WITH CHECK (has_permission(auth.uid(), organization_id, 'lifecycle.manage'));
CREATE POLICY "kpi_lifecycles_delete" ON public.kpi_lifecycles FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'lifecycle.manage'));

-- 10. lifecycle_templates
DROP POLICY IF EXISTS "org members manage lifecycle templates" ON public.lifecycle_templates;
CREATE POLICY "lifecycle_templates_select" ON public.lifecycle_templates FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id) OR is_platform_super_admin(auth.uid()));
CREATE POLICY "lifecycle_templates_insert" ON public.lifecycle_templates FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), organization_id, 'lifecycle.manage'));
CREATE POLICY "lifecycle_templates_update" ON public.lifecycle_templates FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'lifecycle.manage'))
  WITH CHECK (has_permission(auth.uid(), organization_id, 'lifecycle.manage'));
CREATE POLICY "lifecycle_templates_delete" ON public.lifecycle_templates FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'lifecycle.manage'));

-- 11. notification_settings
DROP POLICY IF EXISTS "org members manage notification settings" ON public.notification_settings;
CREATE POLICY "notification_settings_select" ON public.notification_settings FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id) OR is_platform_super_admin(auth.uid()));
CREATE POLICY "notification_settings_insert" ON public.notification_settings FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), organization_id, 'notifications.manage'));
CREATE POLICY "notification_settings_update" ON public.notification_settings FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'notifications.manage'))
  WITH CHECK (has_permission(auth.uid(), organization_id, 'notifications.manage'));
CREATE POLICY "notification_settings_delete" ON public.notification_settings FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'notifications.manage'));

-- 12. approval_queue — INSERT for members with approval.request; UPDATE/DELETE only via service_role
DROP POLICY IF EXISTS "org members manage approval queue" ON public.approval_queue;
CREATE POLICY "approval_queue_select" ON public.approval_queue FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id) OR is_platform_super_admin(auth.uid()));
CREATE POLICY "approval_queue_insert" ON public.approval_queue FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), organization_id, 'approval.request'));

-- 13. notifications DELETE tightening
DROP POLICY IF EXISTS "Org members can delete notifications" ON public.notifications;
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), organization_id, 'notifications.manage') OR is_platform_super_admin(auth.uid()));
