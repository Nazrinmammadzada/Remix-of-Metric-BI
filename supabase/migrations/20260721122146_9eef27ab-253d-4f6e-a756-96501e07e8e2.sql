-- Helper to derive resource+action from `module.code`
INSERT INTO public.permissions (module, resource, action, code, description) VALUES
  ('home','home','view','home.view','Baxış'),
  ('home','home','widgets','home.widgets','Bütün widget-lər'),
  ('home','home','export','home.export','Export'),
  ('kpi','kpi','edit','kpi.edit','Redaktə et'),
  ('kpi','kpi','duplicate','kpi.duplicate','Kopyala'),
  ('kpi','kpi','submit_approval','kpi.submit_approval','Təsdiqə göndər'),
  ('kpi','kpi','cancel','kpi.cancel','Ləğv et'),
  ('kpi','kpi','export','kpi.export','Export'),
  ('kpi','kpi','import','kpi.import','Import'),
  ('kpi','kpi','change_status','kpi.change_status','Statusu dəyiş'),
  ('approvals','approvals','view','approvals.view','Baxış'),
  ('approvals','approvals','approve','approvals.approve','Təsdiqlə'),
  ('approvals','approvals','reject','approvals.reject','Rədd et'),
  ('approvals','approvals','delegate','approvals.delegate','Delegasiya et'),
  ('reports','reports','filter','reports.filter','Filtr'),
  ('reports','reports','export_excel','reports.export_excel','Excel ixracı'),
  ('reports','reports','export_pdf','reports.export_pdf','PDF ixracı'),
  ('reports','reports','schedule','reports.schedule','Cədvəllə göndər'),
  ('reports','reports','share','reports.share','Paylaş'),
  ('teams','teams','create','teams.create','Komanda yarat'),
  ('teams','teams','edit','teams.edit','Redaktə et'),
  ('teams','teams','delete','teams.delete','Sil'),
  ('teams','teams','add_member','teams.add_member','Üzv əlavə et'),
  ('teams','teams','remove_member','teams.remove_member','Üzv sil'),
  ('teams','teams','change_leader','teams.change_leader','Rəhbər dəyiş'),
  ('formulas','formulas','view','formulas.view','Baxış'),
  ('formulas','formulas','create','formulas.create','Yarat'),
  ('formulas','formulas','edit','formulas.edit','Redaktə et'),
  ('formulas','formulas','delete','formulas.delete','Sil'),
  ('formulas','formulas','assign','formulas.assign','Təyin et'),
  ('integrations','integrations','connect','integrations.connect','Qoşul'),
  ('integrations','integrations','disconnect','integrations.disconnect','Kəs'),
  ('integrations','integrations','configure','integrations.configure','Konfiqurasiya'),
  ('integrations','integrations','test','integrations.test','Test et'),
  ('integrations','integrations','sync','integrations.sync','Sinxronizasiya'),
  ('integrations','integrations','export','integrations.export','Export'),
  ('integrations','integrations','import','integrations.import','Import'),
  ('integrations','integrations','logs','integrations.logs','Loglar'),
  ('matrix','matrix','view','matrix.view','Baxış'),
  ('matrix','matrix','create','matrix.create','Yarat'),
  ('matrix','matrix','edit','matrix.edit','Redaktə et'),
  ('matrix','matrix','delete','matrix.delete','Sil'),
  ('matrix','matrix','assign','matrix.assign','Təyin et'),
  ('matrix','matrix','export','matrix.export','Export'),
  ('organization','organization','create_structure','organization.create_structure','Struktur vahidi yarat'),
  ('organization','organization','edit_structure','organization.edit_structure','Struktur vahidini redaktə et'),
  ('organization','organization','delete_structure','organization.delete_structure','Struktur vahidini sil'),
  ('organization','organization','add_employee','organization.add_employee','Əməkdaş əlavə et'),
  ('organization','organization','edit_employee','organization.edit_employee','Əməkdaşı redaktə et'),
  ('organization','organization','deactivate_employee','organization.deactivate_employee','Deaktiv et'),
  ('organization','organization','set_star','organization.set_star','Rəhbər təyin et'),
  ('evaluations','evaluations','view','evaluations.view','Baxış'),
  ('evaluations','evaluations','create','evaluations.create','Yarat'),
  ('evaluations','evaluations','edit','evaluations.edit','Redaktə et'),
  ('evaluations','evaluations','delete','evaluations.delete','Sil'),
  ('evaluations','evaluations','submit','evaluations.submit','Göndər'),
  ('evaluations','evaluations','approve','evaluations.approve','Təsdiqlə'),
  ('evaluations','evaluations','export','evaluations.export','Export'),
  ('evaluations','evaluations','close','evaluations.close','Bağla'),
  ('lifecycle','lifecycle','view','lifecycle.view','Baxış'),
  ('lifecycle','lifecycle','create','lifecycle.create','Yarat'),
  ('lifecycle','lifecycle','edit','lifecycle.edit','Redaktə et'),
  ('lifecycle','lifecycle','delete','lifecycle.delete','Sil'),
  ('lifecycle','lifecycle','create_review','lifecycle.create_review','Review yarat'),
  ('lifecycle','lifecycle','change_review_status','lifecycle.change_review_status','Review statusu dəyiş'),
  ('lifecycle','lifecycle','export','lifecycle.export','Export'),
  ('cascading','cascading','view','cascading.view','Baxış'),
  ('cascading','cascading','distribute','cascading.distribute','Bölüşdür'),
  ('cascading','cascading','load','cascading.load','Yüklə'),
  ('cascading','cascading','change_leader','cascading.change_leader','Rəhbər dəyiş'),
  ('cascading','cascading','approve','cascading.approve','Təsdiqlə'),
  ('cascading','cascading','export','cascading.export','Export'),
  ('bonus','bonus','recalculate','bonus.recalculate','Yenidən hesabla'),
  ('bonus','bonus','publish','bonus.publish','Yayımla'),
  ('bonus','bonus','export','bonus.export','Export'),
  ('bonus','bonus','audit','bonus.audit','Audit'),
  ('salary','salary','view','salary.view','Baxış'),
  ('salary','salary','upload','salary.upload','Yüklə'),
  ('salary','salary','edit','salary.edit','Redaktə et'),
  ('salary','salary','delete','salary.delete','Sil'),
  ('salary','salary','export','salary.export','Export'),
  ('whistleblower','whistleblower','view','whistleblower.view','Baxış'),
  ('whistleblower','whistleblower','create','whistleblower.create','Bildiriş yarat'),
  ('whistleblower','whistleblower','respond','whistleblower.respond','Cavabla'),
  ('whistleblower','whistleblower','close','whistleblower.close','Bağla'),
  ('notifications','notifications','settings','notifications.settings','Sazlamalar'),
  ('notifications','notifications','send','notifications.send','Göndər'),
  ('notifications','notifications','mark_read','notifications.mark_read','Oxundu işarələ'),
  ('notifications','notifications','delete','notifications.delete','Sil'),
  ('settings','settings','edit','settings.edit','Redaktə et'),
  ('settings','settings','export','settings.export','Export'),
  ('settings','settings','import','settings.import','Import'),
  ('settings','settings','language','settings.language','Dil sazlaması'),
  ('settings','settings','reset','settings.reset','Sıfırla'),
  ('audit','audit','export','audit.export','Export'),
  ('audit','audit','filter','audit.filter','Filtr')
ON CONFLICT (code) DO NOTHING;

-- 2) HR gets EVERYTHING (template + every org-level 'hr' role)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.code IN ('hr_template','hr')
ON CONFLICT DO NOTHING;

-- 3) MANAGER: view-tier + management actions they already handled
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.code IN ('manager_template','manager')
  AND (
    p.code LIKE '%.view'
    OR p.code IN (
      'home.widgets','home.export',
      'kpi.evaluate','kpi.approve','kpi.assign','kpi.change_status',
      'approvals.approve','approvals.reject','approvals.delegate',
      'reports.filter','reports.export_excel','reports.export_pdf','reports.share',
      'teams.add_member','teams.remove_member','teams.change_leader',
      'evaluations.submit','evaluations.approve','evaluations.close',
      'lifecycle.create_review','lifecycle.change_review_status',
      'cascading.distribute','cascading.approve','cascading.change_leader',
      'notifications.mark_read','profile.self_manage'
    )
  )
ON CONFLICT DO NOTHING;

-- 4) USER: baseline view + own-profile actions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.code IN ('user_template','user')
  AND p.code IN (
    'home.view','home.widgets',
    'kpi.view','approvals.view','reports.view','teams.view',
    'evaluations.view','evaluations.submit',
    'lifecycle.view','notifications.view','notifications.mark_read',
    'bonus.view','salary.view','whistleblower.view','whistleblower.create',
    'profile.self_manage','settings.view'
  )
ON CONFLICT DO NOTHING;
