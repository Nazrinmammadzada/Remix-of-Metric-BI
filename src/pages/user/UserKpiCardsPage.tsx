import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { useAuth } from "@/contexts/AuthContext";
import { Target, TrendingUp, Users, CheckCircle, Lightbulb, Settings2, Search, Download, Plus, X, Calendar, Hourglass, CheckCircle2, Trash2, Check, ArrowUp, ArrowDown, Clock, GripVertical, Pencil, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PeriodPicker, { type PeriodValue } from "@/components/kpi/PeriodPicker";
import { validateTarget, getTargetPlaceholder } from "@/lib/kpiValidation";
import { formatUserWithRole } from "@/lib/matrixStore";
import { getTeams, type TeamMember } from "@/lib/teamsStore";
import { PageHero } from "@/components/ui/page-hero";
import KpiExtraTabContent, { isExtraTab } from "@/components/kpi/KpiExtraTabs";
import SharedKpiPanel from "@/components/kpi/SharedKpiPanel";

interface SubKpi {
  id: number; name: string; target: string; weight: number; current?: string; progress?: number;
}

interface KpiCard {
  id: number; name: string; icon: any; zone: "green" | "yellow" | "red"; target: string; current: string; unit: string;
  progress: number; minTarget: number; responsible: string; period: string; type: string; formula: string;
  department: string; group: string; subdivision: string; startDate: string; endDate: string; frequency: string;
  weight: number; approvalStatus: "pending" | "approved"; description: string; subKpis?: SubKpi[];
  team: { name: string; role: string; avatar: string }[];
  history: { date: string; value: string; change: number }[];
}

// User's own KPIs + team KPIs
const userKpiCards: KpiCard[] = [
  {
    id: 1, name: "Aylıq Satış Hədəfi", icon: Target, zone: "green", target: "5M", current: "4.2M", unit: "AZN", progress: 84, minTarget: 60,
    responsible: "Samir Həsənov", period: "2026 - Aylıq", type: "Absolut Hədəf", formula: "Cari Satış / Hədəf Satış × 100",
    department: "Satış Departamenti", group: "Bakı Satış Qrupu", subdivision: "Satış Şöbəsi",
    startDate: "01.01.2026", endDate: "31.01.2026", frequency: "Aylıq", weight: 30, approvalStatus: "approved",
    description: "Aylıq satış hədəfinin yerinə yetirilməsi üçün əsas göstərici.",
    team: [
      { name: "Samir Həsənov", role: "Komanda Lideri", avatar: "S" },
      { name: "Leyla Məmmədova", role: "Satış Mütəxəssisi", avatar: "L" },
    ],
    history: [
      { date: "Mart 2026", value: "4.2M AZN", change: 8 },
      { date: "Fevral 2026", value: "3.8M AZN", change: 5 },
    ],
    subKpis: [
      { id: 1, name: "Online Satış", target: "2M AZN", weight: 40, current: "1.7M AZN", progress: 85 },
      { id: 2, name: "Mağaza Satışı", target: "3M AZN", weight: 60, current: "2.5M AZN", progress: 83 },
    ],
  },
  {
    id: 2, name: "Müştəri Əldə Etmə", icon: Users, zone: "green", target: "500", current: "485", unit: "Müştəri", progress: 97, minTarget: 75,
    responsible: "Samir Həsənov", period: "2026 - Aylıq", type: "Say Hədəfi", formula: "Yeni Müştəri / Hədəf × 100",
    department: "Satış Departamenti", group: "Bakı Satış Qrupu", subdivision: "Satış Şöbəsi",
    startDate: "01.03.2026", endDate: "31.03.2026", frequency: "Aylıq", weight: 20, approvalStatus: "approved",
    description: "Yeni müştərilərin cəlb edilməsi üzrə hədəf.",
    team: [{ name: "Samir Həsənov", role: "Komanda Lideri", avatar: "S" }],
    history: [{ date: "Mart 2026", value: "485 Müştəri", change: 15 }],
    subKpis: [
      { id: 1, name: "Sosial Media Müştəriləri", target: "200", weight: 35, current: "190", progress: 95 },
      { id: 2, name: "Referral Müştərilər", target: "150", weight: 30, current: "148", progress: 99 },
      { id: 3, name: "Reklam Kampaniyası", target: "150", weight: 35, current: "147", progress: 98 },
    ],
  },
  {
    id: 3, name: "İnnovasiya İndeksi", icon: Lightbulb, zone: "yellow", target: "80%", current: "72%", unit: "", progress: 65, minTarget: 60,
    responsible: "Samir Həsənov", period: "2026 - İllik", type: "Benchmark", formula: "İnnovasiya Skoru / Hədəf × 100",
    department: "Satış Departamenti", group: "Bakı Satış Qrupu", subdivision: "Satış Şöbəsi",
    startDate: "01.01.2026", endDate: "31.12.2026", frequency: "İllik", weight: 5, approvalStatus: "pending",
    description: "İnnovasiya və yenilikçilik indeksi.",
    team: [{ name: "Samir Həsənov", role: "Komanda Lideri", avatar: "S" }],
    history: [{ date: "Mart 2026", value: "72%", change: 4 }],
  },
  // Team member KPI
  {
    id: 4, name: "Parakəndə Satış Göstəriciləri", icon: TrendingUp, zone: "yellow", target: "2M", current: "1.9M", unit: "AZN", progress: 75, minTarget: 70,
    responsible: "Leyla Məmmədova", period: "2026 - İllik", type: "Faiz Hədəfi", formula: "Parakəndə Satış / Ümumi Satış × 100",
    department: "Satış Departamenti", group: "Bakı Satış Qrupu", subdivision: "Satış Şöbəsi",
    startDate: "01.01.2026", endDate: "31.12.2026", frequency: "İllik", weight: 25, approvalStatus: "approved",
    description: "Parakəndə satış kanalı üzrə performans göstəricisi.",
    team: [{ name: "Leyla Məmmədova", role: "Satış Mütəxəssisi", avatar: "L" }],
    history: [{ date: "Mart 2026", value: "1.9M AZN", change: 12 }],
  },
];

const getCardZone = (progress: number): "green" | "yellow" | "red" => {
  if (progress > 80) return "green";
  if (progress >= 50) return "yellow";
  return "red";
};

const zoneLabel = { green: "Yaşıl Zona", yellow: "Sarı Zona", red: "Qırmızı Zona" };
const zoneBg = { green: "bg-zone-green-bg text-zone-green-text", yellow: "bg-zone-yellow-bg text-zone-yellow-text", red: "bg-zone-red-bg text-zone-red-text" };
const zoneBorder = { green: "border-zone-green-text/30", yellow: "border-zone-yellow-text/30", red: "border-zone-red-text/30" };

const departmentStructure: Record<string, Record<string, string[]>> = {
  "Satış Departamenti": { "Satış Şöbəsi": ["Bakı Satış Qrupu", "Regional Satış Qrupu"] },
};

const availableFormulas = [
  { id: 1, name: "Satış Performans Düsturu", formula: "(Cari Satış / Hədəf Satış) × 100" },
  { id: 2, name: "Müştəri Məmnuniyyət İndeksi", formula: "(Məmnun Müştəri / Ümumi Müştəri) × 100" },
];

const kpiTypeOptions = ["Absolut Hədəf", "Faiz Hədəfi", "Say Hədəfi"];

const subKpisByType: Record<string, { name: string; defaultWeight: number }[]> = {
  "Absolut Hədəf": [
    { name: "Online Satış", defaultWeight: 40 },
    { name: "Mağaza Satışı", defaultWeight: 60 },
  ],
  "Say Hədəfi": [
    { name: "Sosial Media Müştəriləri", defaultWeight: 35 },
    { name: "Referral Müştərilər", defaultWeight: 30 },
    { name: "Reklam Kampaniyası", defaultWeight: 35 },
  ],
  "Faiz Hədəfi": [
    { name: "Onlayn Kanal Faizi", defaultWeight: 50 },
    { name: "Offline Kanal Faizi", defaultWeight: 50 },
  ],
};

const allPersons = ["Kamran Quliyev", "Farid Həsənov", "Nigar Hüseynova", "Günel Əlizadə", "Leyla Məmmədova"];

const UserKpiCardsPage = () => {
  const { user } = useAuth();
  const [selectedKpi, setSelectedKpi] = useState<KpiCard | null>(null);
  const [detailTab, setDetailTab] = useState<"general" | "details" | "performance" | "history" | "team" | "evaluation" | "comments" | "status">("general");
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [filterStatus, setFilterStatus] = useState("Hamısı");
  const [filterView, setFilterView] = useState<"own" | "team" | "structure">("own");
  const [searchText, setSearchText] = useState("");
  const [hoveredMinTarget, setHoveredMinTarget] = useState<number | null>(null);

  const [newKpi, setNewKpi] = useState({
    name: "", types: [] as string[], generalTarget: "", minTarget: "60", selectedFormula: "",
    period: { type: "Aylıq" } as PeriodValue,
    subKpis: [] as { id: number; name: string; target: string; weight: number }[],
    approvalChain: [
      { role: "Şöbə Müdiri", persons: [] as string[] },
      { role: "Departament Direktoru", persons: [] as string[] },
      { role: "HR", persons: [] as string[] },
    ],
  });
  const [targetError, setTargetError] = useState<string>("");
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [personSearches, setPersonSearches] = useState<Record<number, string>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [typeSearchText, setTypeSearchText] = useState("");

  const filteredCards = userKpiCards.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesView = filterView === "own" ? c.responsible === user?.name : c.responsible !== user?.name;
    const matchesStatus = filterStatus === "Hamısı" ||
      (filterStatus === "Təsdiq gözləyən" && c.approvalStatus === "pending") ||
      (filterStatus === "Təsdiq edilmiş" && c.approvalStatus === "approved");
    return matchesSearch && matchesView && matchesStatus;
  });

  // Identify if the current user is a team leader → show per-member KPI breakdown.
  const myLedTeam = user ? getTeams().find(t => t.leader === user.name) : undefined;
  const isLeaderView = filterView === "team" && !!myLedTeam;

  // For leader breakdown: a "team KPI" is one where any member (or the leader) is responsible.
  const teamKpisForLeader = myLedTeam
    ? userKpiCards.filter(c => {
        const memberNames = [myLedTeam.leader, ...myLedTeam.members.map(m => m.name)];
        const matchesMembership = memberNames.includes(c.responsible);
        const matchesSearch = c.name.toLowerCase().includes(searchText.toLowerCase());
        const matchesStatus = filterStatus === "Hamısı" ||
          (filterStatus === "Təsdiq gözləyən" && c.approvalStatus === "pending") ||
          (filterStatus === "Təsdiq edilmiş" && c.approvalStatus === "approved");
        return matchesMembership && matchesSearch && matchesStatus;
      })
    : [];

  // Build per-member synthetic performance for each team KPI (deterministic from member kpiScore).
  const buildBreakdown = (kpi: KpiCard): { name: string; role: string; avatar: string; progress: number }[] => {
    if (!myLedTeam) return [];
    const all: { name: string; role: string; avatar: string; kpiScore: number }[] = [
      { name: myLedTeam.leader, role: "Komanda Lideri", avatar: myLedTeam.leaderAvatar, kpiScore: myLedTeam.kpiResult },
      ...myLedTeam.members.map((m: TeamMember) => ({ name: m.name, role: m.role, avatar: m.avatar, kpiScore: m.kpiScore })),
    ];
    // Mix the KPI's overall progress with each member's score to vary results.
    return all.map(m => ({
      name: m.name,
      role: m.role,
      avatar: m.avatar,
      progress: Math.max(5, Math.min(100, Math.round((m.kpiScore + kpi.progress) / 2))),
    }));
  };

  const toggleKpiType = (type: string) => {
    setNewKpi(prev => {
      const newTypes = prev.types.includes(type) ? prev.types.filter(t => t !== type) : [...prev.types, type];
      const allSubKpis: { id: number; name: string; target: string; weight: number }[] = [];
      let idCounter = 1;
      newTypes.forEach(t => {
        (subKpisByType[t] || []).forEach(sk => {
          if (!allSubKpis.find(s => s.name === sk.name)) {
            allSubKpis.push({ id: idCounter++, name: sk.name, target: "", weight: sk.defaultWeight });
          }
        });
      });
      return { ...prev, types: newTypes, subKpis: allSubKpis };
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

  const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
  const totalSubWeight = newKpi.subKpis.reduce((s, sk) => s + sk.weight, 0);

  // Pre-fill form when editing a card
  useEffect(() => {
    if (editingCardId === null) return;
    const card = userKpiCards.find(c => c.id === editingCardId);
    if (!card) return;
    setNewKpi({
      name: card.name,
      types: [card.type],
      generalTarget: `${card.target} ${card.unit}`.trim(),
      minTarget: String(card.minTarget),
      selectedFormula: card.formula,
      period: { type: "Aylıq" } as PeriodValue,
      subKpis: card.subKpis ? card.subKpis.map(sk => ({ id: sk.id, name: sk.name, target: sk.target, weight: sk.weight })) : [],
      approvalChain: [
        { role: "Şöbə Müdiri", persons: [] as string[] },
        { role: "Departament Direktoru", persons: [] as string[] },
        { role: "HR", persons: [] as string[] },
      ],
    });
    setTargetError("");
  }, [editingCardId]);

  return (
    <div className="min-h-screen">
      <Header title="KPI İzlənməsi" />
      <main className="p-6 pb-24">
        <PageHero
          badge="KPI İzlənməsi"
          icon={Sparkles}
          title="KPI Kartlarım"
          subtitle={`${filteredCards.length} KPI tapıldı`}
          right={
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg bg-card hover:bg-secondary transition-colors">
                <Download className="w-4 h-4" /> Export
              </button>
              <button onClick={() => { setShowCreate(true); setCreateStep(1); }} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-primary to-primary/70 text-primary-foreground shadow-md hover:shadow-lg transition-all">
                <Plus className="w-4 h-4" /> Yeni KPI
              </button>
            </div>
          }
        />

        <div className="mb-6">
          <SharedKpiPanel title="Sizə təyin olunmuş KPI kartları" onlyAssignedToMe />
        </div>




        {/* View toggle & filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
            <button onClick={() => setFilterView("own")} className={`px-4 py-1.5 text-sm rounded-md ${filterView === "own" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Öz KPI-larım</button>
            <button onClick={() => setFilterView("team")} className={`px-4 py-1.5 text-sm rounded-md ${filterView === "team" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Komanda KPI-ları</button>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="KPI axtar..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-card" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-lg bg-card">
            <option>Hamısı</option>
            <option>Təsdiq gözləyən</option>
            <option>Təsdiq edilmiş</option>
          </select>
        </div>

        {isLeaderView ? (
          /* Team-leader breakdown view: each team KPI shows individual member performance. */
          teamKpisForLeader.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-semibold text-foreground">Komanda KPI-ı tapılmadı</p>
              <p className="text-sm text-muted-foreground">Komanda üzvləri üzrə təyin edilmiş KPI yoxdur</p>
            </div>
          ) : (
            <div className="mb-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground inline-flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Komanda lideri görünüşü — hər KPI üzvlər üzrə fərdi göstərilir</span>
            </div>
          )
        ) : null}

        {isLeaderView ? (
          <div className="space-y-4">
            {teamKpisForLeader.map(card => {
              const breakdown = buildBreakdown(card);
              return (
                <div key={card.id} className={`bg-card rounded-xl p-5 border-2 ${zoneBorder[getCardZone(card.progress)]}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        {card.approvalStatus === "approved" ? <CheckCircle2 className="w-5 h-5 text-zone-green-text" /> : <Hourglass className="w-5 h-5 text-zone-yellow-text" />}
                      </div>
                      <div>
                        <button onClick={() => { setSelectedKpi(card); setDetailTab("general"); }} className="text-left">
                          <h3 className="font-semibold text-foreground text-base hover:text-primary transition-colors">{card.name}</h3>
                        </button>
                        <p className="text-xs text-muted-foreground mt-0.5">Hədəf: <span className="font-medium text-foreground">{card.target} {card.unit}</span> · Dövr: {card.period}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${zoneBg[getCardZone(card.progress)]}`}>{zoneLabel[getCardZone(card.progress)]}</span>
                  </div>

                  {/* Per-member rows */}
                  <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Üzvlər üzrə performans ({breakdown.length})</div>
                    {breakdown.map(m => {
                      const z = getCardZone(m.progress);
                      return (
                        <div key={m.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/40 hover:bg-secondary transition-colors">
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">{m.avatar}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                              <span className="text-xs font-semibold text-foreground">{m.progress}%</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{m.role}</p>
                            <div className="w-full bg-background rounded-full h-1.5 mt-1.5">
                              <div className={`rounded-full h-1.5 ${z === "green" ? "bg-success" : z === "yellow" ? "bg-warning" : "bg-destructive"}`} style={{ width: `${m.progress}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-16">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-semibold text-foreground">Məlumat tapılmadı</p>
            <p className="text-sm text-muted-foreground">Bu görünüşdə heç bir KPI yoxdur</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filteredCards.map((card) => (
              <div key={card.id} onClick={() => { setSelectedKpi(card); setDetailTab("general"); }} className={`bg-card rounded-xl p-5 border-2 ${zoneBorder[getCardZone(card.progress)]} cursor-pointer hover:shadow-md transition-shadow relative group`}>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingCardId(card.id); setShowCreate(true); setCreateStep(1); }}
                  title="Redaktə et"
                  className="absolute top-3 right-3 w-7 h-7 rounded-md bg-card border border-border opacity-0 group-hover:opacity-100 hover:bg-secondary flex items-center justify-center transition-opacity z-10"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    {card.approvalStatus === "approved" ? <CheckCircle2 className="w-5 h-5 text-zone-green-text" /> : <Hourglass className="w-5 h-5 text-zone-yellow-text" />}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${zoneBg[getCardZone(card.progress)]} mr-9`}>{zoneLabel[getCardZone(card.progress)]}</span>
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
                <div className="relative w-full mt-1 group" onMouseEnter={() => setHoveredMinTarget(card.id)} onMouseLeave={() => setHoveredMinTarget(null)}>
                  <div className="w-full bg-secondary rounded-full h-2.5">
                    <div className="bg-success rounded-full h-2.5" style={{ width: `${card.progress}%` }} />
                  </div>
                  <div className="absolute top-0 h-2.5 w-1 rounded-full" style={{ left: `${card.minTarget}%`, background: 'linear-gradient(to bottom, hsl(var(--warning)), hsl(var(--destructive)))', boxShadow: '0 0 4px hsl(var(--warning) / 0.6)' }} />
                  {hoveredMinTarget === card.id && (
                    <div className="absolute -top-8 px-2 py-1 text-xs font-medium bg-foreground text-background rounded shadow-lg whitespace-nowrap z-10" style={{ left: `${card.minTarget}%`, transform: 'translateX(-50%)' }}>
                      Min. hədəf: {card.minTarget}%
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{card.responsible}</span>
                  <span>{card.period}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* KPI Detail Dialog */}
      <Dialog open={!!selectedKpi} onOpenChange={() => setSelectedKpi(null)}>
        <DialogContent className="max-w-[95vw] xl:max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">{selectedKpi?.name}</DialogTitle>
              {selectedKpi && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${zoneBg[getCardZone(selectedKpi.progress)]}`}>{zoneLabel[getCardZone(selectedKpi.progress)]}</span>}
            </div>
          </DialogHeader>
          {selectedKpi && (
            <div className="space-y-4">
              <div className="flex gap-2 border-b border-border overflow-x-auto">
                {([["general", "Ümumi"], ["details", "Detallar"], ["performance", "Performans Analitikası"], ["history", "Tarixçə"], ["team", "Komanda"], ["evaluation", "Qiymətləndirmə"], ["comments", "Şərhlər"], ["status", "Status"]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setDetailTab(key)} className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${detailTab === key ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>{label}</button>
                ))}
              </div>

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
                      </div>
                    </div>
                    {selectedKpi.subKpis && selectedKpi.subKpis.length > 0 && (
                      <div className="bg-card rounded-lg border border-border p-4">
                        <h4 className="font-semibold text-foreground mb-3">Hədəflər</h4>
                        <div className="space-y-2">
                          {selectedKpi.subKpis.map(sk => (
                            <div key={sk.id} className="p-2 rounded-lg bg-secondary">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium text-foreground">{sk.name}</span>
                                <span className="text-xs text-muted-foreground">Çəki: {sk.weight}%</span>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Hədəf: {sk.target}</span>
                                <span>Cari: {sk.current}</span>
                              </div>
                              {sk.progress !== undefined && (
                                <div className="w-full bg-muted rounded-full h-1.5">
                                  <div className="bg-primary rounded-full h-1.5" style={{ width: `${sk.progress}%` }} />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
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
                      <h4 className="font-semibold text-foreground mb-3">Hesablama</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">KPI Tipi:</span><span className="font-medium">{selectedKpi.type}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Formula:</span><span className="font-medium font-mono text-xs">{selectedKpi.formula}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Çəki:</span><span className="font-medium">{selectedKpi.weight}%</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Min. Hədəf:</span><span className="font-medium">{selectedKpi.minTarget}%</span></div>
                      </div>
                    </div>
                    <div className="bg-card rounded-lg border border-border p-4">
                      <h4 className="font-semibold text-foreground mb-3">Əlavə</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Dövr:</span><span className="font-medium">{selectedKpi.period}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Tezlik:</span><span className="font-medium">{selectedKpi.frequency}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Vahid:</span><span className="font-medium">{selectedKpi.unit || "Faiz"}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === "history" && (
                <div className="bg-card rounded-lg border border-border p-4">
                  <h4 className="font-semibold text-foreground mb-4">Tarixçə</h4>
                  <div className="space-y-3">
                    {selectedKpi.history.map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Calendar className="w-4 h-4 text-primary" /></div>
                          <div><p className="text-sm font-medium text-foreground">{h.date}</p><p className="text-xs text-muted-foreground">{h.value}</p></div>
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
                  <h4 className="font-semibold text-foreground mb-4">Komanda</h4>
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
                    { role: "Şöbə Müdiri", person: "Kamran Quliyev", status: "approved" as const, date: "11.04.2026" },
                    { role: "Departament Direktoru", person: "Farid Həsənov", status: "approved" as const, date: "12.04.2026" },
                    { role: "HR", person: "Günel Əlizadə", status: "approved" as const, date: "14.04.2026" },
                  ]
                  : [
                    { role: "Şöbə Müdiri", person: "Kamran Quliyev", status: "approved" as const, date: "11.04.2026" },
                    { role: "Departament Direktoru", person: "Farid Həsənov", status: "pending" as const },
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
                      <div className="bg-secondary rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Cari Mərhələ</p><p className="text-sm font-semibold text-foreground mt-1">{currentStepIndex >= 0 ? `${currentStepIndex + 1}-ci` : "Tamamlandı"}</p></div>
                    </div>
                    <div className="bg-card rounded-lg border border-border p-4">
                      <h4 className="font-semibold text-foreground text-sm mb-3">Təsdiqləmə Zənciri</h4>
                      <div className="space-y-3">
                        {approvalChain.map((step, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              step.status === "approved" ? "bg-zone-green-bg text-zone-green-text" : step.status === "pending" ? "bg-zone-yellow-bg text-zone-yellow-text" : "bg-muted text-muted-foreground"
                            }`}>{step.status === "approved" ? <CheckCircle className="w-4 h-4" /> : i + 1}</div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div><p className="text-sm font-medium text-foreground">{step.role}</p><p className="text-xs text-muted-foreground">{step.person}</p></div>
                                <div className="text-right">
                                  {step.status === "approved" && <span className="text-xs text-zone-green-text">✓ {step.date}</span>}
                                  {step.status === "pending" && <span className="text-xs text-zone-yellow-text">⏳ Gözləyir</span>}
                                  {step.status === "waiting" && <span className="text-xs text-muted-foreground">Növbədə</span>}
                                </div>
                              </div>
                            </div>
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

      {/* Create KPI Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni KPI Yarat — Addım {createStep}/2</DialogTitle>
            <p className="text-sm text-muted-foreground">{createStep === 1 ? "Əsas məlumatlar" : "Təsdiqləmə zənciri"}</p>
          </DialogHeader>
          <div className="flex gap-2 mb-2">
            <div className={`flex-1 h-1 rounded-full ${createStep >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex-1 h-1 rounded-full ${createStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
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
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Komanda</label>
                <input value={user?.team || ""} disabled className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">KPI Dövrü</label>
                <PeriodPicker value={newKpi.period} onChange={(v) => setNewKpi(p => ({ ...p, period: v }))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Ümumi Hədəf</label>
                  <input
                    value={newKpi.generalTarget}
                    onChange={e => {
                      const v = e.target.value;
                      setNewKpi(p => ({ ...p, generalTarget: v }));
                      const res = validateTarget(v, newKpi.types);
                      setTargetError(res.ok ? "" : res.error || "");
                    }}
                    placeholder={getTargetPlaceholder(newKpi.types)}
                    className={`w-full mt-1 px-3 py-2 text-sm border rounded-lg bg-background ${targetError ? "border-destructive" : "border-border"}`}
                  />
                  {targetError && <p className="text-xs text-destructive mt-1">{targetError}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Min. Hədəf (%)</label>
                  <input type="number" value={newKpi.minTarget} onChange={e => setNewKpi(p => ({ ...p, minTarget: e.target.value }))} className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Hesablama Düsturu</label>
                <select value={newKpi.selectedFormula} onChange={e => setNewKpi(p => ({ ...p, selectedFormula: e.target.value }))} className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background">
                  <option value="">Düstur seçin (Ayarlardan)</option>
                  {availableFormulas.map(f => <option key={f.id} value={f.name}>{f.name} — {f.formula}</option>)}
                </select>
              </div>

              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-foreground">Hədəflər</label>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${totalSubWeight > 100 ? 'text-destructive' : 'text-muted-foreground'}`}>Toplam: {totalSubWeight}%</span>
                    <button onClick={() => setNewKpi(p => ({ ...p, subKpis: [...p.subKpis, { id: Date.now(), name: "", target: "", weight: 0 }] }))} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-primary text-primary-foreground"><Plus className="w-3 h-3" /> Yeni Hədəf</button>
                  </div>
                </div>
                {newKpi.subKpis.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Hədəf əlavə etmək üçün yuxarıdakı düyməyə klik edin və ya KPI Tipi seçin</p>
                ) : (
                  <div className="space-y-2">
                    {newKpi.subKpis.map((sk, i) => (
                      <div key={sk.id} className="grid grid-cols-12 gap-2 items-center">
                        <input value={sk.name} onChange={e => { const s = [...newKpi.subKpis]; s[i] = { ...s[i], name: e.target.value }; setNewKpi(p => ({ ...p, subKpis: s })); }} placeholder="Hədəf adı" className="col-span-5 px-2 py-1.5 text-sm border border-border rounded-lg bg-background" />
                        <input value={sk.target} onChange={e => { const s = [...newKpi.subKpis]; s[i] = { ...s[i], target: e.target.value }; setNewKpi(p => ({ ...p, subKpis: s })); }} placeholder="Hədəf" className="col-span-3 px-2 py-1.5 text-sm border border-border rounded-lg bg-background" />
                        <div className="col-span-3 flex items-center gap-1">
                          <input type="number" value={sk.weight} onChange={e => { const s = [...newKpi.subKpis]; s[i] = { ...s[i], weight: Number(e.target.value) }; setNewKpi(p => ({ ...p, subKpis: s })); }} className="w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-background" />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                        <button onClick={() => setNewKpi(p => ({ ...p, subKpis: p.subKpis.filter((_, idx) => idx !== i) }))} className="col-span-1 w-7 h-7 rounded bg-zone-red-bg text-zone-red-text flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setCreateStep(2)} className="flex-1 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium">Növbəti →</button>
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 text-sm rounded-lg border border-border bg-card">Ləğv Et</button>
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-4">
              <div className="border border-border rounded-lg p-4">
                <label className="text-sm font-medium text-foreground">Təsdiqləmə Matrisi</label>
                <p className="text-xs text-muted-foreground mb-3 mt-1">Mərhələləri sürüşdürərək sırasını dəyişin</p>
                <div className="space-y-2">
                  {newKpi.approvalChain.map((step, i) => (
                    <div key={i} draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)} onDragEnd={handleDragEnd}
                      className={`border border-border rounded-lg p-3 bg-secondary cursor-grab ${dragIndex === i ? 'opacity-50 border-primary' : ''}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                        <input value={step.role} onChange={e => { const c = [...newKpi.approvalChain]; c[i] = { ...c[i], role: e.target.value }; setNewKpi(p => ({ ...p, approvalChain: c })); }} className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background font-medium" />
                      </div>
                      <div className="ml-8">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                          <input value={personSearches[i] || ""} onChange={e => setPersonSearches(prev => ({ ...prev, [i]: e.target.value }))} placeholder="Şəxs axtar..." className="w-full pl-7 pr-3 py-1.5 text-xs border border-border rounded bg-background" />
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {step.persons.map(p => (
                            <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">{formatUserWithRole(p)}<X className="w-2.5 h-2.5 cursor-pointer" onClick={() => togglePerson(i, p)} /></span>
                          ))}
                        </div>
                        <div className="max-h-24 overflow-y-auto mt-1 space-y-0.5">
                          {allPersons.filter(p => !step.persons.includes(p) && (p.toLowerCase().includes((personSearches[i] || "").toLowerCase()) || formatUserWithRole(p).toLowerCase().includes((personSearches[i] || "").toLowerCase()))).slice(0, 5).map(person => (
                            <div key={person} onClick={() => togglePerson(i, person)} className="px-2 py-1 text-xs hover:bg-primary/5 rounded cursor-pointer text-muted-foreground hover:text-foreground">+ {formatUserWithRole(person)}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setCreateStep(1)} className="flex-1 py-2.5 text-sm rounded-lg border border-border bg-card">← Geri</button>
                <button className="flex-1 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium">📤 Təsdiqə Göndər</button>
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 text-sm rounded-lg border border-border bg-card">Ləğv Et</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserKpiCardsPage;
