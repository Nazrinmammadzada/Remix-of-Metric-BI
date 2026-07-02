## Plan

### 1) KPI kartını Redaktə → Wizard tam məlumatla açılsın
**Fayl:** `src/pages/KpiCardsPage.tsx`
- Kartların üstündəki Pencil düyməsini (sətir ~1331 və digərləri) köhnə `showCreate` formundan **`openWizardForEdit(card.id)`**-yə keçir. Beləliklə redaktədə həmişə wizard pop-up-ı açılır.
- `openWizardForEdit`-i genişləndir: `cardDrafts[cardId]` yoxdursa, karta bağlı `lifecycle`-i (`getLifecycle(cardId)`) və mövcud `approvalMatrixId`-i draftın içinə əlavə et — beləliklə wizard-ın 1-ci və 3-cü addımı (əsas məlumatlar + lifecycle + təsdiqləmə üsulu) tam dolu açılır.
- Wizard-ın step 1 lifecycle sahələri artıq mövcuddur (`draft.lifecycle.*`); yalnız fallback draft-a `lifecycle` bloku ötürülməlidir.

### 2) Komandalar — Komanda lideri seçimi
**Fayl:** `src/pages/TeamsPage.tsx`
- "Yeni komanda yarat" dialoqunda üzv seçimindən sonra **"Komanda lideri"** dropdown-u bərpa et (seçilmiş üzvlər arasından). `leaderName` state onsuz da mövcuddur — yalnız UI selector və `saveNewTeam` içində liderin `leaderName` əsasında seçilməsi lazımdır.
- `saveNewTeam`: `const leader = allPeople.find(p => p.name === leaderName)`; validasiya: lider seçilməyibsə `toast.error("Komanda lideri seçin")`.

### 3) KPI Wizard — Təsdiqləmə üsulu (3-cü addım)
**Fayllar:** `src/components/kpi/CreateKpiWizard.tsx`, `src/lib/kpiCardStore.ts`, `src/lib/teamsStore.ts` (helper)

#### Draft-a yeni sahə
`CreateKpiWizardDraft`-a əlavə et:
```ts
approvalMethod: "structure_leader" | "team_leader" | "matrix";
```
Köhnə `useMatrix` əvəzinə bu istifadə olunur (back-compat: `useMatrix = approvalMethod === "matrix"`).

#### Default seçim məntiqi (təyinat növünə görə)
Wizard step 3-də mount olarkən və mode/bulk seçimləri dəyişəndə default hesablanır (yalnız istifadəçi əl ilə dəyişməyibsə):
- **Toplu → Komanda seçilib** → default `team_leader`
- **Toplu → Struktur seçilib** → default `structure_leader`
- **Toplu → Vəzifə və ya Şəxs seçilib** → default `matrix`
- **Fərdi → Əməkdaş seçilib** → default `matrix`

Bütün hallarda istifadəçi 3 radio arasından dəyişə bilər. `matrix` seçildikdə `getApprovalMatrices()`-dən dropdown göstərilir (mövcud UI-ni saxla).

#### UI dəyişikliyi (step 3)
- Mövcud "Təsdiqləmə matrisi tətbiq olunsun?" checkbox-unu 3 seçimli radio qrupu ilə əvəz et:
  - ○ Təşkilati struktur rəhbəri
  - ○ Komanda rəhbəri
  - ○ Matriks (seçildikdə matris dropdown açılır)
- Yekun (summary) blokunda `Təsdiqləmə üsulu: <label>` göstər.

#### Validasiya — "Təsdiqə göndər" düyməsində
Yeni helper `validateApprovalTargets(draft)` yaz (wizard-ın içində):
- **team_leader**: hədəf alan bütün əməkdaşların `teamsStore`-dan komandası çıxarılır. Komandasız əməkdaş varsa → `toast.error("Bu şəxslərin komandası yoxdur: … Onlar üçün ayrıca kart və ya matriks yaradın.")` və göndərməni blokla.
- **structure_leader**: hər əməkdaşın struktur vahidinin rəhbəri (`orgStore` üzərində `isStarPerson`) yoxlanılır; rəhbəri olmayan struktur varsa oxşar xəta.
- **matrix**: `approvalMatrixId` seçilməlidir.
Uğurlu halda: hər fərqli lider üçün ayrı təsdiqləmə tapşırığı yaradılır (bir kart, çoxlu approver qeydi).

#### Digər modullara ötürmə
- `buildSharedCardFromDraft` (`src/lib/kpiCardStore.ts`) `approvalMethod`-u qəbul edib `SharedKpiCard`-a əlavə etsin (`approvalMethod`, `approvalTargets: {approverId, forEmployeeIds[]}`).
- `enqueueApproval` çağırışını (KpiCardsPage `handleWizardComplete` içində) `approvalMethod`-a görə lider(lər)ə yönəldiləcək şəkildə cütləşdir. Beləliklə **Təstiqləmə Matrisi** modulu və manager panelindəki "Məsul olduğum kartlar" avtomatik doğru rəhbərə düşür.

### Texniki qeydlər
- `teamsStore`-a helper: `getTeamOfEmployee(name: string): Team | null` (üzv və ya lider adına görə).
- `orgStore`-a helper (əgər yoxdursa): `getStructureLeaderForEmployee(empId): OrgEmployee | null`.
- Back-compat: `useMatrix` sahəsi qorunur (derived getter kimi), amma yeni yazmalar `approvalMethod` üzərindən gedir.

### Test axını
1. KPI siyahısında Pencil → wizard 3 addımı dolu açılır (lifecycle daxil).
2. Komandalar → yeni komanda dialoqunda lider dropdown-u seçilir.
3. Wizard step 3-də təyinat növünə görə default üsul dəyişir; matrix seçilirsə mövcud matrislər siyahılanır.
4. Toplu şəxs seçimində 1 nəfər komandasızdırsa "Təsdiqə göndər" xəta verir və göndərmir.
