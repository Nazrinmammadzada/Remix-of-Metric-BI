# Rəhbər profilində dəyişikliklər planı

## 1) Cascade Load məntiqinin düzəldilməsi

**Problem:** Hazırda rəhbərin təyin etdiyi hədəf dəyəri cascade limit kimi işlədilir. Əslində bu dəyər hədəfin **aid olduğu şəxsə** aiddir, təyinediciyə deyil.

**Dəyişikliklər:**
- `CascadeDistributeDialog.tsx`:
  - "Ümumi limit" artıq hədəfin `value`-si deyil, rəhbərin **başqa kartdan** gələn ümumi cascade load-udur.
  - Global seed: rəhbər üçün `500 000` AZN paylanabilən cascade load təyin et (`kpiSetStore` və ya yeni `cascadeLoadStore`-da).
  - Əməkdaşın qarşısına yazılan qiymət default olaraq hədəfin dəyərinə (`bootstrap.limit`) bərabərdir — yalnız bir sətir, birbaşa əməkdaş üçün.
  - Hər bölgüdən sonra qalan cascade load bütün digər pop-up/pəncərələrdə azalmış görünsün (persist real-time).
- `CascadeLoadConfirmDialog`: `value` prop cascade load qalıqını göstərəcək (500000 seed-dən).

## 2) "Hədəf təyin etmə" cədvəlinin görünüşü

`ManagerResponsibleCardsPage.tsx` — "Hədəf təyin etmə" hissəsi:
- Görünüşü tam olaraq "Hədəf qiymətləndirmə" ilə eyni et: multi-card expandable list, hər kart açıldıqda hədəflər cədvəli.
- Sütun adları (Ad, Növ, Dəyər, Çəki, Əməliyyatlar) dəyişməz qalır.
- "Qiymətləndir" yerinə "Təyin et" düyməsi.

## 3) "Nəticələrim" modulu (yeni)

Yeni səhifə `src/pages/manager/ManagerResultsPage.tsx`:
- 3 kart: **Fərdi nəticələrim**, **Komanda nəticələri**, **Tabeçiliyimdəki nəticələr**.
- Hər kartın daxilində 2 tab: **Yekunlaşmış** və **Davam edən**.
- Seed data: komandada və tabeçilikdə nümunə şəxslər (mövcud org profilləri ilə uyğun).
- Sidebar-a əlavə.

## 4) "Bonuslarım" modulu

Yeni səhifə `src/pages/manager/ManagerBonusPage.tsx`:
- 2 kart: **Öz bonuslarım**, **Tabeçiliyimdəki bonuslar**.
- Daxili məntiq eynidir (mövcud `BonusPage` səhifəsinin sadə variantı).
- Sidebar-a əlavə et.

## 5) "KPI izlənməsi" modulu

Yeni səhifə `src/pages/manager/ManagerKpiTrackingPage.tsx`:
- 3 kart:
  1. **Mənim KPI-larım** — fərdi hədəflər və icra vəziyyəti.
  2. **Komanda KPI-ları** — kollektiv hədəflər.
  3. **Tabeçiliyimdəkilərin KPI-ları** — iyerarxik ağac görünüşü:
     - Default: yalnız 1 səviyyə aşağı (birbaşa tabeçilik).
     - Səviyyə seçici (1–5): klik ilə genişlənmə.
     - Ad üzrə axtarış inputu.
     - Hər əməkdaş sətrində: təyin statusu (✓/✗), mərhələ (təyin/qiymətləndirmə), gecikmə bildirişi ("Tələsdür" düyməsi — toast notification).
     - Lifecycle qısa göstəricisi.
- Sidebar-a əlavə et.

## Texniki detallar

**Yeni store:** `src/lib/managerCascadeLoadStore.ts`
- Konstant `TOTAL_LOAD = 500000`, `distributed` state, `remaining()` selector, `distribute(amount)` və `useCascadeLoad()` hook.

**Yeni fayllar:**
- `src/pages/manager/ManagerResultsPage.tsx`
- `src/pages/manager/ManagerBonusPage.tsx`
- `src/pages/manager/ManagerKpiTrackingPage.tsx`
- `src/lib/managerCascadeLoadStore.ts`
- (opsional) `src/lib/managerResultsSeed.ts`, `src/lib/managerBonusSeed.ts`

**Redaktə olunacaq:**
- `src/components/kpi/CascadeDistributeDialog.tsx` — limit mənbəyi və real-time load.
- `src/components/kpi/CascadeLoadConfirmDialog.tsx` — value = qalıq load.
- `src/pages/manager/ManagerResponsibleCardsPage.tsx` — cədvəl görünüşü.
- `src/components/layout/ManagerSidebar.tsx` — 3 yeni link.
- `src/App.tsx` — 3 yeni route.

Təstiq alandan sonra dərhal implementasiyaya başlayıram.
