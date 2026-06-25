import { useEffect, useState } from "react";
import { Lock, TrendingUp, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EVALUATION_CATEGORIES, CURRENT_CYCLE_ID } from "@/data/mockData";
import { getAverageForReviewee } from "@/lib/peerReviewStore";

interface Props {
  employeeId: string;
  cycleId?: string;
}

export const MyAnonymousScores = ({ employeeId, cycleId = CURRENT_CYCLE_ID }: Props) => {
  // Re-read on mount + visibility (simple refresh)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onFocus = () => setTick((t) => t + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  const { overall, perCategory, count } = getAverageForReviewee(employeeId, cycleId);
  void tick;

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Mənim anonim qiymətlərim
          </h3>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Həmkarlarınızın sizə verdiyi qiymətlərin ortalaması — kim qiymət verdiyi göstərilmir.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Users className="w-3 h-3" /> {count} qiymətləndirmə
        </Badge>
      </div>

      {count === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Hələ heç bir həmkar sizi qiymətləndirməyib.
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Ümumi ortalama</span>
            <span className="text-3xl font-bold text-primary">
              {overall!.toFixed(2)} <span className="text-base text-muted-foreground font-normal">/ 5</span>
            </span>
          </div>

          <div className="space-y-3">
            {EVALUATION_CATEGORIES.map((c) => {
              const v = perCategory[c.key] ?? 0;
              return (
                <div key={c.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{c.label}</span>
                    <span className="text-sm font-semibold text-foreground">{v.toFixed(2)} / 5</span>
                  </div>
                  <Progress value={(v / 5) * 100} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
};
