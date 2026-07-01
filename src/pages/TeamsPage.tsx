import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import { Search, Plus, Trophy, TrendingUp, Users, Pencil, X, Check, Star, ChevronDown, Sparkles, ArrowLeft } from "lucide-react";

import { PageHero } from "@/components/ui/page-hero";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTeams, addTeam, type Team, type TeamMember } from "@/lib/teamsStore";
import { toast } from "sonner";
import DropdownMultiSelect from "@/components/kpi/DropdownMultiSelect";
import { getStructures, type OrgStructure } from "@/lib/orgStore";

const allPeople: TeamMember[] = [
  { name: "Samir Həsənov", role: "Komanda Lideri", kpiScore: 90, avatar: "S" },
  { name: "Emin Məmmədov", role: "İpoteka Meneceri", kpiScore: 85, avatar: "E" },
  { name: "Ülviyyə Əliyeva", role: "HR Menecer", kpiScore: 82, avatar: "Ü" },
  { name: "Leyla Məmmədova", role: "Satış Mütəxəssisi", kpiScore: 88, avatar: "L" },
  { name: "Rəşad Əliyev", role: "Satış Mütəxəssisi", kpiScore: 92, avatar: "R" },
  { name: "Nigar Hüseynova", role: "Junior Satış", kpiScore: 85, avatar: "N" },
  { name: "Kamran Quliyev", role: "Regional Menecer", kpiScore: 80, avatar: "K" },
  { name: "Səbinə Rzayeva", role: "Satış Nümayəndəsi", kpiScore: 78, avatar: "S" },
  { name: "Aysel İbrahimova", role: "İpoteka Mütəxəssisi", kpiScore: 87, avatar: "A" },
  { name: "Tural Nəsirov", role: "İpoteka Konsultantı", kpiScore: 83, avatar: "T" },
  { name: "Farid Həsənov", role: "Regional Menecer", kpiScore: 78, avatar: "F" },
  { name: "Aysel Quliyeva", role: "Regional Menecer", kpiScore: 80, avatar: "A" },
  { name: "Tural İsmayılov", role: "Satış Agenti", kpiScore: 75, avatar: "T" },
  { name: "Günel Əlizadə", role: "İpoteka Mütəxəssisi", kpiScore: 87, avatar: "G" },
  { name: "Orxan Məmmədov", role: "İpoteka Mütəxəssisi", kpiScore: 83, avatar: "O" },
];


const TeamsPage = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>(() => getTeams());

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [searchText, setSearchText] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [orgStructures, setOrgStructures] = useState<OrgStructure[]>(() => getStructures());

  // Create team form state
  const [newTeamName, setNewTeamName] = useState("");
  const [structures, setStructures] = useState<string[]>([]);
  const [subStructures, setSubStructures] = useState<string[]>([]);
  const [structSearch, setStructSearch] = useState("");
  const [subStructSearch, setSubStructSearch] = useState("");
  const [memberListSearch, setMemberListSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [leaderName, setLeaderName] = useState<string>("");

  useEffect(() => {
    const refresh = () => setTeams(getTeams());
    const refreshOrg = () => setOrgStructures(getStructures());
    window.addEventListener("teams-updated", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("org-updated", refreshOrg);
    return () => {
      window.removeEventListener("teams-updated", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("org-updated", refreshOrg);
    };
  }, []);

  // Top-level structures from organization module
  const STRUCTURES = orgStructures.map(s => s.name);
  // Sub-structures are children of the selected top-level structures; fallback to all children
  const SUB_STRUCTURES = (() => {
    const source = structures.length
      ? orgStructures.filter(s => structures.includes(s.name))
      : orgStructures;
    const names = source.flatMap(s => s.children.map(c => c.name));
    return Array.from(new Set(names));
  })();

  const avgPerformance = teams.length ? (teams.reduce((s, t) => s + t.kpiResult, 0) / teams.length).toFixed(1) : "0";
  const totalMembers = teams.reduce((s, t) => s + t.members.length + 1, 0);
  const bestTeam = teams.length ? teams.reduce((b, t) => (t.kpiResult > b.kpiResult ? t : b), teams[0]) : null;

  const chartData = teams.map(t => ({
    name: t.name.length > 12 ? t.name.substring(0, 12) + "..." : t.name,
    "KPI Nəticəsi": t.kpiResult,
    "Tamamlanmış": Math.round((t.completedKpi / Math.max(1, t.totalKpi)) * 100),
  }));

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchText.toLowerCase()) ||
    t.leader.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredMembers = selectedTeam?.members.filter(m =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.role.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const filteredCandidates = allPeople.filter(p =>
    p.name.toLowerCase().includes(memberListSearch.toLowerCase()) ||
    p.role.toLowerCase().includes(memberListSearch.toLowerCase())
  );

  const filteredStructures = STRUCTURES.filter(s => s.toLowerCase().includes(structSearch.toLowerCase()));
  const filteredSubStructures = SUB_STRUCTURES.filter(s => s.toLowerCase().includes(subStructSearch.toLowerCase()));

  const toggleMember = (name: string) => {
    setSelectedMembers(prev => {
      const next = prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name];
      if (!next.includes(leaderName)) setLeaderName("");
      return next;
    });
  };

  const toggleAllMembers = () => {
    if (selectedMembers.length === filteredCandidates.length) {
      setSelectedMembers([]);
      setLeaderName("");
    } else {
      setSelectedMembers(filteredCandidates.map(p => p.name));
    }
  };

  const toggleStructure = (s: string) =>
    setStructures(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));
  const toggleSubStructure = (s: string) =>
    setSubStructures(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));

  const resetCreateForm = () => {
    setNewTeamName("");
    setStructures([]);
    setSubStructures([]);
    setStructSearch("");
    setSubStructSearch("");
    setMemberListSearch("");
    setSelectedMembers([]);
    setLeaderName("");
    setShowCreateTeam(false);
  };

  const saveNewTeam = () => {
    if (!newTeamName.trim()) {
      toast.error("Komanda adı daxil edin");
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error("Ən azı bir üzv seçin");
      return;
    }
    const leader = allPeople.find(p => p.name === selectedMembers[0]);
    if (!leader) return;
    const memberObjs = allPeople.filter(p => selectedMembers.includes(p.name) && p.name !== leader.name);
    const branch = subStructures[0] || structures[0] || "Mərkəzi Filial";
    const team: Team = {
      id: Date.now(),
      name: newTeamName.trim(),
      leader: leader.name,
      leaderAvatar: leader.avatar,
      kpiResult: 0,
      branch,
      activeKpi: 0,
      completedKpi: 0,
      totalKpi: 0,
      members: memberObjs,
    };
    addTeam(team);
    setTeams(getTeams());
    toast.success("Komanda yaradıldı");
    resetCreateForm();
  };

  const allSelected = filteredCandidates.length > 0 && selectedMembers.length === filteredCandidates.length;

  return (
    <div className="min-h-screen">
      <Header title="Komandalar" />
      <main className="p-6 pb-24">
        <button
          onClick={() => navigate("/teskilati-struktur")}
          className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Geri
        </button>
        <PageHero

          badge="Komanda İdarəsi"
          icon={Sparkles}
          title="Komandalar"
          subtitle="Komandaları yaradın, redaktə edin və performansı izləyin"
          right={
            <div className="flex gap-3">
              <select className="px-3 py-2 text-sm border border-border rounded-lg bg-card">
                <option>May 2026</option>
                <option>Aprel 2026</option>
                <option>Mart 2026</option>
                <option>Fevral 2026</option>
                <option>Yanvar 2026</option>
              </select>
              <button onClick={() => setShowCreateTeam(true)} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-primary to-primary/70 text-primary-foreground shadow-md hover:shadow-lg transition-all">
                <Plus className="w-4 h-4" /> Yeni komanda yarat
              </button>
            </div>
          }
        />

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Komanda axtar..."
            className="w-full max-w-lg pl-9 pr-3 py-2.5 text-sm border border-border rounded-lg bg-card"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {bestTeam && (
            <div className="bg-card rounded-xl p-5 border border-border relative">
              <span className="absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full bg-zone-green-bg text-zone-green-text">Ən Yaxşı</span>
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-3"><Trophy className="w-5 h-5 text-primary" /></div>
              <p className="text-xs text-muted-foreground">Ən Yaxşı Komanda</p>
              <p className="text-lg font-bold text-primary mt-1">{bestTeam.name}</p>
              <p className="text-sm text-muted-foreground">KPI Nəticə: <span className="text-success font-semibold">{bestTeam.kpiResult}%</span></p>
            </div>
          )}
          <div className="bg-card rounded-xl p-5 border border-border">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-3"><TrendingUp className="w-5 h-5 text-primary" /></div>
            <p className="text-xs text-muted-foreground">ORTALAMA</p>
            <p className="text-xs text-muted-foreground">Orta Performans</p>
            <p className="text-3xl font-bold text-foreground mt-1">{avgPerformance}%</p>
            <p className="text-xs text-muted-foreground">{teams.length} komanda üzrə</p>
          </div>
          <div className="bg-card rounded-xl p-5 border border-border relative">
            <span className="absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full bg-zone-green-bg text-zone-green-text">Aktiv</span>
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-3"><Users className="w-5 h-5 text-primary" /></div>
            <p className="text-xs text-muted-foreground">Ümumi Komandalar</p>
            <p className="text-3xl font-bold text-foreground mt-1">{teams.length}</p>
            <p className="text-xs text-muted-foreground">{totalMembers} komanda üzvü</p>
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border mb-6">
          <h3 className="font-semibold text-foreground mb-4">Komanda Müqayisəsi</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="KPI Nəticəsi" fill="hsl(230 70% 40%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Tamamlanmış" fill="hsl(145 65% 42%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {filteredTeams.map((team) => (
            <div key={team.id} onClick={() => { setSelectedTeam(team); setMemberSearch(""); }} className="bg-card rounded-xl p-5 border border-border flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">{team.leaderAvatar}</div>
                <div>
                  <h4 className="font-semibold text-foreground">{team.name}</h4>
                  <p className="text-sm text-muted-foreground">{team.leader} · {team.branch}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">KPI Nəticə</span>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  team.kpiResult >= 85 ? 'bg-zone-green-bg text-zone-green-text' :
                  team.kpiResult >= 70 ? 'bg-zone-yellow-bg text-zone-yellow-text' :
                  'bg-zone-red-bg text-zone-red-text'
                }`}>{team.kpiResult}%</span>
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Team detail dialog */}
      <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedTeam?.name}</DialogTitle>
            <p className="text-sm text-muted-foreground">Komanda Təfərrüatları və Üzvlər</p>
          </DialogHeader>
          {selectedTeam && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-border rounded-lg p-3"><p className="text-xs text-muted-foreground">Komanda Lideri</p><p className="font-semibold text-foreground mt-1">{selectedTeam.leader}</p></div>
                <div className="border border-border rounded-lg p-3"><p className="text-xs text-muted-foreground">KPI Nəticə</p><p className="font-semibold text-success mt-1">{selectedTeam.kpiResult}%</p></div>
              </div>
              <div className="border border-border rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2">KPI Proqressi</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div><p className="text-xs text-muted-foreground">Aktiv KPI</p><p className="text-xl font-bold text-primary">{selectedTeam.activeKpi}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tamamlanmış</p><p className="text-xl font-bold text-success">{selectedTeam.completedKpi}</p></div>
                  <div><p className="text-xs text-muted-foreground">Ümumi</p><p className="text-xl font-bold text-foreground">{selectedTeam.totalKpi}</p></div>
                </div>
              </div>
              <div className="border border-border rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-3">Komanda Üzvləri</h4>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Üzv axtar..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background" />
                </div>
                <div className="space-y-2">
                  {(filteredMembers || []).map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">{m.avatar}</div>
                        <div><p className="text-sm font-medium text-foreground">{m.name}</p><p className="text-xs text-muted-foreground">{m.role}</p></div>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${m.kpiScore >= 85 ? 'bg-zone-green-bg text-zone-green-text' : 'bg-zone-yellow-bg text-zone-yellow-text'}`}>{m.kpiScore}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create team dialog */}
      <Dialog open={showCreateTeam} onOpenChange={(open) => { if (!open) resetCreateForm(); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Komanda Yarat</DialogTitle>
            <p className="text-sm text-muted-foreground">Yeni komanda üçün məlumatları daxil edin</p>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground">Komanda adı</label>
              <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Komanda adı" className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-ring focus:outline-none" />
            </div>

            {/* Struktur (dropdown multiselect) */}
            <div>
              <label className="text-sm font-medium text-foreground">Struktur (multiselect)</label>
              <DropdownMultiSelect
                options={STRUCTURES}
                selected={structures}
                onToggle={toggleStructure}
                placeholder="Struktur seçin"
                searchPlaceholder="Struktur axtar..."
              />
            </div>

            {/* Sub-struktur (dropdown multiselect) */}
            <div>
              <label className="text-sm font-medium text-foreground">Sub-struktur (multiselect)</label>
              <DropdownMultiSelect
                options={SUB_STRUCTURES}
                selected={subStructures}
                onToggle={toggleSubStructure}
                placeholder="Sub-struktur seçin"
                searchPlaceholder="Sub-struktur axtar..."
              />
              {(structures.length > 1 || subStructures.length > 1) && (
                <p className="text-[11px] text-primary mt-1.5">✓ Qarışıq komanda yarada bilərsiniz</p>
              )}
            </div>

            {/* Members */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">Komanda üzvləri</span>
                <button type="button" onClick={toggleAllMembers} className="text-xs px-2.5 py-1 rounded-md border border-border hover:bg-secondary transition-colors">
                  {allSelected ? "Seçimləri sıfırla" : "Hamısını seç"}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">Komanda üzvlərini seçin.</p>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input value={memberListSearch} onChange={e => setMemberListSearch(e.target.value)} placeholder="Üzv axtar..." className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background" />
              </div>
              <div className="space-y-1 max-h-56 overflow-y-auto border border-border rounded-lg p-1.5">
                {filteredCandidates.map((p) => {
                  const checked = selectedMembers.includes(p.name);
                  return (
                    <div key={p.name} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${checked ? "border-primary bg-primary/5" : "border-transparent hover:bg-secondary"}`}>
                      <div onClick={() => toggleMember(p.name)} className="flex items-center gap-3 flex-1 cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">{p.avatar}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.role}</p>
                        </div>
                      </div>
                      <div onClick={() => toggleMember(p.name)} className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${checked ? "bg-primary border-primary" : "border-border"}`}>
                        {checked && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected members - vertical wrap after 3, with search + scroll */}
            {selectedMembers.length > 0 && (
              <div className="border border-border rounded-lg p-3 bg-secondary/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Seçilmiş üzvlər ({selectedMembers.length})</p>
                </div>
                {selectedMembers.length > 3 && (
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Seçilmişlərdə axtar..." className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded bg-background" />
                  </div>
                )}
                <div className={selectedMembers.length <= 3 ? "flex gap-2 flex-wrap" : "flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1"}>
                  {selectedMembers
                    .filter(name => selectedMembers.length <= 3 || name.toLowerCase().includes(memberSearch.toLowerCase()))
                    .map(name => {
                      const p = allPeople.find(x => x.name === name);
                      if (!p) return null;
                      const isLeader = leaderName === name;
                      return (
                        <div key={name} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-card border ${isLeader ? "border-warning shadow-sm" : "border-border"}`}>
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[11px] font-semibold shrink-0">{p.avatar}</div>
                          <span className="text-xs font-medium text-foreground truncate flex-1">{p.name}</span>
                          {isLeader && <Star className="w-3 h-3 fill-warning text-warning shrink-0" />}
                          <X className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-destructive shrink-0" onClick={() => toggleMember(name)} />
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={saveNewTeam} className="flex-1 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">💾 Yadda Saxla</button>
              <button onClick={resetCreateForm} className="flex-1 py-2.5 text-sm rounded-lg border border-border bg-card hover:bg-secondary transition-colors">Ləğv Et</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamsPage;
