
# Dinamik KPI Workflow — Mövcud Store-ların Düzgün Bağlanması

Yeni entity, yeni store, yeni sahə yaratmıram. Mövcud strukturu istifadə edirəm:

| Biznes mərhələsi | İstifadə olunacaq mövcud sahə |
|---|---|
| HR kart yaradır (Owner tipli) | `SharedKpiCard.ownerId` = seçilmiş əməkdaş |
| HR kart yaradır (Target Setter tipli) | Wizard artıq `addPendingEntry(... ownerType: "manager")` çağırır → `KpiSetEntry.assigneeName = <setter adı>` |
| "Məsul olduğum kartlar → Hədəf təyin etmə" | `KpiSetEntry` (ownerType `manager` + `assigneeName == user.name`) |
| Setter dəyər/limit/çəki yazır | mövcud `setEntryDetails()` |
| "Cascade oluna bilər" | mövcud `KpiSetEntry.cascadable` |
| Cascade Load popup | mövcud `getIncomingCascadeLoad()` — amma mənbəyi düzəldilir (aşağı bax) |
| Cascade dialog | mövcud `CascadeDistributeDialog` |
| Cascade ağacı | mövcud `cascadeTreeStore` (`createRoot`, `distribute`) |
| "Mənim KPI-larım" | mövcud `useCascadeTree()` node-ları + `useSharedKpiCards()` |

Yeni fayl yaratmıram; yalnız aşağıdakı mövcud fayllarda cərrahi düzəlişlər edirəm.

---

## Aşkar etdiyim əsl problemlər (nə qırılıb)

1. **`ManagerResponsibleCardsPage`** `KpiSetEntry`-ni yalnız `ownerType === "manager"` ilə süzür — `assigneeName === user.name` filtri yoxdur. Nəticə: Elvin və Kamran eyni siyahını görür.
2. **`KpiCardsPage` wizard** kart tamamlananda `addPendingEntry` çağırır, amma HR-in seçdiyi target-setter-in adı entry-yə keçmir (assigneeName başqa mənbədən götürülür). Nəticə: kart heç kimin "Hədəf təyin etmə"-sinə düşmür və ya səhv setter-ə düşür.
3. **`getIncomingCascadeLoad`** cascade load-u başqa KpiSetEntry-nin `target` sahəsindən oxuyur → istifadəçinin dediyi kimi bu səhv məntiqdir. Load **`cascadeTreeStore`**-dan gəlməlidir: user-in üstündə parent node varsa, load = həmin parent node-un ona ayırdığı `limit`. Root setter üçün load = HR-in kartda yazdığı ümumi target.
4. **`CascadeDistributeDialog`** artıq tab-larla açılır (`all` / digər), amma:
   - "Yenidən kaskadlaya bilər" checkbox-u varsa silinir.
   - Default olaraq bütün işçilər göstərilir; istifadəçinin istədiyi kimi əvvəl 2-radio ("Tabeliyimdə olan bütün əməkdaşlar" / "Struktur rəhbərləri") təyinat növü seçilməlidir, sonra siyahı gəlsin.
   - Limit prop-u yazılmış target-dan yox, cascade load-dan gəlməlidir (bootstrap-da düzəldirik).
5. **`ManagerKpiTrackingPage`** ("Mənim KPI-larım") `cascadeTreeStore`-dakı user-a düşən node-ları göstərmir → cascade nəticələri Kamran-da / Orxan-da görünmür.

---

## Mərhələ-mərhələ dəyişikliklər (hər biri mövcud fayla toxunur)

### M1 — Wizard → Target Setter düzgün yazılsın
**Fayl:** `src/pages/KpiCardsPage.tsx` (ətrafında sətir 620–656)
- Wizard-dakı mövcud "hədəf təyinat şəxsləri" seçimini oxuyub, hər seçilmiş setter üçün `addPendingEntry({ cardId, cardName, assigneeId, assigneeName, ownerType: "manager", unit })` çağırırıq.
- "Struktur" seçilsə: `orgStore`-dan həmin strukturun `isStarPerson=true` rəhbərini tap və setter et.
- **Yeni sahə əlavə edilmir** — sadəcə mövcud `addPendingEntry` doğru `assigneeName` ilə çağırılır.

**Yoxlama:** HR kart yaradanda `localStorage["kpi_set_entries_v6"]`-də yeni sətir `assigneeName: "Elvin Rəhimov"` (və ya seçilmiş şəxs) ilə görünsün.

### M2 — Responsible Cards istifadəçi əsasında süzülsün
**Fayl:** `src/pages/manager/ManagerResponsibleCardsPage.tsx` (sətir 65–160)
- `rows.filter(r => r.ownerType === "manager")` → `rows.filter(r => r.ownerType === "manager" && r.assigneeName === user?.name)`
- Sayğaclar da eyni filtri istifadə etsin.
- HR hesabı üçün özəl davranış yoxdur — HR öz adı ilə eşleşmədiyi üçün siyahı boş olur (istifadəçinin istədiyi budur).

**Yoxlama:** Kart yaradıldıqdan sonra yalnız setter-in hesabında "Hədəf təyin etmə"-də görünsün; HR-də boş qalsın.

### M3 — Cascade Load-un mənbəyi düzəldilsin
**Fayl:** `src/lib/kpiSetStore.ts` (`getIncomingCascadeLoad`)
- Funksiyanın imzasını qoruyuruq (çağıran yerlər sınmasın).
- Daxildə əvvəl `cascadeTreeStore.getNodes()`-dan `assigneeName === setter` və `parentId !== null` olan node axtarırıq (yəni: setter yuxarı rəhbərdən pay alıbmı?).
  - Varsa → `{ value: node.limit, unit: node.unit, cardName: node.cardName }`.
- Tapılmasa: setter root-dursa (HR-in owner-i olduğu kart), fallback olaraq mövcud `SharedKpiCard.targets` cəmindən HR-in verdiyi ümumi target-i oxuyuruq (kart cardId ilə bağlıdır).
- Köhnə "başqa cascadable entry-dən oxuma" məntiqi silinir — istifadəçinin dediyi səhv budur.

**Yoxlama:** Elvin 200.000 yazır → popup 750.000 göstərir (çünki HR kartın target-i budur). Kamran 100.000 yazır → popup Elvinin ona ayırdığı 300.000-i göstərir.

### M4 — Wizard tərəfindən cascade root avtomatik yaradılsın
**Fayl:** `src/pages/KpiCardsPage.tsx`
- HR kartı yaradanda (`buildSharedCardFromDraft` çağırışından sonra), əgər `cascadable === true`-dursa və kart Owner tiplidirsə (HR-in seçdiyi ownerId var), `createRoot({ assigneeId: ownerEmpId, limit: kartda yazılan target, cardName, goalName: targets[0].name, unit })` çağırırıq.
- Bu, Elvinin sonradan cascade edə bilməsi üçün ağacın kökünü yaradır. Duplikat qorunması üçün `findRootByGoal` istifadə olunur.

**Yoxlama:** Kart yaradıldıqdan dərhal sonra `localStorage["cascade_tree_nodes_v4"]`-də uyğun root peyda olsun.

### M5 — CascadeDistributeDialog təmizliyi
**Fayl:** `src/components/kpi/CascadeDistributeDialog.tsx`
- "Yenidən kaskadlaya bilər" checkbox-u və uyğun state varsa tamamilə silinir.
- Mövcud `Tabs` (all/leaders — koda baxınca artıq var) əvəzinə **məcburi 2-radio seçimi** (əvvəldən heç biri seçili olmasın):
  - `"Tabeliyimdə olan bütün əməkdaşlar"` → `getSubordinatesOfStarHolder(user)` (mövcud helper)
  - `"Struktur rəhbərləri"` → eyni siyahının `isStarPerson` filtri (mövcud kod)
- Seçim edilməyincə audience siyahısı gizlədilsin.
- Bootstrap-a ötürülən `limit` = Cascade Load (M3 mənbəsi), yazılmış target deyil (`ManagerResponsibleCardsPage`-də `cascadeConfirm.value` yerinə `getIncomingCascadeLoad(...).value` ötürürük).
- Cəm > Cascade Load olduqda validation.

**Yoxlama:** Dialoq açılanda əvvəl 2 radio → seçim → yalnız uyğun subordinate-lar → cəm limit-i keçə bilməsin.

### M6 — "Mənim KPI-larım" cascade node-larını göstərsin
**Fayl:** `src/pages/manager/ManagerKpiTrackingPage.tsx`
- Mövcud data mənbəyinə `useCascadeTree()`-dən `n.assigneeName === user.name` filtri əlavə edirik.
- Hər node bir sətir kimi (kart adı = `n.cardName`, hədəf adı = `n.goalName`, dəyər = `n.limit`).
- `useSharedKpiCards()`-dən owner=user olan kartlar da göstərilir (əgər hazırda göstərilmirsə).

**Yoxlama:** Elvin cascade edəndən sonra Kamran hesabında "Mənim KPI-larım"-da yeni sətir çıxır. Kamran cascade edəndə Orxan hesabında çıxır.

### M7 — Cascade Xəritəsi zəncirin tamlığı
**Fayl:** `src/pages/CascadingHubPage.tsx` (yoxlanılır — çox güman ki artıq `useCascadeTree`-yə bağlıdır)
- Yalnız root-un `cardName`-inin yeni yaradılmış kartları da tanıdığından əmin oluruq. Əlavə kod tələb olunmasa toxunulmur.

**Yoxlama:** Wizard → dəyər → cascade → cascade → cascade zənciri (HR→Elvin→Kamran→Orxan) xəritədə tam ağac kimi görünür.

---

## Toxunulmayanlar

- Bütün mövcud seed data (`seed-1..5`, `ks-elvin-*`, `cn-s-root`, `cn-m-root` və s.) olduğu kimi qalır.
- `authStore`, `orgStore`, `SharedKpiCard`, `KpiSetEntry`, `CascadeTreeNode` tipləri **dəyişmir**.
- Yeni fayl yoxdur.

## İş qaydası

M1 → yoxlayaq → M2 → yoxlayaq → ... M7. Hər mərhələdən sonra sizə "hazırdır, X hesabından test edin" deyəcəm. Yalnız sizin OK-nizdən sonra növbəti mərhələyə keçəcəm ki, flow-un heç bir hissəsi yarımçıq qalmasın.
