import { useEffect, useMemo, useRef, useState } from "react";

const hashStrLocal = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
};
import Header from "@/components/layout/Header";
import { Target, TrendingUp, Users, CheckCircle, Lightbulb, Settings2, Search, Download, Plus, X, Calendar, User, Clock, ArrowUp, ArrowDown, GripVertical, Check, Hourglass, CheckCircle2, Trash2, Info, ChevronDown, Pencil, ShieldCheck, AlertTriangle, Sparkles, UserCheck, Shuffle, UserCog, UserPlus, Sliders } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PeriodPicker, { type PeriodValue } from "@/components/kpi/PeriodPicker";
import TeamMultiSelect from "@/components/kpi/TeamMultiSelect";
import FilterTeamSelect from "@/components/kpi/FilterTeamSelect";
import { getTeams } from "@/lib/teamsStore";
import { validateTarget, getTargetPlaceholder, getTargetUnitSuffix } from "@/lib/kpiValidation";
import { getApprovalMatrices, getDeletionMatrix, addDeletionRequest, getDeletedKpiIds, formatAssignee, formatUserWithRole, type ApprovalMatrix } from "@/lib/matrixStore";
import { getStructures, findStructureById, findOccupantsByPosition, getEmployees, type OrgStructure } from "@/lib/orgStore";
import { getPositions } from "@/lib/catalogStore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import KpiExtraTabContent, { isExtraTab } from "@/components/kpi/KpiExtraTabs";
import BscScorecardTab from "@/components/kpi/BscScorecardTab";
import { useCatalogValues } from "@/lib/dropdownCatalogStore";
import { getFormulas } from "@/lib/formulasStore";
import ExportMenu from "@/components/common/ExportMenu";
import { LayoutGrid, List, Briefcase, Copy, Eye, Send } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import ScoreLimitsDialog from "@/components/kpi/ScoreLimitsDialog";
import { getLimitsFor, getEntriesForCard, addPendingEntry, suggestLimitsFromTarget, type LimitSet, type ScoreDescRow } from "@/lib/kpiSetStore";
import LifecycleWizardStep from "@/components/kpi/LifecycleWizardStep";
import LifecycleView from "@/components/kpi/LifecycleView";
import { setCardLifecycle, emptyLifecycleDraft, getLifecycle, getLifecycleWithFallback, type CardLifecycle } from "@/lib/kpiLifecycleStore";
import CreateKpiWizard, { type CreateKpiWizardDraft } from "@/components/kpi/CreateKpiWizard";
import EmployeesTreeView from "@/components/kpi/EmployeesTreeView";
import { upsertStatus } from "@/lib/kpiCardStatusStore";
import { buildSharedCardFromDraft, upsertSharedKpiCard, useSharedKpiCards, type SharedKpiCard } from "@/lib/kpiCardStore";
import { withKartSuffix } from "@/lib/utils";
import { WeightInput } from "@/components/kpi/WeightInput";
import { findRootByGoal, createRoot } from "@/lib/cascadeTreeStore";
import { enqueueApproval } from "@/lib/approvalsStore";
import { getCurrentEmployeeId } from "@/lib/scope";

const STATUS_LABELS = {
  qaralama: "Qaralama", natamam: "Natamam", tesdiq_gozlenilir: "Təsdiq gözlənilir",
  imtina: "İmtina", aktiv: "Aktiv", qiymetlendirme: "Qiymətləndirmə",
  tamamlanib: "Tamamlanıb", legv_olundu: "Ləğv olundu",
} as const;
const STATUS_STYLES: Record<string, string> = {
  qaralama: "bg-slate-200 text-slate-700 border-slate-300",
  natamam: "bg-muted text-muted-foreground border-border",
  tesdiq_gozlenilir: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  imtina: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  aktiv: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  qiymetlendirme: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  tamamlanib: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
  legv_olundu: "bg-slate-800 text-slate-100 border-slate-900",
};

interface EvaluatorPerson { name: string; weight: number; }
interface EvaluatorConfig {
  type: "team" | "person" | "self" | "integration" | null;
  teamId?: number | null;
  persons: EvaluatorPerson[];
  randomCount?: number;
  integrationName?: string;
  integrationWeight?: number;
  integrationFields?: string[];
}

interface SubKpi {
  id: number;
  name: string;
  target: string;
  weight: number;
  current?: string;
  progress?: number;
  unit?: string;
  /** Təyinedici (assigner) üçün ayrı vahid. Boş olarsa qiymətləndiricinin vahidi istifadə olunur. */
  assignerUnit?: string;
  evaluator?: EvaluatorConfig;
  /** Hədəf-nın təyin ediləcəyini kim həll edir: "self" — KPI sahibi özü, "other" — başqa əməkdaş */
  assignerMode?: "self" | "other";
  /** "other" rejimində seçilmiş təyin edən şəxs */
  assigner?: string;
  /** "other" rejimində min/max çəki — verildikdə təyin edən bu aralıqda dəyər yazmalıdır */
  weightMin?: number;
  weightMax?: number;
  /** Wizard-dan gələn qiymət limitləri (Balanced Scorecard-da göstərilir) */
  limits?: LimitSet;
  /** Qiymət-təsvir sətirləri (İcra / Fərdi İnkişaf / Zaman) */
  scoreDescriptions?: ScoreDescRow[];
}

interface KpiCard {
  id: number;
  name: string;
  icon: any;
  zone: "green" | "yellow" | "red";
  target: string;
  current: string;
  unit: string;
  progress: number;
  minTarget: number;
  responsible: string;
  period: string;
  type: string;
  formula: string;
  generalTarget?: string;
  department: string;
  group: string;
  subdivision: string;
  startDate: string;
  endDate: string;
  frequency: string;
  team: { name: string; role: string; avatar: string }[];
  history: { date: string; value: string; change: number }[];
  description: string;
  weight: number;
  approvalStatus: "pending" | "approved";
  subKpis?: SubKpi[];
  isPersonal?: boolean;
  frozen?: boolean;
  /** Təsdiqləmə matrisinin id-si (varsa) — "Təsdiqləmə Zənciri" tabının göstərilməsini idarə edir */
  matrixId?: string | null;
}

const initialKpiCards: KpiCard[] = [
  {
    id: 1, name: "Aylıq Satış Hədəfi", icon: Target, zone: "green", target: "5M", current: "4.2M", unit: "AZN", progress: 84, minTarget: 60,
    responsible: "Samir Həsənov", period: "2026 - Aylıq", type: "Absolut Hədəf", formula: "Cari Satış / Hədəf Satış × 100", generalTarget: "5M AZN",
    department: "Satış Departamenti", group: "Bakı Satış Qrupu", subdivision: "Satış Şöbəsi",
    startDate: "01.01.2026", endDate: "31.01.2026", frequency: "Aylıq", weight: 30, approvalStatus: "approved", matrixId: "matrix-standard",
    description: "Aylıq satış hədəfinin yerinə yetirilməsi üçün əsas göstərici.",
    team: [
      { name: "Samir Həsənov", role: "Komanda Lideri", avatar: "S" },
      { name: "Leyla Məmmədova", role: "Satış Mütəxəssisi", avatar: "L" },
      { name: "Rəşad Əliyev", role: "Satış Mütəxəssisi", avatar: "R" },
    ],
    history: [
      { date: "Mart 2026", value: "4.2M AZN", change: 8 },
      { date: "Fevral 2026", value: "3.8M AZN", change: 5 },
      { date: "Yanvar 2026", value: "3.5M AZN", change: -2 },
      { date: "Dekabr 2025", value: "3.6M AZN", change: 12 },
    ],
    subKpis: [
      { id: 1, name: "Online Satış", target: "2M AZN", weight: 40, current: "1.7M AZN", progress: 85 },
      { id: 2, name: "Mağaza Satışı", target: "3M AZN", weight: 60, current: "2.5M AZN", progress: 83 },
    ],
  },
  {
    id: 2, name: "Parakəndə Satış Göstəriciləri", icon: TrendingUp, zone: "yellow", target: "2M", current: "1.9M", unit: "AZN", progress: 75, minTarget: 70,
    responsible: "Farid Həsənov", period: "2026 - İllik", type: "Faiz Hədəfi", formula: "Parakəndə Satış / Ümumi Satış × 100", generalTarget: "2M AZN",
    department: "Satış Departamenti", group: "Regional Satış Qrupu", subdivision: "Satış Şöbəsi",
    startDate: "01.01.2026", endDate: "31.12.2026", frequency: "İllik", weight: 25, approvalStatus: "approved", matrixId: "matrix-standard",
    description: "Parakəndə satış kanalı üzrə performans göstəricisi.",
    team: [
      { name: "Farid Həsənov", role: "Regional Menecer", avatar: "F" },
      { name: "Aysel Quliyeva", role: "Satış Agenti", avatar: "A" },
    ],
    history: [
      { date: "Mart 2026", value: "1.9M AZN", change: 12 },
      { date: "Fevral 2026", value: "1.7M AZN", change: 3 },
      { date: "Yanvar 2026", value: "1.65M AZN", change: -1 },
    ],
  },
  {
    id: 3, name: "Müştəri Əldə Etmə", icon: Users, zone: "green", target: "500", current: "485", unit: "Müştəri", progress: 97, minTarget: 75,
    responsible: "Samir Həsənov", period: "2026 - Aylıq", type: "Say Hədəfi", formula: "Yeni Müştəri / Hədəf × 100", generalTarget: "500 Müştəri",
    department: "Marketinq", group: "Rəqəmsal Marketinq Qrupu", subdivision: "Marketinq Şöbəsi",
    startDate: "01.03.2026", endDate: "31.03.2026", frequency: "Aylıq", weight: 20, approvalStatus: "approved", matrixId: "matrix-standard",
    description: "Yeni müştərilərin cəlb edilməsi üzrə hədəf.",
    team: [
      { name: "Emin Məmmədov", role: "Marketinq Meneceri", avatar: "E" },
      { name: "Günel Əlizadə", role: "Rəqəmsal Marketinq", avatar: "G" },
      { name: "Orxan Məmmədov", role: "Kontent Menecer", avatar: "O" },
    ],
    history: [
      { date: "Mart 2026", value: "485 Müştəri", change: 15 },
      { date: "Fevral 2026", value: "420 Müştəri", change: 8 },
      { date: "Yanvar 2026", value: "380 Müştəri", change: 5 },
    ],
    subKpis: [
      { id: 1, name: "Sosial Media Müştəriləri", target: "200", weight: 35, current: "190", progress: 95 },
      { id: 2, name: "Referral Müştərilər", target: "150", weight: 30, current: "148", progress: 99 },
      { id: 3, name: "Reklam Kampaniyası", target: "150", weight: 35, current: "147", progress: 98 },
    ],
  },
  {
    id: 4, name: "Müştəri Saxlama Nisbəti", icon: CheckCircle, zone: "green", target: "95%", current: "93%", unit: "", progress: 98, minTarget: 80,
    responsible: "Leyla Həsənova", period: "2026-Q1", type: "Faiz Hədəfi", formula: "Saxlanılan / Ümumi × 100", generalTarget: "95%",
    department: "Müştəri Xidmətləri", group: "CRM Qrupu", subdivision: "CRM Şöbəsi",
    startDate: "01.01.2026", endDate: "31.03.2026", frequency: "Rüblük", weight: 15, approvalStatus: "approved", matrixId: "matrix-standard",
    description: "Mövcud müştərilərin saxlanılma nisbəti.",
    team: [
      { name: "Leyla Həsənova", role: "CRM Meneceri", avatar: "L" },
      { name: "Nigar Hüseynova", role: "Müştəri Xidmətləri", avatar: "N" },
    ],
    history: [
      { date: "Mart 2026", value: "93%", change: 2 },
      { date: "Fevral 2026", value: "91%", change: 1 },
      { date: "Yanvar 2026", value: "90%", change: -1 },
    ],
  },
  {
    id: 5, name: "İnnovasiya İndeksi", icon: Lightbulb, zone: "yellow", target: "80%", current: "72%", unit: "", progress: 65, minTarget: 60,
    responsible: "Rəşad Əliyev", period: "2026 - İllik", type: "Benchmark", formula: "İnnovasiya Skoru / Hədəf × 100", generalTarget: "80%",
    department: "R&D", group: "Tədqiqat Qrupu", subdivision: "R&D Şöbəsi",
    startDate: "01.01.2026", endDate: "31.12.2026", frequency: "İllik", weight: 5, approvalStatus: "pending", matrixId: "matrix-standard",
    description: "İnnovasiya və yenilikçilik indeksi.",
    team: [{ name: "Rəşad Əliyev", role: "R&D Meneceri", avatar: "R" }],
    history: [
      { date: "Mart 2026", value: "72%", change: 4 },
      { date: "Fevral 2026", value: "68%", change: 2 },
    ],
  },
  {
    id: 6, name: "Əməliyyat Effektivliyi", icon: Settings2, zone: "green", target: "90%", current: "88%", unit: "", progress: 98, minTarget: 70,
    responsible: "Samir Həsənov", period: "2026 - Aylıq", type: "Faiz Hədəfi", formula: "Effektiv Əməliyyat / Ümumi × 100", generalTarget: "90%",
    department: "Əməliyyatlar", group: "Əməliyyat Qrupu", subdivision: "Əməliyyat Şöbəsi",
    startDate: "01.03.2026", endDate: "31.03.2026", frequency: "Aylıq", weight: 5, approvalStatus: "pending", matrixId: "matrix-standard",
    description: "Əməliyyat proseslərinin effektivlik göstəricisi.",
    team: [
      { name: "Kamran Quliyev", role: "Əməliyyat Meneceri", avatar: "K" },
      { name: "Tural İsmayılov", role: "Proses Analitik", avatar: "T" },
    ],
    history: [
      { date: "Mart 2026", value: "88%", change: 3 },
      { date: "Fevral 2026", value: "85%", change: 1 },
      { date: "Yanvar 2026", value: "84%", change: 2 },
    ],
  },
  {
    id: 7, name: "Fərdi: Şəxsi İnkişaf Planı", icon: UserCheck, zone: "green", target: "10", current: "8", unit: "Modul", progress: 80, minTarget: 70,
    responsible: "Leyla Həsənova", period: "2026 - Aylıq", type: "Say Hədəfi", formula: "Tamamlanan / Plan × 100", generalTarget: "10 Modul",
    department: "Satış Departamenti", group: "Bakı Satış Qrupu", subdivision: "Satış Şöbəsi",
    startDate: "01.01.2026", endDate: "31.12.2026", frequency: "Aylıq", weight: 10, approvalStatus: "approved", matrixId: "matrix-standard",
    description: "Əməkdaşın fərdi inkişaf modulları üzrə tamamlama göstəricisi.",
    team: [{ name: "Leyla Məmmədova", role: "Satış Mütəxəssisi", avatar: "L" }],
    history: [{ date: "Mart 2026", value: "8 Modul", change: 2 }],
    isPersonal: true,
  },
  {
    id: 8, name: "Fərdi: Layihə Töhfəsi (Arxiv)", icon: UserCheck, zone: "yellow", target: "5", current: "3", unit: "Layihə", progress: 60, minTarget: 60,
    responsible: "Leyla Həsənova", period: "2025 - İllik", type: "Say Hədəfi", formula: "Tamamlanan Layihə / Hədəf × 100", generalTarget: "5 Layihə",
    department: "Əməliyyatlar", group: "Əməliyyat Qrupu", subdivision: "Əməliyyat Şöbəsi",
    startDate: "01.01.2025", endDate: "31.12.2025", frequency: "İllik", weight: 8, approvalStatus: "approved", matrixId: "matrix-standard",
    description: "İşdən çıxmış əməkdaşın fərdi KPI kartı — status dondurulmuşdur.",
    team: [{ name: "Tural İsmayılov", role: "Proses Analitik", avatar: "T" }],
    history: [{ date: "Dekabr 2025", value: "3 Layihə", change: 0 }],
    isPersonal: true,
    frozen: false,
  },
  // İmtina — tam dolu, redaktə edildikdə wizard bütün məlumatlarla açılır
  {
    id: 9, name: "Müştəri Şikayətlərinin Azaldılması", icon: AlertTriangle, zone: "red", target: "50", current: "72", unit: "şikayət", progress: 45, minTarget: 70,
    responsible: "Nigar Hüseynova", period: "2026 - Rüblük", type: "Say Hədəfi", formula: "Hədəf / Faktiki × 100", generalTarget: "50 şikayət",
    department: "Müştəri Xidmətləri", group: "CRM Qrupu", subdivision: "CRM Şöbəsi",
    startDate: "01.01.2026", endDate: "30.06.2026", frequency: "Rüblük", weight: 20, approvalStatus: "pending", matrixId: "matrix-standard",
    description: "Müştəri şikayətlərinin ümumi sayının azaldılması üzrə KPI. Departament Direktoru tərəfindən imtina olunub.",
    team: [
      { name: "Nigar Hüseynova", role: "CRM Meneceri", avatar: "N" },
      { name: "Leyla Həsənova", role: "Müştəri Xidmətləri", avatar: "L" },
    ],
    history: [
      { date: "Fevral 2026", value: "72 şikayət", change: -5 },
      { date: "Yanvar 2026", value: "76 şikayət", change: -2 },
    ],
    subKpis: [
      { id: 1, name: "Şikayət sayının azaldılması", target: "50", weight: 60, current: "72", progress: 45, unit: "şikayət" },
      { id: 2, name: "Cavab müddəti (saat)", target: "24", weight: 40, current: "36", progress: 60, unit: "saat" },
    ],
  },
  {
    id: 10, name: "Marketinq Kampaniyalarının ROI-si", icon: TrendingUp, zone: "red", target: "150%", current: "95%", unit: "%", progress: 63, minTarget: 80,
    responsible: "Emin Məmmədov", period: "2026 - Aylıq", type: "Faiz Hədəfi", formula: "Gəlir / Xərc × 100", generalTarget: "150%",
    department: "Marketinq", group: "Rəqəmsal Marketinq Qrupu", subdivision: "Marketinq Şöbəsi",
    startDate: "01.01.2026", endDate: "31.12.2026", frequency: "Aylıq", weight: 15, approvalStatus: "pending", matrixId: "matrix-standard",
    description: "Marketinq kampaniyalarının qaytarılan investisiya nisbəti. HR Direktoru tərəfindən imtina olunub.",
    team: [
      { name: "Emin Məmmədov", role: "Marketinq Meneceri", avatar: "E" },
      { name: "Günel Əlizadə", role: "Rəqəmsal Marketinq", avatar: "G" },
      { name: "Orxan Məmmədov", role: "Kontent Menecer", avatar: "O" },
    ],
    history: [
      { date: "Mart 2026", value: "95%", change: 5 },
      { date: "Fevral 2026", value: "90%", change: -3 },
    ],
    subKpis: [
      { id: 1, name: "Rəqəmsal reklam ROI", target: "180%", weight: 50, current: "110%", progress: 61, unit: "%" },
      { id: 2, name: "SMM kampaniyaları ROI", target: "120%", weight: 30, current: "85%", progress: 71, unit: "%" },
      { id: 3, name: "Email marketinq ROI", target: "140%", weight: 20, current: "90%", progress: 64, unit: "%" },
    ],
  },
  // Natamam (qaralama) — dolu məlumatla, redaktə edildikdə davam etmək mümkündür
  {
    id: 11, name: "Yeni İşçi Adaptasiyası", icon: UserCheck, zone: "yellow", target: "90%", current: "0%", unit: "%", progress: 0, minTarget: 80,
    responsible: "Leyla Həsənova", period: "2026 - Rüblük", type: "Faiz Hədəfi", formula: "Uğurla adaptasiya / Ümumi × 100", generalTarget: "90%",
    department: "HR", group: "HR Qrupu", subdivision: "HR Şöbəsi",
    startDate: "01.04.2026", endDate: "30.06.2026", frequency: "Rüblük", weight: 10, approvalStatus: "pending",
    description: "Yeni işə qəbul olunan əməkdaşların ilk 3 aylıq adaptasiya göstəricisi (qaralama).",
    team: [{ name: "Leyla Həsənova", role: "HR Menecer", avatar: "L" }],
    history: [],
    subKpis: [
      { id: 1, name: "Onboarding tamamlanma", target: "100%", weight: 50, current: "0%", progress: 0, unit: "%" },
      { id: 2, name: "3 ay ərzində qalma nisbəti", target: "90%", weight: 50, current: "0%", progress: 0, unit: "%" },
    ],
  },
  {
    id: 12, name: "İT İnfrastruktur Yenilənməsi", icon: Settings2, zone: "yellow", target: "10", current: "0", unit: "server", progress: 0, minTarget: 70,
    responsible: "Kamran Quliyev", period: "2026 - İllik", type: "Say Hədəfi", formula: "Tamamlanan / Plan × 100", generalTarget: "10 server",
    department: "İT", group: "İT Qrupu", subdivision: "İT Şöbəsi",
    startDate: "01.01.2026", endDate: "31.12.2026", frequency: "İllik", weight: 12, approvalStatus: "pending",
    description: "Serverlərin yenilənməsi layihəsi (qaralama).",
    team: [{ name: "Kamran Quliyev", role: "İT Menecer", avatar: "K" }],
    history: [],
    subKpis: [
      { id: 1, name: "Server konfiqurasiyası", target: "10", weight: 60, current: "0", progress: 0, unit: "server" },
      { id: 2, name: "Miqrasiya testi", target: "10", weight: 40, current: "0", progress: 0, unit: "test" },
    ],
  },
];

// Seed KPI kartlarının bütün hədəflərinə real limitlər ver (köhnə nümunələr dolu görünsün)
initialKpiCards.forEach(c => {
  c.subKpis?.forEach(sk => {
    if (!sk.limits && sk.target) sk.limits = suggestLimitsFromTarget(sk.target);
  });
});

// Integration → exchangeable data fields (per system)
const integrationFieldsBySystem: Record<string, string[]> = {
  "CRM Sistemi": ["Satış həcmi", "Yeni müştəri sayı", "Konversiya faizi", "Aktiv lead sayı"],
  "CHR": ["İş günü sayı", "Tapşırıq tamamlanma", "Davamiyyət", "Performans skoru"],
  "Microsoft 365": ["Toplantı sayı", "Email cavab müddəti", "Sənəd əməkdaşlığı", "Task tamamlanma"],
  "SIEM Platform": ["İncident sayı", "Reaksiya müddəti", "Bağlanmış hadisə", "Risk skoru"],
};

const availableFormulas = [
  { id: 1, name: "Satış Performans Düsturu", formula: "(Cari Satış / Hədəf Satış) × 100", kpiName: "Aylıq Satış Hədəfi" },
  { id: 2, name: "Müştəri Məmnuniyyət İndeksi", formula: "(Məmnun Müştəri / Ümumi Müştəri) × 100", kpiName: "Müştəri Məmnuniyyəti" },
  { id: 3, name: "Əməliyyat Effektivlik Düsturu", formula: "(Uğurlu Əməliyyat / Ümumi Əməliyyat) × 100", kpiName: "Əməliyyat Effektivliyi" },
  { id: 4, name: "İnnovasiya Skor Düsturu", formula: "(İnnovasiya Xalı / Maksimum Xal) × 100", kpiName: "İnnovasiya İndeksi" },
];

const allPersons = [
  "Kamran Quliyev", "Farid Həsənov", "Nigar Hüseynova", "Günel Əlizadə",
  "Samir Həsənov", "Leyla Məmmədova", "Rəşad Əliyev", "Emin Məmmədov",
  "Aysel Quliyeva", "Tural İsmayılov", "Leyla Həsənova", "Orxan Məmmədov"
];

const departmentStructure: Record<string, Record<string, string[]>> = {
  "Satış Departamenti": { "Satış Şöbəsi": ["Bakı Satış Qrupu", "Regional Satış Qrupu"] },
  "Marketinq": { "Marketinq Şöbəsi": ["Rəqəmsal Marketinq Qrupu"] },
  "Müştəri Xidmətləri": { "CRM Şöbəsi": ["CRM Qrupu"] },
  "R&D": { "R&D Şöbəsi": ["Tədqiqat Qrupu"] },
  "Əməliyyatlar": { "Əməliyyat Şöbəsi": ["Əməliyyat Qrupu"] },
  "Maliyyə": {},
  "İT": {},
  "HR": {},
};

const departments = ["Hamısı", ...Object.keys(departmentStructure)];
const KPI_TYPE_DEFAULTS = ["Absolut Hədəf", "Faiz Hədəfi", "Trend Hədəfi", "Benchmark", "Say Hədəfi"];

// Hədəf options per KPI type — includes per-type unit hint for target field
const subKpisByType: Record<string, { name: string; defaultWeight: number; unit: string }[]> = {
  "Absolut Hədəf": [
    { name: "Online Satış", defaultWeight: 40, unit: "Valyuta (AZN)" },
    { name: "Mağaza Satışı", defaultWeight: 60, unit: "Valyuta (AZN)" },
  ],
  "Say Hədəfi": [
    { name: "Sosial Media Müştəriləri", defaultWeight: 35, unit: "Ədəd" },
    { name: "Referral Müştərilər", defaultWeight: 30, unit: "Ədəd" },
    { name: "Reklam Kampaniyası", defaultWeight: 35, unit: "Ədəd" },
  ],
  "Faiz Hədəfi": [
    { name: "Onlayn Kanal Faizi", defaultWeight: 50, unit: "Faiz (%)" },
    { name: "Offline Kanal Faizi", defaultWeight: 50, unit: "Faiz (%)" },
  ],
  "Benchmark": [],
  "Trend Hədəfi": [],
};

// BSC GSR hesablaması: KPI tipi tərs olarsa (xərc/müddət/şikayət) Hədəf/Faktiki, əks halda Faktiki/Hədəf
const parseNumLoose = (v: string | number | undefined) => {
  if (v === undefined || v === null) return 0;
  const s = String(v).replace(/\s+/g, "").replace(",", ".");
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return 0;
  let n = parseFloat(m[0]);
  if (/m/i.test(s)) n *= 1_000_000;
  else if (/k/i.test(s)) n *= 1_000;
  return n;
};
const isInverseKpi = (typeAndName: string) => /(xərc|müddət|şikayət|cost|time|defect|qüsur)/i.test(typeAndName);
const computeKpiGsr = (card: { type: string; name: string; target: string; current: string }) => {
  const t = parseNumLoose(card.target);
  const a = parseNumLoose(card.current);
  const inv = isInverseKpi(`${card.type} ${withKartSuffix(card.name)}`);
  if (inv) return a === 0 ? 0 : (t / a) * 100;
  return t === 0 ? 0 : (a / t) * 100;
};
const getCardZone = (card: { type: string; name: string; target: string; current: string }): "green" | "yellow" | "red" => {
  const g = computeKpiGsr(card);
  if (g >= 95) return "green";
  if (g >= 80) return "yellow";
  return "red";
};

const zoneLabel = { green: "Yaşıl Zona", yellow: "Sarı Zona", red: "Qırmızı Zona" };
const zoneBg = { green: "bg-zone-green-bg text-zone-green-text", yellow: "bg-zone-yellow-bg text-zone-yellow-text", red: "bg-zone-red-bg text-zone-red-text" };
const zoneBorder = { green: "border-zone-green-text/30", yellow: "border-zone-yellow-text/30", red: "border-zone-red-text/30" };

interface KpiCardsPageProps {
  onBack?: () => void;
  forcedKartView?: "kart1" | "kart2";
}

const KpiCardsPage = ({ onBack, forcedKartView }: KpiCardsPageProps = {}) => {
  const { user } = useAuth();
  const kpiTypeOptions = useCatalogValues("kpi_types", KPI_TYPE_DEFAULTS);
  const kpiStatusOptions = useCatalogValues("kpi_statuses", ["Təsdiq gözləyən", "Təsdiq edilmiş"]);
  // zone catalog removed
  const subKpiUnits = useCatalogValues("sub_kpi_units", ["Valyuta (AZN)", "Faiz (%)", "Qiymət", "Zaman (Gün)", "Nisbət", "Boolean (Hə/Yox)"]);
  const positionOptions = getPositions();
  const [kpiCards, setKpiCards] = useState<KpiCard[]>(() => {
    const deleted = getDeletedKpiIds();
    // Persistensiya — yaradılmış kartlar refresh və modul dəyişikliyində itməsin.
    try {
      const raw = localStorage.getItem("kpi_cards_v1");
      if (raw) {
        const saved = JSON.parse(raw) as KpiCard[];
        return saved.filter(c => !deleted.includes(c.id)).map(c => ({ ...c, icon: c.icon || Target }));
      }
    } catch {}
    const base = initialKpiCards.filter(c => !deleted.includes(c.id));
    const maxId = Math.max(0, ...base.map(c => c.id));
    const clone = (src: KpiCard, id: number, patch: Partial<KpiCard>): KpiCard => ({ ...src, id, ...patch });
    const samir = base.find(c => c.responsible === "Samir Həsənov");
    const farid = base.find(c => c.responsible === "Farid Həsənov");
    const extras: KpiCard[] = [];
    if (samir) {
      extras.push(clone(samir, maxId + 1, { name: "Rüblük Satış Artımı", progress: 72, target: "1.2M", current: "0.9M" }));
      extras.push(clone(samir, maxId + 2, { name: "Müştəri Məmnuniyyəti", progress: 88, target: "90%", current: "82%", unit: "%" }));
    }
    if (farid) {
      extras.push(clone(farid, maxId + 3, { name: "Yeni Kanal İnkişafı", progress: 55, target: "3", current: "1.5", unit: "kanal" }));
    }
    return [...base, ...extras];
  });
  // Persist card list to localStorage
  useEffect(() => {
    try {
      // icon field-i function-dur — serialize etmirik
      const sanitized = kpiCards.map(({ icon, ...rest }) => rest);
      localStorage.setItem("kpi_cards_v1", JSON.stringify(sanitized));
    } catch {}
  }, [kpiCards]);

  // Sync deletions from Approval Matrix module
  useEffect(() => {
    const onDeleted = (e: Event) => {
      const id = (e as CustomEvent).detail?.kpiId;
      if (typeof id === "number") {
        setKpiCards(prev => prev.filter(c => c.id !== id));
        toast.success("Təsdiqləmə Matrisindən təsdiq olundu — KPI silindi");
      }
    };
    window.addEventListener("kpi:deleted", onDeleted);
    return () => window.removeEventListener("kpi:deleted", onDeleted);
  }, []);
  const [selectedKpi, setSelectedKpi] = useState<KpiCard | null>(null);
  const [detailTab, setDetailTab] = useState<"general" | "bsc" | "history" | "team" | "comments" | "status" | "setStatus" | "lifecycle" | "reviewTrack">("general");
  const [deleteDialog, setDeleteDialog] = useState<{ card: KpiCard; mode: "simple" | "choice" } | null>(null);
  const [deleteComment, setDeleteComment] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [lifecycleDraft, setLifecycleDraft] = useState<Omit<CardLifecycle, "cardId" | "cardName" | "updatedAt">>(() => emptyLifecycleDraft());
  const [useMatrix, setUseMatrix] = useState<boolean | null>(null);
  const [selectedMatrixId, setSelectedMatrixId] = useState<string | null>(null);
  // Filter values are persisted in localStorage so they survive route/tab changes.
  const FILTERS_KEY = "kpi-cards-filters-v1";
  const initialFilters = (() => {
    try { return JSON.parse(localStorage.getItem(FILTERS_KEY) || "{}"); } catch { return {}; }
  })();
  const [filterDepartment, setFilterDepartment] = useState<string>(initialFilters.filterDepartment ?? "Hamısı");
  const [filterSubdivision, setFilterSubdivision] = useState<string>(initialFilters.filterSubdivision ?? "Hamısı");
  const [filterGroup, setFilterGroup] = useState<string>(initialFilters.filterGroup ?? "Hamısı");
  const [filterTeamId, setFilterTeamId] = useState<number | null>(initialFilters.filterTeamId ?? null);
  const [filterStatus, setFilterStatus] = useState<string>(initialFilters.filterStatus ?? "Hamısı");
  const [filterAssignKind, setFilterAssignKind] = useState<"Hamısı" | "Fərdi" | "Toplu">(initialFilters.filterAssignKind ?? "Hamısı");
  const [filterBulkKind, setFilterBulkKind] = useState<"Hamısı" | "Komanda" | "Struktur" | "Vəzifə" | "Şəxs">(initialFilters.filterBulkKind ?? "Hamısı");
  // zone filter removed
  const [searchText, setSearchText] = useState<string>(initialFilters.searchText ?? "");
  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify({
        filterDepartment, filterSubdivision, filterGroup, filterTeamId,
        filterStatus, filterAssignKind, filterBulkKind, searchText,
      }));
    } catch {}
  }, [filterDepartment, filterSubdivision, filterGroup, filterTeamId, filterStatus, filterAssignKind, filterBulkKind, searchText]);
  const [hoveredMinTarget, setHoveredMinTarget] = useState<number | null>(null);
  const [approvedPage, setApprovedPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [frozenPage, setFrozenPage] = useState(1);
  const PAGE_SIZE = 3;

  const [newKpi, setNewKpi] = useState({
    name: "", types: [] as string[], department: "", subdivision: "", group: "", minTarget: "60", minTargetAbs: "", generalTarget: "",
    selectedFormula: "", periodType: "Aylıq" as "Aylıq" | "Rüblük" | "İllik",
    periodYear: "2026", periodMonth: "01", periodQuarter: "Q1",
    // 4 müstəqil təyinat seçimi
    targetMode: { individual: false, team: false, structure: false, position: false },
    // Struktur cascading üçün id zənciri (kök → leaf)
    structurePath: [] as number[],
    assignToIndividual: false, assignedUser: "",
    teamIds: [] as number[],
    assignedPositions: [] as string[],
    sharedKpi: false,
    period: { type: "Aylıq" } as PeriodValue,
    subKpis: [] as SubKpi[],
    approvalChain: [
      { role: "Şöbə Müdiri", persons: [] as string[] },
      { role: "Departament Direktoru", persons: [] as string[] },
      { role: "Kurator", persons: [] as string[] },
      { role: "HR", persons: [] as string[] },
    ],
  });
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [kartView, setKartView] = useState<"kart1" | "kart2">(forcedKartView ?? "kart1");
  useEffect(() => { if (forcedKartView) setKartView(forcedKartView); }, [forcedKartView]);
  const [kart2SubView, setKart2SubView] = useState<"structure" | "employees">("structure");


  // === Yeni KPI Sehrbazı (4 addımlı) ===
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitial, setWizardInitial] = useState<Partial<CreateKpiWizardDraft> | undefined>(undefined);
  const [wizardEditingId, setWizardEditingId] = useState<number | null>(null);
  // Saved wizard drafts per cardId (so editing resumes from the last step)
  const [cardDrafts, setCardDrafts] = useState<Record<number, CreateKpiWizardDraft>>({});
  const openWizard = (initial?: Partial<CreateKpiWizardDraft>, editingId: number | null = null) => {
    setWizardInitial(initial);
    setWizardEditingId(editingId);
    setWizardOpen(true);
  };
  const openWizardForEdit = (cardId: number) => {
    const saved = cardDrafts[cardId];
    if (saved) {
      openWizard(saved, cardId);
      return;
    }
    const card = kpiCards.find(c => c.id === cardId);
    if (!card) { openWizard(undefined, cardId); return; }
    // Build a rich fallback draft from card + its subKpis so imtina/natamam
    // cards open fully populated for editing.
    const targets = (card.subKpis || []).map((sk, i) => ({
      id: `t-${cardId}-${sk.id ?? i}`,
      name: sk.name,
      type: "Məbləğ" as const,
      weight: sk.weight || 0,
      scoreLimit: 5,
      targetValue: String(sk.target ?? ""),
      createdBy: "self" as const,
      evaluators: [{ id: `ev-${cardId}-${i}`, name: card.responsible, weight: 100 }],
      evaluator: card.responsible,
      assigner: card.responsible,
      min: "", max: "", currency: "AZN" as const,
      ranges: [{ id: `r-${cardId}-${i}`, min: "0", max: String(sk.target ?? "100"), score: "5", weight: "100" }],
      competencyMatrix: "", freeInput: "",
      booleanYes: 5, booleanNo: 2,
      timeStart: "", timeEnd: "",
      scoreDescriptions: [],
      cascading: false, cascadeMatrix: "",
    }));
    const lc = getLifecycle(cardId);
    const toISO = (s: string) => {
      if (!s) return "";
      // "01.01.2026" → "2026-01-01"
      const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
      return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
    };
    openWizard({
      name: card.name,
      mode: "individual",
      individualEmployees: [card.responsible],
      bulkSelections: { teams: [], structures: [], positions: [], persons: [] },
      frequency: card.frequency || "Aylıq",
      startDate: toISO(card.startDate || ""),
      endDate: toISO(card.endDate || ""),
      scoringSystem: "1-5",
      useMatrix: true,
      approvalMatrixId: "matrix-standard",
      approvalMethod: "matrix",
      lifecycle: {
        assignmentStart: lc?.assignment?.start || "",
        assignmentEnd: lc?.assignment?.end || "",
        assignmentDeadline: lc?.assignment?.end || "",
        evaluationStart: lc?.evaluation?.start || "",
        evaluationEnd: lc?.evaluation?.end || "",
        bonusStart: lc?.bonus?.start || "",
        bonusEnd: lc?.bonus?.end || "",
        reviews: (lc?.reviews || []).map((r, i) => ({
          id: r.id || `r-${i}`,
          name: `Review ${i + 1}`,
          start: r.start,
          end: r.end,
        })),
      },
      targets: targets as any,
      createdBy: "self",
      createdByEmployee: card.responsible,
    } as any, cardId);

  };
  const handleWizardComplete = async (d: CreateKpiWizardDraft) => {
    const action = d.action || "draft";
    const editingId = wizardEditingId;
    // Unikal ID: state hələ commit olmayıbsa belə, iki ardıcıl yaratmada eyni id çıxmasın.
    const id = editingId ?? Math.max(Date.now(), Math.max(0, ...kpiCards.map(c => c.id)) + 1);
    const prevStatus = editingId != null ? statusMap[editingId]?.status : undefined;
    const wasRejected = prevStatus === "imtina";
    // === Helpers ===
    const stripNameLoc = (v: string) => String(v || "").split(" — ")[0].trim();
    // Wizard ranges → 5 tier LimitSet (bal 1..5)
    const rangesToLimitSet = (ranges?: { min: string; max: string; score: string }[]): LimitSet | undefined => {
      if (!ranges || ranges.length === 0) return undefined;
      const zero = { min: 0, max: 0 };
      const map: LimitSet = { l1: { ...zero }, l2: { ...zero }, l3: { ...zero }, l4: { ...zero }, l5: { ...zero } };
      let touched = false;
      ranges.forEach(r => {
        const s = Number(r.score);
        if (!Number.isFinite(s) || s < 1 || s > 5) return;
        const key = (`l${s}` as keyof LimitSet);
        map[key] = { min: Number(r.min) || 0, max: Number(r.max) || 0 };
        touched = true;
      });
      return touched ? map : undefined;
    };
    // Build subKpis from wizard targets
    const wizardSubKpis: SubKpi[] = (d.targets || []).map((t: any, i: number) => ({
      id: i + 1,
      name: t.name || `Hədəf ${i + 1}`,
      target: String(t.targetValue ?? ""),
      unit: t.type === "Məbləğ" ? (t.currency || "AZN") : t.type === "Faiz" ? "%" : "",
      weight: Number(t.weight) || 0,
      current: "",
      progress: 0,
      assignerMode: t.createdBy === "other" ? "other" : "self",
      assigner: t.assigner ? stripNameLoc(t.assigner) : undefined,
      evaluator: t.evaluators && t.evaluators.length
        ? { type: "person", persons: t.evaluators.map((e: any) => ({ name: stripNameLoc(e.name), weight: Number(e.weight) || 0 })) }
        : undefined,
      limits: rangesToLimitSet(t.ranges),
      scoreDescriptions: (t.scoreDescriptions || []).map((s: any) => ({
        score: Number(s.score) || 0,
        description: s.description || "",
        timeStart: s.timeStart,
        timeEnd: s.timeEnd,
      })),
    } as SubKpi));
    // Team = unique participants (assigner + evaluators + assignees)
    const teamMap = new Map<string, { name: string; role: string; avatar: string }>();
    const pushTeam = (raw: string, role: string) => {
      const n = stripNameLoc(raw);
      if (!n || teamMap.has(n)) return;
      teamMap.set(n, { name: n, role, avatar: n[0]?.toUpperCase() || "?" });
    };
    (d.targets || []).forEach((t: any) => {
      if (t.assigner) pushTeam(t.assigner, "Təyin edici");
      (t.evaluators || []).forEach((e: any) => pushTeam(e.name, "Qiymətləndirici"));
    });
    // Assignees — kartın icra ediləcəyi əməkdaşlar (fərdi & toplu)
    try {
      if (d.mode === "individual") {
        (d.individualEmployees || []).forEach(n => pushTeam(n, "Əməkdaş"));
      } else {
        (d.bulkSelections?.persons || []).forEach(n => pushTeam(n, "Əməkdaş"));
        const allTeams = getTeams();
        (d.bulkSelections?.teams || []).forEach(name => {
          const tm = allTeams.find(x => x.name === name);
          if (tm) { pushTeam(tm.leader, "Komanda Lideri"); tm.members.forEach(m => pushTeam(m.name, "Üzv")); }
        });
        // Vəzifə/struktur: onların əməkdaşları da (varsa) əlavə et
        try {
          const empsAll = getEmployees();
          (d.bulkSelections?.positions || []).forEach(pos => {
            empsAll.filter(e => e.positionName === pos).forEach(e => pushTeam(`${e.firstName} ${e.lastName}`, pos));
          });
          (d.bulkSelections?.structures || []).forEach(struct => {
            empsAll.filter(e => (e as any).structurePath?.startsWith(String(struct)) || (e as any).structurePath === String(struct)).forEach(e => pushTeam(`${e.firstName} ${e.lastName}`, "Struktur üzvü"));
          });
        } catch {}
      }
    } catch {}
    // Owner (kart sahibi) — birinci üzv kimi
    const ownerName = d.createdBy === "self" ? "Özüm" : (d.createdByEmployee || "");
    const ownerNameClean = stripNameLoc(ownerName);
    if (ownerNameClean && !teamMap.has(ownerNameClean)) {
      teamMap.set(ownerNameClean, { name: ownerNameClean, role: "Kart sahibi", avatar: ownerNameClean[0]?.toUpperCase() || "?" });
    }
    const wizardTeam = Array.from(teamMap.values());

    const builtCard: KpiCard = {
      id, name: d.name, icon: Target, zone: "yellow",
      target: "—", current: "0", unit: "", progress: 0, minTarget: 60,
      responsible: d.createdBy === "self" ? "Özüm" : (d.createdByEmployee || "—"),
      period: `${d.startDate?.slice(0, 4) || "2026"} - ${d.frequency}`,
      type: "Absolut Hədəf", formula: "—", generalTarget: "",
      department: "—", group: "—", subdivision: "—",
      startDate: d.startDate || "", endDate: d.endDate || "",
      frequency: d.frequency,
      team: wizardTeam, history: [], description: `Bal sistemi: ${d.scoringSystem} · ${d.mode === "individual" ? "Fərdi" : "Toplu"}`,
      weight: 10, approvalStatus: action === "create_active" ? "approved" : "pending",
      subKpis: wizardSubKpis,
      matrixId: d.useMatrix ? (d.approvalMatrixId || null) : null,
    };
    setKpiCards(prev => {
      if (editingId != null) {
        return prev.map(c => c.id === editingId ? { ...c, ...builtCard, id: editingId } : c);
      }
      return [builtCard, ...prev];
    });
    setCardDrafts(prev => ({ ...prev, [id]: d }));
    setWizardEditingId(null);

    // === Lifecycle-ı store-a yaz — həm kart detalında, həm KPI Lifecycle modulunda görünsün ===
    try {
      const lc = d.lifecycle;
      const toStage = (start?: string, end?: string) =>
        (start || end) ? { period: d.frequency || "Aylıq", start: start || "", end: end || "" } : undefined;
      setCardLifecycle(id, d.name || "Adsız KPI", {
        assignment: toStage(lc?.assignmentStart, lc?.assignmentEnd),
        evaluation: toStage(lc?.evaluationStart, lc?.evaluationEnd),
        bonus: toStage(lc?.bonusStart, lc?.bonusEnd),
        reviews: (lc?.reviews || []).map((r, i) => ({
          id: r.id || `r-${i}`,
          period: d.frequency || "Aylıq",
          start: r.start || "",
          end: r.end || "",
        })),
      });
    } catch (err) { console.warn("lifecycle save failed", err); }

    // === Status ===
    // Matris seçilməyibsə → əvvəlki davranış: submit dərhal "aktiv" (heç bir approval axını yoxdur).
    // Matris seçilibsə → əvvəlcə Set tamamlanmalıdır; Set bitəndə sistem avtomatik
    // "tesdiq_gozlenilir"-ə keçirir (bax: kpiApprovalFlow.triggerCardApprovalIfComplete).
    const hasPendingSet = (d.targets || []).some((t: any) => t.createdBy === "other");
    const nextStatus: import("@/lib/kpiCardStatusStore").KpiCardStatus =
      action === "create_active" ? "aktiv"
      : action === "submit"
        ? (d.useMatrix ? (hasPendingSet ? "natamam" : "tesdiq_gozlenilir") : "aktiv")
        : "qaralama";
    try {
      await upsertStatus({
        card_id: id,
        status: nextStatus,
        use_matrix: d.useMatrix,
        submitted_for_approval: action === "submit",
        assignees: [],
      });
      const mod = await import("@/lib/kpiCardStatusStore");
      const next = await mod.fetchAllStatuses();
      setStatusMap(next);
    } catch {}

    // Helpers: wizard employee values look like "Ad Soyad — Vəzifə".
    // Kartların "Ad Soyad" hissəsini ayırıb istifadə edirik.
    const stripName = (v: string) => String(v || "").split(" — ")[0].trim();
    const parseNumLoose = (v: any) => parseFloat(String(v ?? "").replace(/[^\d.\-]/g, "")) || 0;
    const ownerAssigneeNames = (() => {
      const list = new Set<string>();
      if (d.mode === "individual") {
        (d.individualEmployees || []).forEach(v => { const n = stripName(v); if (n) list.add(n); });
      } else {
        (d.bulkSelections?.persons || []).forEach(v => { const n = stripName(v); if (n) list.add(n); });
      }
      return Array.from(list);
    })();

    // === Rəhbər üçün pending KpiSetEntry yarat ===
    // Target-Setter (createdBy==="other"): seçilmiş "Təyin edici"
    // Owner (createdBy==="self"): kartın öz assignee-si (individualEmployees / bulkSelections.persons)
    try {
      const employeesAll = getEmployees();
      const findEmp = (name: string) => employeesAll.find(e => `${e.firstName} ${e.lastName}` === name);
      const seen = new Set<string>();
      const pushPending = (name: string) => {
        if (!name || seen.has(name)) return;
        seen.add(name);
        const emp = findEmp(name);
        addPendingEntry({
          cardId: id,
          cardName: d.name,
          assigneeName: name,
          assigneeId: emp?.id,
          ownerType: "manager",
          weightMin: 5,
          weightMax: 40,
        });
      };
      (d.targets || []).forEach((t: any) => {
        // Yalnız "Digər əməkdaş təyin edir" modunda təyinedici üçün
        // "Məsul olduğum kartlar" entry-si yaradılır.
        // "Özüm təyin edirəm" (createdBy === "self") halında kart Owner-ə
        // aiddir — onun ÖZ kartıdır, məsul olduğu kart deyil.
        if (t.createdBy === "other") {
          pushPending(stripName(t.assigner));
        }
      });
    } catch (err) { console.warn("pending kpi set seed failed", err); }

    // === Approval bridge meta ===
    // HR wizard yaratdığı kart SharedKpiCard-a yazılmır — Approval Workflow-nun
    // Elvin Set-i bitirdikdə Günelə (matrisdəki şəxsə) task göndərə bilməsi üçün
    // lokal `numericId → {matrixId, ownerId, name, ...}` bridge saxlayırıq.
    if (d.useMatrix && (d.approvalMatrixId || null)) {
      try {
        const meMod = await import("@/lib/kpiCardMetaStore");
        const { getCurrentEmployeeId } = await import("@/lib/scope");
        const { getEmployees: getOrgEmps } = await import("@/lib/orgStore");
        const meId = getCurrentEmployeeId(user) || "e1";
        const empsAll = getOrgEmps();
        const nameToEId = (n: string): string | null => {
          const clean = stripName(n);
          const emp = empsAll.find(e => `${e.firstName} ${e.lastName}` === clean);
          return emp ? `e${emp.id}` : null;
        };
        const assigneeIds = Array.from(new Set(
          ownerAssigneeNames.map(nameToEId).filter((x): x is string => !!x)
        ));
        meMod.upsertKpiCardMeta({
          cardId: id,
          name: d.name || "Adsız KPI",
          matrixId: d.approvalMatrixId || null,
          ownerId: meId,
          assigneeIds,
        });
      } catch (err) { console.warn("kpi card meta upsert failed", err); }
    }




    // === Cascade root: HR cascadable Owner kartı yaradanda ağacın kökünü yarat ===
    // Yalnız createdBy==="self" && cascading==true olan hədəflər üçün, hər assignee ilə.
    try {
      const employeesAll = getEmployees();
      const findEmp = (name: string) => employeesAll.find(e => `${e.firstName} ${e.lastName}` === name);
      (d.targets || []).forEach((t: any) => {
        if (t.createdBy !== "self" || !t.cascading) return;
        const limit = parseNumLoose(t.targetValue);
        if (limit <= 0) return;
        const unit = t.type === "Məbləğ" ? (t.currency || "AZN") : t.type === "Faiz" ? "%" : (t.unit || "");
        const goalName = t.name || d.name || "Ana hədəf";
        ownerAssigneeNames.forEach(ownerName => {
          const emp = findEmp(ownerName);
          if (!emp) return;
          const existing = findRootByGoal(d.name || "Kart", goalName, emp.id);
          if (!existing) {
            createRoot({
              cardName: d.name || "Kart",
              goalName,
              unit,
              assigneeId: emp.id,
              assigneeName: `${emp.firstName} ${emp.lastName}`,
              positionName: emp.positionName,
              limit,
            });
          }
        });
      });
    } catch (err) {
      console.warn("cascade root seed failed", err);
    }

    // === Notify təyinedicilər when HR edits a previously-rejected card ===
    if (wasRejected) {
      try {
        const nmod = await import("@/lib/notificationsStore");
        const assigners = new Set<string>();
        d.targets?.forEach(t => { if (t.assigner) assigners.add(t.assigner); });
        const msg = action === "submit"
          ? `"${d.name}" KPI kartı HR tərəfindən düzəliş edildi və yenidən təsdiqə göndərildi.`
          : action === "create_active"
          ? `"${d.name}" KPI kartı HR tərəfindən düzəliş edildi və aktivləşdirildi.`
          : `"${d.name}" KPI kartı HR tərəfindən düzəliş edildi (qaralama).`;
        assigners.forEach(a => nmod.pushNotification?.({
          toEmployeeName: a, kind: "info", message: msg,
        } as any));
      } catch {}
    }
  };



  // === KPI card status (Natamam / Təsdiq gözlənilir / İmtina / Aktiv) ===
  const [statusMap, setStatusMap] = useState<Record<number, import("@/lib/kpiCardStatusStore").KpiCardStatusRow>>({});
  const [statusDialogCardId, setStatusDialogCardId] = useState<number | null>(null);
  const [employeeDrilldown, setEmployeeDrilldown] = useState<string | null>(null);
  useEffect(() => {
    import("@/lib/kpiCardStatusStore").then(m => m.fetchAllStatuses().then(setStatusMap));
  }, []);
  const DEMO_STATUS: Record<number, Partial<import("@/lib/kpiCardStatusStore").KpiCardStatusRow>> = {
    1: { status: "aktiv", use_matrix: true, submitted_for_approval: true, assignees: [{ name: "Samir Həsənov", ok: true }, { name: "Leyla Məmmədova", ok: true }] },
    2: { status: "aktiv", assignees: [{ name: "Farid Həsənov", ok: true }] },
    3: { status: "qiymetlendirme", assignees: [{ name: "Emin Məmmədov", ok: true }] },
    4: { status: "tamamlanib", assignees: [{ name: "Leyla Həsənova", ok: true }] },
    5: { status: "tesdiq_gozlenilir", use_matrix: true, submitted_for_approval: false, assignees: [{ name: "Rəşad Əliyev", ok: true }] },
    6: { status: "natamam", use_matrix: false, assignees: [{ name: "Kamran Quliyev", ok: true }, { name: "Tural İsmayılov", ok: false }] },
    7: { status: "imtina", use_matrix: true, rejected_by: "Departament Direktoru", assignees: [{ name: "Leyla Məmmədova", ok: true }] },
    8: { status: "tamamlanib", assignees: [{ name: "Tural İsmayılov", ok: true }] },
    9: { status: "imtina", use_matrix: true, rejected_by: "Departament Direktoru", rejection_reason: "Hədəf dəyəri çox aşağıdır — yenidən nəzərdən keçirilməlidir.", assignees: [{ name: "Nigar Hüseynova", ok: true }, { name: "Leyla Həsənova", ok: false }] } as any,
    10: { status: "qiymetlendirme", use_matrix: false, assignees: [{ name: "Emin Məmmədov", ok: true }] } as any,
    11: { status: "qaralama", use_matrix: false, assignees: [] },
    12: { status: "qaralama", use_matrix: false, assignees: [] },
  };
  const getStatusFor = (cardId: number) => {
    const remote = statusMap[cardId];
    if (remote) return remote;
    const demo = DEMO_STATUS[cardId] || { status: "natamam" as const, assignees: [] };
    return {
      card_id: cardId,
      status: (demo.status || "natamam") as import("@/lib/kpiCardStatusStore").KpiCardStatus,
      use_matrix: demo.use_matrix || false,
      submitted_for_approval: demo.submitted_for_approval || false,
      rejected_by: demo.rejected_by || null,
      rejected_at: null,
      assignees: demo.assignees || [],
      updated_at: new Date().toISOString(),
    } as import("@/lib/kpiCardStatusStore").KpiCardStatusRow;
  };
  const handleSubmitToMatrix = async (cardId: number) => {
    const mod = await import("@/lib/kpiCardStatusStore");
    await mod.submitToMatrix(cardId);
    const next = await mod.fetchAllStatuses();
    setStatusMap(next);
    toast.success("Matris üzrə təsdiqə göndərildi");
  };

  const [listSearch, setListSearch] = useState("");
  const [showPositionDropdown, setShowPositionDropdown] = useState(false);
  const [positionSearchText, setPositionSearchText] = useState("");
  const [targetError, setTargetError] = useState<string>("");
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [personSearches, setPersonSearches] = useState<Record<number, string>>({});
  const [typeSearchText, setTypeSearchText] = useState("");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userSearchText, setUserSearchText] = useState("");
  // Org structures (canlı oxunur)
  const [orgStructures, setOrgStructures] = useState<OrgStructure[]>(() => getStructures());
  // Per-level struktur axtarış mətnləri
  const [structSearch, setStructSearch] = useState<Record<number, string>>({});
  const [openStructLevel, setOpenStructLevel] = useState<number | null>(null);
  // Multi-select dropdown wrappers — outside click / Escape ilə bağlanır
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const positionDropdownRef = useRef<HTMLDivElement>(null);
  const structDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (showTypeDropdown && typeDropdownRef.current && !typeDropdownRef.current.contains(t)) setShowTypeDropdown(false);
      if (showUserDropdown && userDropdownRef.current && !userDropdownRef.current.contains(t)) setShowUserDropdown(false);
      if (showPositionDropdown && positionDropdownRef.current && !positionDropdownRef.current.contains(t)) setShowPositionDropdown(false);
      if (openStructLevel !== null && structDropdownRef.current && !structDropdownRef.current.contains(t)) setOpenStructLevel(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setShowTypeDropdown(false);
      setShowUserDropdown(false);
      setShowPositionDropdown(false);
      setOpenStructLevel(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [showTypeDropdown, showUserDropdown, showPositionDropdown, openStructLevel]);
  useEffect(() => {
    const refresh = () => setOrgStructures(getStructures());
    window.addEventListener("org-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("org-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Evaluator picker (per hədəf)
  const [evaluatorEditingSubId, setEvaluatorEditingSubId] = useState<number | null>(null);
  const [evDraft, setEvDraft] = useState<EvaluatorConfig>({ type: null, persons: [] });
  const [evSearch, setEvSearch] = useState({ person: "", team: "", integration: "" });
  // Assigner (Təyin edici) picker — per hədəf
  const [assignerEditingSubId, setAssignerEditingSubId] = useState<number | null>(null);
  const [assignerDraft, setAssignerDraft] = useState<string>("");
  const [assignerSearch, setAssignerSearch] = useState("");
  // Vahid şəxs — bütün hədəf-lara aid eyni qiymətləndirici/təyin edici
  const [unifiedPerson, setUnifiedPerson] = useState<string>("");
  const [unifiedAssigner, setUnifiedAssigner] = useState<string>("");
  const [unifiedDialogOpen, setUnifiedDialogOpen] = useState(false);
  const [unifiedDraftEv, setUnifiedDraftEv] = useState<string>("");
  const [unifiedDraftAs, setUnifiedDraftAs] = useState<string>("");
  const [unifiedSearchEv, setUnifiedSearchEv] = useState("");
  const [unifiedSearchAs, setUnifiedSearchAs] = useState("");
  // Yeni hədəf yaradılarkən — təyin edən kimdir seçimi
  const [newSubKpiModeOpen, setNewSubKpiModeOpen] = useState(false);
  // Hədəf vahidini (target unit) inline popover ilə dəyişmək
  const [unitPickerForSubId, setUnitPickerForSubId] = useState<number | null>(null);
  // Hədəf üçün Qiymət Limitləri dialoqu
  const [limitsViewingSubId, setLimitsViewingSubId] = useState<number | null>(null);

  /** Hər səviyyə üçün hansı struktur siyahısının göstəriləcəyini hesablayır.
   * level 0 → kök strukturlar; level N → newKpi.structurePath[N-1]-in uşaqları. */
  const getStructuresAtLevel = (level: number): OrgStructure[] => {
    if (level === 0) return orgStructures;
    const parentId = newKpi.structurePath[level - 1];
    if (!parentId) return [];
    const parent = findStructureById(parentId);
    return parent ? parent.children : [];
  };
  /** Aşağıda göstəriləcək cascading səviyyələrin sayı — seçilmiş leaf-in uşağı varsa daha bir səviyyə açıq qalır. */
  const visibleStructLevels = (() => {
    const levels: number[] = [0];
    for (let i = 0; i < newKpi.structurePath.length; i++) {
      const node = findStructureById(newKpi.structurePath[i]);
      if (node && node.children.length > 0) levels.push(i + 1);
    }
    return levels;
  })();
  const selectedStructureId = newKpi.structurePath[newKpi.structurePath.length - 1] ?? null;
  const selectedStructureNode = selectedStructureId ? findStructureById(selectedStructureId) : null;

  const getSubdivisionsForDept = (dept: string) => {
    if (dept === "Hamısı" || !departmentStructure[dept]) return [];
    return Object.keys(departmentStructure[dept]);
  };
  const getGroupsForSubdivision = (dept: string, sub: string) => {
    if (dept === "Hamısı" || sub === "Hamısı" || !departmentStructure[dept]?.[sub]) return [];
    return departmentStructure[dept][sub];
  };

  const filterSubdivisions = getSubdivisionsForDept(filterDepartment);
  const filterGroups = getGroupsForSubdivision(filterDepartment, filterSubdivision);
  const createSubdivisions = newKpi.department ? Object.keys(departmentStructure[newKpi.department] || {}) : [];
  const createGroups = newKpi.department && newKpi.subdivision ? (departmentStructure[newKpi.department]?.[newKpi.subdivision] || []) : [];



  // Helpers for new columns
  const getCreatedAtFor = (cardId: number): string => {
    const st = statusMap[cardId] as any;
    const s = (st?.updated_at as string | undefined) || undefined;
    if (s) return s.slice(0, 10);
    const draft = cardDrafts[cardId];
    if (draft?.startDate) return draft.startDate;
    const card = kpiCards.find(c => c.id === cardId);
    if (card?.startDate) return card.startDate;
    // Deterministic fallback date based on card id so column is never empty
    const base = new Date(2026, 0, 15);
    base.setDate(base.getDate() - (Math.abs(cardId) % 365) * 3);
    if (isNaN(base.getTime())) return "2026-01-15";
    return base.toISOString().slice(0, 10);
  };
  const getAssignKindFor = (cardId: number): "Fərdi" | "Toplu" => {
    const draft = cardDrafts[cardId];
    if (!draft) {
      const card = kpiCards.find(c => c.id === cardId);
      if (!card) return "Fərdi";
      const teams = getTeams();
      const inTeam = teams.some(t => [t.leader, ...t.members.map(m => m.name)].includes(card.responsible));
      return inTeam ? "Toplu" : "Fərdi";
    }
    return draft.mode === "individual" ? "Fərdi" : "Toplu";
  };

  // === Rəhbər / cross-panel shared kartları HR görsün ===
  // Kartlar SharedKpiCard store-dan gəlir (Rəhbərin kartları burada da var).
  const sharedCards = useSharedKpiCards();
  const mergedKpiCards = useMemo(() => {
    const byNumId = new Map<number, KpiCard>();
    kpiCards.forEach(c => byNumId.set(c.id, c));
    const existingNumIds = new Set<number>(kpiCards.map(c => c.id));
    const employeeById = new Map(getEmployees().map(e => [`e${e.id}`, e]));
    const toKpiCard = (s: SharedKpiCard): KpiCard => {
      const owner = employeeById.get(s.ownerId);
      const responsible = owner ? `${owner.firstName} ${owner.lastName}` : s.ownerId;
      const notes = (s.history || [])
        .filter(h => h.note && h.note.trim())
        .map(h => `• ${h.actor}: ${h.note}`)
        .join("\n");
      const numericId = s.numericId ?? Math.abs(hashStrLocal(s.id));
      return {
        id: numericId,
        name: s.name,
        icon: Target,
        zone: s.status === "aktiv" ? "green" : s.status === "imtina" ? "red" : "yellow",
        target: "—", current: "0", unit: "", progress: 0, minTarget: 60,
        responsible,
        period: `${(s.startDate || "").slice(0, 4)} - ${s.frequency || ""}`,
        type: "Absolut Hədəf", formula: "—", generalTarget: "",
        department: "—", group: "—", subdivision: "—",
        startDate: s.startDate || "", endDate: s.endDate || "",
        frequency: s.frequency || "Aylıq",
        team: [], history: [],
        description: notes || `Bal sistemi: ${s.scoringSystem || "1-5"}`,
        weight: 10,
        approvalStatus: s.status === "aktiv" ? "approved" : "pending",
        subKpis: (s.targets || []).map((t, i) => ({
          id: i + 1,
          name: t.name,
          target: String(t.targetValue ?? "—"),
          unit: t.unit || "",
          weight: t.weight || 0,
          current: "",
          progress: 0,
          assignerMode: t.createdBy === "other" ? "other" : "self",
          assigner: t.assigner,
        } as SubKpi)),
        matrixId: s.matrixId,
      };
    };
    const extras = sharedCards
      .filter(s => !(s.numericId && existingNumIds.has(s.numericId)))
      .map(toKpiCard);
    return [...kpiCards, ...extras];
  }, [kpiCards, sharedCards]);

  const filteredCards = mergedKpiCards.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchText.toLowerCase());
    let matchesTeam = true;
    if (filterTeamId !== null) {
      const team = getTeams().find(t => t.id === filterTeamId);
      if (team) {
        const memberNames = [team.leader, ...team.members.map(m => m.name)];
        matchesTeam = memberNames.includes(c.responsible);
      }
    }
    const st = getStatusFor(c.id);
    const STATUS_LBL: Record<string, string> = {
      qaralama: "Qaralama", natamam: "Natamam", tesdiq_gozlenilir: "Təsdiq gözlənilir",
      imtina: "İmtina", aktiv: "Aktiv", qiymetlendirme: "Qiymətləndirmə",
      tamamlanib: "Tamamlanıb", legv_olundu: "Ləğv olundu",
    };
    const matchesStatus = filterStatus === "Hamısı" || STATUS_LBL[st.status] === filterStatus;
    const kind = getAssignKindFor(c.id);
    let matchesKind = true;
    if (filterAssignKind === "Fərdi") matchesKind = kind === "Fərdi";
    else if (filterAssignKind === "Toplu") matchesKind = kind === "Toplu";
    return matchesSearch && matchesTeam && matchesStatus && matchesKind;
  });

  const pickBscFormulaName = (types: string[]) => {
    if (types.length === 0) return "";
    const formulas = getFormulas();
    // 1) İstifadəçi tərəfindən KPI tipinə bağlanmış düstur
    for (const t of types) {
      const f = formulas.find(fm => fm.kpiTypes?.includes(t));
      if (f) return f.name;
    }
    // 2) Default BSC seçimi: tip adında tərs açar sözləri varsa GSR (Tərs), əks halda Düz
    const inverse = types.some(t => isInverseKpi(t));
    const target = inverse ? "BSC GSR (Tərs)" : "BSC GSR (Düz)";
    const f = formulas.find(fm => fm.name.startsWith(target));
    return f?.name || "";
  };

  const toggleKpiType = (type: string) => {
    setNewKpi(prev => {
      const is360 = (t: string) => /360/i.test(t);
      let newTypes: string[];
      if (prev.types.includes(type)) {
        newTypes = prev.types.filter(t => t !== type);
      } else {
        // 360 qiymətləndirmə seçilirsə, başqa heç nə ola bilməz
        if (is360(type)) {
          newTypes = [type];
        } else if (prev.types.some(is360)) {
          // Artıq 360 seçilibsə, başqa tip əlavə etmək olmaz
          toast.error("360 qiymətləndirmə ilə birgə başqa hədəf tipi seçmək olmaz");
          return prev;
        } else {
          newTypes = [...prev.types, type];
        }
      }
      const autoFormula = pickBscFormulaName(newTypes);
      return {
        ...prev,
        types: newTypes,
        // Hədəflər default olaraq gəlməsin; HR əllə əlavə etsin
        // Default BSC düsturunu avtomatik təyin et (istifadəçi başqasını seçməyibsə)
        selectedFormula: prev.selectedFormula && !prev.selectedFormula.startsWith("BSC GSR") ? prev.selectedFormula : autoFormula,
      };
    });
  };

  const togglePerson = (stepIndex: number, person: string) => {
    setNewKpi(prev => {
      const chain = [...prev.approvalChain];
      const persons = chain[stepIndex].persons;
      chain[stepIndex] = { ...chain[stepIndex], persons: persons.includes(person) ? persons.filter(p => p !== person) : [...persons, person] };
      return { ...prev, approvalChain: chain };
    });
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setNewKpi(prev => {
      const chain = [...prev.approvalChain];
      const [removed] = chain.splice(dragIndex, 1);
      chain.splice(index, 0, removed);
      return { ...prev, approvalChain: chain };
    });
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  const openDetail = (card: KpiCard) => { setSelectedKpi(card); setDetailTab("general"); };
  const resetFilters = () => { setFilterDepartment("Hamısı"); setFilterSubdivision("Hamısı"); setFilterGroup("Hamısı"); setFilterTeamId(null); setFilterStatus("Hamısı"); setSearchText(""); };

  const handleDeleteCard = (card: KpiCard) => {
    const st = statusMap[card.id]?.status;
    const isDraftLike = st === "qaralama" || st === "natamam" || card.approvalStatus === "pending";
    setDeleteComment("");
    setDeleteDialog({ card, mode: isDraftLike ? "simple" : "choice" });
  };

  const performHardDelete = async (card: KpiCard) => {
    setKpiCards(prev => prev.filter(c => c.id !== card.id));
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("kpi_card_status").delete().eq("card_id", card.id);
      const mod = await import("@/lib/kpiCardStatusStore");
      const next = await mod.fetchAllStatuses();
      setStatusMap(next);
    } catch {}
    toast.success("KPI kartı silindi");
    setDeleteDialog(null);
  };

  const sendDeletionRequest = (card: KpiCard, comment: string) => {
    const matrix = getDeletionMatrix();
    if (!matrix || !matrix.approver) {
      toast.error("Silinmə matrisi yoxdur. Təsdiqləmə Matrisi modulundan yaradın.", { duration: 5000 });
      return;
    }
    addDeletionRequest({
      kpiId: card.id,
      kpiName: card.name,
      requestedBy: user?.name || "HR",
    });
    toast.success(`Silinmə sorğusu göndərildi (${matrix.approver.name} təsdiqləyəcək).`);
    setDeleteDialog(null);
  };


  // "Other" (təyin edən başqasıdır) hədəf-ların çəkisi sonra təyin ediləcək — toplamaya daxil etmirik.
  const totalSubWeight = newKpi.subKpis.filter(sk => sk.assignerMode !== "other").reduce((s, sk) => s + sk.weight, 0);

  const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];

  // Pre-fill form when editing a card
  useEffect(() => {
    if (editingCardId === null) return;
    const card = kpiCards.find(c => c.id === editingCardId);
    if (!card) return;
    const teams = getTeams();
    const matchedTeam = teams.find(t =>
      [t.leader, ...t.members.map(m => m.name)].includes(card.responsible)
    );
    setNewKpi({
      name: card.name,
      types: [card.type],
      department: card.department,
      subdivision: card.subdivision,
      group: card.group,
      minTarget: String(card.minTarget),
      minTargetAbs: "",
      assignedPositions: [],
      generalTarget: card.generalTarget || `${card.target} ${card.unit}`.trim(),
      selectedFormula: card.formula,
      periodType: (card.frequency === "Aylıq" || card.frequency === "Rüblük" || card.frequency === "İllik") ? card.frequency as "Aylıq" | "Rüblük" | "İllik" : "Aylıq",
      periodYear: "2026",
      periodMonth: "01",
      periodQuarter: "Q1",
      assignToIndividual: false,
      assignedUser: card.responsible,
      teamIds: matchedTeam ? [matchedTeam.id] : [],
      sharedKpi: false,
      targetMode: { individual: false, team: matchedTeam != null, structure: false, position: false },
      structurePath: [],
      period: { type: "Aylıq" } as PeriodValue,
      subKpis: card.subKpis ? card.subKpis.map(sk => ({ id: sk.id, name: sk.name, target: sk.target, weight: sk.weight, unit: sk.unit, evaluator: sk.evaluator })) : [],
      approvalChain: [
        { role: "Şöbə Müdiri", persons: [] as string[] },
        { role: "Departament Direktoru", persons: [] as string[] },
        { role: "Kurator", persons: [] as string[] },
        { role: "HR", persons: [] as string[] },
      ],
    });
    setTargetError("");
  }, [editingCardId]);

  return (
    <div className="min-h-screen">
      <Header title="KPİ-lar" />
      <main className="p-6 pb-24">
        <PageHero
          badge="KPİ İdarəetməsi"
          icon={Sparkles}
          title="KPİ-lar"
          subtitle={`${filteredCards.length} aktiv KPİ tapıldı`}
          right={
            <div className="flex gap-2">
              <ExportMenu
                getData={() => ({
                  title: "KPI Kartları",
                  fileName: `kpi-kartlari-${new Date().toISOString().slice(0, 10)}`,
                  headers: ["Ad", "Departament", "Komanda", "Məsul", "Tip", "Dövr", "Hədəf", "Cari", "Vahid", "Progress %", "Min Hədəf %", "Status", "Fərdi", "Dondurulmuş"],
                  rows: filteredCards.map(c => [
                    c.name, c.department, c.group, c.responsible, c.type, c.period,
                    c.target, c.current, c.unit, c.progress, c.minTarget,
                    c.approvalStatus === "approved" ? "Təsdiqlənib" : "Gözləyir",
                    c.isPersonal ? "Bəli" : "Xeyr",
                    c.frozen ? "Bəli" : "Xeyr",
                  ]),
                })}
              />
            </div>
          }
        />

        {onBack && (
          <div className="flex items-center gap-2 mb-4">
            <button onClick={onBack} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:bg-secondary text-foreground">
              ← Geri
            </button>
          </div>
        )}


        {!forcedKartView && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {[
            { key: "kart1", title: "KART 1 – Kartlar üzrə", desc: "KPİ-ları kart strukturuna görə qruplaşdırılmış göstər", icon: LayoutGrid, grad: "from-violet-500/15 via-fuchsia-500/10 to-transparent", iconBg: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
            { key: "kart2", title: "KART 2 – Əməkdaşlar üzrə", desc: "KPİ-ları məsul əməkdaşlara görə qruplaşdırılmış göstər", icon: Users, grad: "from-amber-500/15 via-orange-500/10 to-transparent", iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
          ].map(c => {
            const Icon = c.icon as any;
            const active = kartView === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setKartView(c.key as "kart1" | "kart2")}
                className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${c.grad} bg-card p-4 text-left transition-all hover:shadow-md ${active ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl ${c.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
                  </div>
                  {active && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary text-primary-foreground">Aktiv</span>}
                </div>
              </button>
            );
          })}
        </div>
        )}

        {/* Inline filter bar — applies to both Kart1 (table) and Kart2 (grouped) */}
        {(kartView === "kart1" || kartView === "kart2") && (
          <div className="mb-4 bg-card border border-border rounded-xl p-3 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[11px] text-muted-foreground">Axtar</label>
              <div className="relative mt-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="KPI adı ilə axtar..." className="w-full pl-7 pr-3 py-2 text-sm border border-border rounded-lg bg-background" />
              </div>
            </div>
            <div className="min-w-[140px]">
              <label className="text-[11px] text-muted-foreground">Təyinat növü</label>
              <select
                value={filterAssignKind}
                onChange={e => {
                  const v = e.target.value as "Hamısı" | "Fərdi" | "Toplu";
                  setFilterAssignKind(v);
                  if (v !== "Toplu") { setFilterBulkKind("Hamısı"); setFilterTeamId(null); }
                }}
                className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
              >
                <option>Hamısı</option>
                <option>Fərdi</option>
                <option>Toplu</option>
              </select>
            </div>
            <div className="min-w-[180px]">
              <label className="text-[11px] text-muted-foreground">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background">
                <option>Hamısı</option>
                <option>Qaralama</option>
                <option>Natamam</option>
                <option>Təsdiq gözlənilir</option>
                <option>İmtina</option>
                <option>Aktiv</option>
                <option>Qiymətləndirmə</option>
                <option>Tamamlanıb</option>
                <option>Ləğv olundu</option>
              </select>
            </div>
            <button onClick={() => { resetFilters(); setFilterAssignKind("Hamısı"); setFilterBulkKind("Hamısı"); }} className="px-4 py-2 text-sm rounded-lg border border-border bg-card hover:bg-secondary">Sıfırla</button>
          </div>
        )}

        <div>
          <div className="flex-1">

            {kartView === "kart1" && forcedKartView === "kart1" ? (() => {
              // Status-based table for "Kartlar üzrə"
              return (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Kartlar üzrə</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{filteredCards.length} KPİ kartı · Statuslara görə</p>
                    </div>
                    <button
                      onClick={() => { setEditingCardId(null); setWizardOpen(true); }}
                      className="flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                      <Plus className="w-5 h-5" /> Yeni KPI Kartı
                    </button>
                  </div>
                  <DataTable<KpiCard>
                    rows={filteredCards}
                    rowKey={(c) => c.id}
                    storageKey="kpi-cards-main"
                    emptyMessage="Filtrə uyğun KPİ tapılmadı"
                    columns={[
                      { key: "name", label: "Ad", filterType: "text", accessor: (c) => withKartSuffix(c.name), render: (c) => <span className="font-medium text-foreground">{withKartSuffix(c.name)}</span> },
                      { key: "kind", label: "Təyinat növü", filterType: "select", selectOptions: ["Fərdi", "Toplu"], accessor: (c) => getAssignKindFor(c.id), render: (c) => <span className="text-muted-foreground text-xs">{getAssignKindFor(c.id)}</span> },
                      { key: "created", label: "Yaranma tarixi", filterType: "date", accessor: (c) => getCreatedAtFor(c.id), render: (c) => <span className="text-muted-foreground text-xs">{getCreatedAtFor(c.id)}</span> },
                      { key: "period", label: "Dövr", filterType: "text", accessor: (c) => c.period, render: (c) => <span className="text-muted-foreground text-xs">{c.period}</span> },
                      { key: "progress", label: "Progress", filterType: "number", accessor: (c) => c.progress, render: (c) => `${c.progress}%` },
                      {
                        key: "status", label: "Status", filterType: "select",
                        selectOptions: Object.values(STATUS_LABELS),
                        accessor: (c) => STATUS_LABELS[getStatusFor(c.id).status],
                        render: (c) => {
                          const st = getStatusFor(c.id);
                          return (
                            <button
                              onClick={() => setStatusDialogCardId(c.id)}
                              className={`text-[11px] font-medium px-2.5 py-1 rounded-full border min-w-[128px] w-[128px] text-center inline-flex items-center justify-center cursor-pointer hover:opacity-80 ${STATUS_STYLES[st.status]}`}
                              title="Ətraflı bax"
                            >
                              {STATUS_LABELS[st.status]}
                            </button>
                          );
                        }
                      },
                      {
                        key: "ops", label: "Əməliyyat", filterType: "none", align: "center", width: 180,
                        render: (card) => {
                          const st = getStatusFor(card.id);
                          return (
                            <div className="flex items-center gap-1 justify-start">
                              <button
                                onClick={(e) => { e.stopPropagation(); openDetail(card); }}
                                title="Bax"
                                className="p-1.5 rounded border border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {st.status !== "aktiv" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); openWizardForEdit(card.id); }}
                                  title="Redaktə et"
                                  className="p-1.5 rounded border border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const newId = Math.max(0, ...kpiCards.map(c => c.id)) + 1;
                                  const copy: KpiCard = { ...card, id: newId, name: `${withKartSuffix(card.name)} (kopya)`, approvalStatus: "pending" };
                                  setKpiCards(prev => [copy, ...prev]);
                                  try {
                                    await upsertStatus({ card_id: newId, status: "natamam", use_matrix: false, submitted_for_approval: false, assignees: [] });
                                    const mod = await import("@/lib/kpiCardStatusStore");
                                    const next = await mod.fetchAllStatuses();
                                    setStatusMap(next);
                                  } catch {}
                                  toast.success("Kart kopyalandı (Natamam)");
                                }}
                                title="Kopyala"
                                className="p-1.5 rounded border border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              {st.status === "imtina" && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!confirm(`"${withKartSuffix(card.name)}" kartı tamamən ləğv olunsun? Bu əməliyyat "Ləğv olundu" statusuna keçirəcək.`)) return;
                                    setStatusMap(prev => ({
                                      ...prev,
                                      [card.id]: {
                                        ...(prev[card.id] || {}),
                                        card_id: card.id,
                                        status: "legv_olundu",
                                        use_matrix: false,
                                        submitted_for_approval: false,
                                        rejected_by: null,
                                        rejected_at: null,
                                        assignees: [],
                                        updated_at: new Date().toISOString(),
                                      } as any,
                                    }));
                                    try {
                                      await upsertStatus({ card_id: card.id, status: "legv_olundu" as any, use_matrix: false, submitted_for_approval: false, assignees: [] });
                                      const mod = await import("@/lib/kpiCardStatusStore");
                                      const next = await mod.fetchAllStatuses();
                                      setStatusMap(prev => ({ ...prev, ...next }));
                                    } catch {}
                                    toast.success("Kart ləğv olundu");
                                    try {
                                      const nmod = await import("@/lib/notificationsStore");
                                      const draft = cardDrafts[card.id];
                                      const assigners = new Set<string>();
                                      draft?.targets?.forEach(t => { if (t.assigner) assigners.add(t.assigner); });
                                      assigners.forEach(a => nmod.pushNotification?.({
                                        toEmployeeName: a, kind: "info",
                                        message: `"${withKartSuffix(card.name)}" KPI kartı HR tərəfindən tamamən ləğv olundu.`
                                      } as any));
                                    } catch {}
                                  }}
                                  title="Ləğv et"
                                  className="p-1.5 rounded border border-slate-500/40 hover:bg-slate-500/10 text-slate-700 dark:text-slate-300"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteCard(card); }}
                                title="Sil"
                                className="p-1.5 rounded border border-rose-500/30 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        }
                      },
                    ]}
                  />

                  </div>
              );
            })() : kartView === "kart2" ? (() => {
              // Aggregate KPI stats per employee (by responsible full-name match)
              const norm = (s: string) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
              const emps = getEmployees().filter((e: any) => e.active);
              const perEmp = new Map<number, { count: number; sumProgress: number }>();
              emps.forEach((e: any) => perEmp.set(e.id, { count: 0, sumProgress: 0 }));
              const empByName = new Map<string, any>();
              emps.forEach((e: any) => {
                empByName.set(norm(`${e.firstName} ${e.lastName}`), e);
                empByName.set(norm(`${e.lastName} ${e.firstName}`), e);
              });
              filteredCards.forEach(c => {
                const e = empByName.get(norm(c.responsible || ""));
                if (!e) return;
                const cur = perEmp.get(e.id)!;
                cur.count += 1;
                cur.sumProgress += Number(c.progress) || 0;
              });
              const rows = emps.map((e: any) => {
                const st = perEmp.get(e.id)!;
                return {
                  id: e.id,
                  name: [e.firstName, e.lastName].filter(Boolean).join(" "),
                  position: e.positionName || "Əməkdaş",
                  count: st.count,
                  avg: st.count > 0 ? Math.round(st.sumProgress / st.count) : 0,
                };
              });

              return (
                <div className="space-y-4">
                  {/* Görünüş toggle */}
                  <div className="flex items-center justify-end">
                    <div className="inline-flex items-center rounded-lg border border-border bg-card p-1 shadow-sm">
                      <button
                        onClick={() => setKart2SubView("structure")}
                        className={`px-4 py-1.5 text-sm rounded-md transition-colors ${kart2SubView === "structure" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                      >
                        Struktur üzrə
                      </button>
                      <button
                        onClick={() => setKart2SubView("employees")}
                        className={`px-4 py-1.5 text-sm rounded-md transition-colors ${kart2SubView === "employees" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                      >
                        Əməkdaşlar üzrə
                      </button>
                    </div>
                  </div>

                  {kart2SubView === "structure" ? (
                    <EmployeesTreeView
                      cards={filteredCards.map(c => ({ responsible: c.responsible, progress: c.progress }))}
                      onOpenEmployee={(name) => setEmployeeDrilldown(name)}
                    />
                  ) : (
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[720px]">
                          <thead className="bg-secondary/40 text-muted-foreground">
                            <tr className="text-left">
                              <th className="px-4 py-3 font-medium">Əməkdaşın A.S.A.</th>
                              <th className="px-4 py-3 font-medium">Vəzifə</th>
                              <th className="px-4 py-3 font-medium text-center w-40">KPI kartlarının sayı</th>
                              <th className="px-4 py-3 font-medium w-56">Ortalama Progress</th>
                              <th className="px-4 py-3 font-medium text-right w-56">Əməliyyat</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.length === 0 ? (
                              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">Əməkdaş tapılmadı.</td></tr>
                            ) : rows.map(r => (
                              <tr key={r.id} className="border-t border-border hover:bg-secondary/20 transition-colors">
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                                      {r.name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-foreground truncate">{r.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-xs text-muted-foreground truncate">{r.position}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className="inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                    {r.count}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                                      <div
                                        className={`h-full transition-all duration-500 ${r.avg >= 90 ? "bg-emerald-500" : r.avg >= 75 ? "bg-amber-500" : "bg-rose-500"}`}
                                        style={{ width: `${Math.min(r.avg, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-xs tabular-nums font-medium w-9 text-right">{r.avg}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <button
                                    onClick={() => setEmployeeDrilldown(r.name)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Kartlara detallı bax
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })() : (() => {
              const approvedCards = filteredCards.filter(c => c.approvalStatus === "approved" && !c.frozen);
              const pendingCards = filteredCards.filter(c => c.approvalStatus === "pending" && !c.frozen);
              const frozenCards = filteredCards.filter(c => c.frozen);

              const renderCard = (card: KpiCard) => {
                const locked = card.approvalStatus === "approved";
                return (
                  <div key={card.id} onClick={() => openDetail(card)} className={`bg-card rounded-xl p-5 border-2 border-border cursor-pointer hover:shadow-md hover:border-primary/40 transition-shadow relative group ${card.frozen ? "opacity-70" : ""}`}>
                    <button
                      disabled={locked}
                      onClick={(e) => { e.stopPropagation(); if (locked) return; openWizardForEdit(card.id); }}
                      title={locked ? "Təsdiqlənmiş KPI-ı redaktə etmək mümkün deyil" : "Redaktə et"}
                      className={`absolute top-3 right-11 w-7 h-7 rounded-md bg-card border border-border opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10 ${locked ? "cursor-not-allowed opacity-30 group-hover:opacity-40" : "hover:bg-secondary"}`}
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCard(card); }}
                      title={card.approvalStatus === "approved" ? "Silmək üçün təsdiqləmə matrisindən təsdiq tələb olunur" : "Sil"}
                      className="absolute top-3 right-3 w-7 h-7 rounded-md bg-card border border-border opacity-0 group-hover:opacity-100 hover:bg-destructive/10 flex items-center justify-center transition-opacity z-10"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        {card.approvalStatus === "approved" ? <CheckCircle2 className="w-5 h-5 text-zone-green-text" /> : <Hourglass className="w-5 h-5 text-zone-yellow-text" />}
                      </div>
                      <div className="flex items-center gap-1 mr-[72px] flex-wrap justify-end">
                        {card.isPersonal && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">Fərdi</span>}
                        {card.frozen && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">Dondurulmuş</span>}
                      </div>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-2">{withKartSuffix(card.name)}</h3>
                    <div className="space-y-1 mb-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Hədəf</span>
                        <span className="font-bold text-sm text-foreground">{card.target} {card.unit}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Cari</span>
                        <span className="font-bold text-sm text-success">{card.current} {card.unit}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">Progress</span>
                      <span className="text-xs font-semibold text-success">{card.progress}%</span>
                    </div>
                    <div className="relative w-full mt-1 group"
                      onMouseEnter={() => setHoveredMinTarget(card.id)}
                      onMouseLeave={() => setHoveredMinTarget(null)}
                    >
                      <div className="w-full bg-secondary rounded-full h-2.5">
                        <div className="bg-success rounded-full h-2.5" style={{ width: `${card.progress}%` }} />
                      </div>
                      <div
                        className="absolute top-0 h-2.5 w-1 rounded-full"
                        style={{
                          left: `${card.minTarget}%`,
                          background: 'linear-gradient(to bottom, hsl(var(--warning)), hsl(var(--destructive)))',
                          boxShadow: '0 0 4px hsl(var(--warning) / 0.6)',
                        }}
                      />
                      {hoveredMinTarget === card.id && (
                        <div
                          className="absolute -top-8 px-2 py-1 text-xs font-medium bg-foreground text-background rounded shadow-lg whitespace-nowrap z-10"
                          style={{ left: `${card.minTarget}%`, transform: 'translateX(-50%)' }}
                        >
                          Min. hədəf: {card.minTarget}%
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>{card.responsible}</span>
                      <span>{card.period}</span>
                    </div>
                  </div>
                );
              };

              const Pager = ({ page, setPage, total }: { page: number; setPage: (n: number) => void; total: number }) => {
                const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
                const cur = Math.min(page, pages);
                return (
                  <div className="flex items-center gap-1 justify-center mb-4">
                    <button onClick={() => setPage(Math.max(1, cur - 1))} disabled={cur <= 1} className="w-8 h-8 flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-secondary disabled:opacity-40">‹</button>
                    {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 text-sm rounded-md border ${p === cur ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-foreground hover:bg-secondary"}`}>{p}</button>
                    ))}
                    <button onClick={() => setPage(Math.min(pages, cur + 1))} disabled={cur >= pages} className="w-8 h-8 flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-secondary disabled:opacity-40">›</button>
                  </div>
                );
              };

              const Column = ({ title, count, items, page, setPage }: { title: string; count: number; items: KpiCard[]; page: number; setPage: (n: number) => void }) => {
                const start = (page - 1) * PAGE_SIZE;
                const slice = items.slice(start, start + PAGE_SIZE);
                return (
                  <div className="flex flex-col">
                    <div className="flex items-center justify-center mb-3">
                      <h3 className="text-lg font-bold text-foreground text-center tracking-tight">{title} <span className="text-muted-foreground font-semibold">({count})</span></h3>
                    </div>
                    <Pager page={page} setPage={setPage} total={count} />
                    <div className="space-y-4">
                      {slice.length === 0 ? (
                        <div className="text-xs text-muted-foreground bg-card border border-dashed border-border rounded-xl p-6 text-center">Bu kateqoriyada KPI yoxdur</div>
                      ) : slice.map(renderCard)}
                    </div>
                  </div>
                );
              };

              if (viewMode === "list") {
                const listFiltered = filteredCards.filter(c => c.name.toLowerCase().includes(listSearch.toLowerCase()) || c.responsible.toLowerCase().includes(listSearch.toLowerCase()));
                return (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <DataTable<KpiCard>
                      rows={listFiltered}
                      rowKey={(c) => c.id}
                      storageKey="kpi-cards-list"
                      emptyMessage="Nəticə yoxdur"
                      toolbarLeft={
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="KPI və ya məsul şəxs ilə axtar..." className="pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background w-64" />
                        </div>
                      }
                      columns={[
                        { key: "name", label: "Ad", filterType: "text", accessor: (c) => withKartSuffix(c.name), render: (c) => <span className="font-medium text-foreground cursor-pointer" onClick={() => openDetail(c)}>{withKartSuffix(c.name)}</span> },
                        { key: "type", label: "Tip", filterType: "text", accessor: (c) => c.type, render: (c) => <span className="text-muted-foreground">{c.type}</span> },
                        { key: "resp", label: "Məsul", filterType: "text", accessor: (c) => c.responsible, render: (c) => <span className="text-muted-foreground">{c.responsible}</span> },
                        { key: "target", label: "Hədəf", filterType: "text", accessor: (c) => `${c.target} ${c.unit}` },
                        { key: "current", label: "Cari", filterType: "text", accessor: (c) => `${c.current} ${c.unit}` },
                        { key: "progress", label: "Progress", filterType: "number", accessor: (c) => c.progress, render: (c) => `${c.progress}%` },
                        { key: "status", label: "Status", filterType: "select", selectOptions: ["Təsdiqlənib", "Gözləyir"], accessor: (c) => c.approvalStatus === "approved" ? "Təsdiqlənib" : "Gözləyir" },
                      ]}
                    />
                  </div>

                );
              }

              return (
                <div className="grid grid-cols-3 gap-4 items-start">
                  <Column title="Təsdiqlənmişlər" count={approvedCards.length} items={approvedCards} page={approvedPage} setPage={setApprovedPage} />
                  <Column title="Təsdiq Gözləyənlər" count={pendingCards.length} items={pendingCards} page={pendingPage} setPage={setPendingPage} />
                  <Column title="Dondurulmuşlar" count={frozenCards.length} items={frozenCards} page={frozenPage} setPage={setFrozenPage} />
                </div>
              );
            })()}
          </div>
        </div>

      </main>

      {/* Employee drilldown — list of KPI cards belonging to this person */}
      <Dialog open={employeeDrilldown !== null} onOpenChange={(o) => !o && setEmployeeDrilldown(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{employeeDrilldown} — KPI kartları</DialogTitle>
          </DialogHeader>
          {employeeDrilldown && (() => {
            const cards = filteredCards.filter(c => (c.responsible || "Təyin olunmayıb") === employeeDrilldown);
            if (cards.length === 0) return <p className="text-sm text-muted-foreground py-4">Kart tapılmadı.</p>;
            return (
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
                {cards.map(card => {
                  const st = getStatusFor(card.id);
                  return (
                    <div key={card.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-foreground truncate">{withKartSuffix(card.name)}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[st.status]}`}>{STATUS_LABELS[st.status]}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{card.period} · Hədəf {card.target} {card.unit} · Cari {card.current} {card.unit}</div>
                        <div className="w-full bg-secondary rounded-full h-1.5 mt-1.5"><div className="bg-emerald-500 rounded-full h-1.5" style={{ width: `${card.progress}%` }} /></div>
                      </div>
                      <button
                        onClick={() => { setEmployeeDrilldown(null); openDetail(card); }}
                        className="p-1.5 rounded border border-border hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0"
                        title="Bax"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialogCardId !== null} onOpenChange={(o) => !o && setStatusDialogCardId(null)}>
        <DialogContent className="max-w-md">
          {statusDialogCardId !== null && (() => {
            const st = getStatusFor(statusDialogCardId);
            const card = kpiCards.find(c => c.id === statusDialogCardId);
            const draft = cardDrafts[statusDialogCardId];
            const evaluators: { role: string; name: string }[] = [];
            (card?.subKpis || []).forEach(sk => {
              const ev = (sk as any).evaluator;
              if (ev?.type === "person" && Array.isArray(ev.persons)) {
                ev.persons.forEach((p: any) => evaluators.push({ role: `${sk.name} · qiymətləndirici`, name: p.name }));
              } else if (ev?.type === "self") {
                evaluators.push({ role: `${sk.name} · özü qiymətləndirir`, name: card?.responsible || "—" });
              } else if (ev?.type === "integration") {
                evaluators.push({ role: `${sk.name} · inteqrasiya`, name: ev.integrationName || "Sistem" });
              }
            });

            const cfg: Record<string, { title: string; empty: string; rows: { role: string; name: string; tone?: "ok" | "wait" | "err" }[] }> = {
              qaralama:        { title: "Qaralama — hazırlanır", empty: "Kart yaradılıb, hələ təyinə göndərilməyib.", rows: [{ role: "Yaradan", name: card?.responsible || "—", tone: "wait" }] },
              natamam:         { title: "Təyin edənlər", empty: "Təyin edənlər tapılmadı.", rows: (st.assignees || []).map(a => ({ role: "Təyin edən", name: a.name, tone: a.ok ? "ok" : "err" })) },
              tesdiq_gozlenilir: { title: "Təsdiqləyəcək şəxslər", empty: "Təsdiq zənciri təyin edilməyib.", rows: [] },
              imtina:          { title: "İmtina edən", empty: "—", rows: [{ role: (st as any).rejected_by || "Təsdiq mərhələsi", name: (st as any).rejection_reason || "İmtina edildi", tone: "err" }] },
              aktiv:           { title: "İcra edən əməkdaşlar", empty: "Bu kart üçün icraçı tapılmadı.", rows: (st.assignees || []).map(a => ({ role: "İcraçı", name: a.name, tone: "ok" })) },
              qiymetlendirme:  { title: "Qiymətləndirəcək şəxslər", empty: "Qiymətləndirici təyin edilməyib.", rows: evaluators.map(e => ({ ...e, tone: "wait" as const })) },
              tamamlanib:      { title: "Tamamlanıb — qiymətləndirənlər", empty: "—", rows: evaluators.map(e => ({ ...e, tone: "ok" as const })) },
              legv_olundu:     { title: "Ləğv olunub", empty: "—", rows: [{ role: "Ləğv edən", name: card?.responsible || "—", tone: "err" }] },
            };

            if (st.status === "tesdiq_gozlenilir") {
              const chain = (draft as any)?.approvalChain || (card as any)?.approvalChain || [];
              chain.forEach((c: any) => (c.persons || []).forEach((p: string) => cfg.tesdiq_gozlenilir.rows.push({ role: c.role, name: p, tone: "wait" })));
              if (cfg.tesdiq_gozlenilir.rows.length === 0) {
                cfg.tesdiq_gozlenilir.rows.push({ role: "Şöbə Müdiri", name: "Abbas Əliyev Aqil", tone: "wait" });
                cfg.tesdiq_gozlenilir.rows.push({ role: "HR Admin", name: "Super Adminov Blink", tone: "wait" });
              }
            }

            const c = cfg[st.status] || cfg.qaralama;
            const toneCls = {
              ok:   "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              wait: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
              err:  "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
            };
            const badgeText = {
              ok: "Tamamlanıb", wait: "Gözlənilir", err: "Tamamlanmayıb",
            } as const;

            return (
              <>
                <DialogHeader>
                  <DialogTitle>{c.title}</DialogTitle>
                </DialogHeader>
                {c.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">{c.empty}</p>
                ) : (
                  <ul className="space-y-2 py-2">
                    {c.rows.map((r, i) => (
                      <li key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${toneCls[r.tone || "wait"]}`}>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">{i + 1}. {r.name}</span>
                          <span className="text-[11px] text-muted-foreground truncate">{r.role}</span>
                        </div>
                        <span className="text-xs font-medium shrink-0 ml-2">{badgeText[r.tone || "wait"]}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* KPI Detail Dialog */}
      <Dialog open={!!selectedKpi} onOpenChange={() => setSelectedKpi(null)}>
        <DialogContent className="w-[90vw] max-w-[1500px] h-[88vh] min-h-[88vh] max-h-[88vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b border-border">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">{withKartSuffix(selectedKpi?.name)}</DialogTitle>
              {/* zone badge removed */}
            </div>
          </DialogHeader>

          {selectedKpi && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="px-6 pt-4 space-y-4 shrink-0">
              {(() => {
                const st = getStatusFor(selectedKpi.id);
                if (st.status !== "imtina") return null;
                const reason = (st as any).rejection_reason || `${st.rejected_by || "Təsdiq mərhələsi"} tərəfindən imtina edildi`;
                return (
                  <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-rose-700 dark:text-rose-400">İmtina səbəbi</div>
                      <div className="text-sm text-foreground mt-0.5">{reason}</div>
                    </div>
                    <button
                      onClick={() => { const id = selectedKpi.id; setSelectedKpi(null); openWizardForEdit(id); }}
                      className="px-3 py-1.5 text-xs rounded border border-rose-500/40 bg-white dark:bg-background hover:bg-rose-500/10 text-rose-700 dark:text-rose-400 font-medium inline-flex items-center gap-1 shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Redaktə et
                    </button>
                  </div>
                );
              })()}

              <div className="flex gap-2 border-b border-border overflow-x-auto">
                {(() => {
                  const hasMatrix = !!selectedKpi.matrixId;
                  const allTabs = [["general", "Ümumi"], ["bsc", "Balanced Scorecard"], ["lifecycle", "Lifecycle"], ["history", "Tarixçə"], ["team", "KPI Üzvləri"], ["comments", "Şərhlər"], ["status", "Təsdiqləmə Zənciri"], ["setStatus", "Set Statusu"]] as const;
                  const tabs = allTabs.filter(([k]) => k !== "status" || hasMatrix);
                  return tabs.map(([key, label]) => (
                    <button key={key} onClick={() => setDetailTab(key as any)} className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${detailTab === key ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>{label}</button>
                  ));
                })()}
              </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-4 space-y-4">
              {detailTab === "bsc" && <BscScorecardTab kpi={selectedKpi} />}
              {detailTab === "lifecycle" && (() => {
                const st = getStatusFor(selectedKpi.id).status;
                const lc = st === "qaralama"
                  ? (getLifecycle(selectedKpi.id) || null)
                  : getLifecycleWithFallback(selectedKpi.id, withKartSuffix(selectedKpi.name), {
                      startDate: selectedKpi.startDate, endDate: selectedKpi.endDate, frequency: selectedKpi.frequency,
                    });
                return <LifecycleView lifecycle={lc} />;
              })()}
              {isExtraTab(detailTab) && <KpiExtraTabContent kpi={selectedKpi} tab={detailTab} />}

              {detailTab === "general" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card rounded-lg border border-border p-4">
                      <h4 className="font-semibold text-foreground mb-3">Əsas Məlumatlar</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Məsul Şəxs:</span><span className="font-medium">{selectedKpi.responsible}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Təyinat:</span><span className="font-medium">{getAssignKindFor(selectedKpi.id)}{(() => { const d = cardDrafts[selectedKpi.id]; if (!d || d.mode !== "bulk") return ""; const bs = d.bulkSelections; const parts: string[] = []; if (bs.teams?.length) parts.push(`Komandalar: ${bs.teams.join(", ")}`); if (bs.positions?.length) parts.push(`Vəzifələr: ${bs.positions.join(", ")}`); if (bs.structures?.length) parts.push(`Strukturlar: ${bs.structures.length}`); if (bs.persons?.length) parts.push(`Şəxslər: ${bs.persons.join(", ")}`); return parts.length ? ` — ${parts.join(" · ")}` : ""; })()}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Başlama:</span><span className="font-medium">{selectedKpi.startDate}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Bitmə:</span><span className="font-medium">{selectedKpi.endDate}</span></div>
                      </div>
                    </div>
                    {(() => {
                      const own = selectedKpi.subKpis || [];
                      const entries = selectedKpi.id ? getEntriesForCard(selectedKpi.id) : [];
                      const ownIds = new Set(own.map(s => s.id));
                      const extras = entries
                        .filter(e => e.subKpiName && !ownIds.has(e.subKpiId))
                        .map(e => ({ id: e.subKpiId, name: e.subKpiName, target: e.target, unit: e.unit, weight: 0, current: "", progress: undefined, evaluator: undefined as any, _fromSet: true, _assignee: e.assigneeName }));
                      const merged = [...own.map(s => ({ ...s, _fromSet: false as boolean, _assignee: "" })), ...extras];
                      if (merged.length === 0) return null;
                      return (
                      <div className="bg-card rounded-lg border border-border p-4">
                        <h4 className="font-semibold text-foreground mb-3">Hədəflər</h4>
                        <div className="space-y-2">
                          {merged.map(sk => (
                            <div key={sk.id} className="p-2 rounded-lg bg-secondary">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium text-foreground flex items-center gap-2">
                                  {sk.name}
                                  {sk._fromSet && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">KPI Set</span>}
                                </span>
                                {sk.weight ? <span className="text-xs text-muted-foreground">Çəki: {sk.weight}%</span> : null}
                              </div>
                               <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                 <span>Dəyər: {sk.target}{sk.unit ? ` (${sk.unit})` : ""}</span>
                                 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium">
                                   Cari vəziyyət: {sk.current && String(sk.current).trim() !== "" ? `${sk.current}${sk.unit ? ` ${sk.unit}` : ""}` : "—"}
                                 </span>
                                 <span>{sk._fromSet ? `Təyin edici: ${sk._assignee}` : ""}</span>
                               </div>
                              {sk.evaluator?.type && (
                                <div className="text-[11px] text-muted-foreground mt-1">
                                  Qiymətləndirici ({sk.evaluator.type}): {sk.evaluator.type === "self" ? "Özü" : sk.evaluator.type === "integration" ? `${sk.evaluator.integrationName} (${sk.evaluator.integrationWeight ?? 100}%)` : sk.evaluator.persons.map((p: any) => `${p.name} ${p.weight}%`).join(", ")}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      );
                    })()}
                  </div>
                </>
              )}


              {detailTab === "history" && (
                <div className="bg-card rounded-lg border border-border p-4">
                  <h4 className="font-semibold text-foreground mb-4">Dəyişiklik Tarixçəsi</h4>
                  <div className="space-y-3">
                    {selectedKpi.history.map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Calendar className="w-4 h-4 text-primary" /></div>
                          <div><p className="text-sm font-medium text-foreground">{h.date}</p><p className="text-xs text-muted-foreground">Dəyər: {h.value}</p></div>
                        </div>
                        <div className={`flex items-center gap-1 text-sm font-semibold ${h.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {h.change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {h.change >= 0 ? '+' : ''}{h.change}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailTab === "team" && (
                <div className="bg-card rounded-lg border border-border p-4">
                  <h4 className="font-semibold text-foreground mb-4">KPI Üzvləri</h4>
                  <div className="space-y-3">
                    {selectedKpi.team.map((m, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">{m.avatar}</div>
                          <div><p className="text-sm font-medium text-foreground">{m.name}</p><p className="text-xs text-muted-foreground">{m.role}</p></div>
                        </div>
                        {i === 0 && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-zone-green-bg text-zone-green-text">Lider</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailTab === "setStatus" && (() => {
                const own = selectedKpi.subKpis || [];
                const entries = selectedKpi.id ? getEntriesForCard(selectedKpi.id) : [];
                const ownIds = new Set(own.map(s => s.id));
                const extras = entries
                  .filter(e => e.subKpiName && !ownIds.has(e.subKpiId))
                  .map(e => ({ id: e.subKpiId, name: e.subKpiName, assignee: e.assigneeName, isSet: true as const }));
                let merged = [
                  ...own.map(s => ({ id: s.id, name: s.name, assignee: (s as any)?.evaluator?.persons?.[0]?.name || selectedKpi.responsible || "—", isSet: false as const })),
                  ...extras,
                ];
                // Fallback: hər kartın minimum 1 hədəfi olmalıdır — sintez et
                if (merged.length === 0) {
                  merged = [{ id: 1, name: selectedKpi.name, assignee: selectedKpi.responsible || "—", isSet: false as const }];
                }
                const cardStatus = getStatusFor(selectedKpi.id).status;
                const isActive = cardStatus === "aktiv";
                const isDraft = cardStatus === "natamam";
                return (
                  <div className="bg-card rounded-lg border border-border p-4">
                    <h4 className="font-semibold text-foreground mb-4">Hədəf Set Statusu</h4>
                    <div className="space-y-2">
                      {merged.map((h, idx) => {
                        // Status per row derives from KPI card status:
                        //  aktiv → Tamamlanıb (yaşıl), natamam → Natamam (bozu), digərləri → Set edilib/Gözləyir seed məntiqi
                        const badge = isActive
                          ? { cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", icon: <CheckCircle className="w-3 h-3" />, text: "Tamamlanıb" }
                          : isDraft
                          ? { cls: "bg-muted text-muted-foreground border-border", icon: <Clock className="w-3 h-3" />, text: "Natamam" }
                          : h.isSet
                          ? { cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", icon: <CheckCircle className="w-3 h-3" />, text: "Set edilib" }
                          : { cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", icon: <Clock className="w-3 h-3" />, text: "Gözləyir" };
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{h.name}</p>
                              <p className="text-xs text-muted-foreground">Təyin edən: {h.assignee || "—"}</p>
                            </div>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border inline-flex items-center gap-1 ${badge.cls}`}>{badge.icon} {badge.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {detailTab === "status" && (() => {
                const matrixId = selectedKpi.matrixId || null;
                const matrix = matrixId ? getApprovalMatrices().find(m => m.id === matrixId) : null;
                if (!matrix) {
                  return (
                    <div className="bg-card rounded-lg border border-border p-4 text-sm text-muted-foreground">
                      Bu KPI kartı üçün təsdiqləmə matrisi seçilməyib.
                    </div>
                  );
                }
                const isApproved = selectedKpi.approvalStatus === "approved";
                const status = getStatusFor(selectedKpi.id).status;
                const totalSteps = matrix.steps.length;
                // Sadə render: aktivdirsə bütün addımlar approved; təsdiq gözləyirsə ilk addım pending
                const chain = matrix.steps.map((s, i) => {
                  const people = s.assignees.map(a => formatAssignee(a)).join(", ") || s.label;
                  let stStatus: "approved" | "pending" | "waiting" = "waiting";
                  if (isApproved || status === "aktiv" || status === "tamamlanib" || status === "qiymetlendirme") stStatus = "approved";
                  else if (status === "tesdiq_gozlenilir" && i === 0) stStatus = "pending";
                  return { role: s.label, person: people, status: stStatus };
                });
                const completedSteps = chain.filter(s => s.status === "approved").length;
                const currentStepIndex = chain.findIndex(s => s.status === "pending");
                const overallStatus = isApproved ? "Təsdiq edilib" : "Təsdiq gözləyir";
                const statusColor = overallStatus === "Təsdiq edilib" ? "bg-zone-green-bg text-zone-green-text" : "bg-zone-yellow-bg text-zone-yellow-text";

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-secondary rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Matris</p><p className="text-sm font-semibold text-foreground mt-1">{matrix.name}</p></div>
                      <div className="bg-secondary rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Ümumi Status</p><span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusColor}`}>{overallStatus}</span></div>
                      <div className="bg-secondary rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Progress</p><p className="text-lg font-bold text-foreground mt-1">{completedSteps}/{totalSteps}</p></div>
                    </div>
                    <div className="bg-card rounded-lg border border-border p-4">
                      <h4 className="font-semibold text-foreground text-sm mb-4">Təsdiqləmə Zənciri</h4>
                      <div className="space-y-3">
                        {chain.map((step, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              step.status === "approved" ? "bg-zone-green-bg text-zone-green-text" : step.status === "pending" ? "bg-zone-yellow-bg text-zone-yellow-text" : "bg-muted text-muted-foreground"
                            }`}>{step.status === "approved" ? <CheckCircle className="w-4 h-4" /> : i + 1}</div>
                            <div className="flex-1"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-foreground">{step.role}</p><p className="text-xs text-muted-foreground">{step.person}</p></div>
                              <div className="text-right">
                                {step.status === "approved" && <span className="text-xs text-zone-green-text">✓ Təsdiqləndi</span>}
                                {step.status === "pending" && <span className="text-xs text-zone-yellow-text">⏳ Gözləyir</span>}
                                {step.status === "waiting" && <span className="text-xs text-muted-foreground">Növbədə</span>}
                              </div>
                            </div></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-success rounded-full h-2 transition-all" style={{ width: `${(completedSteps / totalSteps) * 100}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">{completedSteps} / {totalSteps} mərhələ tamamlandı</p>
                  </div>
                );
              })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Yeni KPI Sehrbazı — 4 addımlı */}
      <CreateKpiWizard open={wizardOpen} onOpenChange={(o) => { setWizardOpen(o); if (!o) { setWizardInitial(undefined); setWizardEditingId(null); } }} initial={wizardInitial} onComplete={handleWizardComplete} />


      {/* Köhnə Create KPI Dialog — yalnız edit (copy) axını üçün saxlanılır, addım 10-17 növbəti mərhələdə yeni sehrbaza köçürüləcək */}

      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) { setEditingCardId(null); setLifecycleDraft(emptyLifecycleDraft()); } }}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Yeni KPI Yarat — Addım {createStep}/3
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {createStep === 1
                ? "Əsas məlumatlar və hədəf-lar"
                : createStep === 2
                ? "KPI Lifecycle — planlama mərhələləri"
                : "Təsdiqləmə matrisini seçin (opsional)"}
            </p>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex gap-2 mb-2">
            <div className={`flex-1 h-1 rounded-full ${createStep >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex-1 h-1 rounded-full ${createStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex-1 h-1 rounded-full ${createStep >= 3 ? 'bg-primary' : 'bg-muted'}`} />
          </div>


          {createStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">KPI Adı</label>
                  <input value={newKpi.name} onChange={e => setNewKpi(p => ({ ...p, name: e.target.value }))} placeholder="Məsələn: Aylıq Satış Hədəfi" className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">KPI Tipi</label>
                  <div className="relative mt-1" ref={typeDropdownRef}>

                    <div onClick={() => setShowTypeDropdown(!showTypeDropdown)} className="w-full min-h-[38px] px-3 py-1.5 text-sm border border-border rounded-lg bg-background cursor-pointer flex flex-wrap gap-1 items-center">
                      {newKpi.types.length === 0 && <span className="text-muted-foreground">Seçin</span>}
                      {newKpi.types.map(t => (
                        <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                          {t}<X className="w-3 h-3 cursor-pointer" onClick={e => { e.stopPropagation(); toggleKpiType(t); }} />
                        </span>
                      ))}
                    </div>
                    {showTypeDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        <div className="p-2">
                          <input value={typeSearchText} onChange={e => setTypeSearchText(e.target.value)} placeholder="Axtar..." className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background" onClick={e => e.stopPropagation()} />
                        </div>
                        {kpiTypeOptions.filter(t => t.toLowerCase().includes(typeSearchText.toLowerCase())).map(type => (
                          <div key={type} onClick={e => { e.stopPropagation(); toggleKpiType(type); }} className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-secondary ${newKpi.types.includes(type) ? 'bg-primary/5' : ''}`}>
                            <span>{type}</span>{newKpi.types.includes(type) && <Check className="w-4 h-4 text-primary" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Seçilmiş BSC düsturu — tip seçildikdən sonra */}
                  {newKpi.types.length > 0 && (() => {
                    const formulaName = pickBscFormulaName(newKpi.types);
                    if (!formulaName) return null;
                    return (
                      <div className="mt-2 px-3 py-2 rounded-lg text-xs font-medium border bg-secondary border-border text-muted-foreground">
                        {formulaName}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Hədəf təyinatı — 3 müstəqil checkbox: Fərdi / Komanda / Struktur */}
              <div className="p-3 rounded-lg border border-border bg-secondary/40 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">KPI kimə aiddir?</label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Bir və ya bir neçə təyinat seçin. Seçilməyən sahə formada görünməyəcək.</p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { key: "individual", label: "Şəxs(lər)", icon: User },
                    { key: "team", label: "Komanda", icon: Users },
                    { key: "structure", label: "Struktur", icon: ShieldCheck },
                    { key: "position", label: "Vəzifə", icon: Briefcase },
                  ] as const).map(opt => {
                    const checked = newKpi.targetMode[opt.key];
                    const Icon = opt.icon;
                    return (
                      <label
                        key={opt.key}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${checked ? "bg-primary/10 border-primary" : "bg-background border-border hover:bg-secondary"}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            const v = e.target.checked;
                            setNewKpi(p => {
                              const next = { ...p, targetMode: { ...p.targetMode, [opt.key]: v } };
                              if (opt.key === "individual" && !v) { next.assignedUser = ""; }
                              if (opt.key === "team" && !v) { next.teamIds = []; next.sharedKpi = false; }
                              if (opt.key === "structure" && !v) { next.structurePath = []; next.department = ""; next.subdivision = ""; next.group = ""; }
                              if (opt.key === "position" && !v) { next.assignedPositions = []; }
                              return next;
                            });
                          }}
                          className="w-4 h-4 rounded border-border"
                        />
                        <Icon className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Şəxs(lər) seçimi — multiselect + axtarış */}
              {newKpi.targetMode.individual && (() => {
                const selectedList = newKpi.assignedUser
                  ? newKpi.assignedUser.split(",").map(s => s.trim()).filter(Boolean)
                  : [];
                const toggle = (person: string) => {
                  const exists = selectedList.includes(person);
                  const next = exists ? selectedList.filter(p => p !== person) : [...selectedList, person];
                  setNewKpi(p => ({ ...p, assignedUser: next.join(", ") }));
                };
                return (
                  <div>
                    <label className="text-sm font-medium text-foreground">Şəxs(lər) seçin</label>
                    <div className="relative mt-1" ref={userDropdownRef}>

                      <div onClick={() => setShowUserDropdown(!showUserDropdown)} className="w-full min-h-[38px] px-3 py-2 text-sm border border-border rounded-lg bg-background cursor-pointer flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1 flex-1">
                          {selectedList.length === 0
                            ? <span className="text-muted-foreground">Şəxs(lər) seçin</span>
                            : selectedList.map(p => (
                                <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">
                                  {formatUserWithRole(p)}
                                  <button type="button" onClick={(e) => { e.stopPropagation(); toggle(p); }} className="hover:text-destructive"><Check className="w-3 h-3" /></button>
                                </span>
                              ))}
                        </div>
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                      {showUserDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg">
                          <div className="p-2">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <input value={userSearchText} onChange={e => setUserSearchText(e.target.value)} placeholder="Əməkdaş axtar..." className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded bg-background" onClick={e => e.stopPropagation()} />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {allPersons.filter(p => {
                              const q = userSearchText.toLowerCase();
                              return p.toLowerCase().includes(q) || formatUserWithRole(p).toLowerCase().includes(q);
                            }).map(person => {
                              const checked = selectedList.includes(person);
                              return (
                                <div key={person} onClick={e => { e.stopPropagation(); toggle(person); }} className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-secondary ${checked ? 'bg-primary/5' : ''}`}>
                                  <span>{formatUserWithRole(person)}</span>
                                  {checked && <Check className="w-4 h-4 text-primary" />}
                                </div>
                              );
                            })}
                          </div>
                          <div className="p-2 border-t border-border flex justify-end">
                            <button onClick={() => { setShowUserDropdown(false); setUserSearchText(""); }} className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground">Tamam</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Komanda seçimi — yalnız checkbox aktivdirsə */}
              {newKpi.targetMode.team && (
                <TeamMultiSelect
                  value={newKpi.teamIds}
                  onChange={(ids) => setNewKpi(p => ({ ...p, teamIds: ids }))}
                  shared={newKpi.sharedKpi}
                  onSharedChange={(s) => setNewKpi(p => ({ ...p, sharedKpi: s }))}
                />
              )}

              {/* Struktur seçimi — dinamik cascading (təşkilat modulundan) */}
              {newKpi.targetMode.structure && (
                <div className="p-3 rounded-lg border border-border bg-secondary/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Struktur seçimi</label>
                    {newKpi.structurePath.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setNewKpi(p => ({ ...p, structurePath: [] }))}
                        className="text-[11px] text-primary hover:underline"
                      >Təmizlə</button>
                    )}
                  </div>
                  {orgStructures.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Təşkilat modulunda hələ struktur yaradılmayıb.</p>
                  ) : (
                    <div className="space-y-2" ref={structDropdownRef}>

                      {visibleStructLevels.map(level => {
                        const options = getStructuresAtLevel(level);
                        if (options.length === 0) return null;
                        const selectedAtLevel = newKpi.structurePath[level] ?? null;
                        const selectedNode = selectedAtLevel ? options.find(o => o.id === selectedAtLevel) : null;
                        const search = (structSearch[level] || "").toLowerCase();
                        const filtered = options.filter(o => o.name.toLowerCase().includes(search));
                        const isOpen = openStructLevel === level;
                        const labelText = level === 0 ? "Əsas struktur" : `Alt struktur (səviyyə ${level + 1})`;
                        return (
                          <div key={level} className="relative">
                            <label className="text-xs font-medium text-foreground mb-1 block">{labelText}</label>
                            <div
                              onClick={() => setOpenStructLevel(isOpen ? null : level)}
                              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background cursor-pointer flex items-center justify-between"
                            >
                              <span className={selectedNode ? "text-foreground" : "text-muted-foreground"}>
                                {selectedNode ? `${selectedNode.type}: ${selectedNode.name}` : "Seçin..."}
                              </span>
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </div>
                            {isOpen && (
                              <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg">
                                <div className="p-2">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                      value={structSearch[level] || ""}
                                      onChange={e => setStructSearch(s => ({ ...s, [level]: e.target.value }))}
                                      placeholder="Axtar..."
                                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded bg-background"
                                      onClick={e => e.stopPropagation()}
                                    />
                                  </div>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  {filtered.length === 0 ? (
                                    <div className="px-3 py-2 text-xs text-muted-foreground">Nəticə yoxdur</div>
                                  ) : filtered.map(o => (
                                    <div
                                      key={o.id}
                                      onClick={() => {
                                        setNewKpi(p => {
                                          const path = p.structurePath.slice(0, level);
                                          path[level] = o.id;
                                          return { ...p, structurePath: path };
                                        });
                                        setOpenStructLevel(null);
                                        setStructSearch(s => ({ ...s, [level]: "" }));
                                      }}
                                      className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-secondary ${selectedAtLevel === o.id ? "bg-primary/5" : ""}`}
                                    >
                                      <div>
                                        <span className="text-[10px] text-muted-foreground uppercase mr-1.5">{o.type}</span>
                                        <span className="text-foreground">{o.name}</span>
                                      </div>
                                      {selectedAtLevel === o.id && <Check className="w-4 h-4 text-primary" />}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {selectedStructureNode && (
                        <p className="text-[11px] text-muted-foreground pt-1">
                          Seçilmiş: <span className="font-medium text-foreground">{newKpi.structurePath.map(id => findStructureById(id)?.name).filter(Boolean).join(" › ")}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Vəzifə seçimi — multiselect + axtarış */}
              {newKpi.targetMode.position && (
                <div className="p-3 rounded-lg border border-border bg-secondary/40 space-y-2">
                  <label className="text-xs font-semibold text-foreground">Vəzifə seçimi (multiselect)</label>
                  <div className="relative" ref={positionDropdownRef}>

                    <div onClick={() => setShowPositionDropdown(!showPositionDropdown)} className="w-full min-h-[38px] px-3 py-1.5 text-sm border border-border rounded-lg bg-background cursor-pointer flex flex-wrap gap-1 items-center">
                      {newKpi.assignedPositions.length === 0 && <span className="text-muted-foreground">Vəzifələri seçin</span>}
                      {newKpi.assignedPositions.map(pos => (
                        <span key={pos} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                          {pos}
                          <X className="w-3 h-3 cursor-pointer" onClick={e => { e.stopPropagation(); setNewKpi(p => ({ ...p, assignedPositions: p.assignedPositions.filter(x => x !== pos) })); }} />
                        </span>
                      ))}
                      <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
                    </div>
                    {showPositionDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg">
                        <div className="p-2">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input value={positionSearchText} onChange={e => setPositionSearchText(e.target.value)} placeholder="Vəzifə axtar..." className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded bg-background" onClick={e => e.stopPropagation()} />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {positionOptions.filter(p => p.toLowerCase().includes(positionSearchText.toLowerCase())).map(pos => {
                            const selected = newKpi.assignedPositions.includes(pos);
                            return (
                              <div key={pos} onClick={() => setNewKpi(p => ({ ...p, assignedPositions: selected ? p.assignedPositions.filter(x => x !== pos) : [...p.assignedPositions, pos] }))} className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-secondary ${selected ? "bg-primary/5" : ""}`}>
                                <span>{pos}</span>{selected && <Check className="w-4 h-4 text-primary" />}
                              </div>
                            );
                          })}
                          {positionOptions.filter(p => p.toLowerCase().includes(positionSearchText.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground">Nəticə yoxdur</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}








              {/* Period selection */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">KPI Dövrü</label>
                <PeriodPicker value={newKpi.period} onChange={(v) => setNewKpi(p => ({ ...p, period: v }))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Ümumi Hədəf</label>
                  {(() => {
                    const unit = getTargetUnitSuffix(newKpi.types);
                    return (
                      <div className="relative mt-1">
                        <input
                          value={newKpi.generalTarget}
                          onChange={e => {
                            const v = e.target.value;
                            setNewKpi(p => ({ ...p, generalTarget: v }));
                            const res = validateTarget(v, newKpi.types);
                            setTargetError(res.ok ? "" : res.error || "");
                          }}
                          placeholder={getTargetPlaceholder(newKpi.types)}
                          className={`w-full px-3 py-2 ${unit ? "pr-14" : ""} text-sm border rounded-lg bg-background ${targetError ? "border-destructive" : "border-border"}`}
                        />
                        {unit && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {unit}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  {targetError && <p className="text-xs text-destructive mt-1">{targetError}</p>}
                  {newKpi.types.length === 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">Ölçü vahidi tip seçildikdən sonra avtomatik formalaşır.</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Min. Hədəf</label>
                  {(() => {
                    const unit = getTargetUnitSuffix(newKpi.types) || "";
                    const generalNum = parseNumLoose(newKpi.generalTarget);
                    return (
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="relative">
                          <input
                            type="text"
                            value={newKpi.minTargetAbs}
                            placeholder={unit ? `Məs: ${unit === "%" ? "30" : unit === "AZN" ? "1500" : "150"}` : "Dəyər"}
                            onChange={e => {
                              const v = e.target.value;
                              const abs = parseFloat(v.replace(",", "."));
                              const pct = generalNum > 0 && !isNaN(abs) ? Math.round((abs / generalNum) * 100) : 0;
                              setNewKpi(p => ({ ...p, minTargetAbs: v, minTarget: pct ? String(pct) : p.minTarget }));
                            }}
                            className={`w-full px-3 py-2 ${unit ? "pr-12" : ""} text-sm border border-border rounded-lg bg-background`}
                          />
                          {unit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{unit}</span>}
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            value={newKpi.minTarget}
                            placeholder="Məs: 30"
                            onChange={e => {
                              const v = e.target.value;
                              const pct = parseFloat(v);
                              const abs = generalNum > 0 && !isNaN(pct) ? Math.round((generalNum * pct) / 100) : 0;
                              setNewKpi(p => ({ ...p, minTarget: v, minTargetAbs: abs ? String(abs) : p.minTargetAbs }));
                            }}
                            className="w-full px-3 py-2 pr-8 text-sm border border-border rounded-lg bg-background"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                    );
                  })()}
                  <p className="text-[11px] text-muted-foreground mt-1">Birinə dəyər yazsanız, digəri avtomatik hesablanır.</p>
                </div>
              </div>

              {/* Hədəfs — həmişə göstərilir (HR əllə yaradır) */}
              {true && (
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <label className="text-sm font-medium text-foreground">Sub-kpi-lar, qiymətləndirici və təyin edicilər</label>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${newKpi.subKpis.length > 0 && totalSubWeight !== 100 ? 'text-destructive' : 'text-success'}`}>
                        Toplam çəki: {totalSubWeight}%{newKpi.subKpis.length > 0 && totalSubWeight !== 100 && " ⚠️ 100% olmalıdır"}
                      </span>
                      <button onClick={() => setNewSubKpiModeOpen(true)} className="text-xs text-primary font-medium">+ Yeni</button>
                    </div>
                  </div>

                  {/* Vahid şəxs seçimi — qiymətləndirici və təyin edici ayrı-ayrı seçilir, bütün hədəf-lara aid */}
                  <div className="mb-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium text-foreground">Vahid şəxs (bütün hədəf-lar üçün)</span>
                        {unifiedPerson && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground">Qiymət.: {unifiedPerson}</span>
                        )}
                        {unifiedAssigner && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500 text-white">Təyin.: {unifiedAssigner}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setUnifiedDraftEv(unifiedPerson);
                            setUnifiedDraftAs(unifiedAssigner);
                            setUnifiedSearchEv("");
                            setUnifiedSearchAs("");
                            setUnifiedDialogOpen(true);
                          }}
                          className="text-xs px-2.5 py-1 rounded-md border border-primary/40 bg-card text-primary font-medium hover:bg-primary/10"
                        >
                          {unifiedPerson || unifiedAssigner ? "Dəyiş" : "Seç"}
                        </button>
                        {(unifiedPerson || unifiedAssigner) && (
                          <button
                            type="button"
                            onClick={() => { setUnifiedPerson(""); setUnifiedAssigner(""); toast.success("Vahid şəxs ləğv edildi"); }}
                            className="text-xs px-2 py-1 rounded-md border border-border bg-card text-muted-foreground hover:text-destructive"
                            title="Vahid şəxsi sıfırla"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <Dialog open={unifiedDialogOpen} onOpenChange={setUnifiedDialogOpen}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Vahid şəxs — qiymətləndirici və təyin edici</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="text-xs font-medium text-foreground mb-1 block">Qiymətləndirici (bütün hədəf-lar üçün)</label>
                          <div className="relative mb-1">
                            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input value={unifiedSearchEv} onChange={e => setUnifiedSearchEv(e.target.value)} placeholder="Axtar..." className="w-full pl-7 pr-2 py-1.5 text-xs border border-border rounded bg-background" />
                          </div>
                          <div className="max-h-40 overflow-y-auto border border-border rounded">
                            {allPersons.filter(p => p.toLowerCase().includes(unifiedSearchEv.toLowerCase())).map(p => (
                              <button key={p} type="button" onClick={() => setUnifiedDraftEv(p)}
                                className={`w-full text-left px-2 py-1.5 text-xs hover:bg-secondary ${unifiedDraftEv === p ? "bg-primary/10 text-primary font-medium" : ""}`}>
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-foreground mb-1 block">Təyin edici (bütün hədəf-lar üçün)</label>
                          <div className="relative mb-1">
                            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input value={unifiedSearchAs} onChange={e => setUnifiedSearchAs(e.target.value)} placeholder="Axtar..." className="w-full pl-7 pr-2 py-1.5 text-xs border border-border rounded bg-background" />
                          </div>
                          <div className="max-h-40 overflow-y-auto border border-border rounded">
                            {allPersons.filter(p => p.toLowerCase().includes(unifiedSearchAs.toLowerCase())).map(p => (
                              <button key={p} type="button" onClick={() => setUnifiedDraftAs(p)}
                                className={`w-full text-left px-2 py-1.5 text-xs hover:bg-secondary ${unifiedDraftAs === p ? "bg-amber-500/15 text-amber-700 font-medium" : ""}`}>
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setUnifiedDialogOpen(false)} className="px-3 py-1.5 text-xs rounded border border-border">Ləğv et</button>
                        <button
                          type="button"
                          onClick={() => {
                            setUnifiedPerson(unifiedDraftEv);
                            setUnifiedAssigner(unifiedDraftAs);
                            setNewKpi(prev => ({
                              ...prev,
                              subKpis: prev.subKpis.map(sk => ({
                                ...sk,
                                evaluator: unifiedDraftEv ? { type: "person", persons: [{ name: unifiedDraftEv, weight: 100 }] } : sk.evaluator,
                                assigner: unifiedDraftAs ? unifiedDraftAs : sk.assigner,
                                assignerMode: unifiedDraftAs ? "other" : sk.assignerMode,
                              })),
                            }));
                            setUnifiedDialogOpen(false);
                            toast.success("Vahid şəxslər təyin edildi");
                          }}
                          className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground"
                        >
                          Tətbiq et
                        </button>
                      </div>
                    </DialogContent>
                  </Dialog>


                  {newKpi.subKpis.length === 0 ? (
                    <div className="text-xs text-muted-foreground bg-secondary/30 border border-dashed border-border rounded-lg p-4 text-center">
                      Hələ Hədəf yoxdur. "+ Yeni" düyməsi ilə əllə əlavə edin.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-12 gap-2 px-1 mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                        <div className="col-span-1 text-center">Limit</div>
                        <div className="col-span-4">Ad</div>
                        <div className="col-span-4">Hədəf (vahidlə)</div>
                        <div className="col-span-2">Çəki %</div>
                        <div className="col-span-1 text-right">Əməl.</div>
                      </div>
                      <div className="space-y-2">
                        {newKpi.subKpis.map((sk, i) => {
                          const ev = sk.evaluator;
                          const evCount = ev?.type === "person" ? ev.persons.length : ev?.type === "team" ? ev.persons.length : ev?.type ? 1 : 0;
                          const isOther = sk.assignerMode === "other";
                          const lockEdit = isOther; // Digər əməkdaş təyin edirsə ad+hədəf kilidlənir
                          const hasUnified = !!unifiedPerson || !!unifiedAssigner;
                          const updateSub = (patch: Partial<SubKpi>) => {
                            const s = [...newKpi.subKpis];
                            s[i] = { ...s[i], ...patch };
                            setNewKpi(p => ({ ...p, subKpis: s }));
                          };
                          const unit = sk.unit || "Qiymət";
                          return (
                          <div key={sk.id} className="grid grid-cols-12 gap-2 items-center">
                            {/* Qiymət Limitləri düyməsi — adın solunda */}
                            <div className="col-span-1 flex justify-center">
                              <button
                                type="button"
                                onClick={() => setLimitsViewingSubId(sk.id)}
                                title="Qiymət Limitləri (KPI Set modulundan, read-only)"
                                className="w-7 h-7 rounded-md border border-primary/30 bg-primary/5 text-primary flex items-center justify-center hover:bg-primary/10"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <input
                              value={sk.name}
                              onChange={e => updateSub({ name: e.target.value })}
                              placeholder="Hədəf adı"
                              readOnly={lockEdit}
                              title={lockEdit ? "Digər əməkdaş təyin edəcək — redaktə olunmur" : undefined}
                              className={`col-span-4 min-w-0 px-2 py-1.5 text-sm border rounded-lg bg-background ${lockEdit ? "border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground cursor-not-allowed" : "border-border"}`}
                            />
                            {/* Hədəf + inline vahid badge */}
                            <div className="col-span-4 relative">
                              <input
                                value={sk.target}
                                onChange={e => updateSub({ target: e.target.value })}
                                placeholder="Məs: 5000000"
                                readOnly={lockEdit}
                                title={lockEdit ? "Digər əməkdaş təyin edəcək — redaktə olunmur" : undefined}
                                className={`w-full min-w-0 px-2 py-1.5 pr-20 text-sm border rounded-lg bg-background ${lockEdit ? "border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground cursor-not-allowed" : "border-border"}`}
                              />
                              <button
                                type="button"
                                onClick={() => !lockEdit && setUnitPickerForSubId(unitPickerForSubId === sk.id ? null : sk.id)}
                                disabled={lockEdit}
                                title={lockEdit ? "Vahid redaktə olunmur" : "Vahidi dəyişmək üçün klikləyin"}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 disabled:opacity-60"
                              >
                                {unit}
                                <ChevronDown className="w-2.5 h-2.5" />
                              </button>
                              {unitPickerForSubId === sk.id && (
                                <div className="absolute right-0 top-full mt-1 z-30 w-44 bg-card border border-border rounded-md shadow-lg p-1 max-h-56 overflow-y-auto">
                                  {["Qiymət", ...subKpiUnits.filter(u => u !== "Qiymət")].map(u => (
                                    <button
                                      key={u}
                                      type="button"
                                      onClick={() => { updateSub({ unit: u }); setUnitPickerForSubId(null); }}
                                      className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-secondary ${unit === u ? "bg-primary/10 text-primary font-medium" : ""}`}
                                    >
                                      {u}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            {/* Çəki — "other" rejimində min/max + dəyər, "self" rejimində tək input */}
                            <div className="col-span-2">
                              {isOther ? (
                                <div className="flex items-center gap-1" title="Təyin edən şəxs bu aralıqda öz çəkisini yazacaq">
                                  <input
                                    type="number"
                                    placeholder="min"
                                    value={sk.weightMin ?? ""}
                                    onChange={e => {
                                      const v = e.target.value === "" ? undefined : Number(e.target.value);
                                      updateSub({ weightMin: v });
                                    }}
                                    className="w-full min-w-0 px-1.5 py-1.5 text-[11px] border border-border rounded bg-background"
                                  />
                                  <span className="text-muted-foreground text-[10px]">/</span>
                                  <input
                                    type="number"
                                    placeholder="max"
                                    value={sk.weightMax ?? ""}
                                    onChange={e => {
                                      const v = e.target.value === "" ? undefined : Number(e.target.value);
                                      updateSub({ weightMax: v });
                                    }}
                                    className="w-full min-w-0 px-1.5 py-1.5 text-[11px] border border-border rounded bg-background"
                                  />
                                </div>
                              ) : (
                                <div className="relative">
                                  <WeightInput value={sk.weight} onChange={n => updateSub({ weight: n })} className="pr-6 rounded-lg" />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                </div>

                              )}
                            </div>
                            <div className="col-span-1 flex items-center justify-end">
                              <button type="button" onClick={() => setNewKpi(p => ({ ...p, subKpis: p.subKpis.filter((_, idx) => idx !== i) }))} className="w-7 h-7 shrink-0 rounded bg-zone-red-bg text-zone-red-text flex items-center justify-center">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Aşağı sıra: rejim rozeti + qiymətləndirici/təyin edici düymələri (Vahid şəxs seçilibsə düymələr gizlənir) */}
                            <div className="col-span-12 -mt-1 flex items-center gap-2 pl-1">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isOther ? 'bg-amber-500/15 text-amber-700' : 'bg-secondary text-muted-foreground'}`}>
                                {isOther ? "Digər əməkdaş təyin edir" : "Özüm təyin edirəm"}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateSub({ assignerMode: isOther ? "self" : "other", assigner: isOther ? undefined : sk.assigner })}
                                className="text-[10px] text-primary hover:underline"
                              >
                                rejimi dəyiş
                              </button>
                              {!hasUnified && (
                                <div className="ml-auto flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => { setEvaluatorEditingSubId(sk.id); setEvDraft(sk.evaluator || { type: null, persons: [] }); }}
                                    title={ev?.type ? `Qiymətləndirici: ${evCount}` : "Qiymətləndirici seç"}
                                    className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border ${ev?.type ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'}`}
                                  >
                                    <UserCheck className="w-3 h-3" /> Qiymətləndirici{evCount > 0 ? ` (${evCount})` : ""}
                                  </button>
                                  {isOther && (
                                    <button
                                      type="button"
                                      onClick={() => { setAssignerEditingSubId(sk.id); setAssignerDraft(sk.assigner || ""); setAssignerSearch(""); }}
                                      title={sk.assigner ? `Təyin edici: ${sk.assigner}` : "Təyin edici seç"}
                                      className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border-2 ${sk.assigner ? 'border-amber-500 bg-amber-500/15 text-amber-700' : 'border-dashed border-amber-500/60 bg-card text-amber-600'}`}
                                    >
                                      <UserPlus className="w-3 h-3" /> Təyin edici{sk.assigner ? `: ${sk.assigner.split(" ")[0]}` : ""}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground">Hesablama Düsturu</label>
                <select value={newKpi.selectedFormula} onChange={e => setNewKpi(p => ({ ...p, selectedFormula: e.target.value }))} className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background">
                  <option value="">Düstur seçin (Ayarlardan)</option>
                  {availableFormulas.map(f => <option key={f.id} value={f.name}>{f.name} — {f.formula}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => {
                  if (newKpi.subKpis.length > 0 && totalSubWeight !== 100) { toast.error("Hədəflərın ümumi çəkisi 100% olmalıdır"); return; }
                  if (!newKpi.name.trim()) { toast.error("KPI adını daxil edin"); return; }
                  setCreateStep(2);
                }} className="flex-1 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium">Növbəti (Lifecycle) →</button>
                <button
                  onClick={() => {
                    if (!newKpi.name.trim()) { toast.error("KPI adını daxil edin"); return; }
                    if (newKpi.subKpis.length > 0 && totalSubWeight !== 100) { toast.error("Hədəflərın ümumi çəkisi 100% olmalıdır"); return; }
                    if (editingCardId !== null) {
                      setKpiCards(prev => prev.map(c => c.id === editingCardId ? {
                        ...c,
                        name: newKpi.name,
                        target: newKpi.generalTarget || c.target,
                        minTarget: Number(newKpi.minTarget) || c.minTarget,
                        responsible: newKpi.assignedUser || c.responsible,
                        type: newKpi.types[0] || c.type,
                        formula: newKpi.selectedFormula || c.formula,
                        generalTarget: newKpi.generalTarget,
                        department: newKpi.department || c.department,
                        subdivision: newKpi.subdivision || c.subdivision,
                        group: newKpi.group || c.group,
                        subKpis: newKpi.subKpis,
                      } : c));
                      toast.success("KPI yeniləndi");
                      setEditingCardId(null);
                      setShowCreate(false);
                      return;
                    }
                    const id = Math.max(0, ...kpiCards.map(c => c.id)) + 1;
                    const newCard: KpiCard = {
                      id, name: newKpi.name, icon: Target, zone: "yellow",
                      target: newKpi.generalTarget || "—", current: "0",
                      unit: "", progress: 0, minTarget: Number(newKpi.minTarget) || 60,
                      responsible: newKpi.assignedUser || "—", period: "2026 - Aylıq",
                      type: newKpi.types[0] || "Absolut Hədəf", formula: newKpi.selectedFormula || "—",
                      generalTarget: newKpi.generalTarget,
                      department: newKpi.department || "—", group: newKpi.group || "—", subdivision: newKpi.subdivision || "—",
                      startDate: "01.01.2026", endDate: "31.12.2026", frequency: "Aylıq",
                      team: [], history: [], description: "Matrissiz yaradılıb",
                      weight: 10, approvalStatus: "approved",
                      subKpis: newKpi.subKpis,
                    };
                    setKpiCards(prev => [newCard, ...prev]);
                    toast.success("KPI yaradıldı (matrissiz)");
                    setShowCreate(false);
                  }}
                  className="flex-1 py-2.5 text-sm rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium"
                >
                  {editingCardId !== null ? "✓ Yenilə" : "✓ Yarat (matrissiz)"}
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 text-sm rounded-lg border border-border bg-card">Ləğv Et</button>
              </div>

            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-4">
              <LifecycleWizardStep value={lifecycleDraft} onChange={setLifecycleDraft} />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setCreateStep(1)} className="flex-1 py-2.5 text-sm rounded-lg border border-border bg-card">← Geri</button>
                <button
                  onClick={() => setCreateStep(3)}
                  className="flex-1 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium"
                >
                  Növbəti (Təsdiqləmə) →
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 text-sm rounded-lg border border-border bg-card">Ləğv Et</button>
              </div>
            </div>
          )}

          {createStep === 3 && (() => {
            const savedMatrices = getApprovalMatrices();
            return (
              <div className="space-y-4">
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <label className="text-sm font-medium text-foreground">Təsdiqləmə Matrisi</label>
                    <span className="text-[10px] px-1.5 py-0.5 bg-secondary text-muted-foreground rounded">Read-only</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Bu KPI üçün təşkilatda yaradılmış təsdiqləmə matrisi tətbiq olunacaq. Matrisi redaktə etmək üçün <span className="font-medium text-foreground">Təsdiqləmə Matrisi</span> modulundan istifadə edin.</p>

                  {savedMatrices.length === 0 ? (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">Hələ heç bir təsdiqləmə matrisi yaradılmayıb. Zəhmət olmasa <span className="font-medium">Təsdiqləmə Matrisi</span> modulundan ən azı bir matris yaradın.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedMatrices.map((m: ApprovalMatrix) => {
                        const isSelected = selectedMatrixId === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedMatrixId(m.id)}
                            className={`w-full text-left border rounded-lg p-3 transition-all ${isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-border bg-secondary/30 hover:border-primary/40'}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`}>
                                  {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                                </span>
                                <div className="text-sm font-medium text-foreground">{m.name}</div>
                              </div>
                              <span className="text-[11px] text-muted-foreground">{m.steps.length} mərhələ</span>
                            </div>
                            <div className="space-y-1.5">
                              {m.steps.map((s, i) => (
                                <div key={s.id} className="bg-background rounded px-2 py-1.5 border border-border">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">{i + 1}</span>
                                    <span className="text-xs font-medium text-foreground">{s.label}</span>
                                  </div>
                                  <div className="ml-7 flex flex-wrap gap-1">
                                    {s.assignees.map((a, j) => {
                                      // Vəzifəyə görə matris seçilibsə yalnız vəzifə adı göstərilir (ad göstərilmir)
                                      const isPositionMode = m.mode === "position" && a.type === "role";
                                      const label = isPositionMode ? a.name : formatAssignee(a);
                                      return (
                                        <span key={j} className={`text-[11px] px-2 py-0.5 rounded-full ${a.type === "role" ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"}`}>
                                          {label}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setCreateStep(2)} className="flex-1 py-2.5 text-sm rounded-lg border border-border bg-card">← Geri</button>
                  <button
                    onClick={() => {
                      if (!newKpi.name.trim()) { toast.error("KPI adını daxil edin"); return; }
                      if (newKpi.subKpis.length > 0 && totalSubWeight !== 100) { toast.error("Hədəflərın ümumi çəkisi 100% olmalıdır"); return; }
                      const matrix = selectedMatrixId ? savedMatrices.find(x => x.id === selectedMatrixId) : null;
                      const id = Math.max(0, ...kpiCards.map(c => c.id)) + 1;
                      const newCard: KpiCard = {
                        id, name: newKpi.name, icon: Target, zone: "yellow",
                        target: newKpi.generalTarget || "—", current: "0",
                        unit: "", progress: 0, minTarget: Number(newKpi.minTarget) || 60,
                        responsible: newKpi.assignedUser || "—", period: "2026 - Aylıq",
                        type: newKpi.types[0] || "Absolut Hədəf", formula: newKpi.selectedFormula || "—",
                        generalTarget: newKpi.generalTarget,
                        department: newKpi.department || "—", group: newKpi.group || "—", subdivision: newKpi.subdivision || "—",
                        startDate: "01.01.2026", endDate: "31.12.2026", frequency: "Aylıq",
                        team: [], history: [],
                        description: matrix ? "Matris ilə yaradılıb" : "Matrissiz yaradılıb",
                        weight: 10, approvalStatus: matrix ? "pending" : "approved",
                        subKpis: newKpi.subKpis,
                      };
                      setKpiCards(prev => [newCard, ...prev]);
                      const hasLifecycle = !!(lifecycleDraft.assignment || lifecycleDraft.evaluation || lifecycleDraft.bonus || lifecycleDraft.reviews.length);
                      if (hasLifecycle) {
                        setCardLifecycle(newCard.id, newCard.name, lifecycleDraft);
                      }
                      if (matrix) {
                        toast.success(`KPI yaradıldı və "${matrix.name}" matrisinə təsdiqə göndərildi`);
                      } else {
                        toast.success("KPI matrissiz yaradıldı");
                      }
                      setShowCreate(false);
                      setLifecycleDraft(emptyLifecycleDraft());
                    }}
                    className="flex-1 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium"
                  >
                    {selectedMatrixId ? "📤 Təsdiqə Göndər" : "✓ Matrissiz Yarat"}
                  </button>
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 text-sm rounded-lg border border-border bg-card">Ləğv Et</button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Yeni hədəf rejim seçimi (özüm / digər əməkdaş) */}
      <Dialog open={newSubKpiModeOpen} onOpenChange={(o) => { if (!o) setNewSubKpiModeOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Hədəf — təyin edən kimdir?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setNewKpi(p => ({ ...p, subKpis: [...p.subKpis, { id: Date.now(), name: "", target: "", weight: 0, unit: "Qiymət", assignerMode: "self" }] }));
                setNewSubKpiModeOpen(false);
              }}
              className="w-full text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Özüm təyin edəcəm</div>
                <div className="text-xs text-muted-foreground mt-0.5">Təyin edici düyməsi görünməyəcək. Tək çəki dəyəri istifadə olunur.</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setNewKpi(p => ({ ...p, subKpis: [...p.subKpis, { id: Date.now(), name: "", target: "", weight: 0, unit: "Qiymət", assignerMode: "other", assigner: unifiedAssigner || unifiedPerson || undefined, weightMin: undefined, weightMax: undefined }] }));
                setNewSubKpiModeOpen(false);
              }}
              className="w-full text-left p-3 rounded-lg border border-border hover:border-amber-500 hover:bg-amber-500/5 flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-full border-2 border-amber-500 bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Digər əməkdaş təyin edəcək</div>
                <div className="text-xs text-muted-foreground mt-0.5">Hədəf sırasında təyin edici düyməsi görünəcək. Çəki üçün min. / max. dəyər tələb olunur.</div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Təyin edici (Assigner) picker dialog */}
      <Dialog open={assignerEditingSubId !== null} onOpenChange={(o) => { if (!o) setAssignerEditingSubId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Təyin edici seçimi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={assignerSearch}
                onChange={e => setAssignerSearch(e.target.value)}
                placeholder="Əməkdaş axtar..."
                className="w-full pl-7 pr-2 py-2 text-sm border border-border rounded-lg bg-background"
              />
            </div>
            <div className="border border-border rounded-lg max-h-72 overflow-y-auto divide-y">
              {allPersons.filter(n => n.toLowerCase().includes(assignerSearch.toLowerCase())).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAssignerDraft(n)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-secondary ${assignerDraft === n ? "bg-amber-500/10 text-amber-700 font-medium" : ""}`}
                >
                  <span>{n}</span>
                  {assignerDraft === n && <Check className="w-4 h-4" />}
                </button>
              ))}
              {allPersons.filter(n => n.toLowerCase().includes(assignerSearch.toLowerCase())).length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Tapılmadı</div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!assignerDraft) { toast.error("Əməkdaş seçin"); return; }
                  setNewKpi(p => ({ ...p, subKpis: p.subKpis.map(s => s.id === assignerEditingSubId ? { ...s, assigner: assignerDraft } : s) }));
                  toast.success(`Təyin edici: ${assignerDraft}`);
                  setAssignerEditingSubId(null);
                }}
                className="flex-1 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium"
              >Yadda saxla</button>
              <button type="button" onClick={() => setAssignerEditingSubId(null)} className="flex-1 py-2 text-sm rounded-lg border border-border bg-card">Ləğv et</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evaluator picker dialog */}
      <Dialog open={evaluatorEditingSubId !== null} onOpenChange={(o) => { if (!o) setEvaluatorEditingSubId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Qiymətləndirici seçimi</DialogTitle>
          </DialogHeader>
          {(() => {
            const targetUser = newKpi.assignedUser;
            const teams = getTeams();
            const userTeams = targetUser ? teams.filter(t => t.leader === targetUser || t.members.some(m => m.name === targetUser)) : teams;
            const selectedTeam = evDraft.teamId ? teams.find(t => t.id === evDraft.teamId) : null;
            const teamMembers = selectedTeam ? [{ name: selectedTeam.leader }, ...selectedTeam.members.map(m => ({ name: m.name }))] : [];
            const setType = (type: EvaluatorConfig["type"]) => setEvDraft({ type, persons: [], teamId: null });
            const togglePerson = (name: string) => setEvDraft(d => ({ ...d, persons: d.persons.find(p => p.name === name) ? d.persons.filter(p => p.name !== name) : [...d.persons, { name, weight: 0 }] }));
            const updateWeight = (name: string, weight: number) => setEvDraft(d => ({ ...d, persons: d.persons.map(p => p.name === name ? { ...p, weight } : p) }));
            const randomPick = () => {
              if (!selectedTeam || teamMembers.length === 0) return;
              const wanted = Math.max(1, Math.min(evDraft.randomCount || 1, teamMembers.length));
              const pool = [...teamMembers];
              const picked: string[] = [];
              for (let i = 0; i < wanted && pool.length > 0; i++) {
                const idx = Math.floor(Math.random() * pool.length);
                picked.push(pool.splice(idx, 1)[0].name);
              }
              const eachWeight = Math.floor(100 / picked.length);
              setEvDraft(d => ({ ...d, persons: picked.map(n => ({ name: n, weight: eachWeight })) }));
              toast.success(`Təsadüfi seçildi: ${picked.join(", ")}`);
            };
            return (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Növ</label>
                  <select value={evDraft.type || ""} onChange={e => setType(e.target.value as any)} className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background">
                    <option value="">Seçin</option>
                    <option value="team">Komanda daxili</option>
                    <option value="person">Konkret şəxs</option>
                    <option value="self">Özü</option>
                    <option value="integration">İnteqrasiya</option>
                  </select>
                </div>

                {evDraft.type === "team" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Komanda</label>
                      <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          value={evSearch.team}
                          onChange={e => setEvSearch(s => ({ ...s, team: e.target.value }))}
                          placeholder="Komanda axtar..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded bg-background"
                        />
                      </div>
                      <div className="border border-border rounded-lg max-h-40 overflow-y-auto divide-y">
                        {userTeams
                          .filter(t => t.name.toLowerCase().includes(evSearch.team.toLowerCase()))
                          .map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setEvDraft(d => ({ ...d, teamId: t.id, persons: [] }))}
                              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-secondary ${evDraft.teamId === t.id ? "bg-primary/5 text-primary font-medium" : ""}`}
                            >
                              <span>{t.name}</span>
                              {evDraft.teamId === t.id && <Check className="w-4 h-4" />}
                            </button>
                          ))}
                        {userTeams.filter(t => t.name.toLowerCase().includes(evSearch.team.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-xs text-muted-foreground">Nəticə yoxdur</div>
                        )}
                      </div>
                    </div>
                    {selectedTeam && (
                      <>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">Üzvlər ({teamMembers.length})</span>
                          <div className="flex items-center gap-1.5">
                            <label className="text-[11px] text-muted-foreground">Say:</label>
                            <input
                              type="number"
                              min={1}
                              max={teamMembers.length}
                              value={evDraft.randomCount ?? 1}
                              onChange={e => setEvDraft(d => ({ ...d, randomCount: Math.max(1, Number(e.target.value) || 1) }))}
                              className="w-14 px-2 py-1 text-xs border border-border rounded bg-background"
                            />
                            <button onClick={randomPick} className="text-xs flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-secondary"><Shuffle className="w-3 h-3" /> Təsadüfi</button>
                          </div>
                        </div>
                        <div className="border border-border rounded-lg divide-y max-h-60 overflow-y-auto">
                          {teamMembers.map(m => {
                            const sel = evDraft.persons.find(p => p.name === m.name);
                            return (
                              <div key={m.name} className="flex items-center gap-2 p-2">
                                <input type="checkbox" checked={!!sel} onChange={() => togglePerson(m.name)} />
                                <span className="flex-1 text-sm">{m.name}</span>
                                {sel && (
                                  <div className="flex items-center gap-1">
                                    <WeightInput value={sel.weight} onChange={n => updateWeight(m.name, n)} className="w-16 !px-2 !py-1 text-xs" />
                                    <span className="text-xs text-muted-foreground">%</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {evDraft.persons.length > teamMembers.length && (
                          <p className="text-xs text-destructive">Komandada yalnız {teamMembers.length} nəfər var.</p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {evDraft.type === "person" && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Əməkdaş seçin</label>
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Əməkdaş axtar..."
                        value={evSearch.person}
                        onChange={e => setEvSearch(s => ({ ...s, person: e.target.value }))}
                        className="w-full pl-7 pr-3 py-1.5 text-xs border border-border rounded-lg bg-background"
                      />
                    </div>
                    <div className="border border-border rounded-lg divide-y max-h-60 overflow-y-auto">
                      {allPersons
                        .filter(name => name.toLowerCase().includes(evSearch.person.toLowerCase()))
                        .map(name => {
                          const sel = evDraft.persons.find(p => p.name === name);
                          return (
                            <div key={name} className="flex items-center gap-2 p-2">
                              <input type="checkbox" checked={!!sel} onChange={() => togglePerson(name)} />
                              <span className="flex-1 text-sm">{name}</span>
                              {sel && (
                                <div className="flex items-center gap-1">
                                  <WeightInput value={sel.weight} onChange={n => updateWeight(name, n)} className="w-16 !px-2 !py-1 text-xs" />
                                  <span className="text-xs text-muted-foreground">%</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      {allPersons.filter(name => name.toLowerCase().includes(evSearch.person.toLowerCase())).length === 0 && (
                        <div className="p-3 text-xs text-center text-muted-foreground">Heç bir əməkdaş tapılmadı</div>
                      )}
                    </div>
                  </div>
                )}

                {evDraft.type === "self" && (
                  <div className="p-3 rounded-lg bg-secondary text-sm">
                    Qiymətləndirici: KPI sahibi özü (100% ağırlıq).
                  </div>
                )}

                {evDraft.type === "integration" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">İnteqrasiya sistemi</label>
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Sistem axtar..."
                          value={evSearch.integration}
                          onChange={e => setEvSearch(s => ({ ...s, integration: e.target.value }))}
                          className="w-full pl-7 pr-3 py-1.5 text-xs border border-border rounded-lg bg-background"
                        />
                      </div>
                      <div className="border border-border rounded-lg divide-y max-h-48 overflow-y-auto">
                        {Object.keys(integrationFieldsBySystem)
                          .filter(s => s.toLowerCase().includes(evSearch.integration.toLowerCase()))
                          .map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setEvDraft(d => ({ ...d, integrationName: s, integrationFields: [] }))}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary ${evDraft.integrationName === s ? "bg-primary/10 text-primary font-medium" : ""}`}
                            >
                              {s}
                            </button>
                          ))}
                        {Object.keys(integrationFieldsBySystem).filter(s => s.toLowerCase().includes(evSearch.integration.toLowerCase())).length === 0 && (
                          <div className="p-3 text-xs text-center text-muted-foreground">Sistem tapılmadı</div>
                        )}
                      </div>
                    </div>
                    {evDraft.integrationName && integrationFieldsBySystem[evDraft.integrationName] && (
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1.5">Mübadilə olunacaq məlumatlar</label>
                        <div className="border border-border rounded-lg divide-y">
                          {integrationFieldsBySystem[evDraft.integrationName].map(field => {
                            const checked = evDraft.integrationFields?.includes(field) || false;
                            return (
                              <label key={field} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-secondary/50">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => setEvDraft(d => {
                                    const cur = d.integrationFields || [];
                                    return { ...d, integrationFields: cur.includes(field) ? cur.filter(f => f !== field) : [...cur, field] };
                                  })}
                                />
                                <span className="text-sm">{field}</span>
                              </label>
                            );
                          })}
                        </div>
                        {evDraft.integrationFields && evDraft.integrationFields.length > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-1">{evDraft.integrationFields.length} məlumat sahəsi seçildi</p>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Ağırlıq:</span>
                      <input type="number" value={evDraft.integrationWeight || 100} onChange={e => setEvDraft(d => ({ ...d, integrationWeight: Number(e.target.value) }))} className="w-20 px-2 py-1 text-xs border border-border rounded bg-background" />
                      <span className="text-xs">%</span>
                    </div>
                  </div>
                )}

                {(evDraft.type === "team" || evDraft.type === "person") && evDraft.persons.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Toplam ağırlıq: {evDraft.persons.reduce((s, p) => s + p.weight, 0)}%
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      if (evDraft.type === "team" && selectedTeam && evDraft.persons.length > teamMembers.length) {
                        toast.error(`Komandada yalnız ${teamMembers.length} nəfər var`);
                        return;
                      }
                      setNewKpi(p => ({ ...p, subKpis: p.subKpis.map(s => s.id === evaluatorEditingSubId ? { ...s, evaluator: evDraft } : s) }));
                      toast.success("Qiymətləndirici yadda saxlanıldı");
                      setEvaluatorEditingSubId(null);
                    }}
                    className="flex-1 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium"
                  >Yadda saxla</button>
                  <button onClick={() => setEvaluatorEditingSubId(null)} className="flex-1 py-2 text-sm rounded-lg border border-border bg-card">Ləğv et</button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Hədəf Qiymət Limitləri — KPI Set modulundan, read-only */}
      {limitsViewingSubId !== null && (() => {
        const sub = newKpi.subKpis.find(s => s.id === limitsViewingSubId);
        if (!sub) return null;
        const cardId = editingCardId ?? 0;
        const limits = getLimitsFor(cardId, sub.id);
        return (
          <ScoreLimitsDialog
            open={true}
            onOpenChange={(o) => !o && setLimitsViewingSubId(null)}
            mode="view"
            subKpiName={sub.name || "Hədəf"}
            target={sub.target || "0"}
            unit={sub.unit || "Qiymət"}
            initial={limits}
          />
        );
      })()}

      {/* HR — KPI silmə dialoqu */}
      <Dialog open={!!deleteDialog} onOpenChange={(o) => !o && setDeleteDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              KPI kartını sil
            </DialogTitle>
          </DialogHeader>
          {deleteDialog && (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                <span className="font-medium">"{withKartSuffix(deleteDialog.card.name)}"</span> kartını silmək istədiyinizə əminsiniz?
              </p>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Şərh (məcburi deyil)</label>
                <textarea
                  value={deleteComment}
                  onChange={(e) => setDeleteComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Silinmə səbəbi..."
                />
              </div>
              {deleteDialog.mode === "choice" && (
                <p className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/30 rounded-md p-2">
                  Bu KPI aktiv prosesdədir. Silinmə matrisindən təsdiq üçün sorğu göndərə və ya səlahiyyətiniz olduqda birbaşa silə bilərsiniz.
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeleteDialog(null)}
                  className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary"
                >
                  Ləğv et
                </button>
                {deleteDialog.mode === "choice" && (
                  <button
                    onClick={() => sendDeletionRequest(deleteDialog.card, deleteComment)}
                    className="px-4 py-2 text-sm rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 inline-flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Silinmə sorğusu göndər
                  </button>
                )}
                <button
                  onClick={() => performHardDelete(deleteDialog.card)}
                  className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Sil
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KpiCardsPage;
