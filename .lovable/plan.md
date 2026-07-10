
Aşağıdakı 5 hissəni ardıcıl icra edəcəm:

## 1) Rəhbər profili — modul adları
`src/components/layout/ManagerSidebar.tsx`:
- "Nəticələrim" → **Nəticələr**
- "Bonuslarım" → **Bonuslar**
`ManagerResultsPage.tsx` və `ManagerBonusPage.tsx` daxilində Header, PageHero başlıqları eyni cür yenilənəcək (yalnız hub başlıqları; alt kartların adları dəyişməyəcək).

## 2) Sazlamalar → Məlumat Cədvəli kataloqları
`src/lib/dropdownCatalogStore.ts`:
- `sub_kpi_units` (Hədəf Ölçü Vahidləri) → adı **"Hədəf Növləri"**, dəyərləri KPI wizard 2-ci addımdakı `HEDEF_TYPES` ilə eyni: `Məbləğ, Say, İcra, Səriştə, Fərdi İnkişaf, Faiz, Nisbət, Boolean, Zaman`.
- `frequencies` (Tezlik (Period)) → adı **"Dövr"**, dəyərləri wizard 1-ci addım `PERIODS` ilə eyni: `Aylıq, Rüblük, 6 Aylıq, İllik, Custom`.
- `kpi_statuses` → dəyərləri KPI modulundakı 8 status ilə eyni: `Qaralama, Natamam, Təsdiq gözlənilir, İmtina, Aktiv, Qiymətləndirmə, Tamamlanıb, Ləğv olundu`.
- Silinəcək: `approver_roles` (Təsdiqləyici Vəzifələri), `notification_channels` (Bildiriş Kanalları), `kpi_card_types` (KPI Kartı Tipləri). `REMOVED_CATALOG_IDS`-a əlavə olunacaq ki, storage-da da təmizlənsin.

`src/components/settings/DropdownCatalogsTab.tsx`:
- `kpi_statuses` üçün `active.id === "kpi_statuses"` olduqda "Dəyər əlavə et" düyməsi + edit/delete gizlədilsin (read-only).

## 3) Yeni KPI kartı — 2-ci addım Qiymətləndirici modal
`src/components/kpi/CreateKpiWizard.tsx` daxilində Qiymətləndirici seçim dialoqu:
- **Şəxs** tabı — əməkdaş siyahısının başında search input.
- **Komanda** tabı — komanda seçildikdən sonra formalaşan üzvlər üzərində search input.
- **Struktur** tabı — struktur seçildikdən sonra formalaşan şəxslər üzərində search input.
- **İnteqrasiya** tabı — köhnə versiyaya qaytarılacaq (yüklənmiş şəkil əsasında): Növ = "İnteqrasiya", İnteqrasiya sistemi (search + list, `integration_systems` kataloqundan / `integrationsStore` mövcud sistemlərindən), Mübadilə olunacaq məlumatlar checkbox-lar, Ağırlıq %.

## 4) Hədəf təyinlərinin izlənilməsi (`GoalTrackingPage`)
- Sətir üzrə tam eninə uzanan progress bar silinsin.
- Cədvəldə yeni **"İrəliləyiş"** sütunu əlavə olunsun: hər sətirdə kompakt bar + faiz + `Hədəf / Cari` mətn (yüklənmiş 2-ci şəkildəki üslub).

## 5) Qiymətləndirmə → Səriştə Matrisi
`src/components/evaluation/CompetencyMatrixTab.tsx`:
- Header bölməsi ("Səriştə Matrisi (Competency Matrix)" başlığı və subtitle) silinsin.
- 4 stat kart (Cəmi matris / Vəzifələr / Suallar / İstifadə olunan KPI-lar) silinsin.
- "Cavab variantları və Ballar" cədvəli **ümumi** (global) olsun — matris seçimindən asılı olaraq dəyişməsin, hər zaman eyni siyahı görünsün. Store-da global answers saxlayan sadə struktur əlavə olunacaq (`competency_global_answers_v1`).

Test və verify: build + preview yoxlanışı.

## Texniki qeydlər
- Silinən kataloqların `REMOVED_CATALOG_IDS`-a əlavəsi mövcud user-lərin köhnə localStorage-ı üçün də təmizləmə təmin edəcək.
- KPI statusları read-only olduğu üçün add/edit/delete UI-də `kpi_statuses` üçün gizlədiləcək.
