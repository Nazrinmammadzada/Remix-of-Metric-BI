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
  assignSlot, addSlot, removeSlot,
  type OrgEmployee, type OrgStructure, type OrgPosition, type OrgSlot,
  type OrgSlotFraction,
} from "@/lib/orgStore";

type CreateEmployeeInput = Pick<OrgEmployee, "firstName" | "lastName" | "fin" | "phone" | "email"> & {
  fatherName?: string;
};

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

const employeeFromRow = (row: any, map: IdMap): OrgEmployee => ({
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
});

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
  let employees: OrgEmployee[] = (empRes.data ?? []).map((row: any) => employeeFromRow(row, map));

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

  // Rebuild employee structure/position fields from actual slot assignments.
  // org_slots is authoritative, so refresh/other-browser views stay correct even
  // if the denormalized org_employees columns were not updated by an older client.
  const assignments = new Map<number, { structurePath: string; positionName: string; salary?: number }>();
  const collectAssignments = (items: OrgStructure[], path: string[] = []) => {
    for (const node of items) {
      const nextPath = [...path, node.name];
      for (const position of node.positions) {
        for (const slot of position.slots) {
          if (slot.employeeId == null) continue;
          assignments.set(slot.employeeId, {
            structurePath: nextPath.join(" › "),
            positionName: position.name,
            salary: slot.salary ?? undefined,
          });
        }
      }
      collectAssignments(node.children, nextPath);
    }
  };
  collectAssignments(roots);
  employees = employees.map((employee) => {
    const assignment = assignments.get(employee.id);
    return assignment
      ? { ...employee, ...assignment }
      : { ...employee, structurePath: undefined, positionName: undefined, salary: undefined };
  });

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
  // Fire immediately so DB writes hit Postgres before the user can refresh.
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushLocalOrgToCloud();
  }, 0);
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

/** Force any pending local mutation to be written to the DB and await it. */
export const persistOrgNow = async () => {
  if (flushTimer) { window.clearTimeout(flushTimer); flushTimer = null; }
  await flushLocalOrgToCloud();
};

const requireActiveOrg = (): string => {
  if (!currentOrgId) throw new Error("Aktiv təşkilat tapılmadı. Yenidən daxil olun.");
  return currentOrgId;
};

const waitForIdleFlush = async () => {
  if (flushTimer) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
    await flushLocalOrgToCloud();
  }
  if (flushInFlight) await flushInFlight;
};

type SlotContext = {
  structure: OrgStructure;
  position: OrgPosition;
  slot: OrgSlot;
  structurePath: string;
  slotIndex: number;
};

type PositionContext = {
  structure: OrgStructure;
  position: OrgPosition;
  structurePath: string;
};

const findSlotContext = (slotId: number, nodes: OrgStructure[] = getStructures(), path: string[] = []): SlotContext | null => {
  for (const node of nodes) {
    const nextPath = [...path, node.name];
    for (const position of node.positions) {
      const slotIndex = position.slots.findIndex((slot) => slot.id === slotId);
      if (slotIndex >= 0) {
        return { structure: node, position, slot: position.slots[slotIndex], structurePath: nextPath.join(" › "), slotIndex };
      }
    }
    const child = findSlotContext(slotId, node.children, nextPath);
    if (child) return child;
  }
  return null;
};

const findPositionContext = (positionId: number, nodes: OrgStructure[] = getStructures(), path: string[] = []): PositionContext | null => {
  for (const node of nodes) {
    const nextPath = [...path, node.name];
    const position = node.positions.find((p) => p.id === positionId);
    if (position) return { structure: node, position, structurePath: nextPath.join(" › ") };
    const child = findPositionContext(positionId, node.children, nextPath);
    if (child) return child;
  }
  return null;
};

const syncEmployeeAssignmentRows = async (orgId: string, localEmployeeIds: number[]) => {
  const uniqueIds = [...new Set(localEmployeeIds.filter((id): id is number => Number.isFinite(id)))];
  if (uniqueIds.length === 0) return;
  const map = loadMap(orgId);
  const employees = getEmployees();

  await Promise.all(uniqueIds.map(async (localId) => {
    const employeeUuid = uuidFor(map, localId);
    const employee = employees.find((item) => item.id === localId);
    if (!employeeUuid || !employee) return;

    const { error } = await supabase
      .from("org_employees")
      .update({
        structure_path: employee.structurePath ?? null,
        position_name: employee.positionName ?? null,
        salary: employee.salary ?? null,
        is_star_person: !!employee.isStarPerson,
      })
      .eq("id", employeeUuid)
      .eq("organization_id", orgId);

    if (error) console.warn("[orgSync] employee assignment denorm update failed", error);
  }));
};

export const assignSlotInCloud = async (
  slotId: number,
  patch: { employeeId?: number | null; salary?: number | null; fraction?: OrgSlotFraction },
) => {
  const orgId = requireActiveOrg();
  await waitForIdleFlush();

  const before = findSlotContext(slotId);
  const touchedEmployees = new Set<number>();
  if (before?.slot.employeeId != null) touchedEmployees.add(before.slot.employeeId);

  suppressFlush = true;
  try {
    assignSlot(slotId, patch);
  } finally {
    suppressFlush = false;
  }

  const after = findSlotContext(slotId);
  if (!after) throw new Error("Ştat tapılmadı. Səhifəni yeniləyib yenidən cəhd edin.");
  if (after.slot.employeeId != null) touchedEmployees.add(after.slot.employeeId);

  let map = loadMap(orgId);
  let slotUuid = uuidFor(map, slotId);
  if (!slotUuid) {
    await doFlush(orgId);
    map = loadMap(orgId);
    slotUuid = uuidFor(map, slotId);
  }
  if (!slotUuid) throw new Error("Ştat database-də tapılmadı. Yenidən cəhd edin.");

  const slotPatch: { employee_id?: string | null; salary?: number | null; fraction?: number } = {};
  if (patch.employeeId !== undefined) {
    const employeeId = after.slot.employeeId;
    const employeeUuid = employeeId != null ? uuidFor(map, employeeId) : null;
    if (employeeId != null && !employeeUuid) throw new Error("Əməkdaş database-də tapılmadı. Yenidən cəhd edin.");
    slotPatch.employee_id = employeeUuid;
  }
  if (patch.salary !== undefined) slotPatch.salary = after.slot.salary ?? null;
  if (patch.fraction !== undefined) slotPatch.fraction = after.slot.fraction ?? 1;

  const { error } = await supabase
    .from("org_slots")
    .update(slotPatch)
    .eq("id", slotUuid)
    .eq("organization_id", orgId);

  if (error) {
    console.error("[orgSync] slot update failed", error, slotPatch);
    void hydrateOrgFromCloud(orgId);
    throw new Error(error.message || "Ştat təyinatı database-ə yazılmadı.");
  }

  await syncEmployeeAssignmentRows(orgId, [...touchedEmployees]);
  void logAudit({
    organizationId: orgId,
    action: "update",
    module: "org_structure",
    entityType: "org_slot",
    entityId: slotUuid,
    newValues: slotPatch,
  });
};

export const addSlotsInCloud = async (positionId: number, count: number = 1, fraction: OrgSlotFraction = 1) => {
  const orgId = requireActiveOrg();
  await waitForIdleFlush();

  const before = findPositionContext(positionId);
  if (!before) throw new Error("Vəzifə tapılmadı. Səhifəni yeniləyib yenidən cəhd edin.");
  const beforeIds = new Set(before.position.slots.map((slot) => slot.id));
  const startOrder = before.position.slots.length;

  suppressFlush = true;
  try {
    addSlot(positionId, count, fraction);
  } finally {
    suppressFlush = false;
  }

  const after = findPositionContext(positionId);
  const newSlots = (after?.position.slots ?? []).filter((slot) => !beforeIds.has(slot.id));
  if (newSlots.length === 0) return;

  let map = loadMap(orgId);
  let positionUuid = uuidFor(map, positionId);
  if (!positionUuid) {
    await doFlush(orgId);
    map = loadMap(orgId);
    positionUuid = uuidFor(map, positionId);
  }
  if (!positionUuid) throw new Error("Vəzifə database-də tapılmadı. Yenidən cəhd edin.");

  const rows = newSlots.map((slot, index) => ({
    organization_id: orgId,
    position_id: positionUuid,
    employee_id: null,
    salary: null,
    fraction: slot.fraction ?? fraction,
    sort_order: startOrder + index,
  }));

  const { data, error } = await supabase.from("org_slots").insert(rows).select("id");
  if (error || !data) {
    console.error("[orgSync] slot insert failed", error, rows);
    void hydrateOrgFromCloud(orgId);
    throw new Error(error?.message || "Ştat database-ə yazılmadı.");
  }

  data.forEach((row, index) => {
    const localId = newSlots[index]?.id;
    if (localId == null) return;
    map.toUuid[localId] = row.id;
    map.toNum[row.id] = localId;
    if (localId >= map.next) map.next = localId + 1;
  });
  saveMap(orgId, map);
};

export const removeSlotInCloud = async (slotId: number) => {
  const orgId = requireActiveOrg();
  await waitForIdleFlush();

  const before = findSlotContext(slotId);
  const touchedEmployees = before?.slot.employeeId != null ? [before.slot.employeeId] : [];
  const map = loadMap(orgId);
  const slotUuid = uuidFor(map, slotId);

  suppressFlush = true;
  try {
    removeSlot(slotId);
  } finally {
    suppressFlush = false;
  }

  if (slotUuid) {
    const { error } = await supabase
      .from("org_slots")
      .delete()
      .eq("id", slotUuid)
      .eq("organization_id", orgId);
    if (error) {
      console.error("[orgSync] slot delete failed", error);
      void hydrateOrgFromCloud(orgId);
      throw new Error(error.message || "Ştat database-dən silinmədi.");
    }
  }

  await syncEmployeeAssignmentRows(orgId, touchedEmployees);
};

export const createEmployeeInCloud = async (input: CreateEmployeeInput): Promise<OrgEmployee> => {
  const orgId = currentOrgId;
  if (!orgId) throw new Error("Aktiv təşkilat tapılmadı. Yenidən daxil olun.");

  if (flushTimer) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (flushInFlight) await flushInFlight;

  const payload = {
    organization_id: orgId,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    father_name: input.fatherName?.trim() || null,
    fin: input.fin.trim() || null,
    phone: input.phone.trim() || null,
    email: input.email.trim() || null,
    active: true,
    salary: null,
    is_star_person: false,
    structure_path: null,
    position_name: null,
  };

  const { data, error } = await supabase
    .from("org_employees")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Əməkdaş database-ə yazılmadı.");
  }

  const map = loadMap(orgId);
  const employee = employeeFromRow(data, map);
  saveMap(orgId, map);

  suppressFlush = true;
  setEmployees([...getEmployees().filter(e => e.id !== employee.id), employee]);
  suppressFlush = false;

  void logAudit({
    organizationId: orgId,
    action: "create",
    module: "employees",
    entityType: "org_employee",
    entityId: data.id,
    newValues: payload,
  });

  if (employee.email) {
    try {
      const { provisionEmployeeLogin } = await import("@/lib/employeeService");
      void provisionEmployeeLogin({
        organizationId: orgId,
        employeeId: data.id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
      });
    } catch {}
  }

  return employee;
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

const beforeUnloadFlush = () => {
  if (pendingFlush || flushTimer) {
    if (flushTimer) { window.clearTimeout(flushTimer); flushTimer = null; }
    // Fire and forget — some browsers will keep the request alive briefly.
    void flushLocalOrgToCloud();
  }
};

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
  window.removeEventListener("beforeunload", beforeUnloadFlush);
  window.removeEventListener("pagehide", beforeUnloadFlush);
  if (flushTimer) { window.clearTimeout(flushTimer); flushTimer = null; }
  if (rehydrateTimer) { window.clearTimeout(rehydrateTimer); rehydrateTimer = null; }
  if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
  if (onFocusHandler) { window.removeEventListener("focus", onFocusHandler); onFocusHandler = null; }
  if (refreshInterval) { window.clearInterval(refreshInterval); refreshInterval = null; }
};
