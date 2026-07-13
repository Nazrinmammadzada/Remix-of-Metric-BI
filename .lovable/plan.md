
Sorğu geniş və bir neçə moduldur — icra etməzdən əvvəl aşağıdakı planı təsdiqlə.

## 1) Lifecycle Şablonları — default "Standart Aylıq KPI Lifecycle"

`src/lib/lifecycleTemplatesStore.ts`:
- Seed: sistem ilk yükləndikdə (əgər `kpi_lifecycle_templates_v1` boşdursa) 1 ədəd default şablon əlavə olunacaq:
  - `id: "tpl-standard-monthly"`, `name: "Standart Aylıq KPI Lifecycle"`, `isSystem: true`, `active: true`.
  - `data` sahələri xüsusi marker daşıyır: `dynamic: "monthly-standard"` — tarixlər KPI yaradılma tarixinə görə runtime hesablanır (aşağıya bax).
- Yeni sahələr: `active: boolean` (deaktiv üçün), `isSystem?: boolean` (default şablonu silinməkdən qoruyur; yalnız redaktə/deaktiv olunur).
- Yeni funksiyalar: `updateLifecycleTemplate(id, patch)`, `toggleLifecycleTemplateActive(id)`.
- `deleteLifecycleTemplate` — `isSystem` şablonu silməyə imkan verməsin.

**Dinamik tarix hesablaması** (`computeStandardMonthlyLifecycle(createdAtISO)`):
- `KPI təyin olunması`: start = createdAt; end = createdAt + 2 gün.
- `KPI Review`: start = təyinat.end + 1 gün; end = start + 5 gün.
- `KPI qiymətləndirilməsi`: start = ayın sonu − 5 gün; end = ayın sonu − 2 gün.
- `Bonusun hesablanması`: start = qiymətləndirmə.end + 1 gün; end = ayın son günü.
Bu funksiya `Omit<CardLifecycle, "cardId"|"cardName"|"updatedAt">` qaytarır.

## 2) Şablon idarəetməsi UI (KpiLifecyclePage → Şablonlar tabı)

Hər kartda:
- Klik → detal dialoqu (mərhələ adı, başlanğıc/bitmə, dövr) — mövcud `LifecycleView`-a bənzər.
- "Redaktə et" düyməsi → ad/təsvir və (system olmayanlarda) mərhələ tarixləri redaktə edilir. Sistem şablonu üçün yalnız ad/təsvir redaktə + tarixlər readonly (çünki dinamikdir).
- "Deaktiv/Aktivləşdir" toggle.
- Sil düyməsi yalnız `!isSystem` olduqda görünür.

Deaktiv şablonlar KPI yaradılışında dropdown-da görünməsin (yalnız `active === true`).

## 3) KPI kartı yaradarkən "Lifecycle şablonundan seç"

`src/components/kpi/CreateKpiWizard.tsx` — lifecycle addımında (mövcud `LifecycleWizardStep`-in üstündə):
- Yeni sahə: **"Lifecycle şablonlarından seç"** dropdown (aktiv şablonlar + "Manual" seçimi).
- Şablon seçildikdə:
  - Standart Aylıq şablonu → `computeStandardMonthlyLifecycle(new Date())` çağrılır, bütün mərhələ tarixləri avtomatik doldurulur.
  - Digər şablonlar → `template.data` olduğu kimi doldurulur.
  - `LifecycleWizardStep` daxilində tarix və dövr sahələri **readonly** olur (yalnız Review iştirakçıları redaktə edilə bilər).
- "Manual" seçildikdə mövcud davranış qalır.

`LifecycleWizardStep`-ə `readOnlyDates?: boolean` prop əlavə edilir; `StageFields` və `DateField`-də `disabled` state-ə düşür.

## 4) Approval Matrix — 3-cü addımda təsdiqləyicilər siyahısı

`CreateKpiWizard.tsx` addım 3 (Təsdiqləmə matrisi seçimi):
- Matris dropdown-un altında seçilmiş matrisin bütün approver-ləri cədvəl kimi göstərilir:
  - Sütunlar: **№ (ardıcıllıq)**, **Ad Soyad**, **Vəzifə**, **Təsdiqləmə mərhələsi**.
- `approvalsStore` / `matrixStore`-dan approver-lər real-time çıxarılır (matris dəyişəndə avtomatik yenilənir — `useMemo(..., [selectedMatrixId])`).

## 5) Qiymətləndirici seçimi — "Şəxs" tabında search

`CreateKpiWizard.tsx` (Evaluator dialoq) — **Şəxs** tabında əməkdaş siyahısının üstündə `Input` (search) əlavə edilir; ad/vəzifə üzrə filter. (Plan §3 sırasındakı iş idi; həyata keçirilməmişsə tamamlanır.)

## Texniki qeydlər
- Standart şablonun `data` sahəsi seed vaxtı hər mərhələ üçün placeholder saxlayır (`period: "Aylıq"`, boş tarixlər) + `meta.dynamic = "monthly-standard"` markeri; tətbiq zamanı `computeStandardMonthlyLifecycle` istifadə olunur.
- Mövcud KPI-lara tətbiq edilmiş şablonlar toxunulmur; dəyişiklik yalnız yeni KPI yaradılışına təsir edir.
- Typecheck ilə yoxlanılacaq.

## Aydınlaşdırma sualı
İki kiçik məqamı təsdiqlə:
1) Standart şablonun `data` markerini `meta.dynamic="monthly-standard"` sahəsi ilə saxlamağa razısan? (Şablon strukturuna yeni sahə əlavə edir.)
2) "Manual" seçimi dropdown-da qalsın (istifadəçi şablonsuz da yarada bilsin) yoxsa şablon icbari olsun?
