# Ulduzlu Vəzifə (Star Position) əsaslı Kaskadlama

## Məqsəd
Kaskadlama matrisini tamamilə silib, KPI hədəflərinin təşkilati struktur və **vəzifəyə** bağlı "Ulduz" atributu əsasında avtomatik yönləndirilməsini təmin etmək. Ulduz heç vaxt şəxsə bağlanmır — yalnız vəzifəyə. Vəzifədə oturan şəxs dəyişdikdə heç bir manual iş görülməməlidir.

## Data Modeli (dinamik, hardcode-suz)

**StructureUnit** (rekursiv, istənilən dərinlik):
- `id`, `name`, `parentId?`, `level` (yalnız görüntü üçün etiket, məntiqdə yox), `order`

**Position** (vəzifə):
- `id`, `title`, `structureUnitId`, `isStarPosition: boolean`
- Qayda: `structureUnitId` üzrə yalnız **bir** `isStarPosition=true` ola bilər.

**Employee** (mövcud model genişlənir):
- `positionId` (əvvəlki `department/team` sahələri saxlanılır, amma rəhbərlik məntiqi buradan **çıxarılır**).
- Employee-də heç bir `isManager / isStar / managerId` sahəsi məntiq üçün istifadə olunmayacaq — hesablanır.

## Əsas servis: `starCascadeService`

Sırf pure funksiyalar (test edilə bilən), heç bir səviyyə adı yazılmır:

- `getStarPositionOfUnit(unitId)` → Position | null
- `getStarHolderOfUnit(unitId)` → Employee | null (star vəzifədə oturan şəxs)
- `getChildUnits(unitId)` → StructureUnit[]
- `resolveCascadeChain(rootUnitId)` → rekursiv walk: hər səviyyədə star holder + child unit-lər → ağac
- `routeKpiToUnit(unitId)` → star holder tapılmasa `MissingStarError` atır (validasiya)
- `validateStructure()` → hər unit üzrə star sayını yoxlayır (0 və ya >1 halında xəbərdarlıq)

Bütün kaskadlama (KPI kartı yaradılışı, cascading səhifəsi, manager panel scoping) bu tək servisi çağırır. `CascadeMatrix` və `cascadeMatrixStore` işlətmir.

## UI dəyişiklikləri

### 1) Struktur / Vəzifələr ekranı (Təşkilat modulu)
Hər struktur vahidində vəzifə siyahısı göstərilir. Hər vəzifə sətrində:
- Solda ⭐ ikon (aktiv: qızıl-sarı dolu, deaktiv: kənarlıqlı boz).
- Bir kliklə toggle olur; həmin unit üzrə əvvəlki star avtomatik söndürülür (tək star qaydası servis səviyyəsində zorlanır, toast: "Ulduzlu vəzifə köçürüldü").
- Star vəzifədə oturan əməkdaşın adı badge kimi göstərilir (boşdursa "Vakant — kaskadlama dayandırılıb" xəbərdarlığı).

### 2) Cascading modulu (`CascadingPage`)
Manual matris tam silinir. Səhifə "Kaskadlama xəritəsi"nə çevrilir:
- Root struktur seçilir → ağac (tree) formasında zəncir göstərilir: hər node = struktur vahidi + star vəzifə + hazırkı star holder.
- Boş star olan node qırmızı işarələnir, "Ulduzlu vəzifə təyin et" düyməsi ilə birbaşa struktur ekranına yönləndirir.
- Yalnız oxu — heç bir manual assignment yoxdur.

### 3) KPI wizard (təyinat addımı)
- "Toplu → Struktur" seçimində istifadəçi yalnız struktur vahidini seçir; sistem `routeKpiToUnit` ilə star holder-i özü tapıb göstərir (read-only chip: "Yönləndiriləcək: <ad> — <vəzifə>").
- Star yoxdursa "Yarat"/"Təsdiqə göndər" düymələri deaktiv olur və izahat verilir.
- "Rəhbər əl ilə seç" seçimi tamamilə silinir.

### 4) Cascade Matrix menyu bəndi
Sidebar-dan `Cascade Matrisi` linki gizlədilir, `cascadeMatrixStore` istifadə yerlərində yeni servisə yönləndirici shim qoyulur (geriyə uyğunluq üçün mövcud KPI kartlarını sındırmamaq üçün).

## Miqrasiya (mock data)
`src/data/mockExtras.ts` yenilənir:
- Hər `MockTeam` / `MockStructure` üçün star position obyekti seed edilir (məs. "Satış Direktoru", "IT Direktoru" və s. — struktura görə).
- Mövcud `managerId / leaderId` sahələri seed skriptində star holder-dən **hesablanır**, kod ilə yazılmır.

## Validasiya
- Struktur ekranında canlı yoxlama: hər unit-də star sayı badge-i (`⭐ 1/1` yaşıl, `⚠ 0/1` sarı).
- KPI göndərilməzdən əvvəl `resolveCascadeChain` çağırılır; hər hansı node-da star yoxdursa göndəriş bloklanır və problemli unit-lərin siyahısı toast-da göstərilir.

## Fayllar
Yeni:
- `src/lib/positionsStore.ts` — vəzifələr + `isStarPosition` toggle
- `src/lib/starCascadeService.ts` — bütün rekursiv məntiq
- `src/components/org/StarPositionToggle.tsx`
- `src/components/cascading/CascadeTreeView.tsx`

Dəyişən:
- `src/pages/CascadingPage.tsx` — matris silinir, tree view
- `src/pages/OrganizationPage.tsx` + Struktur kart görünüşü — vəzifə siyahısı + ⭐ toggle
- `src/components/kpi/CreateKpiWizard.tsx` — struktur seçimində avtomatik routing
- `src/components/layout/Sidebar.tsx` — "Cascade Matrisi" gizlədilir
- `src/data/mockExtras.ts` — seed star positions

Silinən istifadə (fayl özü qalır, referans kəsilir):
- `src/lib/cascadeMatrixStore.ts` (deprecated shim)
- `src/pages/CascadeMatrixPage.tsx` (route gizlədilir)

## Genişlənə bilənlik
Yeni səviyyə/şirkət/vəzifə əlavə etmək üçün heç bir kod dəyişikliyi lazım deyil — yalnız `structureUnits` və `positions` seed/DB-yə yazılır, `isStarPosition` işarələnir, servis avtomatik marşrutu yenidən hesablayır.

Təsdiq edin, tətbiq edim.