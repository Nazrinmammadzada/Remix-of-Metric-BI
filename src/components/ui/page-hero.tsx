// Shared visual hero block matching UserReportsPage design language.
// Pure presentational — no logic.
import { Sparkles, type LucideIcon } from "lucide-react";

interface PageHeroProps {
  badge?: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  right?: React.ReactNode;
}

export const PageHero = ({ badge, title, subtitle, icon: Icon = Sparkles, right, left }: PageHeroProps & { left?: React.ReactNode }) => (
  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-background to-secondary/40 border border-border px-5 py-4 mb-4">
    <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl" />
    <div className="relative flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        {left}
        <div className="min-w-0 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight truncate">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
      </div>
      {right && <div className="flex items-center gap-2 flex-wrap">{right}</div>}
    </div>
  </div>
);

type Accent = "primary" | "emerald" | "violet" | "amber" | "rose" | "sky";

const accentMap: Record<Accent, string> = {
  primary: "from-primary/15 to-primary/5 text-primary",
  emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  violet: "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400",
  amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
  rose: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400",
  sky: "from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400",
};

interface FancyStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  accent?: Accent;
}

export const FancyStatCard = ({ icon: Icon, label, value, sub, accent = "primary" }: FancyStatCardProps) => (
  <div className="rounded-xl border border-border bg-card p-5 relative overflow-hidden">
    <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${accentMap[accent]} blur-2xl opacity-60`} />
    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${accentMap[accent]} flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

interface FancyCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
}

export const FancyCard = ({ title, subtitle, children, className = "", right }: FancyCardProps) => (
  <div className={`rounded-2xl border border-border bg-card p-5 shadow-sm ${className}`}>
    {(title || right) && (
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          {title && <h3 className="font-semibold text-foreground">{title}</h3>}
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
    )}
    {children}
  </div>
);
