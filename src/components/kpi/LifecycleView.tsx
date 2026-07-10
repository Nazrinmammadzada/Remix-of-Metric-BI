import { Target, Star, Wallet, RefreshCw, CalendarDays, CheckCircle2, Clock, Circle } from "lucide-react";
import { formatStagePeriod, type CardLifecycle, type LifecycleStage } from "@/lib/kpiLifecycleStore";

type StageStatus = "completed" | "in_progress" | "pending";

const getStageStatus = (stage?: { start?: string; end?: string }): StageStatus | null => {
  if (!stage || !stage.start || !stage.end) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(stage.start);
  const end = new Date(stage.end);
  if (today > end) return "completed";
  if (today < start) return "pending";
  return "in_progress";
};

const STATUS_STYLES: Record<StageStatus, {
  card: string;
  icon: string;
  title: string;
  meta: string;
  value: string;
  badge: string;
  badgeIcon: React.ComponentType<{ className?: string }>;
  badgeLabel: string;
}> = {
  completed: {
    card: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
    title: "text-emerald-900 dark:text-emerald-100",
    meta: "text-emerald-700/80 dark:text-emerald-300/70",
    value: "text-emerald-900 dark:text-emerald-100",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
    badgeIcon: CheckCircle2,
    badgeLabel: "Tamamlandı",
  },
  in_progress: {
    card: "bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-900",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
    title: "text-amber-900 dark:text-amber-100",
    meta: "text-amber-700/80 dark:text-amber-300/70",
    value: "text-amber-900 dark:text-amber-100",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
    badgeIcon: Clock,
    badgeLabel: "Davam edir",
  },
  pending: {
    card: "bg-slate-100/70 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800",
    icon: "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
    title: "text-slate-500 dark:text-slate-400",
    meta: "text-slate-400 dark:text-slate-500",
    value: "text-slate-500 dark:text-slate-400",
    badge: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    badgeIcon: Circle,
    badgeLabel: "Gözləyir",
  },
};

const NEUTRAL = {
  card: "bg-card border-border",
  icon: "bg-primary/10 text-primary",
  title: "text-foreground",
  meta: "text-muted-foreground",
  value: "text-foreground",
};

const StageRow = ({
  icon: Icon,
  title,
  stage,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  stage?: LifecycleStage;
}) => {
  const status = getStageStatus(stage);
  const s = status ? STATUS_STYLES[status] : NEUTRAL;
  const BadgeIcon = status ? STATUS_STYLES[status].badgeIcon : null;

  return (
    <div className={`border rounded-lg p-3 transition-colors ${s.card}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${s.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className={`text-sm font-semibold flex-1 ${s.title}`}>{title}</span>
        {status && BadgeIcon && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLES[status].badge}`}>
            <BadgeIcon className="w-3 h-3" />
            {STATUS_STYLES[status].badgeLabel}
          </span>
        )}
      </div>
      {stage ? (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className={`mb-0.5 ${s.meta}`}>Dövr</p>
            <p className={`font-medium ${s.value}`}>{formatStagePeriod(stage)}</p>
          </div>
          <div>
            <p className={`mb-0.5 ${s.meta}`}>Başlama</p>
            <p className={`font-medium inline-flex items-center gap-1 ${s.value}`}>
              <CalendarDays className="w-3 h-3" /> {stage.start || "—"}
            </p>
          </div>
          <div>
            <p className={`mb-0.5 ${s.meta}`}>Bitmə</p>
            <p className={`font-medium inline-flex items-center gap-1 ${s.value}`}>
              <CalendarDays className="w-3 h-3" /> {stage.end || "—"}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Təyin olunmayıb</p>
      )}
    </div>
  );
};

const ReviewRow = ({ r, i }: { r: LifecycleStage & { id: string }; i: number }) => {
  const status = getStageStatus(r);
  const s = status ? STATUS_STYLES[status] : NEUTRAL;
  const BadgeIcon = status ? STATUS_STYLES[status].badgeIcon : null;
  return (
    <div className={`grid grid-cols-[24px,1fr,1fr,1fr,auto] gap-2 items-center text-xs border rounded-md p-2 ${s.card}`}>
      <span className={s.meta}>#{i + 1}</span>
      <div>
        <p className={s.meta}>Dövr</p>
        <p className={`font-medium ${s.value}`}>{formatStagePeriod(r)}</p>
      </div>
      <div>
        <p className={s.meta}>Başlama</p>
        <p className={`font-medium ${s.value}`}>{r.start || "—"}</p>
      </div>
      <div>
        <p className={s.meta}>Bitmə</p>
        <p className={`font-medium ${s.value}`}>{r.end || "—"}</p>
      </div>
      {status && BadgeIcon && (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[status].badge}`}>
          <BadgeIcon className="w-3 h-3" />
          {STATUS_STYLES[status].badgeLabel}
        </span>
      )}
    </div>
  );
};

const LifecycleView = ({ lifecycle }: { lifecycle: CardLifecycle | null }) => {
  if (!lifecycle) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg bg-card">
        Bu KPI üçün lifecycle planı təyin edilməyib.
      </div>
    );
  }

  // Reviews wrapper status: in_progress if any active, else completed if all past, else pending
  const reviewStatuses = lifecycle.reviews.map(r => getStageStatus(r));
  let reviewsWrapperStatus: StageStatus | null = null;
  if (reviewStatuses.length > 0) {
    if (reviewStatuses.some(s => s === "in_progress")) reviewsWrapperStatus = "in_progress";
    else if (reviewStatuses.every(s => s === "completed")) reviewsWrapperStatus = "completed";
    else if (reviewStatuses.every(s => s === "pending")) reviewsWrapperStatus = "pending";
    else reviewsWrapperStatus = "in_progress";
  }
  const rs = reviewsWrapperStatus ? STATUS_STYLES[reviewsWrapperStatus] : NEUTRAL;
  const RBadgeIcon = reviewsWrapperStatus ? STATUS_STYLES[reviewsWrapperStatus].badgeIcon : null;

  return (
    <div className="space-y-3">
      <StageRow icon={Target} title="KPI təyin olunması" stage={lifecycle.assignment} />
      <StageRow icon={Star} title="KPI qiymətləndirilməsi" stage={lifecycle.evaluation} />
      <StageRow icon={Wallet} title="Bonusun hesablanması" stage={lifecycle.bonus} />

      <div className={`border rounded-lg p-3 ${rs.card}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-7 h-7 rounded-md flex items-center justify-center ${rs.icon}`}>
            <RefreshCw className="w-4 h-4" />
          </div>
          <span className={`text-sm font-semibold flex-1 ${rs.title}`}>KPI Review</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {lifecycle.reviews.length} ədəd
          </span>
          {reviewsWrapperStatus && RBadgeIcon && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLES[reviewsWrapperStatus].badge}`}>
              <RBadgeIcon className="w-3 h-3" />
              {STATUS_STYLES[reviewsWrapperStatus].badgeLabel}
            </span>
          )}
        </div>
        {lifecycle.reviews.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Review təyin olunmayıb</p>
        ) : (
          <div className="space-y-2">
            {lifecycle.reviews.map((r, i) => (
              <ReviewRow key={r.id} r={r} i={i} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-muted-foreground border-t border-border mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span><strong className="text-foreground">Tamamlandı</strong> — Bitmə tarixi keçib</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span><strong className="text-foreground">Davam edir</strong> — Tarix intervalı daxilindədir</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          <span><strong className="text-foreground">Gözləyir</strong> — Başlama tarixi gələcəkdir</span>
        </div>
      </div>
    </div>
  );
};

export default LifecycleView;
