import { supabase } from "@/integrations/supabase/client";

export type KpiCardStatus = "natamam" | "tesdiq_gozlenilir" | "imtina" | "aktiv";

export interface AssigneeState {
  name: string;
  ok: boolean; // true = check (yaşıl), false = X (qırmızı)
}

export interface KpiCardStatusRow {
  card_id: number;
  status: KpiCardStatus;
  use_matrix: boolean;
  submitted_for_approval: boolean;
  rejected_by: string | null;
  rejected_at: string | null;
  assignees: AssigneeState[];
  updated_at: string;
}

export const STATUS_LABELS: Record<KpiCardStatus, string> = {
  natamam: "Qaralama",
  tesdiq_gozlenilir: "Təsdiq gözlənilir",
  imtina: "İmtina",
  aktiv: "Aktiv",
};

export const STATUS_STYLES: Record<KpiCardStatus, string> = {
  natamam: "bg-muted text-muted-foreground border-border",
  tesdiq_gozlenilir: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  imtina: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  aktiv: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
};

export async function fetchAllStatuses(): Promise<Record<number, KpiCardStatusRow>> {
  const { data, error } = await supabase.from("kpi_card_status").select("*");
  if (error || !data) return {};
  const map: Record<number, KpiCardStatusRow> = {};
  data.forEach((r: any) => {
    map[r.card_id] = { ...r, assignees: Array.isArray(r.assignees) ? r.assignees : [] };
  });
  return map;
}

export async function upsertStatus(row: Partial<KpiCardStatusRow> & { card_id: number }): Promise<void> {
  await supabase.from("kpi_card_status").upsert(row as any, { onConflict: "card_id" });
}

export async function submitToMatrix(cardId: number): Promise<void> {
  await upsertStatus({ card_id: cardId, status: "tesdiq_gozlenilir", submitted_for_approval: true });
}
