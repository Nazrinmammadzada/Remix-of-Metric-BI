// Bonus runs persistence — save + query deterministic bonus calculations.
// Pairs with the `calculate-bonus` edge function and its local mirror.

import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/auditService";

export interface BonusRunRow {
  id: string;
  periodLabel: string;
  employeeLocalId?: string | null;
  employeeName: string;
  department?: string | null;
  baseSalary: number;
  weightedScore: number;
  achievementPct: number;
  bonusPct: number;
  capPct: number;
  bonusAmount: number;
  currency: string;
  inputs: Record<string, unknown>;
  notes?: string | null;
  createdAt: string;
}

export interface SaveBonusRunInput {
  organizationId: string;
  periodLabel: string;
  employeeLocalId?: string;
  employeeName: string;
  department?: string;
  baseSalary: number;
  weightedScore: number;
  achievementPct: number;
  bonusPct: number;
  capPct: number;
  bonusAmount: number;
  currency?: string;
  inputs?: Record<string, unknown>;
  notes?: string;
  createdBy?: string;
}

const mapRow = (r: any): BonusRunRow => ({
  id: r.id,
  periodLabel: r.period_label,
  employeeLocalId: r.employee_local_id,
  employeeName: r.employee_name,
  department: r.department,
  baseSalary: Number(r.base_salary ?? 0),
  weightedScore: Number(r.weighted_score ?? 0),
  achievementPct: Number(r.achievement_pct ?? 0),
  bonusPct: Number(r.bonus_pct ?? 0),
  capPct: Number(r.cap_pct ?? 0),
  bonusAmount: Number(r.bonus_amount ?? 0),
  currency: r.currency ?? "AZN",
  inputs: r.inputs ?? {},
  notes: r.notes,
  createdAt: r.created_at,
});

export const saveBonusRun = async (input: SaveBonusRunInput): Promise<BonusRunRow | null> => {
  const { data, error } = await supabase
    .from("bonus_runs")
    .insert({
      organization_id: input.organizationId,
      period_label: input.periodLabel,
      employee_local_id: input.employeeLocalId ?? null,
      employee_name: input.employeeName,
      department: input.department ?? null,
      base_salary: input.baseSalary,
      weighted_score: input.weightedScore,
      achievement_pct: input.achievementPct,
      bonus_pct: input.bonusPct,
      cap_pct: input.capPct,
      bonus_amount: input.bonusAmount,
      currency: input.currency ?? "AZN",
      inputs: input.inputs ?? {},
      notes: input.notes ?? null,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  void logAudit({
    organizationId: input.organizationId,
    action: "create",
    module: "bonus",
    entityType: "bonus_run",
    entityId: data.id,
    metadata: {
      periodLabel: input.periodLabel,
      employeeName: input.employeeName,
      amount: input.bonusAmount,
    },
  });
  return mapRow(data);
};

export const listBonusRuns = async (
  organizationId: string,
  opts?: { periodLabel?: string; employeeLocalId?: string; limit?: number },
): Promise<BonusRunRow[]> => {
  let q = supabase
    .from("bonus_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (opts?.periodLabel) q = q.eq("period_label", opts.periodLabel);
  if (opts?.employeeLocalId) q = q.eq("employee_local_id", opts.employeeLocalId);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(mapRow);
};

export const deleteBonusRun = async (organizationId: string, id: string): Promise<boolean> => {
  const { error } = await supabase.from("bonus_runs").delete().eq("id", id).eq("organization_id", organizationId);
  if (error) return false;
  void logAudit({
    organizationId,
    action: "delete",
    module: "bonus",
    entityType: "bonus_run",
    entityId: id,
  });
  return true;
};
