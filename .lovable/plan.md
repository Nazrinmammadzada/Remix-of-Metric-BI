# Plan — KPI kartı təsdiqləmə üsulu + detallar + əməkdaşların strukturlara paylanması

## 1. Təsdiqləmə üsulu (CreateKpiWizard – 3‑cü hissə)

Hər təyinat sətirinin (həm **fərdi**, həm **toplu**) yanında yeni bir seçici:
`approvalMode` = `structure` (Struktur rəhbəri) | `team` (Komanda rəhbəri) | `matrix` (Matriks).

**Default məntiq (target növünə görə, sonradan dəyişilə bilər):**

| Təyinat növü          | Default        |
| --------------------- | -------------- |
| Toplu — Komanda       | team           |
| Toplu — Struktur      | structure      |
| Toplu — Vəzifə / Şəxs | matrix         |
| Fərdi — Əməkdaş       | matrix         |

- `matrix` seçildikdə `getApprovalMatrices()`‑dan gələn matrislərdən `SearchableSelect` ilə birini seçmək məcburidir.
- `structure` / `team` seçildikdə matris seçicisi gizlənir; rəhbər həmin struktur/komandadan avtomatik alınır (`orgStore` + `teamsStore`).
- Sahə card‑a per‑target səviyyəsində yazılır: `target.approvalMode`, `target.approvalMatrixId?`.

**KpiExtraTabs → "Təsdiqləmə matrisi" tabı:**
- Sadəcə bu kartın targets‑indəki üsulları göstərir. `matrix` üçün seçilmiş matrisin adım‑adım şəxs/vəzifə cədvəli çəkilir (başqa data yox). `structure` / `team` üçün rəhbərin adı və mənbə (məs. "Marketinq Departamenti rəhbəri") göstərilir.
- Kartda heç bir target `matrix` deyilsə bu tab conditional olaraq gizli qalır (əvvəlki davranış saxlanılır).

## 2. KPI kartı detalları

**Üzvlər tabı**
- Kartın targets/assignees‑indən yığılan real siyahını göstər (fərdi seçilən əməkdaş, toplu təyinatın yaydığı bütün nəfərlər). Nümunə fallback silinsin.

**Lifecycle**
- CreateKpiWizard save vaxtı `kpiLifecycleStore.upsertForCard(cardId, lifecycle)` çağırılsın.
- Detal görünüşü (`LifecycleView`) həmişə bu store‑dan oxusun → həm kart detallarında, həm `KpiLifecyclePage`‑də görünsün.

**BalanceScorecard limitləri**
- `BscScorecardTab`: yeni kartlar üçün yalnız real `target.scoreLimit` / `kpiSetStore` daxilolmalarını göstər; sintetik nümunə fallback‑i sil.
- Köhnə seed kartlarına (id 1, 3 və mövcud demo) tam dolu default limit dəsti əlavə edilsin ki, boş görünməsinlər.

**Status məntiqi**
- HR özü limitləri set edibsə (target.scoreLimit dolu və ya `kpiSetStore` entry `completed`) → status `aktiv`.
- Ən azı bir pending KpiSet varsa → `natamam`.
- Matrissiz kartda default `aktiv` (natamam yalnız pending set varsa).
- `kpiCardStatusStore` içindəki hesablama funksiyası bu qaydaya uyğunlaşsın.

## 3. Əməkdaşların strukturlara paylanması (orgStore seed)

- Bütün seed əməkdaşları yoxla; `positionId`/`teamId`/`departmentId`‑si olmayanlara müvafiq struktur və vəzifə təyin et.
- Rəqəmsal Marketinq şöbəsinə 3 yeni əməkdaş əlavə et (adlar + vəzifələr: SMM Mütəxəssisi, SEO Mütəxəssisi, Performance Marketinq Mütəxəssisi).
- `devReset.ts` versiya flag‑ini yenilə (`__reset_v4`) ki, brauzerdəki köhnə orgStore snapshot təzələnsin.

## Dəyişəcək fayllar

- `src/components/kpi/CreateKpiWizard.tsx` — hər target üçün `approvalMode` + matris seçici, defaultlar, save‑də lifecycle upsert.
- `src/lib/kpiCardStore.ts` — `Target` tipinə `approvalMode`, `approvalMatrixId` sahələri.
- `src/components/kpi/KpiExtraTabs.tsx` — Üzvlər real siyahıdan, Təsdiqləmə tabı real datadan.
- `src/components/kpi/BscScorecardTab.tsx` — sintetik fallback‑ı sil, seed kartlarına dolu limitlər.
- `src/lib/kpiCardStatusStore.ts` — HR set etdikdə `aktiv` məntiqi.
- `src/lib/kpiLifecycleStore.ts` — `upsertForCard` + card‑a görə oxuma.
- `src/lib/orgStore.ts` — vəzifəsiz əməkdaşlara struktur/vəzifə, 3 yeni Rəqəmsal Marketinq əməkdaşı.
- `src/lib/devReset.ts` — flag versiyası artırılsın.

## Aydınlaşdırma sualı yoxdur — mövcud kod və seed data üzərindən qərarlar götürüləcək.
