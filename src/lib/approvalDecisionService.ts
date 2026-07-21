// Client wrapper for the `process-approval` edge function.
// Records an approver's decision on an approval queue row and returns
// the updated server-side state (status + decisions map).

import { supabase } from "@/integrations/supabase/client";

export type ApprovalDecision = "approved" | "rejected";

export interface ProcessApprovalInput {
  queueLocalId: string;
  organizationId: string;
  approverId: string;
  decision: ApprovalDecision;
  comment?: string;
}

export interface ProcessApprovalResult {
  ok: boolean;
  row?: {
    local_id: string;
    status: "pending" | "approved" | "rejected";
    decisions: Record<string, { decision: string; comment?: string; at?: string }>;
    current_step: number | null;
  };
  error?: string;
}

export const processApproval = async (
  input: ProcessApprovalInput,
): Promise<ProcessApprovalResult> => {
  const { data, error } = await supabase.functions.invoke("process-approval", {
    body: input,
  });
  if (error) return { ok: false, error: error.message };
  return data as ProcessApprovalResult;
};
