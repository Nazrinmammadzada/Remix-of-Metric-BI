# Rəhbər · Hədəf Təyinetmə və Kaskadlama axını

Bu iş "KPI Set" məntiqini bərpa edir — amma ayrı modul kimi yox, `Məsul olduğum kartlar` içərisində. Sonra riyazi düzgün kaskadlama pop-up-ı əlavə olunur.

## 1. HR axını (kart yaradarkən)
`CreateKpiWizard`-da hədəf növünə uyğun aşağıdakılar artıq mövcuddur; toxunulmur:
- Hədəf növü (say, məbləğ, nisbət, faiz, keyfiyyət, tarix, boolean və s.)
- Cascading toggle (yalnız divisible növlərdə — say / məbləğ / nisbət / faiz)
- Bal standartı (1–5, 1–10 və s.)

**Dəyişiklik:** HR kartın daxilində hədəfi öz üzərinə deyil, `responsible` = rəhbər olan bir şəxs seçdikdə wizard tamamlandıqda `kpiSetStore`-da o rəhbər üçün **pending KpiSetEntry** yaradılır (hədəf adı və dəyər boş, yalnız kart, çəki intervalı, cascadable, unit təklifi ötürülür). Bu, indi tam olaraq itmişdir.

## 2. Rəhbər axını (`Məsul olduğum kartlar`)
`ManagerResponsibleCardsPage`-ə **iki reallıq** əlavə olunur:

### 2.1 Təyinetmə pop-up-ı (KPI Set məntiqinin bərpası)
Hər pending sətir üçün "Təyin et" düyməsi.  Yeni komponent `AssignGoalDialog.tsx`:
- **Hədəf adı** (mətn)
- **Hədəf növü** (dropdown — data cədvəlində olan növlər, `dropdownCatalogStore`)
- **Hədəf dəyəri** (unit ilə)
- **Çəki (%)** — kartda təyin olunmuş min/max aralığında validasiya
- **Qiymət limitləri** — `ScoreLimitsDialog`-un daxili blokunu istifadə edir. Bal aralığı kartın seçdiyi standart (məs. 1–10) əsasında formalaşır və hədəf növünə uyğun düzülür (məbləğ üçün diapazon, faiz üçün 0–100 və s.).
- **"Bu hədəfi kaskadlana bilər"** — yalnız say / məbləğ / nisbət / faiz növlərində görünür.

Save → `setEntryDetails` çağırılır → entry `completed` statusuna keçir.

### 2.2 Kaskad pop-up-ı (Save-dan sonra)
Save zamanı yoxlama:
- Rəhbərin öz tabeçiliyində (structure üzrə `getSubordinatesOfStarHolder`) həmin **kartın şamil olunduğu** şəxslər varmı?
- Hədəf `cascadable` mı?

Hər ikisi doğrudursa, təsdiq dialoqu:
> "Sizin üzərinizdə {value} {unit} Cascade Load mövcuddur. Bu hədəfi tabeliyinizdəki əməkdaşlar arasında bölüşdürmək istəyirsiniz?"

**Bəli** seçilərsə `CascadeDistributeDialog`-un yeni **Step-2** görünüşü açılır:
- Yuxarı 3 stat kartı: **Ümumi Limit (Sizin üzərinizdə)**, **Paylanmış**, **Qalıq** (şəkildəki kimi).
- Cədvəl: # · Əməkdaş · Vəzifə · Kaskad limit (input).
- Yalnız kartın şamil olunduğu tabeçilik əməkdaşları görünür (intersect: subordinates ∩ kartın assignees).
- Riyazi validasiya: `Σ slice ≤ ümumi limit`. Overflow → save disable + qırmızı xəbərdarlıq. "Sistem hədəfin şişməsinə icazə verməməlidir."
- Save → `cascadeTreeStore.distribute()`.

## 3. Data axışı
```text
HR kart yaradır ─▶ pending KpiSetEntry (rəhbər üçün)
                         │
Rəhbər AssignGoalDialog açır ─▶ hədəf detalları + limitlər set olur
                         │
        cascadable + subordinates var? ─▶ Confirm pop-up
                         │ bəli
              CascadeDistributeDialog (Step-2 stats + table)
                         │
                cascadeTreeStore.distribute()
```

## 4. Fayl dəyişiklikləri
- **Yeni:** `src/components/kpi/AssignGoalDialog.tsx` — hədəf adı/növü/dəyəri/çəki/limitlər + cascadable seçimi.
- **Yeni:** `src/components/kpi/CascadeLoadConfirmDialog.tsx` — kiçik confirm pop-up.
- **Redaktə:** `src/pages/manager/ManagerResponsibleCardsPage.tsx`
  - Pending sətirlər üçün "Təyin et" düyməsi.
  - Save sonrası cascadable + subordinates check → confirm → distribute dialog.
  - Ümumi limit / paylanmış / qalıq statlarını rəhbərin öz row-u üçün göstər.
- **Redaktə:** `src/components/kpi/CascadeDistributeDialog.tsx`
  - Yuxarıdakı 3 stat kartını şəkildəki layout-a uyğunlaşdır (Ümumi Limit / Paylanmış / Qalıq üçlüsü).
  - Subordinates siyahısını "kartın şamil olunduğu şəxslər ∩ tabeçilik" ilə məhdudlaşdır.
  - Radio "cascade / independent" saxlanılır.
- **Redaktə:** `src/components/kpi/CreateKpiWizard.tsx` (yüngül)
  - HR kartı bitirəndə responsible rəhbərlər üçün pending `KpiSetEntry` yarat (əgər cascadable divisible növdürsə + rəhbər özü təyinediçidirsə).
- **Toxunulmur:** `kpiSetStore.ts` API (setEntryDetails, cascadable, weight artıq mövcuddur).

## 5. Riyazi qaydalar
- Paylanmış = `Σ children.limit`
- Qalıq = `limit − paylanmış` (heç vaxt < 0 olmasın — UI-də save disable)
- Bir slice sıfır olarsa cəmə daxil edilmir
- `distribute()` artıq `sum > parent.limit` yoxlayır — orada da təkrar yoxlama qorunur.

## 6. Ekran uyğunluğu (istifadəçinin şəkli)
- 3 sütunlu üst statlar (Ümumi Limit · Paylanmış · Qalıq) — böyük şrift + ölçü vahidi.
- Cədvəl sütunları: # · Əməkdaş · Vəzifə · Kaskad limit.

Təsdiq etsəniz, birbaşa implementasiyaya başlayıram.
