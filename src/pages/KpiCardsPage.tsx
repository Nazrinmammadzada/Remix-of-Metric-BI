import { useEffect, useState } from "react";
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
import { getStructures, findStructureById, findOccupantsByPosition, type OrgStructure } from "@/lib/orgStore";
import { getPositions } from "@/lib/catalogStore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import KpiExtraTabContent, { isExtraTab } from "@/components/kpi/KpiExtraTabs";
import BscScorecardTab from "@/components/kpi/BscScorecardTab";
import { useCatalogValues } from "@/lib/dropdownCatalogStore";
import { getFormulas } from "@/lib/formulasStore";
import ExportMenu from "@/components/common/ExportMenu";
import { LayoutGrid, List, Briefcase, Copy, Eye } from "lucide-react";
import ScoreLimitsDialog from "@/components/kpi/ScoreLimitsDialog";
import { getLimitsFor, getEntriesForCard } from "@/lib/kpiSetStore";
import LifecycleWizardStep from "@/components/kpi/LifecycleWizardStep";
import LifecycleView from "@/components/kpi/LifecycleView";
import { setCardLifecycle, emptyLifecycleDraft, getLifecycle, type CardLifecycle } from "@/lib/kpiLifecycleStore";
import CreateKpiWizard, { type CreateKpiWizardDraft } from "@/components/kpi/CreateKpiWizard";
import { upsertStatus } from "@/lib/kpiCardStatusStore";
import { buildSharedCardFromDraft, upsertSharedKpiCard } from "@/lib/kpiCardStore";
import { enqueueApproval } from "@/lib/approvalsStore";
import { getCurrentEmployeeId } from "@/lib/scope";

const STATUS_LABELS = { natamam: "Qaralama", tesdiq_gozlenilir: "Təsdiq gözlənilir", imtina: "İmtina", aktiv: "Aktiv", legv_olundu: "Ləğv olundu" } as const;
const STATUS_STYLES: Record<string, string> = {
  natamam: "bg-muted text-muted-foreground border-border",
  tesdiq_gozlenilir: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  imtina: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  aktiv: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
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
}

const initialKpiCards: KpiCard[] = [
  {
    id: 1, name: "Aylıq Satış Hədəfi", icon: Target, zone: "green", target: "5M", current: "4.2M", unit: "AZN", progress: 84, minTarget: 60,
    responsible: "Samir Həsənov", period: "2026 - Aylıq", type: "Absolut Hədəf", formula: "Cari Satış / Hədəf Satış × 100", generalTarget: "5M AZN",
    department: "Satış Departamenti", group: "Bakı Satış Qrupu", subdivision: "Satış Şöbəsi",
    startDate: "01.01.2026", endDate: "31.01.2026", frequency: "Aylıq", weight: 30, approvalStatus: "approved",
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
    startDate: "01.01.2026", endDate: "31.12.2026", frequency: "İllik", weight: 25, approvalStatus: "approved",
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
    startDate: "01.03.2026", endDate: "31.03.2026", frequency: "Aylıq", weight: 20, approvalStatus: "approved",
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
    startDate: "01.01.2026", endDate: "31.03.2026", frequency: "Rüblük", weight: 15, approvalStatus: "approved",
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
    startDate: "01.01.2026", endDate: "31.12.2026", frequency: "İllik", weight: 5, approvalStatus: "pending",
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
    startDate: "01.03.2026", endDate: "31.03.2026", frequency: "Aylıq", weight: 5, approvalStatus: "pending",
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
    startDate: "01.01.2026", endDate: "31.12.2026", frequency: "Aylıq", weight: 10, approvalStatus: "approved",
    description: "Əməkdaşın fərdi inkişaf modulları üzrə tamamlama göstəricisi.",
    team: [{ name: "Leyla Məmmədova", role: "Satış Mütəxəssisi", avatar: "L" }],
    history: [{ date: "Mart 2026", value: "8 Modul", change: 2 }],
    isPersonal: true,
  },
  {
    id: 8, name: "Fərdi: Layihə Töhfəsi (Arxiv)", icon: UserCheck, zone: "yellow", target: "5", current: "3", unit: "Layihə", progress: 60, minTarget: 60,
    responsible: "Leyla Həsənova", period: "2025 - İllik", type: "Say Hədəfi", formula: "Tamamlanan Layihə / Hədəf × 100", generalTarget: "5 Layihə",
    department: "Əməliyyatlar", group: "Əməliyyat Qrupu", subdivision: "Əməliyyat Şöbəsi",
    startDate: "01.01.2025", endDate: "31.12.2025", frequency: "İllik", weight: 8, approvalStatus: "approved",
    description: "İşdən çıxmış əməkdaşın fərdi KPI kartı — status dondurulmuşdur.",
    team: [{ name: "Tural İsmayılov", role: "Proses Analitik", avatar: "T" }],
    history: [{ date: "Dekabr 2025", value: "3 Layihə", change: 0 }],
    isPersonal: true,
    frozen: false,
  },
];

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
  const inv = isInverseKpi(`${card.type} ${card.name}`);
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
    const base = initialKpiCards.filter(c => !deleted.includes(c.id));
    // Demo: give a few employees multiple KPI cards for "Əməkdaşlar üzrə" view
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
  const [detailTab, setDetailTab] = useState<"general" | "bsc" | "history" | "team" | "comments" | "status" | "setStatus" | "lifecycle">("general");
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [lifecycleDraft, setLifecycleDraft] = useState<Omit<CardLifecycle, "cardId" | "cardName" | "updatedAt">>(() => emptyLifecycleDraft());
  const [useMatrix, setUseMatrix] = useState<boolean | null>(null);
  const [selectedMatrixId, setSelectedMatrixId] = useState<string | null>(null);
  const [filterDepartment, setFilterDepartment] = useState("Hamısı");
  const [filterSubdivision, setFilterSubdivision] = useState("Hamısı");
  const [filterGroup, setFilterGroup] = useState("Hamısı");
  const [filterTeamId, setFilterTeamId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("Hamısı");
  const [filterAssignKind, setFilterAssignKind] = useState<"Hamısı" | "Fərdi" | "Komanda" | "Struktur" | "Vəzifə">("Hamısı");
  // zone filter removed
  const [searchText, setSearchText] = useState("");
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
    } else {
      const card = kpiCards.find(c => c.id === cardId);
      openWizard(card ? {
        name: card.name,
        frequency: card.frequency || "Aylıq",
        startDate: card.startDate || "",
        endDate: card.endDate || "",
      } : undefined, cardId);
    }
  };
  const handleWizardComplete = async (d: CreateKpiWizardDraft) => {
    const action = d.action || "draft";
    const editingId = wizardEditingId;
    const id = editingId ?? (Math.max(0, ...kpiCards.map(c => c.id)) + 1);
    const builtCard: KpiCard = {
      id, name: d.name, icon: Target, zone: "yellow",
      target: "—", current: "0", unit: "", progress: 0, minTarget: 60,
      responsible: d.createdBy === "self" ? "Özüm" : (d.createdByEmployee || "—"),
      period: `${d.startDate?.slice(0, 4) || "2026"} - ${d.frequency}`,
      type: "Absolut Hədəf", formula: "—", generalTarget: "",
      department: "—", group: "—", subdivision: "—",
      startDate: d.startDate || "", endDate: d.endDate || "",
      frequency: d.frequency,
      team: [], history: [], description: `Bal sistemi: ${d.scoringSystem} · ${d.mode === "individual" ? "Fərdi" : "Toplu"}`,
      weight: 10, approvalStatus: action === "create_active" ? "approved" : "pending",
      subKpis: [],
    };
    setKpiCards(prev => {
      if (editingId != null) {
        return prev.map(c => c.id === editingId ? { ...c, ...builtCard, id: editingId } : c);
      }
      return [builtCard, ...prev];
    });
    setCardDrafts(prev => ({ ...prev, [id]: d }));
    setWizardEditingId(null);

    const nextStatus: import("@/lib/kpiCardStatusStore").KpiCardStatus =
      action === "create_active" ? "aktiv"
      : action === "submit" ? "tesdiq_gozlenilir"
      : "natamam";
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

    // === Cross-panel sync: mirror the wizard outcome into the shared KPI store ===
    try {
      const ownerId = getCurrentEmployeeId(user) || "e1";
      const sharedStatus: "natamam" | "tesdiq_gozlenilir" | "aktiv" =
        nextStatus === "tesdiq_gozlenilir" ? "tesdiq_gozlenilir"
        : nextStatus === "aktiv" ? "aktiv"
        : "natamam";
      const sharedId = `legacy-${id}`;
      const shared = buildSharedCardFromDraft(d, {
        id: sharedId,
        numericId: id,
        ownerId,
        status: sharedStatus,
        matrixId: d.useMatrix ? (d.approvalMatrixId || null) : null,
      });
      upsertSharedKpiCard(shared);
      // If submitted to a matrix, push to approval queue so MANAGER sees it.
      if (action === "submit" && d.useMatrix && d.approvalMatrixId) {
        // Demo: the Sales manager (e8) acts as approver. Real implementation would
        // resolve approver employee ids from the selected matrix steps.
        enqueueApproval({
          kpiCardId: sharedId,
          kpiName: shared.name,
          matrixId: d.approvalMatrixId,
          approverIds: ["e8"],
          createdBy: ownerId,
        });
      }
    } catch (err) {
      // non-fatal — cross-panel sync is best-effort
      console.warn("shared kpi sync failed", err);
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
    3: { status: "aktiv", assignees: [{ name: "Emin Məmmədov", ok: true }] },
    4: { status: "aktiv", assignees: [{ name: "Leyla Həsənova", ok: true }] },
    5: { status: "tesdiq_gozlenilir", use_matrix: true, submitted_for_approval: false, assignees: [{ name: "Rəşad Əliyev", ok: true }] },
    6: { status: "natamam", use_matrix: false, assignees: [{ name: "Kamran Quliyev", ok: true }, { name: "Tural İsmayılov", ok: false }] },
    7: { status: "imtina", use_matrix: true, rejected_by: "Departament Direktoru", assignees: [{ name: "Leyla Məmmədova", ok: true }] },
    8: { status: "aktiv", assignees: [{ name: "Tural İsmayılov", ok: true }] },
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
    return (draft?.startDate) || "—";
  };
  const getAssignKindFor = (cardId: number): "Fərdi" | "Komanda" | "Struktur" | "Vəzifə" => {
    const draft = cardDrafts[cardId];
    if (!draft) {
      // Legacy demo: map to Fərdi/Komanda based on team match
      const card = kpiCards.find(c => c.id === cardId);
      if (!card) return "Fərdi";
      const teams = getTeams();
      const inTeam = teams.some(t => [t.leader, ...t.members.map(m => m.name)].includes(card.responsible));
      return inTeam ? "Komanda" : "Fərdi";
    }
    if (draft.mode === "individual") return "Fərdi";
    // bulk mode — introspect selected buckets
    const b: any = (draft as any).bulk || {};
    if (b.teamIds?.length) return "Komanda";
    if (b.structureIds?.length) return "Struktur";
    if (b.positions?.length) return "Vəzifə";
    return "Fərdi";
  };

  const filteredCards = kpiCards.filter(c => {
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
      natamam: "Qaralama", tesdiq_gozlenilir: "Təsdiq gözlənilir",
      imtina: "İmtina", aktiv: "Aktiv", legv_olundu: "Ləğv olundu",
    };
    const matchesStatus = filterStatus === "Hamısı" || STATUS_LBL[st.status] === filterStatus;
    const matchesKind = filterAssignKind === "Hamısı" || getAssignKindFor(c.id) === filterAssignKind;
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
    // Unapproved → birbaşa silinir
    if (card.approvalStatus === "pending") {
      if (!confirm(`"${card.name}" KPI-ı silinsin?`)) return;
      setKpiCards(prev => prev.filter(c => c.id !== card.id));
      toast.success("KPI silindi");
      return;
    }
    // Approved → silinmə matrisi yoxlanılır
    const matrix = getDeletionMatrix();
    if (!matrix || !matrix.approver) {
      toast.error("Silinmə matrisi yoxdur. Təsdiqləmə Matrisi modulundan yaradın.", { duration: 5000 });
      return;
    }
    addDeletionRequest({
      kpiId: card.id,
      kpiName: card.name,
      requestedBy: user?.name || "Naməlum",
    });
    toast(`Bu KPI təsdiq edilmişdir. Silinmə üçün ${matrix.approver.name} təsdiqləməlidir. Sorğu göndərildi.`, { duration: 6000, icon: "ℹ️" });
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
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <button onClick={() => setViewMode("card")} title="Kart görünüşü" className={`px-3 py-2 text-sm flex items-center gap-1 ${viewMode === "card" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}><LayoutGrid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode("list")} title="Siyahı görünüşü" className={`px-3 py-2 text-sm flex items-center gap-1 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}><List className="w-4 h-4" /></button>
              </div>
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
            <div className="min-w-[160px]">
              <label className="text-[11px] text-muted-foreground">Təyinat növü</label>
              <select value={filterAssignKind} onChange={e => setFilterAssignKind(e.target.value as any)} className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background">
                <option>Hamısı</option>
                <option>Fərdi</option>
                <option>Komanda</option>
                <option>Struktur</option>
                <option>Vəzifə</option>
              </select>
            </div>
            <div className="min-w-[180px]">
              <label className="text-[11px] text-muted-foreground">Komanda</label>
              <FilterTeamSelect value={filterTeamId} onChange={setFilterTeamId} />
            </div>
            <div className="min-w-[180px]">
              <label className="text-[11px] text-muted-foreground">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background">
                <option>Hamısı</option>
                <option>Qaralama</option>
                <option>Təsdiq gözlənilir</option>
                <option>İmtina</option>
                <option>Aktiv</option>
                <option>Ləğv olundu</option>
              </select>
            </div>
            <button onClick={() => { resetFilters(); setFilterAssignKind("Hamısı"); }} className="px-4 py-2 text-sm rounded-lg border border-border bg-card hover:bg-secondary">Sıfırla</button>
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b border-border">
                          <th className="py-2 px-2">Ad</th>
                          <th className="py-2 px-2">Təyinat növü</th>
                          <th className="py-2 px-2">Yaranma tarixi</th>
                          <th className="py-2 px-2">Dövr</th>
                          <th className="py-2 px-2">Progress</th>
                          <th className="py-2 px-2">Status</th>
                          <th className="py-2 px-2">Əməliyyat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCards.length === 0 ? (
                          <tr><td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">Filtrə uyğun KPİ tapılmadı</td></tr>
                        ) : filteredCards.map(card => {
                          const st = getStatusFor(card.id);
                          const reason = (st as any).rejection_reason || (st.status === "imtina" ? `${st.rejected_by || "Təsdiq mərhələsi"} tərəfindən imtina edildi` : "");
                          return (
                            <tr key={card.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                              <td className="py-2 px-2 font-medium text-foreground">{card.name}</td>
                              <td className="py-2 px-2 text-muted-foreground text-xs">{getAssignKindFor(card.id)}</td>
                              <td className="py-2 px-2 text-muted-foreground text-xs">{getCreatedAtFor(card.id)}</td>
                              <td className="py-2 px-2 text-muted-foreground text-xs">{card.period}</td>
                              <td className="py-2 px-2">{card.progress}%</td>
                              <td className="py-2 px-2">
                                <button
                                  onClick={() => st.status === "natamam" && setStatusDialogCardId(card.id)}
                                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full border min-w-[128px] w-[128px] text-center inline-flex items-center justify-center ${STATUS_STYLES[st.status]} ${st.status === "natamam" ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                                  title={st.status === "natamam" ? "Təyin edənləri gör" : (st.status === "imtina" ? `İmtina səbəbi: ${reason}` : "")}
                                >
                                  {STATUS_LABELS[st.status]}
                                </button>
                              </td>
                              <td className="py-2 px-2">
                                <div className="flex items-center gap-1">
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
                                      const copy: KpiCard = { ...card, id: newId, name: `${card.name} (kopya)`, approvalStatus: "pending" };
                                      setKpiCards(prev => [copy, ...prev]);
                                      try {
                                        await upsertStatus({ card_id: newId, status: "natamam", use_matrix: false, submitted_for_approval: false, assignees: [] });
                                        const mod = await import("@/lib/kpiCardStatusStore");
                                        const next = await mod.fetchAllStatuses();
                                        setStatusMap(next);
                                      } catch {}
                                      toast.success("Kart kopyalandı (Qaralama)");
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
                                        if (!confirm(`"${card.name}" kartı tamamən ləğv olunsun? Bu əməliyyat "Ləğv olundu" statusuna keçirəcək.`)) return;
                                        try {
                                          await upsertStatus({ card_id: card.id, status: "legv_olundu" as any, use_matrix: false, submitted_for_approval: false, assignees: [] });
                                          const mod = await import("@/lib/kpiCardStatusStore");
                                          const next = await mod.fetchAllStatuses();
                                          setStatusMap(next);
                                        } catch {}
                                        toast.success("Kart ləğv olundu");
                                        // Notify original assigners about cancellation
                                        try {
                                          const nmod = await import("@/lib/notificationsStore");
                                          const draft = cardDrafts[card.id];
                                          const assigners = new Set<string>();
                                          draft?.targets?.forEach(t => { if (t.assigner) assigners.add(t.assigner); });
                                          assigners.forEach(a => nmod.pushNotification?.({
                                            toEmployeeName: a, kind: "info",
                                            message: `"${card.name}" KPI kartı HR tərəfindən tamamən ləğv olundu.`
                                          } as any));
                                        } catch {}
                                      }}
                                      title="Ləğv et"
                                      className="p-1.5 rounded border border-slate-500/40 hover:bg-slate-500/10 text-slate-700 dark:text-slate-300"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {st.status === "natamam" && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!confirm(`"${card.name}" kartını silmək istədiyinizə əminsiniz?`)) return;
                                        setKpiCards(prev => prev.filter(c => c.id !== card.id));
                                        try {
                                          const { supabase } = await import("@/integrations/supabase/client");
                                          await supabase.from("kpi_card_status").delete().eq("card_id", card.id);
                                          const mod = await import("@/lib/kpiCardStatusStore");
                                          const next = await mod.fetchAllStatuses();
                                          setStatusMap(next);
                                        } catch {}
                                        toast.success("Kart silindi");
                                      }}
                                      title="Sil"
                                      className="p-1.5 rounded border border-rose-500/30 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })() : kartView === "kart2" ? (() => {
              const groups = new Map<string, KpiCard[]>();
              filteredCards.forEach(c => {
                const k = c.responsible || "Təyin olunmayıb";
                if (!groups.has(k)) groups.set(k, []);
                groups.get(k)!.push(c);
              });
              const entries = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
              if (entries.length === 0) {
                return <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center text-sm text-muted-foreground">Filtrə uyğun KPİ tapılmadı</div>;
              }
              return (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-foreground">Əməkdaşlar üzrə</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{entries.length} əməkdaş · KPI kartlarının sayına baxın</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b border-border">
                          <th className="py-2 px-2">Əməkdaş</th>
                          <th className="py-2 px-2 text-center">KPI kartlarının sayı</th>
                          <th className="py-2 px-2">Ortalama Progress</th>
                          <th className="py-2 px-2 text-right">Əməliyyat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map(([person, cards]) => {
                          const avg = Math.round(cards.reduce((s, c) => s + (c.progress || 0), 0) / cards.length);
                          const initial = person.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
                          return (
                            <tr key={person} className="border-b border-border last:border-0 hover:bg-secondary/40">
                              <td className="py-2.5 px-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-semibold">{initial}</div>
                                  <span className="font-medium text-foreground">{person}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <span className="inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">{cards.length}</span>
                              </td>
                              <td className="py-2.5 px-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-32 bg-secondary rounded-full h-1.5"><div className="bg-emerald-500 rounded-full h-1.5" style={{ width: `${avg}%` }} /></div>
                                  <span className="text-xs text-muted-foreground">{avg}%</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-right">
                                <button
                                  onClick={() => setEmployeeDrilldown(person)}
                                  title="Kartlara bax"
                                  className="inline-flex items-center gap-1 p-1.5 rounded border border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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
                      onClick={(e) => { e.stopPropagation(); if (locked) return; setEditingCardId(card.id); setShowCreate(true); setCreateStep(1); }}
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
                    <h3 className="font-semibold text-foreground text-sm mb-2">{card.name}</h3>
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
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="KPI və ya məsul şəxs ilə axtar..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background" />
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b border-border">
                          <th className="py-2 px-2">Ad</th>
                          <th className="py-2 px-2">Tip</th>
                          <th className="py-2 px-2">Məsul</th>
                          <th className="py-2 px-2">Hədəf</th>
                          <th className="py-2 px-2">Cari</th>
                          <th className="py-2 px-2">Progress</th>
                          <th className="py-2 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listFiltered.length === 0 ? (
                          <tr><td colSpan={7} className="py-6 text-center text-xs text-muted-foreground">Nəticə yoxdur</td></tr>
                        ) : listFiltered.map(card => (
                          <tr key={card.id} onClick={() => openDetail(card)} className="border-b border-border last:border-0 hover:bg-secondary/40 cursor-pointer">
                            <td className="py-2 px-2 font-medium text-foreground">{card.name}</td>
                            <td className="py-2 px-2 text-muted-foreground">{card.type}</td>
                            <td className="py-2 px-2 text-muted-foreground">{card.responsible}</td>
                            <td className="py-2 px-2">{card.target} {card.unit}</td>
                            <td className="py-2 px-2">{card.current} {card.unit}</td>
                            <td className="py-2 px-2">{card.progress}%</td>
                            <td className="py-2 px-2 text-xs">{card.approvalStatus === "approved" ? "Təsdiqlənib" : "Gözləyir"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                          <span className="font-medium text-foreground truncate">{card.name}</span>
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
          <DialogHeader>
            <DialogTitle>Təyin edənlər — Qaralama</DialogTitle>
          </DialogHeader>
          {statusDialogCardId !== null && (() => {
            const st = getStatusFor(statusDialogCardId);
            if (!st.assignees || st.assignees.length === 0) {
              return <p className="text-sm text-muted-foreground py-4">Bu kart üçün təyin edən şəxslər tapılmadı.</p>;
            }
            return (
              <ul className="space-y-2 py-2">
                {st.assignees.map((a, i) => (
                  <li key={i} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-secondary/40">
                    <span className="text-sm font-medium text-foreground">{a.name}</span>
                    {a.ok ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                        <Check className="w-4 h-4" /> Təyin edilib
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs font-medium">
                        <X className="w-4 h-4" /> Təyin edilməyib
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* KPI Detail Dialog */}
      <Dialog open={!!selectedKpi} onOpenChange={() => setSelectedKpi(null)}>
        <DialogContent className="max-w-[95vw] xl:max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">{selectedKpi?.name}</DialogTitle>
              {/* zone badge removed */}
            </div>
          </DialogHeader>

          {selectedKpi && (
            <div className="space-y-4">
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
                {([["general", "Ümumi"], ["details", "Detallar"], ["bsc", "Balanced Scorecard"], ["lifecycle", "Lifecycle"], ["performance", "Performans Analitikası"], ["history", "Tarixçə"], ["team", "Komanda"], ["comments", "Şərhlər"], ["status", "Status"]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setDetailTab(key)} className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${detailTab === key ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>{label}</button>
                ))}
              </div>

              {detailTab === "bsc" && <BscScorecardTab kpi={selectedKpi} />}
              {detailTab === "lifecycle" && <LifecycleView lifecycle={getLifecycle(selectedKpi.id) || null} />}
              {isExtraTab(detailTab) && <KpiExtraTabContent kpi={selectedKpi} tab={detailTab} />}

              {detailTab === "general" && (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-secondary rounded-lg p-3"><p className="text-xs text-muted-foreground">Hədəf</p><p className="text-xl font-bold text-destructive mt-1">{selectedKpi.target} {selectedKpi.unit}</p></div>
                    <div className="bg-zone-green-bg rounded-lg p-3"><p className="text-xs text-muted-foreground">Cari Dəyər</p><p className="text-xl font-bold text-primary mt-1">{selectedKpi.current} {selectedKpi.unit}</p></div>
                    <div className="bg-accent rounded-lg p-3"><p className="text-xs text-muted-foreground">Progress</p><p className="text-xl font-bold text-success mt-1">{selectedKpi.progress}%</p></div>
                    <div className="bg-zone-yellow-bg rounded-lg p-3"><p className="text-xs text-muted-foreground">Dövr</p><p className="text-xl font-bold text-destructive mt-1">{selectedKpi.period}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card rounded-lg border border-border p-4">
                      <h4 className="font-semibold text-foreground mb-3">Əsas Məlumatlar</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Məsul Şəxs:</span><span className="font-medium">{selectedKpi.responsible}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Departament:</span><span className="font-medium">{selectedKpi.department}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Başlama:</span><span className="font-medium">{selectedKpi.startDate}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Bitmə:</span><span className="font-medium">{selectedKpi.endDate}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Tezlik:</span><span className="font-medium">{selectedKpi.frequency}</span></div>
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
                                <span>Hədəf: {sk.target}{sk.unit ? ` (${sk.unit})` : ""}</span>
                                <span>{sk._fromSet ? `Təyinatçı: ${sk._assignee}` : `Cari: ${sk.current || "—"}`}</span>
                              </div>
                              {sk.evaluator?.type && (
                                <div className="text-[11px] text-muted-foreground mt-1">
                                  Qiymətləndirici ({sk.evaluator.type}): {sk.evaluator.type === "self" ? "Özü" : sk.evaluator.type === "integration" ? `${sk.evaluator.integrationName} (${sk.evaluator.integrationWeight ?? 100}%)` : sk.evaluator.persons.map((p: any) => `${p.name} ${p.weight}%`).join(", ")}
                                </div>
                              )}
                              {sk.progress !== undefined && (
                                <div className="w-full bg-muted rounded-full h-1.5">
                                  <div className="bg-primary rounded-full h-1.5" style={{ width: `${sk.progress}%` }} />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      );
                    })()}
                    {(!selectedKpi.subKpis || selectedKpi.subKpis.length === 0) && (
                      <div className="bg-card rounded-lg border border-border p-4">
                        <h4 className="font-semibold text-foreground mb-3">Qeyd</h4>
                        <p className="text-sm text-muted-foreground">Son ayda müsbət dinamika müşahidə olunur.</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {detailTab === "details" && (
                <div className="space-y-4">
                  <div className="bg-card rounded-lg border border-border p-4">
                    <h4 className="font-semibold text-foreground mb-3">KPI Təsviri</h4>
                    <p className="text-sm text-muted-foreground">{selectedKpi.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card rounded-lg border border-border p-4">
                      <h4 className="font-semibold text-foreground mb-3">Hesablama Məlumatları</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">KPI Tipi:</span><span className="font-medium">{selectedKpi.type}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Formula:</span><span className="font-medium font-mono text-xs">{selectedKpi.formula}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Çəki:</span><span className="font-medium">{selectedKpi.weight}%</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Min. Hədəf:</span><span className="font-medium">{selectedKpi.minTarget}%</span></div>
                      </div>
                    </div>
                    <div className="bg-card rounded-lg border border-border p-4">
                      <h4 className="font-semibold text-foreground mb-3">Əlavə Parametrlər</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Departament:</span><span className="font-medium">{selectedKpi.department}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Dövr:</span><span className="font-medium">{selectedKpi.period}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Tezlik:</span><span className="font-medium">{selectedKpi.frequency}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Vahid:</span><span className="font-medium">{selectedKpi.unit || "Faiz"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Status:</span>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-secondary text-foreground">{selectedKpi.approvalStatus === "approved" ? "Təsdiqlənib" : "Gözləyir"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
                  <h4 className="font-semibold text-foreground mb-4">Komanda Üzvləri</h4>
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

              {detailTab === "status" && (() => {
                const isApproved = selectedKpi.approvalStatus === "approved";
                const approvalChain = isApproved
                  ? [
                    { role: "Şöbə Müdiri", person: "Kamran Quliyev", status: "approved" as const, date: "11.04.2026", comment: "Hədəf uyğundur." },
                    { role: "Departament Direktoru", person: "Farid Həsənov", status: "approved" as const, date: "12.04.2026", comment: "Təsdiqləndi." },
                    { role: "Kurator", person: "Nigar Hüseynova", status: "approved" as const, date: "13.04.2026" },
                    { role: "HR", person: "Günel Əlizadə", status: "approved" as const, date: "14.04.2026", comment: "Son təsdiq verildi." },
                  ]
                  : [
                    { role: "Şöbə Müdiri", person: "Kamran Quliyev", status: "approved" as const, date: "11.04.2026", comment: "Hədəf uyğundur." },
                    { role: "Departament Direktoru", person: "Farid Həsənov", status: "pending" as const },
                    { role: "Kurator", person: "Nigar Hüseynova", status: "waiting" as const },
                    { role: "HR", person: "Günel Əlizadə", status: "waiting" as const },
                  ];
                const completedSteps = approvalChain.filter(s => s.status === "approved").length;
                const totalSteps = approvalChain.length;
                const currentStepIndex = approvalChain.findIndex(s => s.status === "pending");
                const overallStatus = isApproved ? "Təsdiq edilib" : "Təsdiq gözləyir";
                const statusColor = overallStatus === "Təsdiq edilib" ? "bg-zone-green-bg text-zone-green-text" : "bg-zone-yellow-bg text-zone-yellow-text";

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-secondary rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Ümumi Status</p><span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusColor}`}>{overallStatus}</span></div>
                      <div className="bg-secondary rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Progress</p><p className="text-lg font-bold text-foreground mt-1">{completedSteps}/{totalSteps}</p></div>
                      <div className="bg-secondary rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Cari Mərhələ</p><p className="text-sm font-semibold text-foreground mt-1">{currentStepIndex >= 0 ? `${currentStepIndex + 1}-ci mərhələ` : "Tamamlandı"}</p></div>
                    </div>
                    <div className="bg-card rounded-lg border border-border p-4">
                      <h4 className="font-semibold text-foreground text-sm mb-3">Hazırda Təsdiqləyən</h4>
                      {currentStepIndex >= 0 ? (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-zone-yellow-bg">
                          <Clock className="w-5 h-5 text-zone-yellow-text" />
                          <div><p className="text-sm font-semibold text-foreground">{approvalChain[currentStepIndex].person}</p><p className="text-xs text-muted-foreground">{approvalChain[currentStepIndex].role}</p></div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-zone-green-bg"><CheckCircle className="w-5 h-5 text-zone-green-text" /><p className="text-sm font-semibold text-foreground">Tamamlandı</p></div>
                      )}
                    </div>
                    <div className="bg-card rounded-lg border border-border p-4">
                      <h4 className="font-semibold text-foreground text-sm mb-4">Təsdiqləmə Zənciri</h4>
                      <div className="space-y-3">
                        {approvalChain.map((step, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              step.status === "approved" ? "bg-zone-green-bg text-zone-green-text" : step.status === "pending" ? "bg-zone-yellow-bg text-zone-yellow-text" : "bg-muted text-muted-foreground"
                            }`}>{step.status === "approved" ? <CheckCircle className="w-4 h-4" /> : i + 1}</div>
                            <div className="flex-1"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-foreground">{step.role}</p><p className="text-xs text-muted-foreground">{step.person}</p></div>
                              <div className="text-right">
                                {step.status === "approved" && <span className="text-xs text-zone-green-text">✓ {step.date}</span>}
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
                  <div className="relative mt-1">
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
                    <div className="relative mt-1">
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
                    <div className="space-y-2">
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
                  <div className="relative">
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
                                  <input type="number" value={sk.weight} onChange={e => updateSub({ weight: Number(e.target.value) })} className="w-full min-w-0 px-2 py-1.5 pr-6 text-sm border border-border rounded-lg bg-background" />
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
                                    <input type="number" value={sel.weight} onChange={e => updateWeight(m.name, Number(e.target.value))} className="w-16 px-2 py-1 text-xs border border-border rounded bg-background" />
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
                                  <input type="number" value={sel.weight} onChange={e => updateWeight(name, Number(e.target.value))} className="w-16 px-2 py-1 text-xs border border-border rounded bg-background" />
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
    </div>
  );
};

export default KpiCardsPage;
