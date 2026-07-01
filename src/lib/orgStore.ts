// Organization Structure store (localStorage demo)
// Manages: employees, nested structures, positions and slots (ştat) with assignment.

export interface OrgEmployee {
  id: number;
  firstName: string;
  lastName: string;
  fatherName?: string;
  fin: string;
  phone: string;
  email: string;
  active: boolean;
  // Auto-filled from structure assignment
  structurePath?: string; // e.g. "İnsan Resursları › İşə qəbul şöbəsi"
  positionName?: string;
  salary?: number;
  /** Rəhbər rolu — bu şəxs KPI hədəflərini qəbul edə və tabeliyindəkilərə bölüşdürə bilər.
   *  Ulduz VƏZİFƏYƏ deyil, birbaşa ŞƏXSƏ verilir. */
  isStarPerson?: boolean;
}

export type OrgSlotFraction = 1 | 0.75 | 0.5 | 0.25;

export interface OrgSlot {
  id: number;
  employeeId: number | null; // null = vacant
  salary: number | null;
  fraction?: OrgSlotFraction; // ştat vahidi (default: 1)
}

export interface OrgPosition {
  id: number;
  name: string;
  slots: OrgSlot[];
}


export interface OrgStructure {
  id: number;
  type: string; // "Departament" | "Şöbə" | "Sektor" ...
  name: string;
  children: OrgStructure[];
  positions: OrgPosition[];
}

const STORAGE_EMPLOYEES = "kpi_org_employees_v2";
const STORAGE_STRUCTURES = "kpi_org_structures_v3";

const seedEmployees: OrgEmployee[] = [
  { id: 1, firstName: "Günel", lastName: "Əlizadə", fatherName: "Vüqar", fin: "1A2B3C4", phone: "+994501234567", email: "hr@kpi.az", active: true,
    structurePath: "İnsan Resursları › İdarəetmə Şöbəsi", positionName: "HR Direktoru", salary: 4200, isStarPerson: true },
  { id: 2, firstName: "Nigar", lastName: "Hüseynova", fatherName: "Elxan", fin: "2B3C4D5", phone: "+994501234568", email: "nigar@kpi.az", active: true,
    structurePath: "Maliyyə Departamenti › İdarəetmə Şöbəsi", positionName: "CFO", salary: 5000, isStarPerson: true },
  { id: 3, firstName: "Samir", lastName: "Həsənov", fatherName: "Rauf", fin: "3C4D5E6", phone: "+994501234569", email: "user@kpi.az", active: true,
    structurePath: "Satış Departamenti › Bakı Satış Şöbəsi", positionName: "Şöbə Müdiri", salary: 2800, isStarPerson: true },
  { id: 4, firstName: "Leyla", lastName: "Məmmədova", fatherName: "İlqar", fin: "4D5E6F7", phone: "+994501234570", email: "leyla@kpi.az", active: true,
    structurePath: "Satış Departamenti › Bakı Satış Şöbəsi", positionName: "Satış Mütəxəssisi", salary: 1800 },
  { id: 5, firstName: "Rəşad", lastName: "Əliyev", fatherName: "Tahir", fin: "5E6F7G8", phone: "+994501234571", email: "reshad@kpi.az", active: true,
    structurePath: "Satış Departamenti › Bakı Satış Şöbəsi", positionName: "Satış Mütəxəssisi", salary: 1800 },
  { id: 6, firstName: "Farid", lastName: "Həsənov", fatherName: "Akif", fin: "6F7G8H9", phone: "+994501234572", email: "farid@kpi.az", active: true,
    structurePath: "Satış Departamenti › İdarəetmə Şöbəsi", positionName: "Departament Direktoru", salary: 4500, isStarPerson: true },
  { id: 7, firstName: "Emin", lastName: "Məmmədov", fatherName: "Səxavət", fin: "7G8H9I0", phone: "+994501234573", email: "emin@kpi.az", active: true,
    structurePath: "Satış Departamenti › Bakı Satış Şöbəsi", positionName: "Satış Mütəxəssisi", salary: 1700 },
  { id: 8, firstName: "Kamran", lastName: "Quliyev", fatherName: "Zaur", fin: "8H9I0J1", phone: "+994501234574", email: "kamran@kpi.az", active: true,
    structurePath: "Maliyyə Departamenti › Mühasibatlıq Şöbəsi", positionName: "Maliyyə Mütəxəssisi", salary: 1900 },
];

const seedStructures: OrgStructure[] = [
  {
    id: 1001, type: "Departament", name: "Satış Departamenti",
    positions: [],
    children: [
      {
        id: 1010, type: "Şöbə", name: "İdarəetmə Şöbəsi",
        positions: [
          {
            id: 2001, name: "Departament Direktoru",
            slots: [{ id: 3001, employeeId: 6, salary: 4500, fraction: 1 }],
          },

        ],
        children: [],
      },
      {
        id: 1002, type: "Şöbə", name: "Bakı Satış Şöbəsi",
        positions: [
          {
            id: 2002, name: "Şöbə Müdiri",
            slots: [{ id: 3002, employeeId: 3, salary: 2800, fraction: 1 }],
          },

          {
            id: 2003, name: "Satış Mütəxəssisi",
            slots: [
              { id: 3003, employeeId: 4, salary: 1800, fraction: 1 },
              { id: 3004, employeeId: 5, salary: 1800, fraction: 1 },
              { id: 3005, employeeId: 7, salary: 1700, fraction: 1 },
            ],
          },
        ],
        children: [],
      },
    ],
  },
  {
    id: 1003, type: "Departament", name: "İnsan Resursları",
    positions: [],
    children: [
      {
        id: 1011, type: "Şöbə", name: "İdarəetmə Şöbəsi",
        positions: [
          {
            id: 2004, name: "HR Direktoru",
            slots: [{ id: 3006, employeeId: 1, salary: 4200, fraction: 1 }],
          },

        ],
        children: [],
      },
    ],
  },
  {
    id: 1004, type: "Departament", name: "Maliyyə Departamenti",
    positions: [],
    children: [
      {
        id: 1012, type: "Şöbə", name: "İdarəetmə Şöbəsi",
        positions: [
          {
            id: 2005, name: "CFO",
            slots: [{ id: 3007, employeeId: 2, salary: 5000, fraction: 1 }],
          },

        ],
        children: [],
      },
      {
        id: 1013, type: "Şöbə", name: "Mühasibatlıq Şöbəsi",
        positions: [
          {
            id: 2006, name: "Maliyyə Mütəxəssisi",
            slots: [{ id: 3008, employeeId: 8, salary: 1900, fraction: 1 }],
          },
        ],
        children: [],
      },
    ],
  },
];

const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(key, JSON.stringify(fallback));
  return fallback;
};

const save = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("org-updated"));
};

// ---------- Employees ----------

export const getEmployees = (): OrgEmployee[] => load(STORAGE_EMPLOYEES, seedEmployees);

export const setEmployees = (list: OrgEmployee[]) => save(STORAGE_EMPLOYEES, list);

export const addEmployee = (data: Omit<OrgEmployee, "id" | "active" | "structurePath" | "positionName" | "salary">) => {
  const list = getEmployees();
  const id = list.length ? Math.max(...list.map(e => e.id)) + 1 : 1;
  const next = [...list, { ...data, id, active: true } as OrgEmployee];
  setEmployees(next);
  return next;
};

export const updateEmployee = (id: number, patch: Partial<OrgEmployee>) => {
  const next = getEmployees().map(e => e.id === id ? { ...e, ...patch } : e);
  setEmployees(next);
  return next;
};

export const toggleEmployeeActive = (id: number) => {
  const next = getEmployees().map(e => e.id === id ? { ...e, active: !e.active } : e);
  setEmployees(next);
  return next;
};

// ---------- Structures (tree) ----------

export const getStructures = (): OrgStructure[] => load(STORAGE_STRUCTURES, seedStructures);

export const setStructures = (list: OrgStructure[]) => {
  save(STORAGE_STRUCTURES, list);
  syncEmployeesFromStructures(list);
};

const newId = () => Date.now() + Math.floor(Math.random() * 1000);

const cloneStructures = (list: OrgStructure[]): OrgStructure[] => JSON.parse(JSON.stringify(list));

const findAndMutate = (
  list: OrgStructure[],
  targetId: number,
  mutator: (node: OrgStructure) => void,
): boolean => {
  for (const node of list) {
    if (node.id === targetId) {
      mutator(node);
      return true;
    }
    if (findAndMutate(node.children, targetId, mutator)) return true;
  }
  return false;
};

export const addRootStructure = (type: string, name: string, count: number = 1) => {
  const list = cloneStructures(getStructures());
  const n = Math.max(1, Math.min(50, Math.floor(count) || 1));
  for (let i = 0; i < n; i++) {
    const baseName = name && name.trim() ? name : `Yeni ${type}`;
    const suffix = n > 1 ? ` ${i + 1}` : "";
    list.push({ id: newId() + i, type, name: `${baseName}${suffix}`, children: [], positions: [] });
  }
  setStructures(list);
  return list;
};

export const addSubStructure = (parentId: number, type: string, name: string, count: number = 1) => {
  const list = cloneStructures(getStructures());
  const n = Math.max(1, Math.min(50, Math.floor(count) || 1));
  findAndMutate(list, parentId, (node) => {
    for (let i = 0; i < n; i++) {
      const baseName = name && name.trim() ? name : `Yeni ${type}`;
      const suffix = n > 1 ? ` ${i + 1}` : "";
      node.children.push({ id: newId() + i, type, name: `${baseName}${suffix}`, children: [], positions: [] });
    }
  });
  setStructures(list);
  return list;
};

export const renameStructure = (structureId: number, name: string) => {
  const list = cloneStructures(getStructures());
  findAndMutate(list, structureId, (node) => { node.name = name; });
  setStructures(list);
  return list;
};

export const addPosition = (structureId: number, name: string) => {
  const list = cloneStructures(getStructures());
  findAndMutate(list, structureId, (node) => {
    node.positions.push({ id: newId(), name, slots: [] });
  });
  setStructures(list);
  return list;
};

const findPositionAndMutate = (
  list: OrgStructure[],
  positionId: number,
  mutator: (pos: OrgPosition, parent: OrgStructure) => void,
): boolean => {
  for (const node of list) {
    const pos = node.positions.find(p => p.id === positionId);
    if (pos) {
      mutator(pos, node);
      return true;
    }
    if (findPositionAndMutate(node.children, positionId, mutator)) return true;
  }
  return false;
};

export const addSlot = (positionId: number, count: number = 1, fraction: OrgSlotFraction = 1) => {
  const list = cloneStructures(getStructures());
  const n = Math.max(1, Math.min(100, Math.floor(count) || 1));
  findPositionAndMutate(list, positionId, (pos) => {
    for (let i = 0; i < n; i++) {
      pos.slots.push({ id: newId() + i, employeeId: null, salary: null, fraction });
    }
  });
  setStructures(list);
  return list;
};

export const assignSlot = (
  slotId: number,
  patch: { employeeId?: number | null; salary?: number | null; fraction?: OrgSlotFraction },
) => {
  const list = cloneStructures(getStructures());
  const visit = (nodes: OrgStructure[]): boolean => {
    for (const node of nodes) {
      for (const pos of node.positions) {
        const s = pos.slots.find(x => x.id === slotId);
        if (s) {
          if (patch.employeeId !== undefined) s.employeeId = patch.employeeId;
          if (patch.salary !== undefined) s.salary = patch.salary;
          if (patch.fraction !== undefined) s.fraction = patch.fraction;
          return true;
        }
      }
      if (visit(node.children)) return true;
    }
    return false;
  };
  visit(list);
  setStructures(list);
  return list;
};

export const removeSlot = (slotId: number) => {
  const list = cloneStructures(getStructures());
  const visit = (nodes: OrgStructure[]): boolean => {
    for (const node of nodes) {
      for (const pos of node.positions) {
        const i = pos.slots.findIndex(x => x.id === slotId);
        if (i >= 0) { pos.slots.splice(i, 1); return true; }
      }
      if (visit(node.children)) return true;
    }
    return false;
  };
  visit(list);
  setStructures(list);
  return list;
};

export const removePosition = (positionId: number) => {
  const list = cloneStructures(getStructures());
  const visit = (nodes: OrgStructure[]): boolean => {
    for (const node of nodes) {
      const i = node.positions.findIndex(p => p.id === positionId);
      if (i >= 0) { node.positions.splice(i, 1); return true; }
      if (visit(node.children)) return true;
    }
    return false;
  };
  visit(list);
  setStructures(list);
  return list;
};

export const removeStructure = (structureId: number) => {
  const list = cloneStructures(getStructures());
  const visit = (nodes: OrgStructure[]): boolean => {
    const i = nodes.findIndex(n => n.id === structureId);
    if (i >= 0) { nodes.splice(i, 1); return true; }
    for (const n of nodes) if (visit(n.children)) return true;
    return false;
  };
  visit(list);
  setStructures(list);
  return list;
};

// ---------- Sync employees with current assignments ----------

interface AssignmentInfo { structurePath: string; positionName: string; salary: number | null; }

const buildAssignmentMap = (list: OrgStructure[]): Map<number, AssignmentInfo> => {
  const map = new Map<number, AssignmentInfo>();
  const walk = (nodes: OrgStructure[], pathParts: string[]) => {
    for (const node of nodes) {
      const path = [...pathParts, node.name];
      for (const pos of node.positions) {
        for (const slot of pos.slots) {
          if (slot.employeeId != null) {
            map.set(slot.employeeId, {
              structurePath: path.join(" › "),
              positionName: pos.name,
              salary: slot.salary,
            });
          }
        }
      }
      walk(node.children, path);
    }
  };
  walk(list, []);
  return map;
};

const syncEmployeesFromStructures = (list: OrgStructure[]) => {
  const map = buildAssignmentMap(list);
  const employees = getEmployees().map(e => {
    const info = map.get(e.id);
    if (info) {
      return { ...e, structurePath: info.structurePath, positionName: info.positionName, salary: info.salary ?? undefined };
    }
    // Cleared assignment
    return { ...e, structurePath: undefined, positionName: undefined, salary: undefined };
  });
  localStorage.setItem(STORAGE_EMPLOYEES, JSON.stringify(employees));
  window.dispatchEvent(new Event("org-updated"));
};

export const getAssignedEmployeeIds = (): Set<number> => {
  const ids = new Set<number>();
  const walk = (nodes: OrgStructure[]) => {
    for (const n of nodes) {
      for (const p of n.positions) for (const s of p.slots) if (s.employeeId != null) ids.add(s.employeeId);
      walk(n.children);
    }
  };
  walk(getStructures());
  return ids;
};

// ---------- Helpers for KPI form ----------

export interface FlatStructureNode {
  id: number;
  name: string;
  type: string;
  path: string;            // "Satış › Bakı Satış Şöbəsi"
  parentId: number | null;
  hasChildren: boolean;
  depth: number;
}

export const getFlatStructureNodes = (): FlatStructureNode[] => {
  const out: FlatStructureNode[] = [];
  const walk = (nodes: OrgStructure[], parentId: number | null, pathParts: string[], depth: number) => {
    for (const n of nodes) {
      const path = [...pathParts, n.name].join(" › ");
      out.push({ id: n.id, name: n.name, type: n.type, path, parentId, hasChildren: n.children.length > 0, depth });
      walk(n.children, n.id, [...pathParts, n.name], depth + 1);
    }
  };
  walk(getStructures(), null, [], 0);
  return out;
};

/** Find a single structure node by id (deep). */
export const findStructureById = (id: number): OrgStructure | null => {
  const visit = (nodes: OrgStructure[]): OrgStructure | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const r = visit(n.children);
      if (r) return r;
    }
    return null;
  };
  return visit(getStructures());
};

/**
 * Vəzifə adına görə həmin strukturda (və alt strukturlarında) işləyən şəxsləri tap.
 * Əgər structureId verilməyibsə, bütün təşkilatda axtarır.
 */
export const findOccupantsByPosition = (
  positionName: string,
  structureId?: number | null,
): string[] => {
  const employees = getEmployees();
  const empName = (id: number | null) => {
    if (id == null) return null;
    const e = employees.find(x => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : null;
  };
  const collect = (nodes: OrgStructure[], out: string[]) => {
    for (const n of nodes) {
      for (const p of n.positions) {
        if (p.name.toLowerCase() === positionName.toLowerCase()) {
          for (const s of p.slots) {
            const nm = empName(s.employeeId);
            if (nm && !out.includes(nm)) out.push(nm);
          }
        }
      }
      collect(n.children, out);
    }
  };
  const out: string[] = [];
  if (structureId != null) {
    const root = findStructureById(structureId);
    if (root) collect([root], out);
  } else {
    collect(getStructures(), out);
  }
  return out;
};


// =====================================================================
// STAR POSITION — Ulduzlu Vəzifə (Kaskadlama üçün)
// =====================================================================
// Qayda: Ulduz VƏZİFƏYƏ verilir, şəxsə deyil. Hər struktur vahidində
// yalnız bir Star Position ola bilər. Vəzifədə oturan əməkdaş dəyişdikdə
// heç bir mapping yenidən qurulmur — servis avtomatik yeni holder-i tapır.

/** Vəzifəyə ulduz təyin et / sil. Uniqueness həmin struktur daxilində zorlanır. */
export const setStarPosition = (positionId: number, isStar: boolean) => {
  const list = cloneStructures(getStructures());
  findPositionAndMutate(list, positionId, (pos, parent) => {
    if (isStar) {
      // Həmin struktur vahidində əvvəlki ulduz(lar)ı söndür
      parent.positions.forEach(p => {
        if (p.id !== positionId) p.isStarPosition = false;
      });
      pos.isStarPosition = true;
    } else {
      pos.isStarPosition = false;
    }
  });
  setStructures(list);
  return list;
};

/** Verilmiş struktur vahidindəki Star Position-u tapır (yoxdursa null). */
export const getStarPositionOfUnit = (unitId: number): OrgPosition | null => {
  const node = findStructureById(unitId);
  if (!node) return null;
  return node.positions.find(p => p.isStarPosition) ?? null;
};

/** Ulduz vəzifədə oturan əməkdaşı(ları) qaytarır. Vakantdırsa boş massiv. */
export const getStarHoldersOfUnit = (unitId: number): OrgEmployee[] => {
  const pos = getStarPositionOfUnit(unitId);
  if (!pos) return [];
  const employees = getEmployees();
  const out: OrgEmployee[] = [];
  for (const s of pos.slots) {
    if (s.employeeId != null) {
      const e = employees.find(x => x.id === s.employeeId);
      if (e && e.active) out.push(e);
    }
  }
  return out;
};

/** Vahid holder — birdən çox slot varsa, birincisini qaytarır. */
export const getStarHolderOfUnit = (unitId: number): OrgEmployee | null =>
  getStarHoldersOfUnit(unitId)[0] ?? null;

export interface CascadeNode {
  unitId: number;
  unitName: string;
  unitType: string;
  path: string;
  starPosition: OrgPosition | null;
  starHolder: OrgEmployee | null;
  /** Ulduz vəzifə var, amma boşdursa true — göndəriş bloklanır. */
  vacant: boolean;
  /** Struktur vahidində ümumiyyətlə Star Position təyin edilməyibsə true. */
  missingStar: boolean;
  children: CascadeNode[];
}

/** Verilmiş kökdən başlayaraq bütün alt strukturları rekursiv gəzir. */
export const resolveCascadeChain = (rootUnitId: number): CascadeNode | null => {
  const root = findStructureById(rootUnitId);
  if (!root) return null;
  const build = (node: OrgStructure, pathParts: string[]): CascadeNode => {
    const path = [...pathParts, node.name].join(" › ");
    const starPos = node.positions.find(p => p.isStarPosition) ?? null;
    const holder = starPos ? getStarHolderOfUnit(node.id) : null;
    return {
      unitId: node.id,
      unitName: node.name,
      unitType: node.type,
      path,
      starPosition: starPos,
      starHolder: holder,
      vacant: !!starPos && !holder,
      missingStar: !starPos,
      children: node.children.map(c => build(c, [...pathParts, node.name])),
    };
  };
  return build(root, []);
};

/** Bütün kökləri (top-level struktur vahidlərini) zəncir kimi qaytarır. */
export const resolveAllCascadeChains = (): CascadeNode[] =>
  getStructures().map(s => resolveCascadeChain(s.id)!).filter(Boolean);

/** Struktur boyunca star saylarını yoxlayır — >1 halı təhlükəlidir. */
export interface StarValidationIssue {
  unitId: number;
  unitName: string;
  path: string;
  kind: "missing" | "multiple" | "vacant";
  detail?: string;
}

export const validateStarStructure = (): StarValidationIssue[] => {
  const issues: StarValidationIssue[] = [];
  const walk = (nodes: OrgStructure[], pathParts: string[]) => {
    for (const n of nodes) {
      const path = [...pathParts, n.name].join(" › ");
      const stars = n.positions.filter(p => p.isStarPosition);
      if (stars.length > 1) {
        issues.push({ unitId: n.id, unitName: n.name, path, kind: "multiple", detail: stars.map(s => s.name).join(", ") });
      } else if (stars.length === 0 && n.positions.length > 0) {
        issues.push({ unitId: n.id, unitName: n.name, path, kind: "missing" });
      } else if (stars.length === 1) {
        const holder = getStarHolderOfUnit(n.id);
        if (!holder) issues.push({ unitId: n.id, unitName: n.name, path, kind: "vacant", detail: stars[0].name });
      }
      walk(n.children, [...pathParts, n.name]);
    }
  };
  walk(getStructures(), []);
  return issues;
};

/** KPI hədəfini struktur vahidinə yönləndirmə üçün əməkdaşı tap. */
export class MissingStarError extends Error {
  constructor(public unitId: number, public unitName: string) {
    super(`"${unitName}" strukturunda Ulduzlu Vəzifə təyin edilməyib`);
  }
}

export const routeKpiToUnit = (unitId: number): OrgEmployee => {
  const node = findStructureById(unitId);
  if (!node) throw new Error("Struktur tapılmadı");
  const holder = getStarHolderOfUnit(unitId);
  if (!holder) throw new MissingStarError(unitId, node.name);
  return holder;
};
