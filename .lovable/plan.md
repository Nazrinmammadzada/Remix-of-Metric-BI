# KPI Kartları — Kompleks Yeniləmə Planı

Aşağıdakı 6 dəyişiklik ayrı-ayrı fayllara toxunur. Hamısını bir turda edəcəm, amma böyük fayllar olduğu üçün sizin təsdiqiniz gərəkdir.

## 1) Wizard Addım 2 — "Vahid şəxs" panelinin sadələşdirilməsi
**Fayl:** `src/components/kpi/CreateKpiWizard.tsx`
- Yuxarı hissədəki "Sub-KPI-lar / Qiymətləndirici / Təyin edici" xülasə kartlarını, "Toplam çəki %"-i və "Yeni +" düyməsini silirik.
- Yalnız **"Vahid şəxs (bütün hədəflər üçün)"** paneli qalır. "Seç" düyməsi kliklənərkən kiçik popup açılır — orada çəki bölgüsü ilə **Qiymətləndirici(lər)** və **Təyin edici** seçilir.
- Vahid seçimdə seçilən şəxslər bütün hədəflərə **məcburi default** olur — hədəf səviyyəsində şəxsi dəyişmək mümkün olmur (input disable + tooltip).

## 2) Hədəf daxilində qiymətləndirici/təyin edici seçimi — minimal görünüş
- Hədəfin daxilindəki "Qiymətləndirici seç / Təyin edici seç" bloklarını **inline dropdown chip**-lərinə çeviririk (bir sətir, hər biri dar). Ayrıca panel yer tutmasın.

## 3) Yeni "ləğv olundu" statusu + imtina davranışı
**Fayllar:** `src/lib/kpiCardStatusStore.ts`, `src/pages/KpiCardsPage.tsx`, `src/components/kpi/SharedKpiPanel.tsx`, `src/lib/kpiCardStore.ts`
- `KpiCardStatus` və `SharedKpiStatus` tiplərinə `"legv_olundu"` əlavə edirik + label ("Ləğv olundu") və qara/tünd stil.
- **İmtina olunmuş kart**: daxilində imtina səbəbi göstərilir; HR "Redaktə" edə bilər; kart **son halında** görünür (bütün hədəflər/çəkilər/təyinedicilər dolu). Ayrıca "Ləğv et" düyməsi — status `legv_olundu` olur.
- HR başqa təyinedicinin hədəfini redaktə edərsə, `notificationsStore` üzərindən həmin təyinedicilərə bildiriş göndərilir: `"{KPI ad} kartında yazdığınız {hədəf} hədəfində dəyişiklik olundu"`.
- **Miqrasiya**: `kpi_card_status_enum`-a `legv_olundu` dəyəri əlavə olunur.

## 3b) KPI-lar modulunda status dropdown-u
- `KpiCardsPage.tsx`-də status filter dropdown-u və cədvəldəki status sütunu eyni 5 dəyəri (Qaralama, Təsdiq gözlənilir, İmtina, Aktiv, Ləğv olundu) göstərsin.

## 4) Kart siyahısı — sütun və filter dəyişiklikləri
`KpiCardsPage.tsx`:
- **Silin**: `Tip`, `Məsul`, `Hədəf` sütunları.
- **Əlavə edin**: `Yaranma tarixi`, `Təyinat növü` (Fərdi / Komanda / Struktur / Vəzifə / Şəxs).
- **Filter**: hazırkı "yalnız komanda" filteri əvəzinə çoxlu təyinat növü seçimi (bütün mode-lar üçün).

## 5) Wizard — "digər əməkdaş təyin edir" davranışı
`CreateKpiWizard.tsx`:
- Hədəfdə `createdBy === "other"` olduqda **"Qiymətlər" düyməsi disabled** olur.
- `canNext` funksiyasında: əgər hər hansı hədəf `other`-dirsə, çəki cəmi 100% olmasa da irəli getməyə icazə verilir (yalnız `self` hədəflərin çəki cəmi validasiya edilir).

## 6) "Əməkdaşlar üzrə" görünüş
`src/pages/KpiHubPage.tsx` və/və ya yeni `src/components/kpi/EmployeesKpiView.tsx`:
- Dondurulmuş kartları çıxarırıq; 1-2 nəfərə əlavə mock KPI kartı əlavə edirik ki, ən azı bir neçəsi 2+ karta sahib olsun.
- Cədvəl: **Şəxs adı**, **Karların sayı**, **Eye ikonu**. Eye kliklənərkən — həmin şəxsə aid bütün kartların siyahısı olan modal açılır, hər sətir "Bax" düyməsi ilə KPI kart detalına yönləndirir.

## 7) Əvvəlki modulların geri qaytarılması
**Fayllar:** `src/App.tsx`, `src/components/layout/Sidebar.tsx`, `src/lib/modulePermissions.ts`
- `EvaluationPage` (Qiymətləndirmə) və `KpiSetPage` (KPI Set) route-larını və sidebar bəndlərini bərpa edirik.

---

## Texniki qeydlər
- Yeni status enum dəyəri üçün Lovable Cloud miqrasiyası lazımdır (`ALTER TYPE kpi_card_status_enum ADD VALUE 'legv_olundu'`).
- Bildirişlər üçün mövcud `notificationsStore.ts` istifadə olunur.
- Vahid seçim məcburiliyi — hədəf field-ləri `disabled` + placeholder mətni ilə göstərilir.

Təsdiq edin, dərhal başlayım.