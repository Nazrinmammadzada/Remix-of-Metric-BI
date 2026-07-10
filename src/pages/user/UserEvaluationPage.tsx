import { ClipboardList, Users, Target } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PeerEvaluationDialog } from "@/components/evaluation/PeerEvaluationDialog";
import { KpiEvaluationSection } from "@/components/evaluation/KpiEvaluationSection";
import { MOCK_USER_ID, mockEmployees, getInitials, buildPeerAssignments, CURRENT_CYCLE_ID } from "@/data/mockData";

const UserEvaluationPage = () => {
  const me = mockEmployees.find((e) => e.id === MOCK_USER_ID);
  const peers = buildPeerAssignments(CURRENT_CYCLE_ID)[MOCK_USER_ID] || [];

  return (
    <div className="p-6 space-y-6">
      <PageHero
        badge="Qiymətləndirmə"
        title="Mənim Qiymətləndirmələrim"
        subtitle="Sizə təyin olunmuş 360° həmkar və KPI qiymətləndirmələrini buradan icra edin."
        icon={ClipboardList}
      />

      {me && (
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center text-lg font-semibold">
            {getInitials(me.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-foreground">{me.fullName}</p>
            <p className="text-sm text-muted-foreground">{me.position} · {me.department}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cari dövr: <span className="font-medium text-foreground">{CURRENT_CYCLE_ID}</span>
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="peer" className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-2">
          <TabsTrigger value="peer" className="gap-2">
            <Users className="w-4 h-4" /> Səriştə üzrə qiymətləndirmə
          </TabsTrigger>
          <TabsTrigger value="kpi" className="gap-2">
            <Target className="w-4 h-4" /> Hədəf üzrə qiymətləndirmə
          </TabsTrigger>
        </TabsList>

        <TabsContent value="peer" className="space-y-4 mt-5">
          <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Səriştə üzrə (360°) Həmkar Qiymətləndirməsi</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Sizə {peers.length} həmkar təyin olunub. Hər biri üçün 5 meyar üzrə 0–5 bal verin.
                Qiymətləriniz tam anonimdir — sizin verdiyiniz və sizə verilmiş anonim qiymətlər ekranda göstərilmir.
              </p>
            </div>
            <PeerEvaluationDialog reviewerId={MOCK_USER_ID} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {peers.map((p, i) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  {getInitials(p.fullName)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">Həmkar #{i + 1}: {p.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.position} · {p.department}</p>
                </div>
              </div>
            ))}
            {peers.length === 0 && (
              <div className="md:col-span-2 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Hələ qiymətləndirmək üçün təyin olunmuş həmkar yoxdur.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="kpi" className="mt-5 space-y-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Nümunə: Hədəf tipi "Səriştə" seçildikdə</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Əgər KPI kartında hədəf tipi kimi <b>“Səriştə”</b> seçilibsə, User hesabında proses belə işləyir:
                </p>
                <ol className="mt-2 space-y-1 text-xs text-foreground/90 list-decimal list-inside">
                  <li>Sistem hədəfin nəticəsini avtomatik olaraq <b>Səriştə üzrə qiymətləndirmə</b> (360°) modulundan çəkir.</li>
                  <li>Sizə həmin səriştə üzrə təyin olunmuş qiymətləndiricilərin verdiyi ortalama bal hesablanır (məs. 5 həmkardan orta 4.2 / 5).</li>
                  <li>Bu bal həmin KPI-nın <b>faktiki nəticəsi</b> kimi Hədəf üzrə qiymətləndirmə cədvəlinə əks olunur.</li>
                  <li>Nəticə avtomatik olaraq zonalara bölünür: 4.5+ Yaşıl, 3.5–4.4 Sarı, 3.5 aşağı Qırmızı.</li>
                </ol>
              </div>
            </div>
          </div>
          <KpiEvaluationSection assigneeId={MOCK_USER_ID} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserEvaluationPage;
