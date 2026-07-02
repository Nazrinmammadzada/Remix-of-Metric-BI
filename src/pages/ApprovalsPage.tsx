// Sistem Təsdiqləri — original card/kanban layout.
// HR (submits) and Manager (decides) share the same queue via approvalsStore.
import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Clock, CheckCircle2, XCircle, Send, Eye, User, Calendar, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useApprovals, decideApproval, type ApprovalItem } from "@/lib/approvalsStore";
import { useSharedKpiCards } from "@/lib/kpiCardStore";
import { getCurrentEmployeeId, getVisibleApprovals } from "@/lib/scope";
import { getEnrichedEmployee } from "@/data/mockExtras";
import { toast } from "sonner";

const empName = (id: string) => getEnrichedEmployee(id)?.fullName || id;

const ApprovalCard = ({
  a, canAct, onView, onApprove, onReject,
}: {
  a: ApprovalItem;
  canAct: boolean;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
}) => {
  const accent = a.status === "pending"
    ? "border-amber-300/60 bg-gradient-to-br from-amber-50 to-white"
    : a.status === "approved"
    ? "border-emerald-300/60 bg-gradient-to-br from-emerald-50 to-white"
    : "border-rose-300/60 bg-gradient-to-br from-rose-50 to-white";
  const badge = a.status === "pending"
    ? "bg-amber-500/15 text-amber-800 border-amber-400/40"
    : a.status === "approved"
    ? "bg-emerald-500/15 text-emerald-800 border-emerald-400/40"
    : "bg-rose-500/15 text-rose-800 border-rose-400/40";
  const StatusIcon = a.status === "pending" ? Clock : a.status === "approved" ? CheckCircle2 : XCircle;
  const label = a.status === "pending" ? "Gözləyir" : a.status === "approved" ? "Təsdiqləndi" : "İmtina";

  const firstNote = Object.values(a.decisions).find(d => d?.note)?.note;

  return (
    <div className={`rounded-xl border ${accent} p-4 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate">{a.kpiName}</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <User className="h-3 w-3" /> {empName(a.createdBy)}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border ${badge} shrink-0`}>
          <StatusIcon className="h-3 w-3" /> {label}
        </span>
      </div>

      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
        <Calendar className="h-3 w-3" /> {new Date(a.createdAt).toLocaleDateString("az-AZ")}
      </div>

      <div className="mb-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Təsdiqçilər</div>
        <div className="flex flex-wrap gap-1">
          {a.approverIds.map(id => {
            const d = a.decisions[id]?.decision || "pending";
            const dotColor = d === "approved" ? "bg-emerald-500" : d === "rejected" ? "bg-rose-500" : "bg-amber-500";
            return (
              <span key={id} className="text-xs px-2 py-0.5 rounded-full bg-white border border-border flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                {empName(id)}
              </span>
            );
          })}
        </div>
      </div>

      {firstNote && (
        <div className="text-xs bg-white/60 border border-border rounded-md px-2 py-1.5 mb-3 flex gap-1.5">
          <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
          <span className="text-foreground/80">{firstNote}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/60">
        <button onClick={onView} className="px-2.5 py-1 text-xs rounded-md border border-border bg-white hover:bg-muted/60 flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" /> Bax
        </button>
        {canAct && (
          <>
            <button onClick={onApprove} className="px-2.5 py-1 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Təsdiqlə
            </button>
            <button onClick={onReject} className="px-2.5 py-1 text-xs rounded-md bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1">
              <X className="h-3.5 w-3.5" /> İmtina
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const ApprovalsPage = () => {
  const { user } = useAuth();
  const all = useApprovals();
  const cards = useSharedKpiCards();
  const meId = getCurrentEmployeeId(user);
  const visible = useMemo(() => getVisibleApprovals(user, all), [user, all]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const detail = visible.find(a => a.id === detailId) || null;
  const cardOf = (kpiCardId: string) => cards.find(c => c.id === kpiCardId);

  const isManagerActor = user?.role === "MANAGER";

  const handleApprove = (id: string) => {
    if (!meId) return toast.error("Profil tapılmadı");
    decideApproval(id, meId, "approved");
    toast.success("KPI təsdiqləndi — kart aktiv statusa keçdi");
    setDetailId(null);
  };
  const handleReject = () => {
    if (!rejectId || !meId) return;
    decideApproval(rejectId, meId, "rejected", rejectNote || "Səbəb göstərilməyib");
    toast.success("İmtina qeyd olundu");
    setRejectId(null);
    setRejectNote("");
    setDetailId(null);
  };

  const columns = [
    { key: "pending" as const, label: "Gözləyir", icon: Clock, color: "amber" },
    { key: "approved" as const, label: "Təsdiqlənmiş", icon: CheckCircle2, color: "emerald" },
    { key: "rejected" as const, label: "İmtina", icon: XCircle, color: "rose" },
  ];

  return (
    <>
      <Header title="Sistem Təsdiqləri" />
      <main className="p-6 space-y-6">
        <PageHero
          icon={Send}
          title="Sistem Təsdiqləri"
          subtitle={isManagerActor
            ? "Sizə yönləndirilmiş KPI kartlarını təsdiqləyin və ya imtina edin"
            : "KPI kartlarının matris üzrə təsdiqləmə vəziyyəti"}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {columns.map(col => {
            const items = visible.filter(a => a.status === col.key);
            const Icon = col.icon;
            const headerColor = col.color === "amber"
              ? "from-amber-500/10 to-amber-500/5 border-amber-400/40"
              : col.color === "emerald"
              ? "from-emerald-500/10 to-emerald-500/5 border-emerald-400/40"
              : "from-rose-500/10 to-rose-500/5 border-rose-400/40";
            const iconColor = col.color === "amber" ? "text-amber-600"
              : col.color === "emerald" ? "text-emerald-600" : "text-rose-600";
            return (
              <div key={col.key} className="rounded-xl border border-border bg-muted/20 overflow-hidden flex flex-col">
                <div className={`px-4 py-3 border-b bg-gradient-to-r ${headerColor} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                    <span className="font-semibold text-sm">{col.label}</span>
                  </div>
                  <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-white border border-border">
                    {items.length}
                  </span>
                </div>
                <div className="p-3 space-y-3 min-h-[400px]">
                  {items.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-10">
                      Boş
                    </div>
                  )}
                  {items.map(a => {
                    const myDecision = meId ? a.decisions[meId]?.decision : undefined;
                    const canActMe = isManagerActor && a.status === "pending" && myDecision === "pending";
                    return (
                      <ApprovalCard
                        key={a.id}
                        a={a}
                        canAct={canActMe}
                        onView={() => setDetailId(a.id)}
                        onApprove={() => handleApprove(a.id)}
                        onReject={() => { setRejectId(a.id); setRejectNote(""); }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{detail?.kpiName}</DialogTitle></DialogHeader>
          {detail && (() => {
            const c = cardOf(detail.kpiCardId);
            return (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><div className="text-muted-foreground">Yaradan</div><div className="font-medium">{empName(detail.createdBy)}</div></div>
                  <div><div className="text-muted-foreground">Status</div><div className="font-medium capitalize">{detail.status}</div></div>
                  <div><div className="text-muted-foreground">Dövr</div><div className="font-medium">{c?.frequency || "—"}</div></div>
                  <div><div className="text-muted-foreground">Bal sistemi</div><div className="font-medium">{c?.scoringSystem || "—"}</div></div>
                </div>
                {c && (
                  <div>
                    <div className="text-muted-foreground mb-1">Hədəflər</div>
                    <ul className="space-y-1">
                      {c.targets.map(t => (
                        <li key={t.id} className="flex justify-between rounded bg-muted/40 px-3 py-2">
                          <span>{t.name || "Hədəf"} <span className="text-muted-foreground">({t.type})</span></span>
                          <span>Çəki: {t.weight} · Bal: {t.scoreLimit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground mb-1">Təsdiq zənciri</div>
                  <ul className="space-y-1">
                    {detail.approverIds.map(id => {
                      const dec = detail.decisions[id];
                      const label = dec?.decision === "approved" ? "Təsdiqlədi"
                        : dec?.decision === "rejected" ? "İmtina"
                        : "Gözləyir";
                      return (
                        <li key={id} className="flex justify-between rounded border border-border px-3 py-2">
                          <span>{empName(id)}</span>
                          <span className="text-muted-foreground">{label}{dec?.note ? ` — ${dec.note}` : ""}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>İmtina səbəbi</DialogTitle></DialogHeader>
          <textarea
            value={rejectNote}
            onChange={e => setRejectNote(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Səbəbi qeyd edin..."
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setRejectId(null)} className="px-3 py-1.5 rounded-md border border-border text-sm">Ləğv et</button>
            <button onClick={handleReject} className="px-3 py-1.5 rounded-md bg-rose-600 text-white text-sm">İmtina et</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApprovalsPage;
