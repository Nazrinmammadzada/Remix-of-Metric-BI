import { useState } from "react";
import Header from "@/components/layout/Header";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, Check, X, Bell, CheckCircle, XCircle, AlertCircle, ChevronDown, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageHero } from "@/components/ui/page-hero";

interface ApprovalStep {
  role: string; person: string; status: "pending" | "approved" | "rejected" | "waiting";
  date?: string; rejectReason?: string; comment?: string; createdDate?: string;
}

interface ApprovalRequest {
  id: string; kpiCode: string; kpiName: string; kpiType: string; createdDate: string; createdBy: string;
  kpiOwner: string; department: string; currentStep: number; approvalChain: ApprovalStep[];
  status: "pending" | "approved" | "rejected"; target: string; description: string;
}

const PAGE_SIZE = 3;

const UserApprovalsPage = () => {
  const { user } = useAuth();
  const userName = user?.name || "Samir Həsənov";

  const [requests, setRequests] = useState<ApprovalRequest[]>([
    {
      id: "1", kpiCode: "KPI-2026-007", kpiName: "Komanda Satış Performansı", kpiType: "Absolut Hədəf",
      createdDate: "10.04.2026", createdBy: "Leyla Məmmədova", kpiOwner: "Leyla Məmmədova",
      department: "Satış Departamenti", currentStep: 0, status: "pending", target: "3M AZN",
      description: "Komanda satış performansının qiymətləndirilməsi.",
      approvalChain: [
        { role: "Komanda Lideri", person: userName, status: "pending", createdDate: "10.04.2026" },
        { role: "Departament Direktoru", person: "Farid Həsənov", status: "waiting", createdDate: "10.04.2026" },
        { role: "HR", person: "Günel Əlizadə", status: "waiting", createdDate: "10.04.2026" },
      ],
    },
    {
      id: "2", kpiCode: "KPI-2026-008", kpiName: "Müştəri Ziyarətləri", kpiType: "Say Hədəfi",
      createdDate: "08.04.2026", createdBy: "Rəşad Əliyev", kpiOwner: "Rəşad Əliyev",
      department: "Satış Departamenti", currentStep: 0, status: "pending", target: "200",
      description: "Aylıq müştəri ziyarətlərinin sayı.",
      approvalChain: [
        { role: "Komanda Lideri", person: userName, status: "pending", createdDate: "08.04.2026" },
        { role: "HR", person: "Günel Əlizadə", status: "waiting", createdDate: "08.04.2026" },
      ],
    },
    {
      id: "5", kpiCode: "KPI-2026-006", kpiName: "Marketinq ROI", kpiType: "Faiz Hədəfi",
      createdDate: "12.04.2026", createdBy: "Emin Məmmədov", kpiOwner: "Emin Məmmədov",
      department: "Marketinq", currentStep: 0, status: "pending", target: "150%",
      description: "Marketinq xərclərinin gəlirə nisbəti.",
      approvalChain: [
        { role: "Şöbə Müdiri", person: userName, status: "pending", createdDate: "12.04.2026" },
        { role: "Departament Direktoru", person: "Farid Həsənov", status: "waiting", createdDate: "12.04.2026" },
        { role: "HR", person: "Günel Əlizadə", status: "waiting", createdDate: "12.04.2026" },
      ],
    },
    {
      id: "3", kpiCode: "KPI-2026-009", kpiName: "Parakəndə Satış", kpiType: "Faiz Hədəfi",
      createdDate: "05.04.2026", createdBy: "Leyla Məmmədova", kpiOwner: "Leyla Məmmədova",
      department: "Satış Departamenti", currentStep: 2, status: "approved", target: "2M AZN",
      description: "Parakəndə satış göstəricisinin artırılması.",
      approvalChain: [
        { role: "Komanda Lideri", person: userName, status: "approved", date: "06.04.2026", comment: "Uyğundur.", createdDate: "05.04.2026" },
        { role: "Departament Direktoru", person: "Farid Həsənov", status: "approved", date: "07.04.2026", createdDate: "05.04.2026" },
        { role: "HR", person: "Günel Əlizadə", status: "approved", date: "08.04.2026", createdDate: "05.04.2026" },
      ],
    },
    {
      id: "4", kpiCode: "KPI-2026-004", kpiName: "Əməliyyat Xərcləri", kpiType: "Absolut Hədəf",
      createdDate: "03.04.2026", createdBy: "Tural İsmayılov", kpiOwner: "Kamran Quliyev",
      department: "Əməliyyatlar", currentStep: 1, status: "rejected", target: "500K AZN",
      description: "Əməliyyat xərclərinin optimallaşdırılması hədəfi.",
      approvalChain: [
        { role: "Komanda Lideri", person: userName, status: "approved", date: "04.04.2026", comment: "Təsdiqləndi.", createdDate: "03.04.2026" },
        { role: "Departament Direktoru", person: "Farid Həsənov", status: "rejected", date: "05.04.2026", rejectReason: "Hədəf dəyəri real bazar şəraitinə uyğun deyil.", createdDate: "03.04.2026" },
      ],
    },
  ]);

  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [showApproveInput, setShowApproveInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approveComment, setApproveComment] = useState("");
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [pendingPage, setPendingPage] = useState(1);
  const [approvedPage, setApprovedPage] = useState(1);
  const [rejectedPage, setRejectedPage] = useState(1);
  const [notifications, setNotifications] = useState([
    { id: "n1", message: "KPI-2026-007 təsdiqiniz gözləyir", date: "10.04.2026", read: false },
    { id: "n2", message: "KPI-2026-008 təsdiqiniz gözləyir", date: "08.04.2026", read: false },
    { id: "n3", message: "KPI-2026-006 təsdiqiniz gözləyir", date: "12.04.2026", read: false },
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

  const pendingRequests = requests.filter(r => r.status === "pending" && r.approvalChain[r.currentStep]?.person === userName);
  const approvedRequests = requests.filter(r => r.status === "approved");
  const rejectedRequests = requests.filter(r => r.status === "rejected");

  const handleApprove = (req: ApprovalRequest) => {
    setRequests(prev => prev.map(r => {
      if (r.id !== req.id) return r;
      const chain = [...r.approvalChain];
      chain[r.currentStep] = { ...chain[r.currentStep], status: "approved", date: new Date().toLocaleDateString("az-AZ"), comment: approveComment || undefined };
      const nextStep = r.currentStep + 1;
      const isLast = nextStep >= chain.length;
      if (!isLast) chain[nextStep] = { ...chain[nextStep], status: "pending" };
      setNotifications(prev => [...prev, { id: `n-${Date.now()}`, message: isLast ? `${r.kpiCode} tam təsdiq edildi!` : `${r.kpiCode} növbəti mərhələyə keçdi`, date: new Date().toLocaleDateString("az-AZ"), read: false }]);
      return { ...r, approvalChain: chain, currentStep: isLast ? chain.length : nextStep, status: isLast ? "approved" : "pending" };
    }));
    setApproveComment(""); setShowApproveInput(false); setSelectedRequest(null);
    toast.success("Sorğu təsdiqləndi");
  };

  const handleReject = (req: ApprovalRequest) => {
    if (!rejectReason.trim()) return;
    setRequests(prev => prev.map(r => {
      if (r.id !== req.id) return r;
      const chain = [...r.approvalChain];
      chain[r.currentStep] = { ...chain[r.currentStep], status: "rejected", date: new Date().toLocaleDateString("az-AZ"), rejectReason };
      setNotifications(prev => [...prev, { id: `n-${Date.now()}`, message: `${r.kpiCode} imtina edildi`, date: new Date().toLocaleDateString("az-AZ"), read: false }]);
      return { ...r, approvalChain: chain, status: "rejected" };
    }));
    setRejectReason(""); setShowRejectInput(false); setSelectedRequest(null);
    toast.error("Sorğu imtina edildi");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <span className="text-xs px-2 py-0.5 rounded-full bg-zone-green-bg text-zone-green-text font-medium">Təsdiq edilib</span>;
      case "rejected": return <span className="text-xs px-2 py-0.5 rounded-full bg-zone-red-bg text-zone-red-text font-medium">İmtina edilib</span>;
      case "pending": return <span className="text-xs px-2 py-0.5 rounded-full bg-zone-yellow-bg text-zone-yellow-text font-medium">Təsdiq gözləyir</span>;
      default: return <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Gözləyir</span>;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const variantStyles = {
    pending: {
      panel: "bg-[hsl(217_40%_94%)] border-[hsl(217_30%_82%)] dark:bg-[hsl(217_35%_14%)] dark:border-[hsl(217_30%_24%)]",
      card: "bg-[hsl(217_55%_62%)] border-[hsl(217_45%_55%)] text-white dark:bg-[hsl(217_50%_42%)] dark:border-[hsl(217_45%_35%)]",
      title: "bg-[hsl(217_50%_55%)] border-b border-[hsl(217_45%_50%)] dark:bg-[hsl(217_50%_32%)] dark:border-[hsl(217_45%_28%)]",
      iconBg: "bg-[hsl(217_65%_55%)] dark:bg-[hsl(217_65%_45%)]",
      pageBtn: "bg-[hsl(217_65%_55%)] text-white dark:bg-[hsl(217_65%_45%)]",
      headerText: "text-[hsl(217_45%_25%)] dark:text-[hsl(217_60%_80%)]",
    },
    approved: {
      panel: "bg-[hsl(152_40%_94%)] border-[hsl(152_30%_80%)] dark:bg-[hsl(152_30%_12%)] dark:border-[hsl(152_25%_22%)]",
      card: "bg-[hsl(152_40%_55%)] border-[hsl(152_35%_48%)] text-white dark:bg-[hsl(152_40%_35%)] dark:border-[hsl(152_35%_28%)]",
      title: "bg-[hsl(152_38%_48%)] border-b border-[hsl(152_35%_42%)] dark:bg-[hsl(152_38%_28%)] dark:border-[hsl(152_35%_22%)]",
      iconBg: "bg-[hsl(152_50%_48%)] dark:bg-[hsl(152_50%_38%)]",
      pageBtn: "bg-[hsl(152_50%_48%)] text-white dark:bg-[hsl(152_50%_38%)]",
      headerText: "text-[hsl(152_45%_22%)] dark:text-[hsl(152_55%_75%)]",
    },
    rejected: {
      panel: "bg-[hsl(0_45%_95%)] border-[hsl(0_30%_82%)] dark:bg-[hsl(0_30%_14%)] dark:border-[hsl(0_25%_24%)]",
      card: "bg-[hsl(0_55%_65%)] border-[hsl(0_45%_58%)] text-white dark:bg-[hsl(0_50%_42%)] dark:border-[hsl(0_45%_35%)]",
      title: "bg-[hsl(0_50%_58%)] border-b border-[hsl(0_45%_52%)] dark:bg-[hsl(0_50%_35%)] dark:border-[hsl(0_45%_28%)]",
      iconBg: "bg-[hsl(0_60%_58%)] dark:bg-[hsl(0_60%_45%)]",
      pageBtn: "bg-[hsl(0_60%_58%)] text-white dark:bg-[hsl(0_60%_45%)]",
      headerText: "text-[hsl(0_50%_30%)] dark:text-[hsl(0_65%_78%)]",
    },
  } as const;

  const RequestCard = ({ req, variant }: { req: ApprovalRequest; variant: "pending" | "approved" | "rejected" }) => {
    const styles = variantStyles[variant];
    const datedSteps = req.approvalChain.filter(s => s.date);
    const lastDate = datedSteps.length ? datedSteps[datedSteps.length - 1].date : null;
    const firstApprover = req.approvalChain[0]?.person ?? "";
    return (
      <div className={`${styles.card} rounded-lg border overflow-hidden`}>
        <div className={`${styles.title} px-4 py-2 text-center font-semibold text-sm`}>
          {req.kpiType ? `${req.kpiType} sorğusu` : "Sorğu"}
        </div>
        <div className="px-4 py-3 space-y-1 text-sm">
          <div><span className="opacity-90">Sorğu NO</span> - {req.kpiCode}</div>
          <div><span className="opacity-90">Sorğu Növü</span> - {req.kpiType || "—"}</div>
          <div><span className="opacity-90">Sorğunun Yaradılma Tarixi</span> - {req.createdDate}</div>
          {variant === "pending" && (
            <div><span className="opacity-90">İlk təsdiqləyici şəxs</span> - {firstApprover || "—"}</div>
          )}
          {variant === "approved" && (
            <div><span className="opacity-90">Sorğunun Təsdiq Tarixi</span> - {lastDate || "—"}</div>
          )}
          {variant === "rejected" && (
            <div><span className="opacity-90">Sorğunun imtina tarixi</span> - {lastDate || "—"}</div>
          )}
          <div><span className="opacity-90">Sorğu Yaradan</span> - {req.createdBy}</div>
          <div><span className="opacity-90">Subyektin adı soyadı</span> - {req.kpiOwner || "—"}</div>
          <div><span className="opacity-90">Struktur</span> - {req.department || "—"}</div>
        </div>
        <div className="flex justify-end px-4 pb-3">
          <button
            onClick={() => { setSelectedRequest(req); setShowRejectInput(false); setShowApproveInput(false); setRejectReason(""); setApproveComment(""); setSelectedStepIndex(null); }}
            className="text-white/90 hover:text-white"
            title="Ətraflı bax"
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const Pagination = ({ page, setPage, total, variant }: { page: number; setPage: (n: number) => void; total: number; variant: "pending" | "approved" | "rejected" }) => {
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const styles = variantStyles[variant];
    return (
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="w-8 h-8 rounded-md border border-border bg-card text-foreground flex items-center justify-center disabled:opacity-40"
        >‹</button>
        {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            onClick={() => setPage(n)}
            className={`w-8 h-8 rounded-md text-sm font-medium ${n === page ? styles.pageBtn : "border border-border bg-card text-foreground"}`}
          >{n}</button>
        ))}
        <button
          onClick={() => setPage(Math.min(pages, page + 1))}
          disabled={page >= pages}
          className="w-8 h-8 rounded-md border border-border bg-card text-foreground flex items-center justify-center disabled:opacity-40"
        >›</button>
      </div>
    );
  };

  const Column = ({
    title, icon: Icon, variant, items, page, setPage, emptyText,
  }: {
    title: string;
    icon: typeof AlertCircle;
    variant: "pending" | "approved" | "rejected";
    items: ApprovalRequest[];
    page: number;
    setPage: (n: number) => void;
    emptyText: string;
  }) => {
    const styles = variantStyles[variant];
    const start = (page - 1) * PAGE_SIZE;
    const pageItems = items.slice(start, start + PAGE_SIZE);
    return (
      <div className={`${styles.panel} border rounded-2xl p-5`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`${styles.headerText} font-semibold text-lg`}>{title}</h3>
          <div className={`${styles.iconBg} w-8 h-8 rounded-full flex items-center justify-center text-white`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="mb-4">
          <Pagination page={page} setPage={setPage} total={items.length} variant={variant} />
        </div>
        <div className="space-y-4 min-h-[200px]">
          {pageItems.length === 0 ? (
            <div className={`text-center ${styles.headerText} opacity-60 py-10 text-sm`}>{emptyText}</div>
          ) : (
            pageItems.map(req => <RequestCard key={req.id} req={req} variant={variant} />)
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <Header title="Sistem Təsdiqləri" />
      <main className="p-6 pb-24">
        <PageHero
          badge="Təsdiqləmə Mərkəzi"
          icon={Sparkles}
          title="Sistem Təsdiqləri"
          subtitle="KPI təsdiqləmə zənciri və sorğuların idarə edilməsi"
          right={
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 rounded-lg bg-card border border-border hover:bg-secondary transition-colors">
                <Bell className="w-5 h-5 text-foreground" />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">{unreadCount}</span>}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <h4 className="font-semibold text-foreground text-sm">Bildirişlər</h4>
                    <button onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))} className="text-xs text-primary">Hamısını oxunmuş et</button>
                  </div>
                  {notifications.length === 0 ? <p className="p-4 text-sm text-muted-foreground text-center">Bildiriş yoxdur</p> :
                    notifications.slice().reverse().map(n => (
                      <div key={n.id} className={`p-3 border-b border-border last:border-0 text-sm ${!n.read ? 'bg-primary/5' : ''}`}>
                        <p className="text-foreground">{n.message}</p><p className="text-xs text-muted-foreground mt-1">{n.date}</p>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          }
        />

        <div className="grid grid-cols-3 gap-6">
          <Column
            title="Yeni Sorğular"
            icon={AlertCircle}
            variant="pending"
            items={pendingRequests}
            page={pendingPage}
            setPage={setPendingPage}
            emptyText="Təsdiq gözləyən sorğu yoxdur"
          />
          <Column
            title="Təsdiq edilmiş sorğular"
            icon={CheckCircle}
            variant="approved"
            items={approvedRequests}
            page={approvedPage}
            setPage={setApprovedPage}
            emptyText="Təsdiq edilmiş sorğu yoxdur"
          />
          <Column
            title="İmtina edilmiş sorğular"
            icon={XCircle}
            variant="rejected"
            items={rejectedRequests}
            page={rejectedPage}
            setPage={setRejectedPage}
            emptyText="İmtina edilmiş sorğu yoxdur"
          />
        </div>
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <DialogTitle className="text-lg">{selectedRequest.kpiCode} - {selectedRequest.kpiName}</DialogTitle>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <p className="text-sm text-muted-foreground">{selectedRequest.description}</p>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-secondary rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-3 text-sm">KPI Məlumatları</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">KPI Kodu:</span><span className="font-medium">{selectedRequest.kpiCode}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">KPI Növü:</span><span className="font-medium">{selectedRequest.kpiType}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Hədəf:</span><span className="font-medium">{selectedRequest.target}</span></div>
                    {(() => {
                      const ds = selectedRequest.approvalChain.filter(s => s.date);
                      const respDate = ds.length ? ds[ds.length - 1].date : null;
                      const apprDate = selectedRequest.status === "approved" && ds.length ? ds[ds.length - 1].date : null;
                      return (
                        <>
                          <div className="flex justify-between"><span className="text-muted-foreground">Cavab tarixi:</span><span className="font-medium">{respDate || "—"}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Təsdiq tarixi:</span><span className="font-medium">{apprDate || "—"}</span></div>
                        </>
                      );
                    })()}
                    <div className="flex justify-between"><span className="text-muted-foreground">Yaradan:</span><span className="font-medium">{selectedRequest.createdBy}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">KPI Sahibi:</span><span className="font-medium">{selectedRequest.kpiOwner}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Struktur:</span><span className="font-medium">{selectedRequest.department}</span></div>
                  </div>
                </div>

                <div className="bg-card rounded-lg border border-border p-4">
                  <h4 className="font-semibold text-foreground mb-4 text-sm">Təsdiqləmə Zənciri</h4>
                  <div className="space-y-3">
                    {selectedRequest.approvalChain.map((step, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step.status === "approved" ? "bg-zone-green-bg text-zone-green-text" : step.status === "rejected" ? "bg-zone-red-bg text-zone-red-text" : step.status === "pending" ? "bg-zone-yellow-bg text-zone-yellow-text" : "bg-muted text-muted-foreground"}`}>
                            {step.status === "approved" ? <Check className="w-4 h-4" /> : step.status === "rejected" ? <X className="w-4 h-4" /> : i + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div><p className="text-sm font-medium text-foreground">{step.role}</p><p className="text-xs text-muted-foreground">{step.person}</p></div>
                              <div className="text-right">
                                {step.status === "approved" && <span className="text-xs text-zone-green-text">✓ Təsdiq — {step.date}</span>}
                                {step.status === "rejected" && <span className="text-xs text-zone-red-text">✗ İmtina — {step.date}</span>}
                                {step.status === "pending" && <span className="text-xs text-zone-yellow-text">⏳ Gözləyir</span>}
                                {step.status === "waiting" && <span className="text-xs text-muted-foreground">Növbədə</span>}
                              </div>
                            </div>
                          </div>
                          <button onClick={() => setSelectedStepIndex(selectedStepIndex === i ? null : i)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-secondary transition-colors shrink-0">
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${selectedStepIndex === i ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                        {selectedStepIndex === i && (
                          <div className="ml-11 mt-2 p-3 bg-secondary rounded-lg border border-border space-y-2">
                            <h5 className="text-sm font-semibold text-foreground">{step.role} təsdiqi — Mərhələ Detalları</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-muted-foreground">Təsdiqləyən:</span> <span className="font-medium text-foreground">{step.person}</span></div>
                              <div><span className="text-muted-foreground">Status:</span> <span className={`font-medium ${step.status === "approved" ? "text-zone-green-text" : step.status === "rejected" ? "text-zone-red-text" : step.status === "pending" ? "text-zone-yellow-text" : "text-muted-foreground"}`}>{step.status === "approved" ? "Təsdiq edilib" : step.status === "rejected" ? "İmtina edilib" : step.status === "pending" ? "Gözləyir" : "Növbədə"}</span></div>
                              {step.date && step.status === "approved" && <div><span className="text-muted-foreground">Təsdiq tarixi:</span> <span className="font-medium text-foreground">{step.date}</span></div>}
                              {step.date && <div><span className="text-muted-foreground">Cavab tarixi:</span> <span className="font-medium text-foreground">{step.date}</span></div>}
                            </div>
                            {step.status === "approved" && step.comment && (
                              <div className="p-2 bg-zone-green-bg rounded text-xs text-zone-green-text">
                                <span className="font-medium">Təsdiq şərhi: </span>{step.comment}
                              </div>
                            )}
                            {step.status === "rejected" && step.rejectReason && (
                              <div className="p-2 bg-zone-red-bg rounded text-xs text-zone-red-text">
                                <span className="font-medium">İmtina səbəbi: </span>{step.rejectReason}
                              </div>
                            )}
                            {step.status === "pending" && step.person === userName && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => { setShowApproveInput(true); setShowRejectInput(false); setSelectedStepIndex(null); }}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg bg-success text-success-foreground font-medium"
                                >
                                  <Check className="w-3 h-3" /> Təsdiq Et
                                </button>
                                <button
                                  onClick={() => { setShowRejectInput(true); setShowApproveInput(false); setSelectedStepIndex(null); }}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg bg-destructive text-destructive-foreground font-medium"
                                >
                                  <X className="w-3 h-3" /> İmtina Et
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                {selectedRequest.status === "pending" && selectedRequest.approvalChain[selectedRequest.currentStep]?.person === userName && (
                  <div className="space-y-3 pt-2">
                    {showApproveInput ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-foreground">Təsdiq Şərhi (ixtiyari)</label>
                          <textarea value={approveComment} onChange={e => setApproveComment(e.target.value)} placeholder="Şərh əlavə edin..." rows={2} className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background resize-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => handleApprove(selectedRequest)} className="flex-1 py-2.5 text-sm rounded-lg bg-success text-success-foreground font-medium">Təsdiq Et</button>
                          <button onClick={() => { setShowApproveInput(false); setApproveComment(""); }} className="flex-1 py-2.5 text-sm rounded-lg border border-border bg-card">Ləğv Et</button>
                        </div>
                      </div>
                    ) : showRejectInput ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-foreground">İmtina Səbəbi</label>
                          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="İmtina səbəbini yazın..." rows={3} className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background resize-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => handleReject(selectedRequest)} disabled={!rejectReason.trim()} className="flex-1 py-2.5 text-sm rounded-lg bg-destructive text-destructive-foreground font-medium disabled:opacity-50">İmtina Et</button>
                          <button onClick={() => { setShowRejectInput(false); setRejectReason(""); }} className="flex-1 py-2.5 text-sm rounded-lg border border-border bg-card">Ləğv Et</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button onClick={() => setShowApproveInput(true)} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-lg bg-success text-success-foreground font-medium">
                          <Check className="w-4 h-4" /> Təsdiq Et
                        </button>
                        <button onClick={() => setShowRejectInput(true)} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-lg bg-destructive text-destructive-foreground font-medium">
                          <X className="w-4 h-4" /> İmtina Et
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserApprovalsPage;
