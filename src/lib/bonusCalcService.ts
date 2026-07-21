// Client wrapper for the deterministic `calculate-bonus` edge function.
import { supabase } from "@/integrations/supabase/client";

export interface BonusTargetInput {
  name?: string;
  weight: number;   // 0..100
  score: number;    // 0..100+ (achievement %)
}

export interface BonusRequest {
  salary: number;
  weights: BonusTargetInput[];
  bonusPct?: number;   // default 20
  capPct?: number;     // default 150
}

export interface BonusBreakdown {
  name: string | null;
  weight: number;
  score: number;
  contribution: number;
}

export interface BonusResult {
  salary: number;
  totalWeight: number;
  weightedScore: number;
  achievement: number;  // %
  bonusPct: number;
  capPct: number;
  bonusAmount: number;
  breakdown: BonusBreakdown[];
  computedAt: string;
}

export async function calculateBonus(req: BonusRequest): Promise<BonusResult> {
  const { data, error } = await supabase.functions.invoke("calculate-bonus", { body: req });
  if (error) throw error;
  return data as BonusResult;
}

// Deterministic local mirror — same math as the edge function. Handy for
// previews / dry-runs before persisting a calculation.
export function calculateBonusLocal(req: BonusRequest): BonusResult {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
  const salary = Number(req.salary) || 0;
  const bonusPct = req.bonusPct ?? 20;
  const capPct = req.capPct ?? 150;
  const items = req.weights ?? [];
  const totalWeight = items.reduce((s, t) => s + (Number(t.weight) || 0), 0);
  const weightedSum = items.reduce((s, t) => s + (Number(t.weight) || 0) * (Number(t.score) || 0), 0);
  const weightedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const achievement = clamp(weightedScore / 100, 0, capPct / 100);
  return {
    salary,
    totalWeight,
    weightedScore: round2(weightedScore),
    achievement: round2(achievement * 100),
    bonusPct,
    capPct,
    bonusAmount: round2(salary * (bonusPct / 100) * achievement),
    breakdown: items.map((t) => ({
      name: t.name ?? null,
      weight: Number(t.weight) || 0,
      score: Number(t.score) || 0,
      contribution: totalWeight > 0
        ? round2(((Number(t.weight) || 0) * (Number(t.score) || 0)) / totalWeight)
        : 0,
    })),
    computedAt: new Date().toISOString(),
  };
}
