
# Kaskadlama axınının tam düzəldilməsi

Aşağıdakı 5 dəyişikliyi 1 addımda tətbiq edəcəyəm. Hər dəyişiklik konkret fayl və funksiyaya toxunur — mövcud UI/dizayn dəyişmir.

## 1) Cascade Load = HR-in verdiyi kök hədəf (bütün mənbələri əhatə edən)

**Fayl:** `src/lib/kpiSetStore.ts` → `getIncomingCascadeLoad`

Hazırda funksiya cascade tree-də node axtarır, sonra yalnız `ownerId === empKey` olan SharedKpiCard-lara baxır. Elvin `assigneeIds`-də olduğu (HR-in ona verdiyi) cascadable kartlar nəzərə alınmır — nəticədə köhnə seed 500 000 qayıdır.

Dəyişiklik:
- Step 2-ni `ownerId === empKey || assigneeIds.includes(empKey)` şəklinə genişləndir.
- `updatedAt` DESC ilə sırala → yenidən yaradılan "ŞELVİN KPİ KART" (70 700) birinci gəlsin.
- `excludeCardId` cari kartı istisna edir (Elvin öz "MARKETINGIN İLLİK KARTI"-nı təyin edərkən özündən pay çəkməsin).

Nəticə: Popup (şəkil 3) və Kaskadlama pəncərəsinin "Cascade Load" xanası (şəkil 4) həmişə şəkil 1-dəki kök dəyəri (70 700) göstərəcək.

## 2) Kaskadlama sətir default-u = təyinetmə zamanı yazılan hədəf dəyəri

**Fayl:** `src/pages/manager/ManagerResponsibleCardsPage.tsx` (artıq `defaultSliceValue: assignedValue` göndərilir — dəyişiklik yoxdur, sadəcə #1-dən sonra düzgün işləyəcək).

**Fayl:** `src/components/kpi/CascadeDistributeDialog.tsx` — `SubTable` `defaultValue` prop-u `bootstrap?.defaultSliceValue` istifadə edir. Bunu qoruyuruq.

Əlavə: Manager KPI İzlənməsindən "Kaskadla" düyməsi ilə açıldıqda (`existingNode` yolu) sətir default-u root limitinin bərabər hissəyə bölünməsi kimi qalır (bu yol AssignGoalDialog-dan keçmir → hədəf dəyəri yoxdur).

## 3) Kaskadlama zamanı tam paylanmayan root = qırmızı

**Fayl:** `src/pages/CascadeTrackingPage.tsx` → `toneOf` və sol siyahıdakı `toneOf(r)`.

Hazırda root üçün `kids.length === 0` → "neutral" (boz). Root heç kaskadlanmayıbsa (kids yoxdur, amma limit > 0) — qırmızı olmalıdır.

Dəyişiklik: `toneOf`-da xüsusi hal — `parentId === null && limit > 0 && kids.length === 0` → **qırmızı**; `parentId === null && kids.length === 0 && limit === 0` → neytral.

## 4) Yeni kaskadlama MÜTLƏQ əvvəlki zəncirin davamı kimi görünsün

**Fayl:** `src/components/kpi/CascadeDistributeDialog.tsx` — bootstrap `useEffect`.

Kart adı/hədəf adı fərqli olsa belə, Elvin kaskadlama seçəndə yeni root yaradılmır. Sistem əvvəlcə Elvinə HR tərəfindən verilmiş real ROOT-u tapır və bölgünü həmin root-un altına yazır. Beləliklə Elvinin payladığı məbləğ HR root-unun qalıq dəyərindən azalır.

Kamran üçün də eyni qayda işləyir: Kamran Elvindən CHILD node alıbsa, Kamranın sonrakı bölgüsü həmin CHILD node-un altına yazılır və HR → Elvin → Kamran → alt əməkdaş zənciri qırılmır.

Köhnə 500 000-lik demo Marketinq root-u silinir və artıq Cascade Load mənbəyi kimi istifadə edilmir.

## 5) Kamran üçün eyni məntiq — resurs sıralama düzəldilməsi

**Fayl:** `src/lib/kpiSetStore.ts` (eyni #1 dəyişikliyinin nəticəsi).

Kamran öz "Məsul olduğum kartlar"-ında hədəf təyin etdikdə:
- Step 1 cascade tree-də Kamran üçün CHILD node tapır (Elvin tərəfindən paylanan) → onun limitini qaytarır.
- Popup göstərir: "Sizə başqa KPI kartından gələn Cascade Load: X AZN" (Elvinin ona verdiyi rəqəm).
- "Bəli" → CascadeDistributeDialog Kamran üçün açılır, onun CHILD node-una əsaslanaraq alt bölgü yaradır → eyni ağaca əlavə olunur (Elvin → Kamran → Orxan zənciri qırılmaz).

Bu artıq mövcud kod tərəfindən dəstəklənir; #1 ilə düzgün dəyər qayıdacaq.

---

## Toxunulacaq fayllar

- `src/lib/kpiSetStore.ts` — `getIncomingCascadeLoad` (Step 2 genişlənməsi + sıralama)
- `src/pages/CascadeTrackingPage.tsx` — `toneOf` (kaskadlanmayan root qırmızı)

## Yoxlanış

Dəyişikliklərdən sonra:
1. Elvinin AssignGoalDialog → Yadda saxla → popup **HR-in verdiyi 70 700** göstərir.
2. Distribute pəncərəsi: Cascade Load = 70 700, sətir default-u = 7 000 (təyinetmədə yazılan).
3. Bölüşdürüldükdən sonra root-un altında budaqlar görünür; tam paylanmayıbsa root qırmızı.
4. Kamran da eyni axını təkrarlayır; hər addım Cascade İzlənmə səhifəsində əks olunur.
