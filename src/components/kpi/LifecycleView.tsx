import { Target, Star, Wallet, RefreshCw, CalendarDays } from "lucide-react";
import { formatStagePeriod, type CardLifecycle, type LifecycleStage } from "@/lib/kpiLifecycleStore";

const StageRow = ({
  icon: Icon,
  title,
  stage,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  stage?: LifecycleStage;
}) => (
  <div className="border border-border rounded-lg p-3 bg-card">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <span className="text-sm font-semibold text-foreground flex-1">{title}</span>
    </div>
    {stage ? (
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground mb-0.5">Dövr</p>
          <p className="font-medium text-foreground">{formatStagePeriod(stage)}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">Başlama</p>
          <p className="font-medium text-foreground inline-flex items-center gap-1">
            <CalendarDays className="w-3 h-3" /> {stage.start || "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">Bitmə</p>
          <p className="font-medium text-foreground inline-flex items-center gap-1">
            <CalendarDays className="w-3 h-3" /> {stage.end || "—"}
          </p>
        </div>
      </div>
    ) : (
      <p className="text-xs text-muted-foreground italic">Təyin olunmayıb</p>
    )}
  </div>
);

const LifecycleView = ({ lifecycle }: { lifecycle: CardLifecycle | null }) => {
  if (!lifecycle) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg bg-card">
        Bu KPI üçün lifecycle planı təyin edilməyib.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <StageRow icon={Target} title="KPI təyin olunması" stage={lifecycle.assignment} />
      <StageRow icon={Star} title="KPI qiymətləndirilməsi" stage={lifecycle.evaluation} />
      <StageRow icon={Wallet} title="Bonusun hesablanması" stage={lifecycle.bonus} />

      <div className="border border-border rounded-lg p-3 bg-card">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground flex-1">KPI Review</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {lifecycle.reviews.length} ədəd
          </span>
        </div>
        {lifecycle.reviews.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Review təyin olunmayıb</p>
        ) : (
          <div className="space-y-2">
            {lifecycle.reviews.map((r, i) => (
              <div key={r.id} className="grid grid-cols-[24px,1fr,1fr,1fr] gap-2 items-center text-xs border-t border-border pt-2 first:border-t-0 first:pt-0">
                <span className="text-muted-foreground">#{i + 1}</span>
                <div>
                  <p className="text-muted-foreground">Dövr</p>
                  <p className="font-medium text-foreground">{formatStagePeriod(r)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Başlama</p>
                  <p className="font-medium text-foreground">{r.start || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bitmə</p>
                  <p className="font-medium text-foreground">{r.end || "—"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LifecycleView;
