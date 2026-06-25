import { useState } from "react";
import Header from "@/components/layout/Header";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Trophy, TrendingUp, Users, Pencil, Star, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHero, FancyStatCard, FancyCard } from "@/components/ui/page-hero";

interface TeamMember {
  name: string; role: string; kpiScore: number; avatar: string;
}

interface Team {
  id: number; name: string; leader: string; leaderAvatar: string; kpiResult: number;
  department: string; activeKpi: number; completedKpi: number; totalKpi: number; members: TeamMember[];
}

const allTeams: Team[] = [
  {
    id: 1, name: "Elite Satış Komandası", leader: "Samir Həsənov", leaderAvatar: "S",
    kpiResult: 90, department: "Satış Departamenti", activeKpi: 8, completedKpi: 6, totalKpi: 10,
    members: [
      { name: "Leyla Məmmədova", role: "Satış Mütəxəssisi", kpiScore: 88, avatar: "L" },
      { name: "Rəşad Əliyev", role: "Satış Mütəxəssisi", kpiScore: 92, avatar: "R" },
      { name: "Nigar Hüseynova", role: "Satış Meneceri", kpiScore: 85, avatar: "N" },
    ],
  },
  {
    id: 2, name: "Regional Satış Komandası", leader: "Farid Həsənov", leaderAvatar: "F",
    kpiResult: 78, department: "Satış Departamenti", activeKpi: 6, completedKpi: 4, totalKpi: 8,
    members: [
      { name: "Aysel Quliyeva", role: "Regional Menecer", kpiScore: 80, avatar: "A" },
      { name: "Tural İsmayılov", role: "Satış Agenti", kpiScore: 75, avatar: "T" },
    ],
  },
  {
    id: 3, name: "İpoteka Satış Komandası", leader: "Emin Məmmədov", leaderAvatar: "E",
    kpiResult: 85, department: "Satış Departamenti", activeKpi: 7, completedKpi: 5, totalKpi: 9,
    members: [
      { name: "Günel Əlizadə", role: "İpoteka Mütəxəssisi", kpiScore: 87, avatar: "G" },
      { name: "Orxan Məmmədov", role: "İpoteka Mütəxəssisi", kpiScore: 83, avatar: "O" },
    ],
  },
];

const UserTeamsPage = () => {
  const { user } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [searchText, setSearchText] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  // User sees only their own team but can compare all
  const myTeam = allTeams.find(t => t.leader === user?.name || t.members.some(m => m.name === user?.name));

  const avgPerformance = (allTeams.reduce((s, t) => s + t.kpiResult, 0) / allTeams.length).toFixed(1);
  const totalMembers = allTeams.reduce((s, t) => s + t.members.length + 1, 0);
  const bestTeam = allTeams.reduce((b, t) => t.kpiResult > b.kpiResult ? t : b, allTeams[0]);

  const chartData = allTeams.map(t => ({
    name: t.name.length > 12 ? t.name.substring(0, 12) + "..." : t.name,
    "KPI Nəticəsi": t.kpiResult,
    "Tamamlanmış": Math.round(t.completedKpi / t.totalKpi * 100),
  }));

  const filteredTeams = allTeams.filter(t =>
    t.name.toLowerCase().includes(searchText.toLowerCase()) ||
    t.leader.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredMembers = selectedTeam?.members.filter(m =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.role.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Header title="Komandalar" />
      <main className="p-6 pb-24">
        <PageHero
          badge="Komanda Mərkəzi"
          icon={Sparkles}
          title="Komandalar"
          subtitle="Komandaları kəşf edin və müqayisə edin"
          right={
            <select className="px-3 py-2 text-sm border border-border rounded-lg bg-card">
              <option>May 2026</option><option>Aprel 2026</option><option>Mart 2026</option>
            </select>
          }
        />

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Komanda axtar..." className="w-full max-w-lg pl-9 pr-3 py-2.5 text-sm border border-border rounded-lg bg-card" />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <FancyStatCard icon={Trophy} label="Ən Yaxşı Komanda" value={bestTeam.name} sub={`KPI Nəticə: ${bestTeam.kpiResult}%`} accent="amber" />
          <FancyStatCard icon={TrendingUp} label="Orta Performans" value={`${avgPerformance}%`} sub={`${allTeams.length} komanda üzrə`} accent="primary" />
          <FancyStatCard icon={Users} label="Ümumi Komandalar" value={allTeams.length} sub={`${totalMembers} komanda üzvü`} accent="emerald" />
        </div>

        {/* Chart */}
        <FancyCard title="Komanda Müqayisəsi" subtitle="KPI nəticəsi və tamamlanma faizi" className="mb-6">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="KPI Nəticəsi" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Tamamlanmış" fill="hsl(145 65% 42%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </FancyCard>

        {/* Team List - matching HR layout, user's team highlighted */}
        <div className="space-y-3">
          {filteredTeams.map((team) => {
            const isMyTeam = myTeam?.id === team.id;
            return (
              <div key={team.id} onClick={() => { setSelectedTeam(team); setMemberSearch(""); }}
                className={`bg-card rounded-xl p-5 border-2 ${isMyTeam ? 'border-primary' : 'border-border'} flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">{team.leaderAvatar}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">{team.name}</h4>
                      {isMyTeam && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Öz komandam</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{team.leader} · Departament: {team.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">KPI Nəticə</span>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${team.kpiResult >= 85 ? 'bg-zone-green-bg text-zone-green-text' : team.kpiResult >= 70 ? 'bg-zone-yellow-bg text-zone-yellow-text' : 'bg-zone-red-bg text-zone-red-text'}`}>{team.kpiResult}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Team Detail Dialog - matching HR */}
      <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedTeam?.name}</DialogTitle>
            <p className="text-sm text-muted-foreground">Komanda Təfərrüatları və Üzvlər</p>
          </DialogHeader>
          {selectedTeam && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="border border-border rounded-lg p-3"><p className="text-xs text-muted-foreground">Komanda Lideri</p><p className="font-semibold text-foreground mt-1">{selectedTeam.leader}</p></div>
                <div className="border border-border rounded-lg p-3"><p className="text-xs text-muted-foreground">KPI Nəticə</p><p className="font-semibold text-success mt-1">{selectedTeam.kpiResult}%</p></div>
                <div className="border border-border rounded-lg p-3"><p className="text-xs text-muted-foreground">Departament</p><p className="font-semibold text-foreground mt-1">{selectedTeam.department}</p></div>
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
    </div>
  );
};

export default UserTeamsPage;
