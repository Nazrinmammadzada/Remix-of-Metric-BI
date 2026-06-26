// Live Sistem Təsdiqləri — driven by the shared approvalsStore so HR (submits)
// and Manager (decides) see the same queue across panels.
import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Clock, CheckCircle2, XCircle, Send, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useApprovals, decideApproval } from "@/lib/approvalsStore";
import { useSharedKpiCards } from "@/lib/kpiCardStore";
import { getCurrentEmployeeId, getVisibleApprovals } from "@/lib/scope";
import { getEnrichedEmployee } from "@/data/mockExtras";
import { toast } from "sonner";

const ApprovalsPage = () => {
  const { user } = useAuth();
  const all = useApprovals();
  const cards = useSharedKpiCards();
  const meId = getCurrentEmployeeId(user);
  const visible = useMemo(() => getVisibleApprovals(user, all), [user, all]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const filtered = visible.filter(a => a.status === tab);
  const detail = visible.find(a => a.id === detailId) || null;
  const cardOf = (kpiCardId: string) => cards.find(c => c.id === kpiCardId);
  const empName = (id: string) => {
    const e = getEnrichedEmployee(id);
    return e ? e.fullName : id;
  };

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

  const counters = {
    pending: visible.filter(a => a.status === "pending").length,
    approved: visible.filter(a => a.status === "approved").length,
    rejected: visible.filter(a => a.status === "rejected").length,
  };

  const isManagerActor = user?.role === "MANAGER";

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["pending", "approved", "rejected"] as const).map(t => {
            const labels = { pending: "Gözləyir", approved: "Təsdiqlənmiş", rejected: "İmtina" };
            const icons = { pending: Clock, approved: CheckCircle2, rejected: XCircle };
            const Icon = icons[t];
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-left rounded-xl border p-4 transition ${
                  tab === t ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="h-4 w-4" /> {labels[t]}
                  </div>
                  <span className="text-2xl font-semibold">{counters[t]}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">KPI</th>
                <th className="text-left px-4 py-3 font-medium">Yaradan</th>
                <th className="text-left px-4 py-3 font-medium">Təsdiqçilər</th>
                <th className="text-left px-4 py-3 font-medium">Tarix</th>
                <th className="text-right px-4 py-3 font-medium">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center px-4 py-10 text-muted-foreground">Bu kateqoriyada qeyd yoxdur</td></tr>
              )}
              {filtered.map(a => {
                const myDecision = meId ? a.decisions[meId]?.decision : undefined;
                const canActMe = isManagerActor && a.status === "pending" && myDecision === "pending";
                return (
                  <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{a.kpiName}</td>
                    <td className="px-4 py-3">{empName(a.createdBy)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {a.approverIds.map(id => {
                          const d = a.decisions[id]?.decision || "pending";
                          const color = d === "approved" ? "bg-emerald-500/15 text-emerald-700"
                            : d === "rejected" ? "bg-rose-500/15 text-rose-700"
                            : "bg-amber-500/15 text-amber-700";
                          return (
                            <span key={id} className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
                              {empName(id)}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(a.createdAt).toLocaleDateString("az-AZ")}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setDetailId(a.id)} className="p-1.5 hover:bg-muted rounded" title="Bax">
                          <Eye className="h-4 w-4" />
                        </button>
                        {canActMe && (
                          <>
                            <button onClick={() => handleApprove(a.id)} className="p-1.5 text-emerald-700 hover:bg-emerald-500/10 rounded" title="Təsdiqlə">
                              <Check className="h-4 w-4" />
                            </button>
                            <button onClick={() => { setRejectId(a.id); setRejectNote(""); }} className="p-1.5 text-rose-700 hover:bg-rose-500/10 rounded" title="İmtina">
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
