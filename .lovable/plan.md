## Məqsəd
Sizin `super.admin → HR → əməkdaş → login → rol/icazə əsaslı görünüş` ardıcıllığı tam real backend üzərindən işləməlidir. Artıq qurulmuş hissələr üzərində qalan boşluqları 4 mərhələdə bağlayacağam. Hər mərhələnin sonunda test edə bilərsiniz.

Qərar verilmiş qaydalar (sualdan sonra):
- Bütün yeni əməkdaşlar üçün default şifrə: **`123456`** (məcburi ilk-giriş dəyişməsi ilə).
- Custom rollar: sistem template + org-a xas override.

---

## Mərhələ 1 — HR Əməkdaş İdarəetməsi (real Auth users)

**Yeni edge function:** `manage-employees` (service-role)
- `create`: HR-in orgu üçün Auth user (`123456`, email_confirm=true), `profiles` sətri (`must_change_password=true`), `org_employees` sətri (vəzifə, struktur, komanda, rəhbər, status), `organization_members`, default `USER` rolu bağlama.
- `update`: profile + org_employees + rol dəyişikliyi.
- `deactivate` / `reactivate`: `org_employees.status` + Auth user `ban`/`unban`.
- `reset_password`: şifrəni `123456`-ya qaytar + `must_change_password=true`.
- Bütün əməliyyatlar `has_permission(caller, org, 'users.manage')` yoxlamasından keçir.

**Frontend:**
- `src/lib/employeeService.ts` — yuxarıdakı funksiyanı çağıran wrapper.
- `OrganizationPage.tsx`-in "Əməkdaşlar" tabı yalnız `org_employees`-i real DB-dən oxuyur/yazır, `mockExtras`-a düşməz.
- Ad/soyad/FİN validasiyaları saxlanır.
- Silinən əməkdaş: soft-deactivate (Auth ban + status=`inactive`).

**Nəticə:** HR əməkdaş yaradır → o dərhal `email` + `123456` ilə giriş edir → `Şifrəni dəyişin` səhifəsinə düşür → yeni şifrədən sonra öz roluna uyğun panel.

---

## Mərhələ 2 — RBAC UI (Rollar & İcazələr)

- `SettingsPage → Rol və Səlahiyyət` tabı localStorage `rolesStore` əvəzinə DB `roles` + `role_permissions`-a bağlanır.
- Sistem template rolları (HR/Manager/USER) `is_system_role=true` — silinməz, redaktə oluna bilməz.
- HR "Yeni rol yarat" → `organization_id=<org>`, `is_system_role=false`, template-dən klonlanır, sonra HR öz icazələrini əlavə/silir.
- Modul-səviyyəli matris UI: hər modul üçün `view/create/edit/delete/approve/manage` toggles → `permissions.code` ilə eşlənir (məs. `kpi.view`, `kpi.create`...).
- HR rolları əməkdaşlara `user_roles` cədvəli vasitəsilə təyin edir.
- `permissionMapping.ts` genişlənir: hazırda 20-ə yaxın kod var, bütün modul×hərəkət kombinasiyaları əlavə olunur (lazım gələn permissions DB-ə migrasiya ilə seed olunacaq).

---

## Mərhələ 3 — Manager & User panelləri real data

- `src/pages/manager/*` və `src/pages/user/*` `mockExtras`-dan tamamilə ayrılır.
- `scope.ts` real `org_employees` + `org_teams` + `org_structures` üzərindən işləyir (artıq DB-də mövcuddur — sadəcə `mockExtras` yerinə real sorğular).
- KPI Tracking / Results / Bonuslar / Reviews səhifələrinin görünürlüyü DB icazə kodları (`kpi.view_own`, `kpi.view_team`, `kpi.view_subordinates` və s.) əsasında filtrlənir.
- Yeni permission kodları migrasiya ilə seed olunur (Mərhələ 2 ilə birgə).

---

## Mərhələ 4 — Data izolyasiyası & yekun test

- Bütün yeni RLS siyasətlərini `security--linter` ilə yoxla.
- Cross-tenant leak testi (Playwright): iki fərqli org HR ilə giriş, bir-birinin verilənlərini görməməli.
- Bir tam ax(ı)nlıq E2E: super_admin → org yarat → HR giriş → 3 əməkdaş yarat + rəhbər → əməkdaş giriş edib şifrə dəyişir → KPI kartı yaradır → təsdiq → nəticə → bonus.

---

## Texniki qeydlər
- Bütün edge function-lar caller-in `has_permission` və ya `is_platform_super_admin`-ni yoxlayır.
- Bütün yeni migrasiyalar `GRANT` + RLS + policy-lər ilə birlikdə gəlir.
- Heç bir mock fallback qalmır — səhifə boş də olsa real DB-dən oxuyur.
- Bütün əməliyyatlar `auditService` vasitəsilə loglanır.

---

## İş həcmi
Təxminən 4 uzun mesaj (hər mərhələ bir mesaj). Hər mərhələdən sonra sınaqdan keçirməyinizi xahiş edəcəm ki, sonrakına keçək. Təsdiqləyirsinizsə, Mərhələ 1-dən başlayıram.
