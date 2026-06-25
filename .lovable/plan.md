## İcra Planı — 16 dəyişiklik

Aşağıdakı dəyişiklikləri ardıcıl olaraq tətbiq edəcəm. Hər biri yalnız müvafiq modul/fayllara toxunacaq.

### KPI yaratmaq (KpiCardsPage + əlaqəli dialoqlar)
1. Yeni KPI yarat pəncərəsində min/max yanındakı **ümumi çəki** xanasını silmək. Çəki yalnız təyinedici tərəfindən təyinat zamanı yazılacaq.
2. **Qiymətləndirici** və **təyinedici** üçün ayrı-ayrı **vahid** seçimi əlavə etmək (iki ayrı dropdown).
9. Fərdi seçim → **Şəxs(lər)** olaraq adlandırılacaq və **multiselect + search** olacaq (həm yeni KPI, həm Cascade matrisində).

### KPI Set (KpiSetPage + ScoreLimitsDialog)
3. ScoreLimitsDialog-da Qiymətləndirmə → Parametrlər tabında yaradılmış **bal aralığı şablonlarından** birini seçmək imkanı (default + custom). Seçilənə görə səviyyələr formalaşır.
4. Pending və Completed siyahısında **səviyyə rəngləri** (əla=yaşıl, yaxşı=mavi, orta=sarı, zəif=narıncı, çox zəif=qırmızı). Completed sub-KPI-larda hər səviyyə yanında **bal** (Əla 5, Yaxşı 4, ...).
13. Hədəf daxil edildikdə min/max səviyyələri **0** kimi göstər; yalnız **Avtomatik təklif** düyməsinə basıldıqda təkliflər doldurulur.

### Qiymətləndirmə (EvaluationPage)
6. KPI Qiymətləri pop-up'unda **hesablama bölməsi** (qiymətləndiricilərin çəki × balı formulu və yekun bal).
8. **KPI planlama** və **Planlama reyestri** düymələrini silmək.

### Lifecycle (KpiLifecyclePage + Wizard step)
7. **Şablon kimi yadda saxla** və **Şablondan yüklə** düymələri. İki tab: **Lifecycle planları** və **Lifecycle şablonları**.

### Cascading / Cascade Matrix
12. Cascading modulunda **Paylaş** düyməsinin yanındakı ikonu silmək.
16. Cascade matrisində **Struktur** seçildikdə KPI kartındakı kimi **kaskad dropdown** (əsas struktur → sub-struktur → ...).

### Settings (SettingsPage + Bildiriş sazlamaları)
10. Rol və səlahiyyətlərdə yaradılmış **bütün rol adları** Bildiriş sazlamaları → Alıcılar bölməsində dinamik görünür.
11. Alıcılar bölməsinə **Şəxs(lər)** seçimi: kliklədikdə searchable multiselect dropdown açılır, istənilən sayda əməkdaş seçilir.
15. **Tezliyə görə** xatırladıcı məntiqi (məs: birdəfəlik bildirişdə xatırladıcı gizlənir, dövri olanlarda göstərilir). Göndərmə kanallarından **Telegram** silinir.

### Salary
14. Yüklənən sənədlər siyahısına **bir uyğunsuzluqlu** nümunə əlavə etmək (status: uyğunsuzluq).

### Ümumi
5. Layihənin heç bir modulunda **zona** anlayışı qalmamalıdır — qalmış istinadları silirik (filtrlərdə, formalarda, mock data, dropdown kataloqlarında).

---

Plan təsdiqlənərsə, bütün dəyişiklikləri tətbiq edəcəm. Razısınız?