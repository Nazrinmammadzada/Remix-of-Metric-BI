import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Search, Settings2, Download, CheckCircle2, XCircle, Trash2, Filter, ListChecks, UserCheck, Users, ArrowRight, ArrowLeft, Sparkles, Target, Send, Calendar as CalendarIcon, Shuffle, Hand, CalendarDays, Pencil, Star, Eye, ArrowLeftCircle } from "lucide-react";
import { getSharedKpiCards, type SharedKpiCard } from "@/lib/kpiCardStore";
import { mockStructures, mockTeams } from "@/data/mockExtras";
import { PageHero } from "@/components/ui/page-hero";
import ExportMenu from "@/components/common/ExportMenu";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCatalogValues } from "@/lib/dropdownCatalogStore";
import { Badge } from "@/components/ui/badge";
import { mockEmployees, getInitials, MockEmployee, buildPeerAssignments, CURRENT_CYCLE_ID } from "@/data/mockData";
import { toast } from "sonner";
import { getCriteria, addCriterion, removeCriterion } from "@/lib/catalogStore";
import { getScoreScale, setScoreScale, getScoreScales, addScoreScale, removeScoreScale, setDefaultScale, getDefaultScale, getScaleById, type ScoreScale } from "@/lib/evaluationConfigStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getSeasonOpen, setSeasonOpen } from "@/lib/seasonStore";
import { hasReviewerSubmitted, getReviewsForReviewee } from "@/lib/peerReviewStore";
import { getManualAssignments, addManualAssignment, removeManualAssignment, getUsedRevieweeIds, type ManualAssignment } from "@/lib/manualAssignmentsStore";
import { addSurvey } from "@/lib/evaluationSurveyStore";
import ColumnSearchHeader from "@/components/common/ColumnSearchHeader";

// =============== Survey Dialog (HR sends evaluation request to employees) ===============
const SurveyDialog = () => {
  const [open, setOpen] = useState(false);
  const [periodType, setPeriodType] = useState<"halfYear" | "annual">("halfYear");
  const [half, setHalf] = useState<"H1" | "H2">("H1");
  const [year, setYear] = useState<number>(2026);
  const [deadline, setDeadline] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);
  const [notify, setNotify] = useState(true);

  const reset = () => {
    setPeriodType("halfYear"); setHalf("H1"); setYear(2026);
    setDeadline(""); setSelected([]); setNotify(true);
  };

  const allIds = mockEmployees.map(e => e.id);
  const allSelected = selected.length === allIds.length;
  const toggleAll = () => setSelected(allSelected ? [] : allIds);
  const toggleOne = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const canSubmit = selected.length > 0 && !!deadline;

  const submit = () => {
    if (!canSubmit) return;
    addSurvey({
      periodType,
      half: periodType === "halfYear" ? half : undefined,
      year,
      deadline,
      employeeIds: selected,
      notifyEmail: notify,
    });
    toast.success("Sorğu göndərildi", {
      description: `${selected.length} əməkdaş${notify ? " · email bildirişi aktiv" : ""}`,
    });
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Qiymətləndirmə sorğusu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Qiymətləndirmə Sorğusu
          </DialogTitle>
          <DialogDescription>
            Seçilmiş əməkdaşlara qiymətləndirmə sorğusu göndərin.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Dövr</Label>
            <Select value={periodType} onValueChange={(v: "halfYear" | "annual") => setPeriodType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="halfYear">Yarımillik</SelectItem>
                <SelectItem value="annual">İllik</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {periodType === "halfYear" && (
            <div className="space-y-1.5">
              <Label>Yarımil</Label>
              <Select value={half} onValueChange={(v: "H1" | "H2") => setHalf(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="H1">1-ci yarımil</SelectItem>
                  <SelectItem value="H2">2-ci yarımil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>İl</Label>
            <Input type="number" min={2024} max={2030} value={year} onChange={e => setYear(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Son tarix *</Label>
            <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>İşçilər</Label>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-medium text-primary hover:underline"
            >
              {allSelected ? "Heç birini seçmə" : "Hamısını seç"}
            </button>
          </div>
          <div className="border border-border rounded-xl overflow-y-auto max-h-48 divide-y divide-border">
            {mockEmployees.map(e => {
              const checked = selected.includes(e.id);
              return (
                <label key={e.id} className={`flex items-center gap-3 p-2.5 cursor-pointer transition-colors ${checked ? "bg-primary/10" : "hover:bg-muted/40"}`}>
                  <Checkbox checked={checked} onCheckedChange={() => toggleOne(e.id)} />
                  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    {getInitials(e.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{e.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {e.department} — {e.position} · {e.email}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{selected.length} işçi seçildi</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <Checkbox checked={notify} onCheckedChange={(v) => setNotify(Boolean(v))} />
          <Send className="w-4 h-4 text-muted-foreground" />
          Email ilə bildiriş göndər
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Ləğv et</Button>
          <Button onClick={submit} disabled={!canSubmit} className="gap-2">
            <Send className="w-4 h-4" /> Sorğu göndər ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// =============== Manual Assignment (HR → 1 reviewer + 2 reviewees + criteria) ===============
const ManualAssignmentDialog = ({ onCreated }: { onCreated: () => void }) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [reviewerIds, setReviewerIds] = useState<string[]>([]);
  const [revieweeIds, setRevieweeIds] = useState<string[]>([]);
  const [criteriaByReviewee, setCriteriaByReviewee] = useState<Record<string, string[]>>({});
  const [scaleByReviewee, setScaleByReviewee] = useState<Record<string, string>>({});
  const [revieweeCount, setRevieweeCount] = useState<number>(2);
  const [search, setSearch] = useState("");

  const allCriteria = getCriteria();
  const allScales = getScoreScales();
  const defaultScale = getDefaultScale();
  const usedReviewees = getUsedRevieweeIds(CURRENT_CYCLE_ID);

  const reset = () => {
    setStep(1); setReviewerIds([]); setRevieweeIds([]);
    setCriteriaByReviewee({}); setScaleByReviewee({});
    setRevieweeCount(2); setSearch("");
  };

  const matchSearch = (e: MockEmployee) =>
    search.trim() === "" ||
    e.fullName.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase()) ||
    e.position.toLowerCase().includes(search.toLowerCase());

  const reviewerPool = mockEmployees.filter(matchSearch);

  // Step 2 pool: all employees searched. Reviewers shown but disabled (greyed).
  // Previously-used reviewees are also hidden.
  const revieweePool = mockEmployees.filter(e => !usedReviewees.has(e.id) && matchSearch(e));

  const toggleReviewer = (id: string) => {
    setReviewerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleReviewee = (id: string) => {
    if (reviewerIds.includes(id)) return;
    setRevieweeIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(x => x !== id);
        setCriteriaByReviewee(c => { const n = { ...c }; delete n[id]; return n; });
        setScaleByReviewee(s => { const n = { ...s }; delete n[id]; return n; });
        return next;
      }
      if (prev.length >= revieweeCount) {
        toast.error(`Maksimum ${revieweeCount} əməkdaş seçə bilərsiniz`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const performRandomPick = () => {
    const pool = revieweePool.filter(e => !reviewerIds.includes(e.id));
    const picks: string[] = [];
    const n = Math.min(revieweeCount, pool.length);
    const work = [...pool];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * work.length);
      picks.push(work[idx].id);
      work.splice(idx, 1);
    }
    setRevieweeIds(picks);
    setCriteriaByReviewee({}); setScaleByReviewee({});
    toast.success(`${picks.length} əməkdaş təsadüfi seçildi`);
  };

  const toggleCriterionFor = (revId: string, c: string) => {
    setCriteriaByReviewee(prev => {
      const cur = prev[revId] || [];
      return { ...prev, [revId]: cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c] };
    });
  };

  const setScaleFor = (revId: string, scaleId: string) => {
    setScaleByReviewee(prev => ({ ...prev, [revId]: scaleId }));
  };

  const submit = () => {
    if (reviewerIds.length === 0 || revieweeIds.length === 0) return;
    const allHave = revieweeIds.every(id => (criteriaByReviewee[id]?.length ?? 0) > 0);
    if (!allHave) return;
    // create one assignment per reviewer
    reviewerIds.forEach(rev => {
      addManualAssignment({
        reviewerId: rev,
        revieweeIds: revieweeIds,
        criteriaByReviewee,
        criteria: Array.from(new Set(revieweeIds.flatMap(id => criteriaByReviewee[id] || []))),
        scaleByReviewee,
        cycleId: CURRENT_CYCLE_ID,
      });
    });
    toast.success("Təyinat yaradıldı", {
      description: `${reviewerIds.length} qiymətləndirici × ${revieweeIds.length} əməkdaş`,
    });
    onCreated();
    setOpen(false);
    reset();
  };

  const step3Valid =
    revieweeIds.length > 0 &&
    revieweeIds.every(id => (criteriaByReviewee[id]?.length ?? 0) > 0);

  const nextDisabled =
    (step === 1 && reviewerIds.length === 0) ||
    (step === 2 && revieweeIds.length < 1) ||
    (step === 3 && !step3Valid);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-sm">
          <Sparkles className="w-4 h-4" /> Qiymətləndirən təyin et
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            Yeni Qiymətləndirən Təyinatı
          </DialogTitle>
          <DialogDescription>
            Addım-addım qiymətləndirən(lər)i, hədəf əməkdaşları və meyarları təyin edin.
          </DialogDescription>
        </DialogHeader>


        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-1">
          {[
            { n: 1, l: "Qiymətləndirici(lər)", icon: UserCheck },
            { n: 2, l: "Əməkdaşlar", icon: Users },
            { n: 3, l: "Meyarlar", icon: Target },
          ].map((s, i) => {
            const Icon = s.icon;
            const active = step === s.n;
            const done = step > s.n;
            return (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-1 transition-all ${
                  active ? "bg-primary text-primary-foreground shadow-sm" :
                  done ? "bg-primary/15 text-primary" :
                  "bg-muted/40 text-muted-foreground"
                }`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{s.n}. {s.l}</span>
                </div>
                {i < 2 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
              </div>
            );
          })}
        </div>

        {/* STEP 1: pick reviewers (MULTI) */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Qiymətləndirməni aparacaq əməkdaş(lar)ı seçin.
              </p>
              <Badge variant={reviewerIds.length > 0 ? "default" : "secondary"}>{reviewerIds.length} seçilib</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ad, departament və ya vəzifə..." className="pl-9" />
            </div>
            <div className="border border-border rounded-xl overflow-y-auto max-h-72 divide-y divide-border">
              {reviewerPool.map(e => {
                const checked = reviewerIds.includes(e.id);
                return (
                  <label key={e.id} className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${checked ? "bg-primary/10" : "hover:bg-muted/40"}`}>
                    <Checkbox checked={checked} onCheckedChange={() => toggleReviewer(e.id)} />
                    <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">{getInitials(e.fullName)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{e.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.department} — {e.position}</p>
                    </div>
                  </label>
                );
              })}
              {reviewerPool.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Tapılmadı</div>}
            </div>
          </div>
        )}

        {/* STEP 2: pick reviewees */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">
                Qiymətləndirilcək əməkdaşları seçin və ya təsadüfi təyin edin.
              </p>
              <Badge variant={revieweeIds.length >= 1 ? "default" : "secondary"}>{revieweeIds.length}/{revieweeCount}</Badge>
            </div>
            <div className="flex items-end gap-2 flex-wrap">
              <div className="space-y-1.5">
                <Label className="text-xs">Say</Label>
                <Input type="number" min={1} max={20} value={revieweeCount}
                  onChange={e => setRevieweeCount(Math.max(1, Number(e.target.value) || 1))}
                  className="w-24" />
              </div>
              <Button onClick={performRandomPick} variant="outline" className="gap-2">
                <Shuffle className="w-4 h-4" /> Təsadüfi seç
              </Button>
              <p className="text-[11px] text-muted-foreground ml-auto">
                Qiymətləndirici kimi seçilmiş şəxslər boz görünür və seçilə bilməz.
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Axtar..." className="pl-9" />
            </div>
            <div className="border border-border rounded-xl overflow-y-auto max-h-72 divide-y divide-border">
              {revieweePool.map(e => {
                const checked = revieweeIds.includes(e.id);
                const isReviewer = reviewerIds.includes(e.id);
                return (
                  <label key={e.id} className={`flex items-center gap-3 p-3 transition-colors ${
                    isReviewer ? "opacity-50 cursor-not-allowed bg-muted/20" :
                    checked ? "bg-primary/10 cursor-pointer" : "hover:bg-muted/40 cursor-pointer"
                  }`}>
                    <Checkbox checked={checked} disabled={isReviewer} onCheckedChange={() => toggleReviewee(e.id)} />
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${isReviewer ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"}`}>{getInitials(e.fullName)}</div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${isReviewer ? "text-muted-foreground italic" : "text-foreground"}`}>
                        {e.fullName}{isReviewer && " (qiymətləndirici)"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{e.department} — {e.position}</p>
                    </div>
                  </label>
                );
              })}
              {revieweePool.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Sərbəst əməkdaş yoxdur</div>}
            </div>
          </div>
        )}

        {/* STEP 3: per-reviewee criteria + scale */}
        {step === 3 && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <p className="text-sm text-muted-foreground">
              Hər əməkdaş üçün <span className="font-semibold text-foreground">vəzifəsinə uyğun</span> meyarları və bal sistemini seçin.
            </p>
            {allCriteria.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                Meyarlar kataloqu boşdur. Əvvəlcə "Meyarlar kataloqu" tabından meyar əlavə edin.
              </div>
            )}
            {revieweeIds.map(rid => {
              const emp = mockEmployees.find(e => e.id === rid);
              if (!emp) return null;
              const selectedForEmp = criteriaByReviewee[rid] || [];
              const activeScale = getScaleById(scaleByReviewee[rid]) || defaultScale;
              return (
                <div key={rid} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
                    <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">{getInitials(emp.fullName)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{emp.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.department} — {emp.position}</p>
                    </div>
                    <Badge variant={selectedForEmp.length > 0 ? "default" : "secondary"}>
                      {selectedForEmp.length} meyar
                    </Badge>
                  </div>

                  {/* Scale row */}
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-background">
                    <div className="flex items-center gap-2 min-w-0">
                      <Star className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-xs text-muted-foreground">Bal sistemi:</span>
                      <span className="text-sm font-medium text-foreground">{activeScale.label}</span>
                      <span className="text-[11px] text-muted-foreground">({activeScale.min}–{activeScale.max})</span>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 gap-1">
                          <Pencil className="w-3.5 h-3.5" /> Dəyiş
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-64 p-1">
                        <div className="max-h-60 overflow-y-auto">
                          {allScales.map(s => {
                            const isActive = activeScale.id === s.id;
                            return (
                              <button key={s.id} onClick={() => setScaleFor(rid, s.id)}
                                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-sm transition-colors ${isActive ? "bg-primary/10 text-foreground" : "hover:bg-muted/60 text-foreground"}`}>
                                <span className="flex items-center gap-2">
                                  <span className="font-medium">{s.label}</span>
                                  {s.isDefault && <Badge variant="secondary" className="h-4 text-[9px]">default</Badge>}
                                </span>
                                <span className="text-[11px] text-muted-foreground">{s.min}–{s.max}</span>
                              </button>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {allCriteria.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                      {allCriteria.map(c => {
                        const checked = selectedForEmp.includes(c);
                        return (
                          <label key={c} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${checked ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}>
                            <Checkbox checked={checked} onCheckedChange={() => toggleCriterionFor(rid, c)} />
                            <span className="text-sm text-foreground">{c}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="flex !justify-between">
          <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1) as 1 | 2 | 3)} disabled={step === 1} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Geri
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)} disabled={nextDisabled} className="gap-1">
              Növbəti <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={nextDisabled} className="gap-1">
              <CheckCircle2 className="w-4 h-4" /> Qiymətləndirəni təyin et
            </Button>
          )}
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};


// =============== Manual Assignments List ===============
const AssignmentsTab = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const r = () => force(t => t + 1);
    window.addEventListener("manual-assignments-updated", r);
    return () => window.removeEventListener("manual-assignments-updated", r);
  }, []);
  const items = getManualAssignments().filter(a => a.cycleId === CURRENT_CYCLE_ID);

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Hələ qiymətləndirən yoxdur</p>
          <p className="text-xs text-muted-foreground mt-1">Yuxarıdakı "Qiymətləndirən təyin et" düyməsindən başlayın</p>
        </div>

      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(a => {
            const reviewer = mockEmployees.find(e => e.id === a.reviewerId);
            const reviewees = a.revieweeIds.map(id => mockEmployees.find(e => e.id === id)).filter(Boolean) as MockEmployee[];
            return (
              <div key={a.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                      {reviewer ? getInitials(reviewer.fullName) : "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{reviewer?.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{reviewer?.position}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { removeManualAssignment(a.id); toast.success("Silindi"); }}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 font-semibold">Qiymətləndirəcək (meyarlarla)</div>
                <div className="space-y-3">
                  {reviewees.map(r => {
                    const perCrit = a.criteriaByReviewee?.[r.id] ?? a.criteria ?? [];
                    return (
                      <div key={r.id} className="rounded-lg bg-muted/40 border border-border p-2.5 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold">{getInitials(r.fullName)}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground truncate">{r.fullName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{r.position}</p>
                          </div>
                          <Badge variant="secondary" className="text-[10px] h-5">{perCrit.length}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {perCrit.map(c => (
                            <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{c}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// =============== Criteria catalog ===============
const CriteriaTab = () => {
  const [, force] = useState(0);
  const [val, setVal] = useState("");
  useEffect(() => {
    const r = () => force(t => t + 1);
    window.addEventListener("catalog-updated", r);
    return () => window.removeEventListener("catalog-updated", r);
  }, []);
  const items = getCriteria();
  const submit = () => {
    if (!val.trim()) return;
    addCriterion(val.trim());
    toast.success("Meyar əlavə edildi");
    setVal("");
  };
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden max-w-2xl">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/30">
        <ListChecks className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">Qiymətləndirmə meyarları</h3>
        <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <Input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="məs: Liderlik" />
          <Button onClick={submit} className="gap-1"><Plus className="w-4 h-4" /> Əlavə et</Button>
        </div>
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Boşdur</p>}
          {items.map(it => (
            <div key={it} className="flex items-center justify-between px-3 py-2 text-sm rounded-lg border border-border bg-background">
              <span className="text-foreground">{it}</span>
              <button onClick={() => { removeCriterion(it); toast.success("Silindi"); }} className="p-1 rounded hover:bg-destructive/10">
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SettingsTab = () => {
  const [scales, setScales] = useState<ScoreScale[]>(getScoreScales());
  const [newMin, setNewMin] = useState<number>(1);
  const [newMax, setNewMax] = useState<number>(10);
  const [newLabel, setNewLabel] = useState<string>("");

  useEffect(() => {
    const r = () => setScales(getScoreScales());
    window.addEventListener("eval-config-updated", r);
    return () => window.removeEventListener("eval-config-updated", r);
  }, []);

  const handleAdd = () => {
    if (newMin >= newMax) { toast.error("Min < Max olmalıdır"); return; }
    if (scales.some(s => s.min === newMin && s.max === newMax)) {
      toast.error("Bu aralıq artıq mövcuddur"); return;
    }
    addScoreScale({
      label: newLabel.trim() || `${newMin} – ${newMax}`,
      min: newMin, max: newMax,
    });
    setNewLabel("");
    toast.success("Yeni bal aralığı əlavə olundu");
  };

  const handleMakeDefault = (id: string) => {
    setDefaultScale(id);
    toast.success("Default bal aralığı yeniləndi");
  };

  const handleRemove = (id: string) => {
    if (scales.length <= 1) { toast.error("Ən azı bir aralıq qalmalıdır"); return; }
    removeScoreScale(id);
    toast.success("Silindi");
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Bal aralıqları</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Default aralıq təyinat yaradılarkən hər əməkdaş üçün avtomatik tətbiq olunur. Lazım gəldikdə qiymətləndirici hər əməkdaş üçün başqa aralıq seçə bilər.
        </p>

        <div className="space-y-2">
          {scales.map(s => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <Star className={`w-4 h-4 ${s.isDefault ? "text-primary fill-primary" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{s.label}</span>
                  {s.isDefault && <Badge variant="default" className="h-5 text-[10px]">Default</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">Aralıq: {s.min} – {s.max}</p>
              </div>
              {!s.isDefault && (
                <Button variant="outline" size="sm" onClick={() => handleMakeDefault(s.id)}>
                  Default et
                </Button>
              )}
              {!s.isDefault && (
                <Button variant="ghost" size="sm" onClick={() => handleRemove(s.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Yeni bal aralığı əlavə et</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Min</Label>
            <Input type="number" value={newMin} onChange={e => setNewMin(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Max</Label>
            <Input type="number" value={newMax} onChange={e => setNewMax(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Ad (ixtiyari)</Label>
            <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder={`${newMin} – ${newMax}`} />
          </div>
        </div>
        <Button onClick={handleAdd} className="gap-1"><Plus className="w-4 h-4" /> Əlavə et</Button>
      </div>
    </div>
  );
};


// =============== Status İzləmə — 3 sub-tab (Fərdi / Komanda / Struktur) ===============
// (imports moved to top)

type StatusScope = "individual" | "team" | "structure";

interface StatusGroup {
  key: string;
  name: string;
  subtitle?: string;
  cards: SharedKpiCard[];
  goalCount: number;
  members?: { id: string; name: string; position?: string }[];
}

const hash = (s: string) => {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const employeeName = (id: string): string => {
  const e = mockEmployees.find(x => x.id === id);
  return e?.fullName || id;
};
const employeePosition = (id: string): string => {
  const e = mockEmployees.find(x => x.id === id);
  return e?.position || "";
};

const buildGroups = (scope: StatusScope): StatusGroup[] => {
  const cards = getSharedKpiCards().filter(c => c.status !== "imtina");
  if (scope === "individual") {
    // Fərdi: teamIds && structureIds boş olan kartlar
    const map = new Map<string, StatusGroup>();
    cards.filter(c => (!c.teamIds || c.teamIds.length === 0) && (!c.structureIds || c.structureIds.length === 0))
      .forEach(c => {
        c.assigneeIds.forEach(aid => {
          const g = map.get(aid) || { key: aid, name: employeeName(aid), subtitle: employeePosition(aid), cards: [], goalCount: 0 };
          g.cards.push(c);
          g.goalCount += c.targets.length;
          map.set(aid, g);
        });
      });
    return Array.from(map.values());
  }
  if (scope === "team") {
    const map = new Map<string, StatusGroup>();
    cards.filter(c => c.teamIds && c.teamIds.length > 0).forEach(c => {
      c.teamIds.forEach(tid => {
        const team = mockTeams.find(t => t.id === tid);
        const g = map.get(tid) || {
          key: tid,
          name: team?.name || tid,
          subtitle: team ? `${team.memberIds.length} üzv` : undefined,
          cards: [], goalCount: 0,
          members: team?.memberIds.map(mid => ({ id: mid, name: employeeName(mid), position: employeePosition(mid) })),
        };
        g.cards.push(c);
        g.goalCount += c.targets.length;
        map.set(tid, g);
      });
    });
    return Array.from(map.values());
  }
  // structure
  const map = new Map<string, StatusGroup>();
  cards.filter(c => c.structureIds && c.structureIds.length > 0).forEach(c => {
    c.structureIds.forEach(sid => {
      const st = mockStructures.find(s => s.id === sid);
      const members = mockTeams.filter(t => t.structureId === sid).flatMap(t => t.memberIds);
      const uniqueMembers = Array.from(new Set(members));
      const g = map.get(sid) || {
        key: sid,
        name: st?.name || sid,
        subtitle: `${uniqueMembers.length} əməkdaş`,
        cards: [], goalCount: 0,
        members: uniqueMembers.map(mid => ({ id: mid, name: employeeName(mid), position: employeePosition(mid) })),
      };
      g.cards.push(c);
      g.goalCount += c.targets.length;
      map.set(sid, g);
    });
  });
  return Array.from(map.values());
};

// ---------- Multi-rater evaluation row ----------
interface RaterEval {
  evaluatorId: string;
  score: number | null;
  max: number;
  date: string | null;
  done: boolean;
}

const buildRaters = (seed: string, evaluatorIds: string[], scoreLimit: number): RaterEval[] => {
  return evaluatorIds.map((eid, ei) => {
    const h = hash(seed + eid);
    const done = (h + ei) % 4 !== 0; // ~75% completed
    const score = done ? 1 + (h % scoreLimit) : null;
    const day = 5 + (h % 22);
    return {
      evaluatorId: eid,
      score,
      max: scoreLimit,
      date: done ? `2026-01-${String(day).padStart(2, "0")}` : null,
      done,
    };
  });
};

const finalScore = (raters: RaterEval[]): number | null => {
  const done = raters.filter(r => r.done && r.score !== null);
  if (done.length === 0) return null;
  return Math.round((done.reduce((s, r) => s + (r.score! / r.max) * 5, 0) / done.length) * 10) / 10;
};

const RaterList = ({ raters }: { raters: RaterEval[] }) => (
  <div className="space-y-1.5">
    {raters.map((r, i) => (
      <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2">
        <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
          {getInitials(employeeName(r.evaluatorId))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground truncate">{employeeName(r.evaluatorId)}</p>
          <p className="text-[10px] text-muted-foreground truncate">{employeePosition(r.evaluatorId)}</p>
        </div>
        {r.done ? (
          <>
            <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/20 h-6">
              <Star className="w-3 h-3" /> {r.score}/{r.max}
            </Badge>
            <span className="text-[10px] text-muted-foreground shrink-0">{r.date}</span>
            <Badge variant="secondary" className="gap-1 h-6"><CheckCircle2 className="w-3 h-3 text-primary" /> Qiymətləndirib</Badge>
          </>
        ) : (
          <Badge variant="secondary" className="gap-1 h-6"><XCircle className="w-3 h-3" /> Gözləyir</Badge>
        )}
      </div>
    ))}
  </div>
);

const GroupDetailDialog = ({ group, scope, onClose }: { group: StatusGroup | null; scope: StatusScope; onClose: () => void }) => {
  const [section, setSection] = useState<"goals" | "competencies">("goals");
  const [showMembers, setShowMembers] = useState(false);
  useEffect(() => {
    setSection("goals");
    setShowMembers(false);
  }, [group?.key]);
  if (!group) return null;

  // Competencies from the criteria catalog
  const competencies = getCriteria().slice(0, 6);

  // Deterministic set of "evaluators" per group. For individual, use card.evaluatorIds
  // + a couple of extra people so multi-rater is visible on at least one item.
  const extraEvaluatorPool = mockEmployees.filter(e => e.id !== group.key).map(e => e.id);
  const groupExtraEvaluators = (n: number): string[] => {
    const h = hash(group.key);
    return Array.from({ length: n }, (_, i) => extraEvaluatorPool[(h + i * 7) % extraEvaluatorPool.length]);
  };

  return (
    <Dialog open={!!group} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            {group.name}
          </DialogTitle>
          <DialogDescription>
            {group.cards.length} KPI kartı · {group.goalCount} hədəf
            {group.subtitle && ` · ${group.subtitle}`}
          </DialogDescription>
        </DialogHeader>

        {/* Section switcher (Goals / Competencies) + members button */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 border border-border rounded-xl bg-card p-1 w-fit">
            {[
              { k: "goals" as const, l: "Hədəflər", icon: Target },
              { k: "competencies" as const, l: "Səriştələr", icon: Sparkles },
            ].map(t => {
              const Icon = t.icon;
              const active = section === t.k;
              return (
                <button key={t.k} onClick={() => setSection(t.k)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  <Icon className="w-3.5 h-3.5" /> {t.l}
                </button>
              );
            })}
          </div>
          {scope !== "individual" && group.members && group.members.length > 0 && (
            <button onClick={() => setShowMembers(v => !v)}
              className="text-[11px] text-primary hover:underline">
              {showMembers ? "Qiymətləndirmələrə qayıt" : scope === "team" ? "Komanda üzvlərinə bax" : "Strukturdakı əməkdaşlar"}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {showMembers ? (
            <div className="border border-border rounded-xl divide-y divide-border">
              {group.members?.map(m => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">{getInitials(m.name)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{m.position}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : section === "goals" ? (
            group.cards.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">Kart yoxdur</div>
            ) : group.cards.map(card => (
              <div key={card.id} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <p className="text-sm font-semibold text-foreground">{card.name}</p>
                  <p className="text-[11px] text-muted-foreground">Dövr: {card.startDate} — {card.endDate}</p>
                </div>
                <div className="divide-y divide-border">
                  {card.targets.map((t, ti) => {
                    // Multi-rater: use card.evaluatorIds, and on first target of first card,
                    // inject 2 extras so multi-rater (3 evaluators) is visible.
                    const base = card.evaluatorIds.length > 0 ? card.evaluatorIds : [card.ownerId];
                    const evalIds = ti === 0 && card === group.cards[0]
                      ? Array.from(new Set([...base, ...groupExtraEvaluators(2)]))
                      : base;
                    const raters = buildRaters(card.id + t.id, evalIds, t.scoreLimit);
                    const finalS = finalScore(raters);
                    const h = hash(card.id + t.id);
                    const actual = 60 + (h % 60); // 60..119
                    return (
                      <div key={t.id} className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{t.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {t.type} · çəki {t.weight}% · nəticə {actual}%
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="h-6">Qiymətləndirən: {raters.length}</Badge>
                            <Badge className={`h-6 gap-1 ${finalS !== null ? "bg-primary/15 text-primary hover:bg-primary/20" : ""}`} variant={finalS !== null ? "default" : "secondary"}>
                              <Star className="w-3 h-3" /> Yekun: {finalS !== null ? `${finalS}/5` : "—"}
                            </Badge>
                          </div>
                        </div>
                        <RaterList raters={raters} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <p className="text-sm font-semibold text-foreground">Səriştələr</p>
                <p className="text-[11px] text-muted-foreground">Hər səriştə üzrə qiymətləndirənlər və verilən ballar</p>
              </div>
              <div className="divide-y divide-border">
                {competencies.map((c, ci) => {
                  const base = group.cards[0]?.evaluatorIds && group.cards[0].evaluatorIds.length > 0
                    ? group.cards[0].evaluatorIds
                    : [group.cards[0]?.ownerId || "e1"];
                  // First competency shown with 3 evaluators to demonstrate multi-rater
                  const evalIds = ci === 0
                    ? Array.from(new Set([...base, ...groupExtraEvaluators(2)]))
                    : base;
                  const raters = buildRaters(group.key + "-comp-" + c, evalIds, 5);
                  const finalS = finalScore(raters);
                  return (
                    <div key={c} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{c}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="h-6">Qiymətləndirən: {raters.length}</Badge>
                          <Badge className={`h-6 gap-1 ${finalS !== null ? "bg-primary/15 text-primary hover:bg-primary/20" : ""}`} variant={finalS !== null ? "default" : "secondary"}>
                            <Star className="w-3 h-3" /> Yekun: {finalS !== null ? `${finalS}/5` : "—"}
                          </Badge>
                        </div>
                      </div>
                      <RaterList raters={raters} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bağla</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const StatusTab = () => {
  const [subTab, setSubTab] = useState<StatusScope>("individual");
  const [search, setSearch] = useState("");
  const [openGroup, setOpenGroup] = useState<StatusGroup | null>(null);
  const [, force] = useState(0);
  useEffect(() => {
    const r = () => force(t => t + 1);
    window.addEventListener("shared-kpi-cards-updated", r);
    return () => window.removeEventListener("shared-kpi-cards-updated", r);
  }, []);
  const groups = useMemo(() => buildGroups(subTab), [subTab]);
  const filtered = groups.filter(g => !search.trim() || g.name.toLowerCase().includes(search.toLowerCase()));

  const label = subTab === "individual" ? "Əməkdaş" : subTab === "team" ? "Komanda" : "Struktur";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border border-border rounded-xl bg-card p-1 w-fit">
        {[
          { k: "individual" as const, l: "Fərdi", icon: UserCheck },
          { k: "team" as const, l: "Komanda", icon: Users },
          { k: "structure" as const, l: "Struktur", icon: ListChecks },
        ].map(t => {
          const Icon = t.icon;
          const active = subTab === t.k;
          return (
            <button key={t.k} onClick={() => setSubTab(t.k)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="w-4 h-4" /> {t.l}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={`${label} axtar...`} className="pl-9 w-64" />
        </div>
        <Badge variant="secondary" className="ml-auto">{filtered.length} nəticə</Badge>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">{label} adı</th>
              {subTab === "individual" && <th className="px-4 py-3 text-left">Vəzifə</th>}
              <th className="px-4 py-3 text-left">KPI kartlarının sayı</th>
              <th className="px-4 py-3 text-left">Hədəflərin sayı</th>
              <th className="px-4 py-3 text-right">Bax</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(g => (
              <tr key={g.key} className="border-t border-border hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                      {getInitials(g.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{g.name}</p>
                      {subTab !== "individual" && g.subtitle && (
                        <p className="text-[11px] text-muted-foreground">{g.subtitle}</p>
                      )}
                    </div>
                  </div>
                </td>
                {subTab === "individual" && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">{g.subtitle || "—"}</td>
                )}
                <td className="px-4 py-3">
                  <Badge variant="secondary">{g.cards.length}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{g.goalCount}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => setOpenGroup(g)}>
                    <Eye className="w-4 h-4" /> Bax
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={subTab === "individual" ? 5 : 4} className="px-4 py-10 text-center text-muted-foreground text-sm">Nəticə yoxdur</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <GroupDetailDialog group={openGroup} scope={subTab} onClose={() => setOpenGroup(null)} />
    </div>
  );
};


const SeasonToggle = () => {
  const [open, setOpen] = useState(getSeasonOpen());
  const [confirm, setConfirm] = useState<null | boolean>(null);
  useEffect(() => {
    const r = () => setOpen(getSeasonOpen());
    window.addEventListener("season-updated", r);
    return () => window.removeEventListener("season-updated", r);
  }, []);
  const apply = () => {
    if (confirm === null) return;
    setSeasonOpen(confirm);
    toast.success(confirm ? "Qiymətləndirmə dövrü açıldı" : "Qiymətləndirmə dövrü bağlandı");
    setConfirm(null);
  };
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card">
        <span className={`text-xs font-medium ${open ? "text-primary" : "text-muted-foreground"}`}>
          Dövr: {open ? "Açıq" : "Bağlı"}
        </span>
        <Switch checked={open} onCheckedChange={(v) => setConfirm(Boolean(v))} />
      </div>
      <AlertDialog open={confirm !== null} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm ? "Dövrü açmaq istəyirsiniz?" : "Dövrü bağlamaq istəyirsiniz?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm
                ? "Bu dövrdə əməkdaşlar bir-birini qiymətləndirə biləcək."
                : "Dövr bağlanarsa, yeni qiymətləndirmələr qəbul edilməyəcək."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ləğv et</AlertDialogCancel>
            <AlertDialogAction onClick={apply}>Təsdiq et</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

type EvalSection = "teyinat" | "status" | "kataloq" | "parametr";

const SECTIONS: { k: EvalSection; l: string; desc: string; icon: any; accent: string }[] = [
  { k: "teyinat",  l: "Qiymətləndirənlər", desc: "Qiymətləndirənləri təyin edin və idarə edin", icon: UserCheck,     accent: "from-primary/15 to-primary/5 text-primary" },
  { k: "status",   l: "Status izləmə",     desc: "Fərdi, komanda və struktur üzrə status",       icon: ListChecks,    accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-600" },
  { k: "kataloq",  l: "Meyarlar kataloqu", desc: "Qiymətləndirmə meyarlarını idarə edin",        icon: ClipboardList, accent: "from-amber-500/15 to-amber-500/5 text-amber-600" },
  { k: "parametr", l: "Parametrlər",       desc: "Bal aralıqları və digər parametrlər",          icon: Settings2,     accent: "from-sky-500/15 to-sky-500/5 text-sky-600" },
];

const EvaluationPage = () => {
  const [section, setSection] = useState<EvalSection | null>(null);
  const [, force] = useState(0);
  const active = SECTIONS.find(s => s.k === section);
  return (
    <div className="min-h-screen">
      <Header title="Qiymətləndirmə" />
      <div className="p-6">
      <PageHero
        badge="HR · Qiymətləndirmə"
        title="Qiymətləndirmə"
        subtitle="Qiymətləndirənləri təyin edin, meyarlar kataloqunu idarə edin və statusu izləyin."
        icon={ClipboardList}
        right={
          <div className="flex items-center gap-2">
            <ExportMenu
              getData={() => ({
                title: `Qiymətləndirənlər (${CURRENT_CYCLE_ID})`,
                headers: ["Ad", "Departament", "Vəzifə"],
                rows: mockEmployees.map(e => [e.fullName, e.department, e.position]),
                fileName: `qiymetlendirenler-${CURRENT_CYCLE_ID}`,
              })}
            />
            <ManualAssignmentDialog onCreated={() => force(t => t + 1)} />
          </div>
        }
      />

      {section === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.k} onClick={() => setSection(s.k)}
                className={`group text-left rounded-2xl border border-border bg-gradient-to-br ${s.accent} p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-11 h-11 rounded-xl bg-background/70 backdrop-blur flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-60 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-base font-semibold text-foreground">{s.l}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setSection(null)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeftCircle className="w-4 h-4" /> Bütün bölmələr
            </button>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
              {SECTIONS.map(s => {
                const activeK = section === s.k;
                return (
                  <button key={s.k} onClick={() => setSection(s.k)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeK ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {s.l}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3 mb-2">
            {active?.icon && <active.icon className="w-5 h-5 text-primary" />}
            <h2 className="text-lg font-semibold text-foreground">{active?.l}</h2>
          </div>
          {section === "teyinat" && <AssignmentsTab />}
          {section === "status" && <StatusTab />}
          {section === "kataloq" && <CriteriaTab />}
          {section === "parametr" && <SettingsTab />}
        </div>
      )}
      </div>
    </div>
  );
};

export default EvaluationPage;
