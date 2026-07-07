## KPI Platform Improvements — HR, Manager, User

Bu plan yeddi tələbi mövcud biznes məntiqini pozmadan tətbiq edir. Hər dəyişiklik ayrı bir modul/faylda aparılır.

---

### 1. HR — KPI Kart Siyahısı persistensiyası
- `src/lib/kpiCardStore.ts` (və/və ya `kpiSetStore.ts`) yoxlanılır: kartların localStorage-ə yazılması və oxunması hər dəfə tam işlədiyinə əmin olunur.
- Səhifə refresh və ya modul dəyişdikdə HR-ın yaratdığı kartlar `KpiHubPage` / `KpiCardsPage`-də daim görünəcək.
- Kart yaradıldıqdan dərhal sonra `save()` çağırıldığından və event dispatch olunduğundan əmin olunur.

### 2. HR — KPI Kart yaradılmasında "Özüm" seçimi
- `src/components/kpi/CreateKpiWizard.tsx` içindəki Vahid Şəxs (assignee) selectorə "Özüm (cari HR)" opsiyası əlavə edilir.
- Seçildikdə `assigneeIds` cari HR-ın employee ID-si ilə doldurulur.
- Yaradılmış kart digər əməkdaşlar üçün olan məntiqlə eyni axına düşür: HR həm sahibi, həm assignee, həm də evaluator ola bilər.

### 3. HR — Hədəf Təyinatlarının İzlənməsi
- `src/pages/GoalTrackingPage.tsx` cascade zəncirini tam göstərəcək şəkildə genişləndirilir: root + bütün cascade child node-lar `cascadeTreeStore` / `kpiSetStore`-dan oxunur və siyahıya qoşulur.
- Bütün "Cascade Matrix" mətn/etiketləri modul UI-dan silinir (yalnız bu səhifədə).

### 4. USER — Anonim Bildiriş üst panelə köçürülür
- `src/components/layout/UserSidebar.tsx`-dən `/user/whistleblower` menyu elementi silinir.
- `src/components/layout/Header.tsx`-də (User layout-una tətbiq olunan üst panel) manager kimi Anonim Bildiriş ikonu / popover göstərilir.
- Route (`/user/whistleblower`) saxlanılır ki, keçmiş linklər sınmasın.

### 5. Daxili Bildiriş Sistemi — User və Manager eyni məntiqdə
- `notificationsStore` və user bildiriş UI-ı yoxlanılır; User göndərə bilir, Manager göndərə bilir, HR yalnız monitorinq edir.
- User-in mövcud daxili bildiriş interfeysi saxlanılır, manager ilə eyni davranış təmin edilir (send + inbox).
- HR tərəfdə heç bir dəyişiklik edilmir (yalnız oxu/monitorinq).

### 6. USER — KPI İzlənməsi rəhbər strukturuna gətirilir
- `src/pages/user/UserKpiCardsPage.tsx` `ManagerKpiTrackingPage` görünüşünə uyğunlaşdırılır; üç tab: **Mənim KPI-larım**, **Komandamın KPI-ları**, **Strukturumun KPI-ları**.
- "Tabeçiliyimdə olan əməkdaşlar" tabı və rəhbərə xas idarəetmə düymələri (cascade, təsdiq, təyin) User tərəfdə gizlədilir.
- Mənim KPI-larım tabı tam detal (hədəf, nəticə, status, qiymətləndirmə, hesablama) göstərir.
- Komandamın / Strukturumun KPI-ları yalnız icmal sütunları göstərir: ad, cari nəticə, hədəf, status, ümumi KPI %.

### 7. USER — Komandam modulu
- `src/pages/user/UserTeamsPage.tsx` manager `TeamsPage` görünüşünə uyğunlaşdırılır (eyni UI/UX).
- Data `scope.ts`-dəki `getVisibleTeams(user)` ilə məhdudlaşdırılır — yalnız istifadəçinin aid olduğu komanda(lar).
- Rəhbərə xas düymələr (cascade et, qiymətləndir, təsdiq göndər və s.) gizlədilir; yalnız icmal + üzv siyahısı + KPI göstəriciləri qalır.

---

### Texniki qeydlər
- Bütün dəyişikliklər frontend qatındadır; store faylları yalnız oxu/paylama məntiqi üçün ehtiyat halda yenilənir.
- Rol yoxlaması `useAuth().user.role` və `scope.ts` helper-ləri vasitəsilə aparılır; heç bir yerdə hardcoded rol yoxdur.
- Mövcud cascade/leader-change/deactivation axınları toxunulmaz qalır.

### Dəyişəcək fayllar (təxmini)
- `src/lib/kpiCardStore.ts` (persistensiya yoxlama)
- `src/components/kpi/CreateKpiWizard.tsx` ("Özüm" opsiyası)
- `src/pages/GoalTrackingPage.tsx` (cascade zənciri + "Cascade Matrix" mətnlərinin silinməsi)
- `src/components/layout/UserSidebar.tsx` (Anonim Bildiriş silinməsi)
- `src/components/layout/Header.tsx` və ya UserLayout (üst panel anonim bildiriş)
- `src/pages/user/UserKpiCardsPage.tsx` (3 tab yenidən qurulur)
- `src/pages/user/UserTeamsPage.tsx` (manager UX + user data scope)
- (lazım olarsa) `src/lib/notificationsStore.ts` / user notification UI kiçik düzəlişlər
