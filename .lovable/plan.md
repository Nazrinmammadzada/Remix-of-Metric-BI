# Tam backend inteqrasiya planı

İki paralel audit (mock data + backend inteqrasiya) tamamlandı. Aşağıda tapılan boşluqlar və hər biri üçün konkret icra planı verilir. Sistemin bütün modulları real Supabase üzərində, RLS və server-side RBAC ilə işlək vəziyyətə gətiriləcək.

## Faza 1 — Təhlükəsizlik və RLS (kritik)

1. **RLS-i sərtləşdir** — hazırda `is_org_member` ilə bütün üzvlər yaza bilir. Aşağıdakı cədvəllərdə INSERT/UPDATE/DELETE üçün `has_permission()` tələb ediləcək:
   - `approval_matrices`, `deletion_matrices`, `cascade_matrices` → `approval_matrices.manage`
   - `salary_records`, `salary_uploads` → `salary.manage`
   - `bonus_runs` → `bonus.configure`
   - `kpi_lifecycles`, `lifecycle_templates` → `lifecycle.manage`
   - `notification_settings` → `notifications.manage`
   - `approval_queue` → INSERT `approval.request`, UPDATE/DELETE yalnız `service_role` (yalnız `process-approval` edge function)
2. **Demo login-i sil** — `AuthContext.demoProfiles`, `passwordStore.defaultPasswordHashes`, `resolveDemoUser`/`verifyDemoPassword` fallback tam çıxarılacaq. Yalnız Supabase auth qalacaq.
3. **`notifications` sahibliyi** — `to_employee_id` = `auth.uid()` yoxlaması policy-lərə əlavə ediləcək.

## Faza 2 — Mock data-nın silinməsi

4. **Evaluation/Peer Review modulu** real backend üzərinə köçürüləcək:
   - `mockEmployees`, `mockStructures`, `mockTeams`, `EMAIL_TO_EMPLOYEE_ID` silinəcək.
   - Yeni cədvəllər: `peer_reviews`, `evaluation_cycles`, `evaluation_scores`, `competency_matrix_entries`.
   - `peerReviewStore`, `kpiEvaluationStore`, `competencyMatrixStore`, `evaluationSurveyStore` cloud-sync pattern-ə keçəcək.
   - `EvaluationPage`, `UserEvaluationPage`, `PeerEvaluationDialog`, `CompetencyMatrixTab`, `MyAnonymousScores`, `KpiPlanningDialog`, `SharedKpiPanel` real `org_employees` üzərindən işləyəcək.
5. **`OrganizationPage` MOCK_CHR_CHANGES** silinəcək — real `approval_queue` sorğusu ilə əvəzlənəcək.
6. **`ReportsPage`, `UserReportsPage`** mock filter dropdown-ları real org tree ilə əvəzlənəcək; `individualKpiAssignees` hardcode-u KPI assignment sorğusu ilə əvəz olunacaq.
7. **`GoalTrackingPage.statusFor`** — real KPI actuals-dan hesablanacaq.
8. **`PeriodPicker.buildDemoSeries`** yalnız placeholder kimi qalacaq, dashboard-lar real aggregate-ə bağlanacaq.
9. **`hrAdminStore`, `companiesStore`** silinəcək — Super Admin əməliyyatları birbaşa `organizations`/`profiles`/`organization_members` üzərinə yazacaq.

## Faza 3 — Sync etibarlılığı

10. **Silent failure-lərin aradan qaldırılması** — bütün `*Service.ts` flush funksiyalarında `.error` yoxlanacaq, uğursuzluq toast + audit ilə göstəriləcək, local optimistic update geri qaytarılacaq.
11. **Delete propagation** — `orgService`, `kpiCardsService`, `payrollService`, `lifecycleService` üçün tombstone/diff-DELETE əlavə ediləcək ki, local silinmələr cloud-a köçsün.
12. **Konkurent yazışma** — kritik cədvəllərdə `updated_at` version check (optimistic concurrency) əlavə olunacaq.
13. **Numeric↔UUID ID map** localStorage-dan çıxarılıb DB-də saxlanılacaq (`legacy_id` sütunları artıq mövcuddur — istifadə genişləndiriləcək).

## Faza 4 — Multi-tenant və audit

14. **Tenant switcher** — istifadəçinin bir neçə `organization_members` sətri olduqda header-də org seçim UI, `currentOrgId` URL və `localStorage`-də saxlanılacaq.
15. **`hasPermission()`** hər tenant dəyişimində və müəyyən interval-larda yenidən sorğulanacaq.
16. **Audit zənginləşdirməsi** — `"sync"` ümumi event-lər əvəzinə hər entity üçün `previousValues`/`newValues` diff loglanacaq (org, KPI card, lifecycle, approvals).

## Faza 5 — Edge functions və localStorage-only store-lar

17. **`accept-invitation`** `listUsers` pagination + rate limiting.
18. **`calculate-bonus`** rate limiting.
19. **~25 localStorage-only store**-un triage-i: hər biri ya real cədvələ köçürüləcək (`whistleblowerStore`, `rolesStore`, `teamsStore`, `dropdownCatalogStore`, `seasonStore`, `formulasStore`, `formulaAssignmentsStore`, `cascadeMatrixStore`, `cascadingStore`, `matrixStore`, `manualAssignmentsStore`, `catalogStore`, `operationsLogStore`, `salaryUploadsStore`), ya da UI-state kimi rəsmi işarələnəcək.
20. **`devReset`** `import.meta.env.DEV` guard.

## Texniki qeydlər

- Hər RLS dəyişikliyi ayrı migration-da göndəriləcək (təsdiq lazımdır).
- Yeni cədvəllər üçün mütləq `GRANT` + `service_role` daxil ediləcək.
- Bütün edge function dəyişiklikləri deploy olunacaq; frontend yalnız `supabase.functions.invoke` istifadə edəcək.
- Mövcud demo istifadəçilər (`hr@kpi.az`, `user@kpi.az`, `manager@kpi.az`) silindiyi üçün, real testing üçün `super.admin@outlook.com` üzərindən yeni istifadəçilər dəvətlə (`accept-invitation` flow) yaradılmalıdır.

## Həcm və mərhələli təslim

Bu iş **5 faza** və təxminən **20 böyük dəyişiklik** deməkdir (12+ migration, 30+ fayl redaktəsi, 4+ yeni cədvəl, mock-ların silinməsi bütün evaluation vertikalını yenidən sim edir). Bir mesajda tam təslim etmək praktik deyil — hər faza ayrı-ayrı deploy ediləcək, hər fazadan sonra siz test edib növbətini təsdiqləyəcəksiniz.

**Başlanğıc:** təsdiqlədikdən sonra **Faza 1** (RLS sərtləşdirməsi + demo auth-un silinməsi) ilə başlayıram — bu ən yüksək təhlükəsizlik risqidir və digər fazalar üçün təməldir.
