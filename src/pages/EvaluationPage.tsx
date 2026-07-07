import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Search, Settings2, Download, CheckCircle2, XCircle, Trash2, Filter, ListChecks, UserCheck, Users, ArrowRight, ArrowLeft, Sparkles, Target, Send, Calendar as CalendarIcon, Shuffle, Hand, CalendarDays, Pencil, Star } from "lucide-react";
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
          <p className="text-sm font-medium text-foreground">Hələ təyinat yoxdur</p>
          <p className="text-xs text-muted-foreground mt-1">Yuxarıdakı "Təyinat yarat" düyməsindən başlayın</p>
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


const StatusTab = () => {
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const evalStatusLabels = useCatalogValues("evaluation_statuses", ["Tamamlanıb", "Gözləyir"]);
  const [search, setSearch] = useState("");
  const [cf, setCf] = useState<Record<string, string>>({});
  const setCol = (k: string, v: string) => setCf(p => ({ ...p, [k]: v }));

  const assignments = useMemo(() => buildPeerAssignments(CURRENT_CYCLE_ID), []);
  const rows = useMemo(() => {
    return mockEmployees
      .filter(e => assignments[e.id]?.length > 0)
      .map(e => {
        const submitted = hasReviewerSubmitted(e.id, CURRENT_CYCLE_ID);
        return { ...e, submitted, peers: assignments[e.id] };
      });
  }, [assignments]);

  const departments = Array.from(new Set(mockEmployees.map(e => e.department)));

  const filtered = rows.filter(r => {
    if (deptFilter !== "all" && r.department !== deptFilter) return false;
    if (statusFilter === "done" && !r.submitted) return false;
    if (statusFilter === "pending" && r.submitted) return false;
    if (search && !r.fullName.toLowerCase().includes(search.toLowerCase())) return false;
    const l = (s: string) => s.toLowerCase();
    if (cf.name && !l(r.fullName).includes(l(cf.name))) return false;
    if (cf.dept && !l(r.department).includes(l(cf.dept))) return false;
    if (cf.status) {
      const st = r.submitted ? "tamamlanıb" : "gözləyir";
      if (!st.includes(l(cf.status))) return false;
    }
    return true;
  });

  const buildExportData = () => ({
    title: `Qiymətləndirmə statusu (${CURRENT_CYCLE_ID})`,
    headers: ["Ad", "Departament", "Vəzifə", "Status", "Həmkar 1", "Həmkar 2", "Aldığı qiymətlər"],
    rows: filtered.map(r => {
      const reviews = getReviewsForReviewee(r.id, CURRENT_CYCLE_ID);
      return [
        r.fullName, r.department, r.position,
        r.submitted ? "Tamamlanıb" : "Gözləyir",
        r.peers[0]?.fullName || "",
        r.peers[1]?.fullName || "",
        reviews.length,
      ];
    }),
    fileName: `qiymetlendirme-${CURRENT_CYCLE_ID}`,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ad axtar..." className="pl-9 w-56" />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-44"><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün departamentlər</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün statuslar</SelectItem>
            <SelectItem value="done">{evalStatusLabels[0] ?? "Tamamlanıb"}</SelectItem>
            <SelectItem value="pending">{evalStatusLabels[1] ?? "Gözləyir"}</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <ExportMenu getData={buildExportData} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th data-col="name" className="px-4 py-3 text-left align-top"><ColumnSearchHeader label="Qiymətləndirilən əməkdaş" value={cf.name || ""} onChange={v => setCol("name", v)} /></th>
              <th data-col="dept" className="px-4 py-3 text-left align-top"><ColumnSearchHeader label="Departament" value={cf.dept || ""} onChange={v => setCol("dept", v)} /></th>
              <th data-col="peer360" className="px-4 py-3 text-left">360 üzrə təyin olunmuş həmkarlar</th>
              <th data-col="peerTarget" className="px-4 py-3 text-left">Hədəf üzrə təyin olunmuş həmkarlar</th>
              <th data-col="status" className="px-4 py-3 text-left align-top"><ColumnSearchHeader label="Status" value={cf.status || ""} onChange={v => setCol("status", v)} /></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => {
              // Mock target evaluators based on index — some completed, some pending
              const targetEvaluators = [
                { name: "Samir Həsənov", done: idx % 2 === 0 },
                { name: "Leyla Məmmədova", done: idx % 3 !== 0 },
              ];
              const peerStatuses = r.peers.map((p, i) => ({ name: p.fullName, done: (idx + i) % 2 === 0 }));
              const allDone = peerStatuses.every(p => p.done) && targetEvaluators.every(t => t.done);
              return (
              <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                <td data-col="name" className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">{getInitials(r.fullName)}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{r.fullName}</p>
                      <p className="text-xs text-muted-foreground">{r.position}</p>
                    </div>
                  </div>
                </td>
                <td data-col="dept" className="px-4 py-3 text-xs text-muted-foreground">{r.department}</td>
                <td data-col="peer360" className="px-4 py-3 text-xs">
                  <div className="space-y-1">
                    {peerStatuses.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${p.done ? "bg-success" : "bg-destructive"}`} />
                        <span className="text-foreground">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td data-col="peerTarget" className="px-4 py-3 text-xs">
                  <div className="space-y-1">
                    {targetEvaluators.map((t, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${t.done ? "bg-success" : "bg-destructive"}`} />
                        <span className="text-foreground">{t.name}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td data-col="status" className="px-4 py-3">
                  {allDone ? (
                    <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/20"><CheckCircle2 className="w-3 h-3" /> Tamamlanıb</Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1"><XCircle className="w-3 h-3" /> Gözləyir</Badge>
                  )}
                </td>
              </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">Nəticə yoxdur</td></tr>
            )}
          </tbody>
        </table>
      </div>
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

const EvaluationPage = () => {
  const [tab, setTab] = useState<"teyinat" | "status" | "kataloq" | "parametr">("teyinat");
  const [, force] = useState(0);
  return (
    <div className="min-h-screen">
      <Header title="Qiymətləndirmə" />
      <div className="p-6">
      <PageHero
        badge="HR · Qiymətləndirmə"
        title="Qiymətləndirmə"
        subtitle="Qiymətləndirici və hədəf əməkdaşları HR təyin edir, meyarlar kataloqdan seçilir."
        icon={ClipboardList}
        right={
          <div className="flex items-center gap-2">
            <ExportMenu
              getData={() => ({
                title: `Qiymətləndirmə təyinatları (${CURRENT_CYCLE_ID})`,
                headers: ["Ad", "Departament", "Vəzifə"],
                rows: mockEmployees.map(e => [e.fullName, e.department, e.position]),
                fileName: `qiymetlendirme-teyinat-${CURRENT_CYCLE_ID}`,
              })}
            />
            <ManualAssignmentDialog onCreated={() => force(t => t + 1)} />
          </div>
        }
      />

      <div className="flex gap-1 border-b border-border mb-6">
        {[
          { k: "teyinat", l: "Təyinatlar" },
          { k: "status", l: "Status izləmə" },
          { k: "kataloq", l: "Meyarlar kataloqu" },
          { k: "parametr", l: "Parametrlər" },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as typeof tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t.k ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === "teyinat" && <AssignmentsTab />}
      {tab === "status" && <StatusTab />}
      {tab === "kataloq" && <CriteriaTab />}
      {tab === "parametr" && <SettingsTab />}
      </div>
    </div>
  );
};

export default EvaluationPage;
