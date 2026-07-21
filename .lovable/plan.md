# Plan: Təşkilat validasiyaları və Bildiriş sazlamaları yenidən dizaynı

## 1. Təşkilat modulu

### 1.1 Əməkhaqqı bazası – əməkdaş seçin (dropdown-a axtarış)
- `src/pages/OrganizationPage.tsx` — "Əməkhaqqı bazası" kartında yeni məlumat əlavə etmə dialoqunda `select` əvəzinə `SearchableSelect` (`src/components/common/SearchableSelect.tsx`) tətbiq et.

### 1.2 Struktur kataloqu – istifadə olunan struktur tipi/vəzifə silinə bilməz
- `src/lib/orgStore.ts` — köməkçi funksiyalar: `isStructureTypeInUse(typeName)` (units-də yoxla) və `isPositionInUse(positionName)` (employees & slots-da yoxla).
- Struktur kataloqu kartında silmə əməliyyatında istifadəni yoxla və istifadə olunursa toast.error ilə `"Bu struktur tipi istifadə olunduğu üçün silinə bilməz."` / `"Bu vəzifə istifadə olunduğu üçün silinə bilməz."` göstər.

### 1.3 Ad / Soyad / Ata adı validasiyası
- Yeni əməkdaş dialoqunda `firstName`, `lastName`, `middleName`:
  - `maxLength = 50`
  - Regex: `^[A-Za-zƏəÇçĞğİıIiÖöŞşÜüÂâ\-\s]+$` (yalnız hərflər + defis + boşluq)
  - Səhv daxil edilərsə inline error + submit blok:
    - `"Ad yalnız hərflərdən və defis (-) işarəsindən ibarət olmalıdır."`
    - `"Soyad yalnız hərflərdən və defis (-) işarəsindən ibarət olmalıdır."`
    - `"Ata adı yalnız hərflərdən və defis (-) işarəsindən ibarət olmalıdır."`

### 1.4 FIN validasiyası
- Regex: `^[0-9A-HJ-NP-Z]+$` (I, O istisna), uppercase-only
- Səhv olarsa: `"FİN yalnız rəqəmlər və hərflərdən (I, O istisna) ibarət olmalıdır."`

## 2. Sazlamalar → Bildiriş sazlamaları (`NotificationSettingsTab.tsx`)

### 2.1 Kanallardan SMS-i sil və Xatırladıcılar sahəsini tam sil
- `CHANNEL_LABELS` və tip-dən `sms` çıxarılır (`notificationSettingsStore.ts`), mövcud seed-lərdə təmizlənir.
- Formada `reminders` bloku və `remDraft` state-i silinir, `supportsReminders` istifadəsi silinir.

### 2.2 Alıcılar – tab-based multi-select
Yeni komponent: `src/components/settings/NotificationRecipientsPicker.tsx`

Tablar (Tabs komponenti şadcn):
1. Şəxs — employees siyahısı (checkbox + search)
2. Vəzifə — `getPositions()` (checkbox + search)
3. Struktur — TreeView (`orgStore` units), parent toggle → bütün alt strukturlar
4. Komanda — `teamsStore` siyahısı (checkbox + search)
5. Sistem rolu — sabit rol siyahısı: KPI sahibi, Rəhbər, Qiymətləndirici, KPI təyin edən, HR, CEO (checkbox + search)

Token sxemi (backward-compatible əlavə):
- `person:<AdSoyad>`, `position:<Ad>`, `structure:<UnitId>`, `team:<TeamId>`, `role:<Ad>`

Altda "Seçilmiş alıcılar" bölməsi – bütün seçimlər chip kimi, hər biri × ilə silinə bilər; sağda "Hamısını təmizlə" linki. Tab dəyişəndə seçimlər qorunur (state parent-də saxlanılır). Real-time search. Scroll pozisiyası tab-a görə saxlanılır.

Köhnə `RECIPIENT_LABELS` chip-ləri yeni pickerlə əvəz olunur.

### 2.3 Tezlik – dropdown + dinamik forma
`NotificationSettingsTab.tsx`-də `frequency` bloku yenilənir. Yeni tip:

```ts
type Frequency =
  | "on_event" | "on_date" | "daily" | "weekly"
  | "monthly" | "quarterly" | "yearly" | "custom";
```

Dropdown seçimlərinə uyğun konfiqurasiya sahələri:
- on_event: time + timezone
- on_date: date + time + timezone
- daily: startDate + endDate? + time + timezone
- weekly: weekdays[] + time + timezone
- monthly: mode (`dayOfMonth` | `weekOfMonth`) + gün/həftə + weekday + time + timezone
- quarterly: quarter (I–IV) + month + day + time + timezone
- yearly: month + day + time + timezone
- custom: startDate + endDate + repeatEvery + unit (Gün/Həftə/Ay) + cron?

Aşağıda "Cədvəl xülasəsi" — cari seçimlərdən hesablanan human-readable mətn.

`NotificationSetting` tipi genişləndirilir (`schedule` obyektinə köçürülür). Köhnə `sendTime` və `frequency` migrate olunur. Mövcud `FREQUENCY_LABELS` yeni seçimlərlə əvəz olunur.

## Texniki qeydlər
- Bütün UI Metric BI dizayn tokenləri (`bg-card`, `border-border`, `text-primary`, s.) ilə.
- Yeni state-lər localStorage-a serialize olunur (mövcud `notificationSettingsStore` üzərində).
- Migration: köhnə setting yüklənəndə çatışmayan `schedule` sahəsi `frequency`+`sendTime`-dən inşa edilir; `sms` kanalı avtomatik çıxarılır; `reminders` sahəsi silinir.
- Tip yoxlaması `tsgo` ilə təsdiq edilir.

## Fayllar
- `src/pages/OrganizationPage.tsx` (dropdown search, validation, delete guard mesajları)
- `src/lib/orgStore.ts` (`isStructureTypeInUse`, `isPositionInUse`)
- `src/components/settings/DropdownCatalogsTab.tsx` (əgər struktur tipi/vəzifə silmə bu kartdadırsa – guard tətbiq)
- `src/components/settings/NotificationSettingsTab.tsx` (recipients + frequency + kanal/xatırladıcı təmizliyi)
- `src/components/settings/NotificationRecipientsPicker.tsx` (yeni)
- `src/components/settings/NotificationSchedulePicker.tsx` (yeni)
- `src/lib/notificationSettingsStore.ts` (tip genişlənməsi, migrasiya, SMS/reminders təmizliyi)
