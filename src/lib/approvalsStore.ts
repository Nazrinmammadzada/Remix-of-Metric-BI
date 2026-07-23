// Approval queue for KPI cards that were submitted with a Təsdiqləmə Matrisi.
// Both HR (/sistem-tesdiq) and Manager (/manager/sistem-tesdiq) read from here.

import { useEffect, useState } from "react";
import { setKpiStatus } from "./kpiCardStore";
import { pushNotification } from "./notificationsStore";

export type ApprovalDecision = "pending" | "approved" | "rejected";

export interface ApprovalItem {
  id: string;
  kpiCardId: string;            // SharedKpiCard.id
  kpiName: string;
  matrixId: string;
  approverIds: string[];        // current step approvers (active)
  decisions: Record<string, { decision: ApprovalDecision; note?: string; at?: string }>;
  status: ApprovalDecision;     // aggregate: approved when all approvers approve; rejected on first rejection
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Sequential-flow chain: list of approver id arrays, one per matrix step.
  stepsChain?: string[][];
  currentStep?: number;
}

const KEY = "kpi_approval_queue_v2";
const EVT = "kpi-approval-queue-updated";

const load = (): ApprovalItem[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

const save = (list: ApprovalItem[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
};

const flushSoon = () => {
  void import("./approvalsService").then(m => m.flushApprovalsToCloud()).catch(() => undefined);
};

const flushCardsSoon = () => {
  void import("./kpiCardsService").then(m => m.flushLocalKpiCardsToCloud()).catch(() => undefined);
};

export const getApprovals = (): ApprovalItem[] => load();

export const enqueueApproval = (input: {
  kpiCardId: string;
  kpiName: string;
  matrixId: string;
  approverIds: string[];
  createdBy: string;
  stepsChain?: string[][];
}): ApprovalItem => {
  const list = load();
  // dedupe: if a pending request exists for this card, return existing
  const existing = list.find(a => a.kpiCardId === input.kpiCardId && a.status === "pending");
  if (existing) return existing;
  const chain = input.stepsChain && input.stepsChain.length > 0 ? input.stepsChain : [input.approverIds];
  const firstStep = chain[0];
  const item: ApprovalItem = {
    id: crypto.randomUUID(),
    kpiCardId: input.kpiCardId,
    kpiName: input.kpiName,
    matrixId: input.matrixId,
    approverIds: firstStep,
    decisions: Object.fromEntries(firstStep.map(a => [a, { decision: "pending" as const }])),
    status: "pending",
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stepsChain: chain,
    currentStep: 0,
  };
  list.unshift(item);
  save(list);
  flushSoon();
  firstStep.forEach(approverId => {
    pushNotification({
      toEmployeeId: approverId,
      type: "approval_request",
      title: `Təsdiq tələbi: ${input.kpiName}`,
      body: "Sistem Təsdiqləri modulunda kart sizi gözləyir.",
      link: "/manager/sistem-tesdiq",
    });
  });
  return item;
};

export const decideApproval = (
  approvalId: string,
  approverId: string,
  decision: Exclude<ApprovalDecision, "pending">,
  note?: string,
) => {
  const list = load();
  const idx = list.findIndex(a => a.id === approvalId);
  if (idx < 0) return;
  const item = { ...list[idx] };
  item.decisions = {
    ...item.decisions,
    [approverId]: { decision, note, at: new Date().toISOString() },
  };

  const allApproved = item.approverIds.every(id => item.decisions[id]?.decision === "approved");
  const anyRejected = item.approverIds.some(id => item.decisions[id]?.decision === "rejected");

  if (anyRejected) {
    item.status = "rejected";
  } else if (allApproved) {
    const chain = item.stepsChain || [item.approverIds];
    const cur = item.currentStep ?? 0;
    if (cur + 1 < chain.length) {
      // Advance to next step
      const nextStep = chain[cur + 1];
      item.currentStep = cur + 1;
      item.approverIds = nextStep;
      nextStep.forEach(id => {
        if (!item.decisions[id]) item.decisions[id] = { decision: "pending" };
      });
      item.status = "pending";
      nextStep.forEach(nextApprover => {
        pushNotification({
          toEmployeeId: nextApprover,
          type: "approval_request",
          title: `Təsdiq tələbi: ${item.kpiName}`,
          body: "Sistem Təsdiqləri modulunda kart sizi gözləyir.",
          link: "/manager/sistem-tesdiq",
        });
      });
    } else {
      item.status = "approved";
    }
  } else {
    item.status = "pending";
  }

  item.updatedAt = new Date().toISOString();
  list[idx] = item;
  save(list);
  flushSoon();

  // Mirror the decision onto the shared KPI card itself.
  if (item.status === "approved") {
    setKpiStatus(item.kpiCardId, "aktiv", approverId, "Matris vasitəsilə təsdiq edildi");
    flushCardsSoon();
    pushNotification({
      toEmployeeId: item.createdBy,
      type: "approval_result",
      title: `KPI təsdiq olundu: ${item.kpiName}`,
      body: "Kart aktiv statusa keçdi.",
      link: "/kpi-kartlari",
    });
  } else if (item.status === "rejected") {
    setKpiStatus(item.kpiCardId, "imtina", approverId, note || "Rəhbər imtina etdi");
    flushCardsSoon();
    pushNotification({
      toEmployeeId: item.createdBy,
      type: "approval_result",
      title: `KPI imtina olundu: ${item.kpiName}`,
      body: note || "Səbəb göstərilməyib.",
      link: "/kpi-kartlari",
    });
  }
};

export const useApprovals = (): ApprovalItem[] => {
  const [rows, setRows] = useState<ApprovalItem[]>(() => load());
  useEffect(() => {
    const h = () => setRows(load());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener(EVT, h); window.removeEventListener("storage", h); };
  }, []);
  return rows;
};
