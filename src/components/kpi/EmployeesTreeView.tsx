import { useMemo, useState } from "react";
import { ChevronRight, Building2, Layers, Users as UsersIcon, User as UserIcon, ArrowUp } from "lucide-react";
import { getEmployees, getStructures, type OrgStructure, type OrgEmployee } from "@/lib/orgStore";

type NodeKind = "company" | "department" | "division" | "team" | "employee";

interface TreeNode {
  id: string;
  parent?: string;
  kind: NodeKind;
  name: string;
  position?: string;
  empId?: number;
  /** Cari cədvəldəki kartlar üzrə */
  kpiCount: number;
  avgProgress: number;
}

const kindIcon: Record<NodeKind, any> = {
  company: Building2,
  department: Layers,
  division: Layers,
  team: UsersIcon,
  employee: UserIcon,
};

const norm = (s: string) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

interface Props {
  /** Filtrlənmiş KPI kartları — responsible sahəsindən istifadə olunur */
  cards: { responsible?: string; progress?: number }[];
  /** Əməkdaşın adı ilə drilldown açan callback */
  onOpenEmployee: (fullName: string) => void;
}

export default function EmployeesTreeView({ cards, onOpenEmployee }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { tree, childrenOf } = useMemo(() => {
    const emps = getEmployees().filter(e => e.active);
    const structs = getStructures();

    // Per-employee stat lookup — normalized "first last" and "last first"
    const perEmp = new Map<number, { count: number; sumProgress: number }>();
    emps.forEach(e => perEmp.set(e.id, { count: 0, sumProgress: 0 }));
    const empByName = new Map<string, OrgEmployee>();
    emps.forEach(e => {
      empByName.set(norm(`${e.firstName} ${e.lastName}`), e);
      empByName.set(norm(`${e.lastName} ${e.firstName}`), e);
    });
    cards.forEach(c => {
      const key = norm(c.responsible || "");
      const e = empByName.get(key);
      if (!e) return;
      const cur = perEmp.get(e.id)!;
      cur.count += 1;
      cur.sumProgress += Number(c.progress) || 0;
    });

    // Group employees by their structurePath
    const empByPath = new Map<string, OrgEmployee[]>();
    emps.forEach(e => {
      const p = e.structurePath ?? "";
      if (!empByPath.has(p)) empByPath.set(p, []);
      empByPath.get(p)!.push(e);
    });

    const nodes: TreeNode[] = [];
    const rootId = "all";

    const empNode = (e: OrgEmployee, parentId: string): TreeNode => {
      const st = perEmp.get(e.id)!;
      return {
        id: `e${e.id}`,
        empId: e.id,
        parent: parentId,
        kind: "employee",
        name: [e.firstName, e.lastName].filter(Boolean).join(" "),
        position: e.positionName || "Əməkdaş",
        kpiCount: st.count,
        avgProgress: st.count > 0 ? Math.round(st.sumProgress / st.count) : 0,
      };
    };

    const walk = (s: OrgStructure, parentPath: string, parentId: string) => {
      const path = parentPath ? `${parentPath} › ${s.name}` : s.name;
      const id = `s${s.id}`;
      const t = (s.type || "").toLowerCase();
      const kind: NodeKind = t.includes("depart") ? "department"
        : (t.includes("komanda") || t.includes("team")) ? "team"
        : "division";
      nodes.push({ id, parent: parentId, kind, name: s.name, kpiCount: 0, avgProgress: 0 });
      (empByPath.get(path) ?? []).forEach(e => nodes.push(empNode(e, id)));
      s.children.forEach(ch => walk(ch, path, id));
    };

    // Root — Bütün şirkət
    nodes.push({ id: rootId, kind: "company", name: "Bütün şirkət", kpiCount: 0, avgProgress: 0 });
    (empByPath.get("") ?? []).forEach(e => nodes.push(empNode(e, rootId)));
    structs.forEach(s => walk(s, "", rootId));

    // Aggregate stats up the tree (post-order)
    const childrenMap = new Map<string | undefined, TreeNode[]>();
    nodes.forEach(n => {
      const key = n.parent;
      if (!childrenMap.has(key)) childrenMap.set(key, []);
      childrenMap.get(key)!.push(n);
    });
    const compute = (n: TreeNode): { count: number; empCards: number[] } => {
      if (n.kind === "employee") {
        const arr = n.kpiCount > 0 ? Array(n.kpiCount).fill(n.avgProgress) : [];
        return { count: n.kpiCount, empCards: arr };
      }
      let count = 0;
      const empCards: number[] = [];
      (childrenMap.get(n.id) ?? []).forEach(c => {
        const r = compute(c);
        count += r.count;
        empCards.push(...r.empCards);
      });
      n.kpiCount = count;
      n.avgProgress = empCards.length > 0 ? Math.round(empCards.reduce((a, b) => a + b, 0) / empCards.length) : 0;
      return { count, empCards };
    };
    (childrenMap.get(undefined) ?? []).forEach(compute);

    const childrenOf = (id: string) => childrenMap.get(id) ?? [];
    return { tree: nodes, childrenOf };
  }, [cards]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  // Flatten visible rows
  const rows = useMemo(() => {
    const out: { node: TreeNode; depth: number }[] = [];
    const sortChildren = (arr: TreeNode[]) => {
      const emp = arr.filter(n => n.kind === "employee");
      const rest = arr.filter(n => n.kind !== "employee");
      return [...rest, ...emp];
    };
    const walk = (parentId: string | undefined, depth: number) => {
      sortChildren(tree.filter(n => n.parent === parentId)).forEach(n => {
        out.push({ node: n, depth });
        if (expanded.has(n.id)) walk(n.id, depth + 1);
      });
    };
    tree.filter(n => !n.parent).forEach(root => {
      out.push({ node: root, depth: 0 });
      if (expanded.has(root.id)) walk(root.id, 1);
    });
    return out;
  }, [expanded, tree]);

  return (
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
            {rows.map(({ node, depth }) => {
              const Icon = kindIcon[node.kind];
              const isEmp = node.kind === "employee";
              const hasChildren = !isEmp && childrenOf(node.id).length > 0;
              const isOpen = expanded.has(node.id);
              return (
                <tr
                  key={node.id}
                  onClick={() => !isEmp && hasChildren && toggle(node.id)}
                  className={`border-t border-border transition-colors ${!isEmp && hasChildren ? "cursor-pointer hover:bg-secondary/40" : "hover:bg-secondary/20"}`}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 20}px` }}>
                      {hasChildren ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggle(node.id); }}
                          className="w-5 h-5 rounded hover:bg-secondary inline-flex items-center justify-center text-muted-foreground"
                          aria-label="Aç/bağla"
                        >
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                        </button>
                      ) : <span className="w-5 inline-block" />}
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center border ${isEmp ? "bg-primary/10 border-primary/20 text-primary" : "bg-secondary/60 border-border text-muted-foreground"}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{node.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground truncate">
                    {isEmp ? (node.position || "—") : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      {node.kpiCount}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${node.avgProgress >= 90 ? "bg-emerald-500" : node.avgProgress >= 75 ? "bg-amber-500" : "bg-rose-500"}`}
                          style={{ width: `${Math.min(node.avgProgress, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums font-medium w-9 text-right">{node.avgProgress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isEmp ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenEmployee(node.name); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                      >
                        Kartlara Detallı bax
                        <ArrowUp className="w-3.5 h-3.5 rotate-90" />
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Struktur boşdur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
