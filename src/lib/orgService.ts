// Org cloud service — reads/writes the real database and keeps the legacy
// synchronous `orgStore` (localStorage) hydrated so existing UI keeps working
// while all business data lives in Postgres.
//
// Strategy:
//  • On login we call `hydrateOrgFromCloud(orgId)`, which pulls all rows and
//    rewrites the local caches under the same STORAGE keys used today.
//  • UI mutations continue to hit `orgStore` synchronously. A debounced
//    `flushLocalOrgToCloud` mirrors the current local snapshot back into
//    Supabase (upsert-on-write). No optimistic-UI regressions.
//  • Because the legacy store uses numeric IDs, we keep a per-org
//    numeric↔UUID map so re-hydrations stay stable.

import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/auditService";
import {
  getEmployees, setEmployees, getStructures, setStructures,
  type OrgEmployee, type OrgStructure, type OrgPosition, type OrgSlot,
  type OrgSlotFraction,
} from "@/lib/orgStore";

// ── ID mapping (numeric ↔ uuid) ───────────────────────────────────────────────
type IdMap = { toUuid: Record<number, string>; toNum: Record<string, number>; next: number };
const MAP_KEY = (orgId: string) => `kpi_org_idmap_${orgId}`;

const loadMap = (orgId: string): IdMap => {
  try {
    const raw = localStorage.getItem(MAP_KEY(orgId));
    if (raw) return JSON.parse(raw) as IdMap;
  } catch {}
  return { toUuid: {}, toNum: {}, next: 1 };
};
const saveMap = (orgId: string, m: IdMap) => {
  localStorage.setItem(MAP_KEY(orgId), JSON.stringify(m));
};
const numFor = (m: IdMap, uuid: string): number => {
  if (m.toNum[uuid] != null) return m.toNum[uuid];
  const id = m.next++;
  m.toNum[uuid] = id;
  m.toUuid[id] = uuid;
  return id;
};
const uuidFor = (m: IdMap, num: number): string | undefined => m.toUuid[num];

// ── HYDRATE ───────────────────────────────────────────────────────────────────
export const hydrateOrgFromCloud = async (orgId: string): Promise<void> => {
  const [empRes, structRes, posRes, slotRes] = await Promise.all([
    supabase.from("org_employees").select("*").eq("organization_id", orgId),
    supabase.from("org_structures").select("*").eq("organization_id", orgId).order("sort_order"),
    supabase.from("org_positions").select("*").eq("organization_id", orgId).order("sort_order"),
    supabase.from("org_slots").select("*").eq("organization_id", orgId).order("sort_order"),
  ]);

  // If cloud is empty for this org, seed it from the current local snapshot.
  const cloudEmpty =
    (empRes.data?.length ?? 0) === 0 &&
    (structRes.data?.length ?? 0) === 0;
  if (cloudEmpty) {
    await seedCloudFromLocal(orgId);
    return; // seed writes local map + returns; local data is already correct.
  }

  const map = loadMap(orgId);

  // Employees
  const employees: OrgEmployee[] = (empRes.data ?? []).map((row: any) => ({
    id: numFor(map, row.id),
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    fatherName: row.father_name ?? undefined,
    fin: row.fin ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    active: !!row.active,
    structurePath: row.structure_path ?? undefined,
    positionName: row.position_name ?? undefined,
    salary: row.salary != null ? Number(row.salary) : undefined,
    isStarPerson: !!row.is_star_person,
  }));

  // Structures — build tree from parent_id
  const rawStruct: any[] = structRes.data ?? [];
  const rawPos: any[] = posRes.data ?? [];
  const rawSlots: any[] = slotRes.data ?? [];

  const nodes: Record<string, OrgStructure> = {};
  for (const s of rawStruct) {
    nodes[s.id] = {
      id: numFor(map, s.id),
      type: s.type ?? "Departament",
      name: s.name ?? "",
      children: [],
      positions: [],
    };
  }
  const roots: OrgStructure[] = [];
  for (const s of rawStruct) {
    const node = nodes[s.id];
    if (s.parent_id && nodes[s.parent_id]) nodes[s.parent_id].children.push(node);
    else roots.push(node);
  }
  const positionsById: Record<string, OrgPosition & { __struct: string }> = {};
  for (const p of rawPos) {
    const pos: OrgPosition & { __struct: string } = {
      id: numFor(map, p.id),
      name: p.name ?? "",
      slots: [],
      __struct: p.structure_id,
    };
    positionsById[p.id] = pos;
    if (nodes[p.structure_id]) nodes[p.structure_id].positions.push(pos);
  }
  for (const sl of rawSlots) {
    const pos = positionsById[sl.position_id];
    if (!pos) continue;
    pos.slots.push({
      id: numFor(map, sl.id),
      employeeId: sl.employee_id ? (map.toNum[sl.employee_id] ?? numFor(map, sl.employee_id)) : null,
      salary: sl.salary != null ? Number(sl.salary) : null,
      fraction: (Number(sl.fraction) as OrgSlotFraction) || 1,
    });
  }

  saveMap(orgId, map);
  // Write to localStorage caches without triggering a re-flush.
  suppressFlush = true;
  setEmployees(employees);
  setStructures(roots);
  suppressFlush = false;

  // Auto-provision auth logins for any employees that lack an auth.users row.
  try {
    const { provisionPendingEmployees } = await import("@/lib/employeeService");
    void provisionPendingEmployees(orgId);
  } catch {}
};


// ── SEED cloud from current local snapshot (first-time bootstrap) ─────────────
const seedCloudFromLocal = async (orgId: string) => {
  const employees = getEmployees();
  const structures = getStructures();
  const map: IdMap = { toUuid: {}, toNum: {}, next: 1 };

  // Insert employees
  const empRows = employees.map(e => ({
    organization_id: orgId,
    first_name: e.firstName,
    last_name: e.lastName,
    father_name: e.fatherName ?? null,
    fin: e.fin || null,
    phone: e.phone || null,
    email: e.email || null,
    active: e.active,
    salary: e.salary ?? null,
    is_star_person: !!e.isStarPerson,
    structure_path: e.structurePath ?? null,
    position_name: e.positionName ?? null,
  }));
  const empIns = empRows.length
    ? await supabase.from("org_employees").insert(empRows).select("id")
    : { data: [] as { id: string }[], error: null };
  if (empIns.error) { console.warn("seed employees failed", empIns.error); return; }
  (empIns.data ?? []).forEach((row, i) => {
    const localId = employees[i].id;
    map.toNum[row.id] = localId;
    map.toUuid[localId] = row.id;
    if (localId >= map.next) map.next = localId + 1;
  });

  // Recursively insert structures preserving order.
  const insertStructRec = async (nodes: OrgStructure[], parentUuid: string | null) => {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const { data, error } = await supabase.from("org_structures").insert({
        organization_id: orgId,
        parent_id: parentUuid,
        type: n.type,
        name: n.name,
        sort_order: i,
      }).select("id").single();
      if (error || !data) { console.warn("seed structure failed", error); continue; }
      map.toNum[data.id] = n.id;
      map.toUuid[n.id] = data.id;
      if (n.id >= map.next) map.next = n.id + 1;

      // Positions
      for (let pi = 0; pi < n.positions.length; pi++) {
        const p = n.positions[pi];
        const pos = await supabase.from("org_positions").insert({
          organization_id: orgId,
          structure_id: data.id,
          name: p.name,
          sort_order: pi,
        }).select("id").single();
        if (pos.error || !pos.data) continue;
        map.toNum[pos.data.id] = p.id;
        map.toUuid[p.id] = pos.data.id;
        if (p.id >= map.next) map.next = p.id + 1;

        // Slots
        for (let si = 0; si < p.slots.length; si++) {
          const s = p.slots[si];
          const empUuid = s.employeeId != null ? map.toUuid[s.employeeId] ?? null : null;
          const slot = await supabase.from("org_slots").insert({
            organization_id: orgId,
            position_id: pos.data.id,
            employee_id: empUuid,
            salary: s.salary,
            fraction: s.fraction ?? 1,
            sort_order: si,
          }).select("id").single();
          if (slot.error || !slot.data) continue;
          map.toNum[slot.data.id] = s.id;
          map.toUuid[s.id] = slot.data.id;
          if (s.id >= map.next) map.next = s.id + 1;
        }
      }
      await insertStructRec(n.children, data.id);
    }
  };
  await insertStructRec(structures, null);
  saveMap(orgId, map);
};

// ── FLUSH local → cloud (best-effort mirror) ──────────────────────────────────
// The legacy sync store fires "org-updated" on every mutation. We debounce and
// diff-mirror everything back to Supabase so the DB stays authoritative.

let suppressFlush = false;
let flushTimer: number | null = null;
let currentOrgId: string | null = null;
let activeUserId: string | null = null;
let flushInFlight: Promise<void> | null = null;
let pendingFlush = false;

const scheduleFlush = () => {
  if (suppressFlush || !currentOrgId) return;
  pendingFlush = true;
  if (flushTimer) window.clearTimeout(flushTimer);
  // Very short debounce so bursts of mutations coalesce but the DB write
  // hits Postgres before the user can navigate/refresh.
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushLocalOrgToCloud();
  }, 50);
};

export const flushLocalOrgToCloud = async () => {
  const orgId = currentOrgId;
  if (!orgId) return;
  // Serialize concurrent flushes to avoid duplicate inserts.
  if (flushInFlight) {
    await flushInFlight;
  }
  let resolveFlush!: () => void;
  flushInFlight = new Promise<void>((r) => { resolveFlush = r; });
  pendingFlush = false;
  try {
    await doFlush(orgId);
  } finally {
    resolveFlush();
    flushInFlight = null;
  }
};

const doFlush = async (orgId: string) => {
  const map = loadMap(orgId);

  // Diff by full replace for simplicity: delete rows whose numeric id no longer
  // exists locally, then upsert everything present.
  const employees = getEmployees();
  const structures = getStructures();

  // 1) Employees upsert
  for (const e of employees) {
    const uuid = uuidFor(map, e.id);
    const payload = {
      organization_id: orgId,
      first_name: e.firstName,
      last_name: e.lastName,
      father_name: e.fatherName ?? null,
      fin: e.fin || null,
      phone: e.phone || null,
      email: e.email || null,
      active: e.active,
      salary: e.salary ?? null,
      is_star_person: !!e.isStarPerson,
      structure_path: e.structurePath ?? null,
      position_name: e.positionName ?? null,
    };
    if (uuid) {
      const { error } = await supabase.from("org_employees").update(payload).eq("id", uuid);
      if (error) console.error("[orgSync] employee update failed", error, payload);
    } else {
      const ins = await supabase.from("org_employees").insert(payload).select("id").single();
      if (ins.error) {
        console.error("[orgSync] employee insert failed", ins.error, payload);
      } else if (ins.data) {
        map.toUuid[e.id] = ins.data.id;
        map.toNum[ins.data.id] = e.id;
      }
    }
  }

  // 2) Structures / positions / slots: walk and upsert
  const walk = async (nodes: OrgStructure[], parentUuid: string | null) => {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      let uuid = uuidFor(map, n.id);
      const payload = {
        organization_id: orgId,
        parent_id: parentUuid,
        type: n.type,
        name: n.name,
        sort_order: i,
      };
      if (uuid) {
        await supabase.from("org_structures").update(payload).eq("id", uuid);
      } else {
        const ins = await supabase.from("org_structures").insert(payload).select("id").single();
        if (ins.data) { uuid = ins.data.id; map.toUuid[n.id] = uuid!; map.toNum[uuid!] = n.id; }
      }
      if (!uuid) continue;

      for (let pi = 0; pi < n.positions.length; pi++) {
        const p = n.positions[pi];
        let posUuid = uuidFor(map, p.id);
        const posPayload = {
          organization_id: orgId,
          structure_id: uuid,
          name: p.name,
          sort_order: pi,
        };
        if (posUuid) {
          await supabase.from("org_positions").update(posPayload).eq("id", posUuid);
        } else {
          const ins = await supabase.from("org_positions").insert(posPayload).select("id").single();
          if (ins.data) { posUuid = ins.data.id; map.toUuid[p.id] = posUuid!; map.toNum[posUuid!] = p.id; }
        }
        if (!posUuid) continue;

        for (let si = 0; si < p.slots.length; si++) {
          const s = p.slots[si];
          let slotUuid = uuidFor(map, s.id);
          const slotPayload = {
            organization_id: orgId,
            position_id: posUuid,
            employee_id: s.employeeId != null ? uuidFor(map, s.employeeId) ?? null : null,
            salary: s.salary,
            fraction: s.fraction ?? 1,
            sort_order: si,
          };
          if (slotUuid) {
            await supabase.from("org_slots").update(slotPayload).eq("id", slotUuid);
          } else {
            const ins = await supabase.from("org_slots").insert(slotPayload).select("id").single();
            if (ins.data) { slotUuid = ins.data.id; map.toUuid[s.id] = slotUuid!; map.toNum[slotUuid!] = s.id; }
          }
        }
      }

      await walk(n.children, uuid);
    }
  };
  await walk(structures, null);

  saveMap(orgId, map);
  void logAudit({
    organizationId: orgId,
    action: "sync",
    module: "org_structure",
    metadata: { employees: employees.length, structures: structures.length },
  });

  // After mirroring, provision auth logins for any newly-added employees who
  // have an email but no auth_user_id yet. Fire-and-forget: the edge function
  // creates the auth.users row with the default temporary password (123456)
  // and links it back to org_employees.auth_user_id.
  try {
    const { provisionPendingEmployees } = await import("@/lib/employeeService");
    void provisionPendingEmployees(orgId);
  } catch {}
};


// ── Attach to auth lifecycle ──────────────────────────────────────────────────
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let rehydrateTimer: number | null = null;
let refreshInterval: number | null = null;
let onFocusHandler: (() => void) | null = null;

const scheduleRehydrate = () => {
  if (!currentOrgId) return;
  if (rehydrateTimer) window.clearTimeout(rehydrateTimer);
  rehydrateTimer = window.setTimeout(async () => {
    rehydrateTimer = null;
    // If a local mutation is pending or a flush is in flight, wait for it to
    // finish before rehydrating — otherwise we'd wipe unsynced local changes.
    if (pendingFlush) { await flushLocalOrgToCloud(); }
    if (flushInFlight) { try { await flushInFlight; } catch {} }
    if (currentOrgId) void hydrateOrgFromCloud(currentOrgId);
  }, 400);
};

export const activateOrgSync = async (orgId: string, userId: string) => {
  if (currentOrgId === orgId && activeUserId === userId) return;
  currentOrgId = orgId;
  activeUserId = userId;
  // Purge local caches BEFORE hydrate so a fresh browser can't flush the
  // demo seed back to the cloud on the first user mutation.
  suppressFlush = true;
  try { localStorage.removeItem("kpi_org_employees_v5"); } catch {}
  try { localStorage.removeItem("kpi_org_structures_v6"); } catch {}
  suppressFlush = false;
  await hydrateOrgFromCloud(orgId);
  window.addEventListener("org-updated", scheduleFlush);
  // Best-effort: if the tab is about to unload, kick a synchronous flush so
  // the last local mutation reaches the DB.
  window.addEventListener("beforeunload", beforeUnloadFlush);
  window.addEventListener("pagehide", beforeUnloadFlush);


  // Realtime: any change to org data in Postgres triggers a re-hydration so
  // other browsers / devices see the update within seconds.
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel = supabase
    .channel(`org-live-${orgId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "org_employees", filter: `organization_id=eq.${orgId}` }, scheduleRehydrate)
    .on("postgres_changes", { event: "*", schema: "public", table: "org_structures", filter: `organization_id=eq.${orgId}` }, scheduleRehydrate)
    .on("postgres_changes", { event: "*", schema: "public", table: "org_positions", filter: `organization_id=eq.${orgId}` }, scheduleRehydrate)
    .on("postgres_changes", { event: "*", schema: "public", table: "org_slots", filter: `organization_id=eq.${orgId}` }, scheduleRehydrate)
    .subscribe();

  // Fallback: refresh on window focus + every 15s so we recover from missed
  // realtime broadcasts (e.g. sleeping tab, transient websocket drop).
  onFocusHandler = () => scheduleRehydrate();
  window.addEventListener("focus", onFocusHandler);
  if (refreshInterval) window.clearInterval(refreshInterval);
  refreshInterval = window.setInterval(scheduleRehydrate, 15000);
};

export const deactivateOrgSync = () => {
  currentOrgId = null;
  activeUserId = null;
  window.removeEventListener("org-updated", scheduleFlush);
  if (flushTimer) { window.clearTimeout(flushTimer); flushTimer = null; }
  if (rehydrateTimer) { window.clearTimeout(rehydrateTimer); rehydrateTimer = null; }
  if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
  if (onFocusHandler) { window.removeEventListener("focus", onFocusHandler); onFocusHandler = null; }
  if (refreshInterval) { window.clearInterval(refreshInterval); refreshInterval = null; }
};
