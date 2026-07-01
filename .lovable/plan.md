# KPI Kartı və Modul Təkmilləşdirmələri Planı

Bu böyük tələb 4 əsas hissəyə bölünür. Aşağıdakı ardıcıllıqla implementasiya olunacaq.

## 1. KPI Yaratma Wizard – 2-ci Addım (Hədəflər)

- **Hədəf növünə uyğun dəyər sahəsi əlavə et:**
  - Növ seçildikdən sonra `Hədəf dəyəri` sahəsi görünsün.
  - `Məbləğ` → rəqəm + valyuta seçimi
  - `Faiz` → 0-100 rəqəm
  - `Rəqəm/Say` → sərbəst rəqəm
  - `Vaxt/Müddət` → gün/saat
  - `Keyfiyyət/Mətn` → mətn sahəsi
- **Təyin edici məntiqi:** "Özüm təyin edirəm" → HR dəyəri yazır (aktiv). "Digər əməkdaş" → sahə deaktivdir (təyin edici sonradan yazacaq).

## 2. KPI Kartları Cədvəli (KpiCardsPage)

- **İmtina data:** 2 hazır `imtina` statuslu kart əlavə et — hər biri bütün sahələr (hədəflər, təyin edici, qiymətləndirici, matris) ilə dolu; redaktə açıldıqda wizard tam məlumatla açılsın.
- **Təyinat növü seçimləri:** `Komanda / Fərdi` → **`Toplu / Fərdi`**. Wizardda `Toplu` seçildikdə: Struktur / Vəzifə / Şəxs / Komanda alt seçimlər.
- **Filterlər:** "Komanda axtarış" filterini sil. Təyinat növü filterinə əsasən dinamik sub-filter göstər (məs: Toplu-Komanda seçildikdə komanda dropdown-u).
- **Ləğv məntiqi:** İmtina kartını "Ləğv et" edəndə status `imtina` deyil, `legv_olundu` olsun.

## 3. Qiymətləndirici Seçim Dialoqu (ilk versiya bərpası)

`ScoreLimitsDialog` / evaluator seçici 4 tab-lı görünüşə qaytarılacaq:
- **Komanda daxili** — cari kartın komandası üzvləri
- **Konkret şəxs** — bütün aktiv əməkdaşlar (axtarışla)
- **Özü** — kartın sahibi
- **İnteqrasiya** — sistem inteqrasiyaları (CRM, ERP, HRIS və s.)

Hər tab-ın daxili mock data ilə doldurulacaq.

## 4. Default Data (boş cədvəllər probleminin həlli)

Aşağıdakı səhifələrə default (bugünkü / cari dövr) seçimi ilə cədvəl dolu gəlsin:
- `SalaryPage` (əməkhaqqı bazası) — cari ay default seçili
- `KpiScoresPage` (KPI nəticələri) — cari rüb default
- `BonusPage` (Bonuslar) — cari il default
- Boş `mockData` massivlərinə seed əlavə et (əgər lazımdırsa).

## 5. "Sub-KPI" → "Hədəf" Terminologiya Dəyişikliyi (bütün modullarda)

- `BscScorecardTab`, `KpiExtraTabs`, `KpiSetPage`, `EvaluationPage`, `KpiEvaluationSection`, `LifecycleDetailDialog` və digər istifadələr rename olunsun.

## 6. Kart Daxili (Detail Modal) — Bütün Tab-lar

**Ümumi (Overview) tab:**
- Kart hədəfləri siyahısı (ad, çəki, dəyər, təyin edici, qiymətləndirici)
- Məsul şəxs = kartı yaradan profil (departament göstərmə)
- Təyinatın həm növü, həm konkret adı (məs: "Toplu — Satış Departamenti")
- Ümumi hədəf / cari dəyər sil
- Tezlik sahəsi sil
- **Detallar tab** tamamilə sil

**Balanced Scorecard tab:**
- Sil: Perspektiv, Çəki, KPI adı sətri
- Sil: Hədəf/Nəticə/İcra Faizi/Bal kartları
- Sil: Qiymətləndirmə şkalası, Hesablama düsturu, Nümunə, Ümumi BSC Balı
- Saxla: "Sub-KPI-lar" bölməsi → adı **"Hədəflər"** olsun, hər hədəfin ballarını göstər (limits necə var elə).

**Performans Analitikası tab:** tamamilə sil.

**Tarixçə tab:** Kartın kiçik hədəflərinə (targets) uyğun məlumat göstər — ümumi hədəf üzərində deyil.

**Komanda tab → "KPI Üzvləri":** ad dəyiş, məzmun dəyiş. Kartın qəbul edicilərini və qiymətləndiricilərini göstər — bəzi kartlarda eyni vəzifəlilər, bəzilərində müxtəlif rollu üzvlər olacaq (mock differentiation).

**Status tab → "Təsdiqləmə Zənciri":** ad dəyiş (məzmun matrix zənciri qalır).

**Yeni Status tab əlavə et:** hər hədəf üzrə kimin `set` etdiyi (təyin edici) və kimin hələ set etmədiyini, cari statusuna görə (natamam / gözləyir / təsdiqlənib / imtina) göstər.

## 7. Modullararası Sinxronizasiya

`kpiCardStore`, `sharedKpiCards`, `kpiEvaluationStore`, `salaryStore`, `bonusStore` üzərində `useEffect + storage event` yenilənməsini yoxla — bir moduldakı əlavə/silmə digərində əks olunsun (əsasən artıq var, çatışmayan yerləri bağla).

## Texniki Detallar

- Yeni status enum dəyəri: `legv_olundu` (`kpiCardStatusStore.ts`).
- `CreateKpiWizard` – `WizardHedef` interfeysinə `targetValue: string`, `targetUnit?: string` əlavə et.
- `BscScorecardTab` – trim və rename.
- `KpiExtraTabs` – tab siyahısını yenilə: Ümumi | BSC | Hədəflər (yeni) | Set Statusu (yeni) | KPI Üzvləri | Təsdiqləmə Zənciri | Tarixçə. (Detallar və Performans Analitikası silinir.)
- Filterlər `KpiCardsPage` daxilində conditional dropdown-a çevrilir.
- İmtina seed data `kpiCardStore` seed-ə əlavə olunur.

## Sual

Bu 7 hissə çox həcmlidir. Hamısını bir dəfəyə tətbiq edim, yoxsa (a) Wizard + Cədvəl + İmtina data, (b) Detail Modal tabları, (c) Digər modullar default data — deyə mərhələlərlə addım-addım gedim ki, siz hər addımdan sonra yoxlaya biləsiniz?
