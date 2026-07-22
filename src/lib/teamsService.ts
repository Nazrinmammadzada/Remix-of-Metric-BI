// Cloud sync for the Teams module. Local mutations happen through the
// existing `teamsStore` (localStorage cache + "teams-updated" event). This
// service hydrates that cache from Postgres on login and pushes every local
// change back to `public.org_teams` so teams survive refresh, logout/login,
// and appear identically in another browser / device.

import { supabase } from "@/integrations/supabase/client";
import { getTeams, replaceTeamsSilent, type Team } from "@/lib/teamsStore";

const UUID_MAP_KEY = "kpi_team_uuid_map_v1";

type UuidMap = Record<string, string>;

const loadMap = (): UuidMap => {
  try { return JSON.parse(localStorage.getItem(UUID_MAP_KEY) || "{}"); }
  catch { return {}; }
};
const saveMap = (m: UuidMap) => localStorage.setItem(UUID_MAP_KEY, JSON.stringify(m));

let activeOrgId: string | null = null;
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let suppressPush = false;
let pushing = false;
let pendingPush = false;

type Row = {
  id: string;
  name: string;
  members: unknown;
  metadata: any;
  created_at: string;
};

const rowToTeam = (row: Row): Team => {
  const meta = (row.metadata || {}) as Partial<Team> & { local_id?: number };
  const members = Array.isArray(row.members) ? (row.members as Team["members"]) : [];
  return {
    id: meta.local_id ?? Date.now(),
    name: row.name,
    leader: meta.leader ?? "",
    leaderAvatar: meta.leaderAvatar ?? "",
    kpiResult: meta.kpiResult ?? 0,
    branch: meta.branch ?? "",
    activeKpi: meta.activeKpi ?? 0,
    completedKpi: meta.completedKpi ?? 0,
    totalKpi: meta.totalKpi ?? 0,
    members,
    createdAt: row.created_at,
  };
};

const teamToPayload = (team: Team, orgId: string) => ({
  organization_id: orgId,
  name: team.name,
  members: team.members as any,
  metadata: {
    local_id: team.id,
    leader: team.leader,
    leaderAvatar: team.leaderAvatar,
    kpiResult: team.kpiResult,
    branch: team.branch,
    activeKpi: team.activeKpi,
    completedKpi: team.completedKpi,
    totalKpi: team.totalKpi,
  } as any,
});

export const hydrateTeamsFromCloud = async (orgId: string): Promise<void> => {
  const { data, error } = await supabase
    .from("org_teams")
    .select("id, name, members, metadata, created_at")
    .eq("organization_id", orgId);
  if (error) {
    console.error("[teamsSync] hydrate failed", error);
    return;
  }
  const rows = (data ?? []) as Row[];
  const teams = rows.map(rowToTeam);
  const map: UuidMap = {};
  for (const r of rows) {
    const local = (r.metadata as any)?.local_id ?? r.id;
    map[String(local)] = r.id;
  }
  saveMap(map);
  suppressPush = true;
  try { replaceTeamsSilent(teams); }
  finally { suppressPush = false; }
};

const pushLocalTeamsToCloud = async (): Promise<void> => {
  if (!activeOrgId) return;
  if (pushing) { pendingPush = true; return; }
  pushing = true;
  try {
    const orgId = activeOrgId;
    const teams = getTeams();
    const map = loadMap();

    // Upsert every local team.
    for (const t of teams) {
      const localKey = String(t.id);
      const existing = map[localKey];
      if (existing) {
        const { error } = await supabase
          .from("org_teams")
          .update(teamToPayload(t, orgId))
          .eq("id", existing);
        if (error) console.error("[teamsSync] update failed", error);
      } else {
        const { data, error } = await supabase
          .from("org_teams")
          .insert(teamToPayload(t, orgId))
          .select("id")
          .single();
        if (error) {
          console.error("[teamsSync] insert failed", error);
        } else if (data?.id) {
          map[localKey] = data.id;
        }
      }
    }

    // Delete rows whose local team was removed.
    const localKeys = new Set(teams.map(t => String(t.id)));
    for (const [k, uuid] of Object.entries(map)) {
      if (localKeys.has(k)) continue;
      const { error } = await supabase.from("org_teams").delete().eq("id", uuid);
      if (!error) delete map[k];
    }

    saveMap(map);
  } finally {
    pushing = false;
    if (pendingPush) {
      pendingPush = false;
      void pushLocalTeamsToCloud();
    }
  }
};

const onLocalTeamsUpdated = () => {
  if (suppressPush) return;
  void pushLocalTeamsToCloud();
};

export const activateTeamsSync = async (orgId: string) => {
  activeOrgId = orgId;
  await hydrateTeamsFromCloud(orgId);
  window.addEventListener("teams-updated", onLocalTeamsUpdated);

  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel = supabase
    .channel(`teams-live-${orgId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "org_teams", filter: `organization_id=eq.${orgId}` },
      () => { if (activeOrgId) void hydrateTeamsFromCloud(activeOrgId); },
    )
    .subscribe();
};

export const deactivateTeamsSync = () => {
  activeOrgId = null;
  window.removeEventListener("teams-updated", onLocalTeamsUpdated);
  if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
};
