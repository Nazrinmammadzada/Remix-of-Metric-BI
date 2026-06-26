# Modullararası Əlaqə və Panel Scoping Planı

Məqsəd: HR (Admin), Rəhbər (Manager) və User (Əməkdaş) panelləri arasında **tək həqiqət mənbəyi** (single source of truth) qurmaq, hər panelin ancaq öz görməli olduğu məlumatı görməsini təmin etmək və modullar arasında dəyişikliklərin real-time əks olunmasını təmin etmək.

## 1. Mərkəzi Data Modeli (mock + persistence)

Bütün modullar üçün ortaq `src/lib/` store-ları genişləndiriləcək. Hər biri `localStorage` + custom event ilə işləyir ki, bir paneldə dəyişiklik o biri panelə dərhal yansısın (artıq mövcud pattern, məs. `cascadeMatrixStore`).

Yeni / yenilənəcək store-lar:
- `orgStore.ts` — strukturlar (departament/şöbə) + hər birinə bağlı **rəhbər (managerId)** və üzv `employeeIds[]`.
- `teamsStore.ts` — komandalar + `leaderId` (rəhbər) + `memberIds[]` + `structureId`.
- `mockData.ts` — hər əməkdaşa `id`, `managerId`, `structureId`, `teamIds[]`, `role` (HR/MANAGER/USER) əlavə.
- `matrixStore.ts` — Təsdiqləmə Matrisi: hər matris bir neçə **approver** (rəhbər) saxlayır + matrisə bağlı KPI kartları siyahısı.
- `kpiCardStore.ts` (yeni, mövcud `kpiCardStatusStore`-u tamamlayır) — KPI kartının tam snapshot-u: `ownerId`, `assigneeIds[]`, `evaluatorIds[]`, `matrixId`, `targets[]`, status, lifecycle nöqtəsi.
- `approvalsStore.ts` — sistem təsdiq queue: kart matrisə göndəriləndə avtomatik bu store-a düşür, matrisdəki rəhbərlər öz panellərində görür.
- `notificationsStore.ts` — bildiriş feed-i (Hədəf təyini, təsdiq gözləyir, imtina, qəbul və s.).

## 2. Rol əsaslı Scoping

`src/lib/scope.ts` adlı yardımçı:
- `getVisibleEmployees(user)` — HR: hamısı; MANAGER: `managerId === user.id` olan + öz; USER: yalnız özü.
- `getVisibleTeams(user)` — HR: hamısı; MANAGER: `leaderId === user.id`; USER: üzv olduğu komandalar.
- `getVisibleStructures(user)` — analoji.
- `getVisibleKpiCards(user)` — HR: hamısı; MANAGER: rəhbəri olduğu adamlara aid kartlar + öz kartları + matrisdə approver olduğu kartlar; USER: `assigneeIds` daxilindədirsə.
- `getVisibleApprovals(user)` — MANAGER: matris approver-i olduğu kartlar; HR: hamısı.

Bütün səhifə komponentləri data oxuyarkən bu funksiyalardan keçəcək.

## 3. KPI → Matris → Təsdiq axını

1. HR `CreateKpiWizard`-da matris seçir → kart yaranır, status `tesdiq_gozlenilir` → `approvalsStore.enqueue(cardId, matrixId)`.
2. Matrisdəki hər rəhbər öz panelində `/manager/sistem-tesdiq` səhifəsində kartı görür (artıq mövcud route, indi data ilə qoşulur).
3. Rəhbər **Təsdiq** edirsə → kart status `aktiv`; **İmtina** edirsə → `imtina` + səbəb. Hər iki halda HR `/sistem-tesdiq` və KPI cədvəlində dərhal əks olunur (eyni store + event).
4. Aktiv olduqda `assigneeIds`-dəki user-lər öz `/user/kpi-kartlari` səhifəsində kartı görür və icra statusu (Hədəf təyinlərinin izlənilməsi) verə bilirlər.

## 4. Modullar üzrə qoşulmalar

| Modul | HR | Rəhbər | User |
|---|---|---|---|
| Təşkilat | bütün struktur idarəsi | yalnız öz şöbə/komanda | — |
| KPİ-lar | bütün kartlar | öz komandasının + matris approver | yalnız təyin olunduğu |
| Hədəf izləmə | hamısı | öz tabesindəkilər | yalnız özü; status yeniləyir |
| KPI lifecycle | hamısı | öz tabe | öz |
| KPI Nəticələri | hamısı | öz tabe + öz | öz |
| Cascading | hamısı | yalnız oxu (öz əhatəsi) | — |
| Təsdiqləmə Matrisi | yaradır/redaktə | seçici (görür kimə düşür) | — |
| Sistem Təsdiq | hamısı | yalnız matris approver olduğu | yalnız özünə aid |
| Hesabatlar | hamısı | öz əhatə | öz |
| Anonim Bildiriş | header sağ; hamısı oxuya bilər (HR only). | göndərir + öz şikayətləri | göndərir |
| Bonuslar | hamısı | öz tabe + öz | öz |
| Komandalar | hamısı | öz | yalnız üzv olduğu |
| Əməkhaqqı | HR-only | (giriş yoxdur) | (yoxdur) |

## 5. Mock data

`src/data/mockData.ts` genişləndiriləcək:
- 3 struktur (Satış, IT, Maliyyə) — hər birinin bir rəhbəri.
- 3 komanda — hər birinə bir leader (mövcud `manager@kpi.az` Satış rəhbəri olur).
- 16 əməkdaşın `managerId`/`teamIds` doldurulur.
- 4 hazır KPI kartı: 2 aktiv (Satış komandasına), 1 təsdiq gözləyən (matrisdə Satış rəhbəri approver), 1 natamam draft.
- 2 hazır matris: "Satış Matrisi" (approver = Satış rəhbəri), "İT Matrisi".

## 6. Reaktivlik

Hər store mövcud pattern-i izləyir:
```ts
const EVT = "xxx-updated";
save(): window.dispatchEvent(new Event(EVT));
useStore(): useEffect → addEventListener(EVT) + "storage"
```
Beləliklə HR kartı təsdiqə göndərən kimi Rəhbər panelində açıq olan `/manager/sistem-tesdiq` saniyə içində yenilənir.

## 7. Texniki addımlar (faylların əhatəsi)

1. `src/data/mockData.ts` — sahə əlavələri + mock kart/matris seed.
2. `src/lib/scope.ts` — yeni scoping helper.
3. `src/lib/kpiCardStore.ts`, `src/lib/approvalsStore.ts`, `src/lib/notificationsStore.ts` — yeni store-lar.
4. `src/lib/teamsStore.ts`, `src/lib/orgStore.ts`, `src/lib/matrixStore.ts` — leader/approver sahələri.
5. `CreateKpiWizard.tsx` — submit həqiqi store-a yazır + matris seçildikdə approvals-a göndərir.
6. `KpiCardsPage`, `UserKpiCardsPage`, `manager/mesul-kartlar` — scoped data oxuyur.
7. `ApprovalsPage` (HR və Manager üçün eyni komponent, scope ilə fərqlənir).
8. `GoalTrackingPage`, `KpiLifecyclePage`, `KpiScoresPage`, `BonusPage`, `TeamsPage`, `OrganizationPage`, `WhistleblowerPage` — scope tətbiqi.
9. `ManagerHomePage`, `UserHomePage`, `HomePage` — dashboard kartları artıq real store-dan oxuyacaq.

## 8. Test ssenarisi (manual)

- HR olaraq KPI yarat → matris "Satış Matrisi" seç → submit.
- Manager (`manager@kpi.az`) ilə daxil ol → `/manager/sistem-tesdiq`-də kart görünür → Təsdiq et.
- HR-də status `Aktiv` olur, User panelində assignee öz kartını görür.
- User `Hədəf izləmə` modulunda icra statusunu yeniləyir → HR və Manager-də dərhal əks olunur.

## 9. Sahə xaricində qalanlar

- Real-time Supabase sync (hələlik localStorage event-ləri kifayətdir; mövcud `kpi_card_status` cədvəli saxlanılır).
- Yeni Supabase miqrasiyaları (bu addımda yoxdur; sırf frontend store + mock).
- Səhifələrin vizual yenidən dizaynı — yalnız data bağlantısı.

Təsdiq verirsənsə, dərhal həyata keçirməyə başlayıram.
