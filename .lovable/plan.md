# KPI Cascading (Ana Hədəf → Alt Hədəflər) — İcra Planı

Bu plan spesifikasiyadakı 13 qaydanın hamısını əhatə edir və mövcud "Rəhbər rolu (Star Person)" konsepsiyası üzərində qurulur — heç bir Cascading Matrix qurulmur.

## 1) Data modeli (`src/lib/kpiCardStore.ts`, yeni `src/lib/cascadeTreeStore.ts`)

Hər `Goal` (hədəf) obyektinə əlavə olunacaq:

- `cascadable: boolean` — "C" seçimi (yalnız uyğun tiplər üçün aktiv edilə bilər).
- `parentGoalId?: string` — parent-child əlaqəsi (kaskadla yaranıbsa).
- `rootGoalId?: string` — bütün zəncirin kökü (tez axtarış üçün).
- `numericTarget?: number` — sayısal hədəf (bölgü riyaziyyatı üçün).
- `assigneePersonId?: string` — hədəfi qəbul edən şəxs.

**Uyğun tiplər** (`kpiValidation.ts` üzərində helper):
- Bölünə bilər: Məbləğ, Say, Faiz, Nisbət, Absolut, Say, Faiz.
- Bölünə bilməz: Tarix, Vaxt, Bəli/Xeyr, Səriştə, Fərdi inkişaf, Mətn/Trend/Benchmark (bal).

Yeni fayl `cascadeTreeStore.ts`:
- `getChildren(goalId)`, `getRemaining(goalId)`, `getStatus(goalId)` → 🟢/🟡/🔴/⚪.
- `distribute(parentId, slices[])` — cəm yoxlanışı, artıq bölgüyə icazə vermir.
- Event bus (`window.dispatchEvent`) real-time UI üçün.

## 2) KPI Yaradılması (`CreateKpiWizard.tsx`)

Addım 2 (Hədəflər) blokunda hər hədəf üçün:

- Yeni **"C — Kaskadlana bilər"** switch (yalnız uyğun tip seçildikdə aktiv, əks halda disabled + tooltip: *"Bu tip bölünə bilmir"*).
- C aktiv olan hədəf `cascadable=true` ilə saxlanır.
- `numericTarget` avtomatik parse olunur (`target` sətrindən).
- Təyin edici Star statuslu deyilsə xəbərdarlıq (blocking deyil, info).

## 3) Rəhbərə göndərmə (`kpiSetStore.ts` + `KpiSetPage.tsx`)

HR "Təyin etmə"-yə keçirdikdən sonra:
- Kartın `cascadable` hədəfləri Star statuslu təyin edicinin **"Məsul olduğum kartlar"** siyahısında görünür (`ownerType: "manager"` artıq var).
- Kart üzərində "Ümumi limit: X" chip-i əlavə olunur.

## 4) Rəhbərin bölgü axını (yeni `src/components/kpi/CascadeDistributeDialog.tsx`)

Rəhbər Star statuslu hədəfi açanda dialoq açılır:

- **Sual:** "Bu hədəfi necə təyin etmək istəyirsiniz?"
  1. *Mövcud hədəfdən bölərək (Kaskadlama)* — parent-child, limit çıxılır.
  2. *Yeni müstəqil hədəf* — heç bir bağ yaradılmır (mövcud KPI create axını).
- Yalnız `cascadable=true` olduqda göstərilir.
- Kaskad seçildikdə: tabelikdəki əməkdaşlar + alt-Star rəhbərlər siyahısı; hər sətrdə **"Ayrılan məbləğ"** input-u.
- Real-time hesablama panel:
  ```
  Ana Hədəf:      1.000.000
  Bölüşdürülüb:     850.000
  Qalıq:            150.000   [🟡]
  ```
- Cəm > ana → **Yadda saxla** disabled + qırmızı xəbər.
- Alt-Star rəhbər seçilibsə, ona verilən hissə də yenidən bölünə bilər (rekursiv).

## 5) Rekursiv işləmə

`distribute()` çağırışı hər səviyyədə eyni məntiqi işlədir; child goal `parentGoalId + rootGoalId` alır. UI ağacı `getChildren` ilə tam rekursiv render olur — səviyyə sayı hardcoded deyil.

## 6) Kaskad İzləmə (`CascadingHubPage` → track view)

`CascadeTrackingPage.tsx`-ni işlək tree ilə əvəz edirik:

- Sol panel: `cascadable` ana hədəflər siyahısı (search + status chip).
- Sağ panel: seçilən ana hədəfin **ağac görünüşü** — hər node:
  - Ad · vəzifə · ⭐ (varsa) · Limit · Bölüşdürülüb · Qalıq · Status rəngli badge.
  - Yığma/açma (Radix Collapsible).
- `useSyncExternalStore` + custom event ilə real-vaxt yenilənmə (səhifə refresh olmadan).

## 7) Statuslar helper

`cascadeTreeStore.getStatus(node)`:
- Alt yoxdursa və `assignee` varsa → ⚪ Gözləyir (əgər limit heç ayrılmayıbsa) və ya 🟢 Tamamlandı (son icraçı).
- `remaining === 0 && children.length > 0` → 🟢.
- `remaining > 0 && distributed > 0` → 🟡.
- `remaining > 0 && bölgü açılmayıb amma vaxt keçib` (sadə: heç bölgü yoxdursa) → 🔴.

## 8) Genişlənə bilən arxitektura

- Bölünə bilən tiplər siyahısı tək yerdə (`kpiValidation.ts` → `isDivisibleType`).
- Struktur/rəhbər sorğuları `orgStore` içindəki mövcud helper-lərdən (dəyişməz interfeys) istifadə edir.
- Bütün cascade state `cascadeTreeStore.ts`-də — yeni səviyyə/şöbə/rol əlavə edildikdə əlavə kod tələb olunmur.

## Faylların dəyişiklik xülasəsi

| Fayl | Əməliyyat |
|---|---|
| `src/lib/kpiValidation.ts` | `isDivisibleType(types)` helper əlavə |
| `src/lib/kpiCardStore.ts` | Goal-a `cascadable/parentGoalId/rootGoalId/numericTarget/assigneePersonId` |
| `src/lib/cascadeTreeStore.ts` | **YENİ** — tree/limit/status/distribute API + event bus |
| `src/components/kpi/CreateKpiWizard.tsx` | Hər hədəfə "C" switch + tip yoxlaması |
| `src/components/kpi/CascadeDistributeDialog.tsx` | **YENİ** — bölgü dialoqu (kaskad vs. müstəqil) |
| `src/pages/KpiSetPage.tsx` | Star rəhbər üçün "Kaskad et" düyməsi |
| `src/pages/CascadingHubPage.tsx` | Track kartını real işlək ağaca bağla |
| `src/pages/CascadeTrackingPage.tsx` | **YENİ** — ağac vizualı + real-time |

## Kənarda saxlanılanlar

- Backend / Supabase sxem dəyişikliyi bu iterasiyada YOXDUR — hər şey mövcud `localStorage` store nümunəsi ilə davam edir (layihənin qalanı ilə uyğun). Cloud sync sonrakı addımdır.
- Bildiriş göndərmə mövcud `notificationsStore` ilə bağlanır, yeni infrastruktur qurulmur.

Təsdiqlədikdən sonra bütün faylları paralel şəkildə yazacam.