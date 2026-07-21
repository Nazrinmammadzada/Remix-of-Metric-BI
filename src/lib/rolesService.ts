// RBAC service — DB-backed CRUD for roles, permissions, and user↔role assignments.
// Scoped to the caller's current organization. Default org roles are HR, USER,
// MANAGER; additional custom roles can be created and persisted in the backend.

import { supabase } from "@/integrations/supabase/client";

export interface DbPermission {
  id: string;
  code: string;
  module: string;
  description: string | null;
}

export interface DbRole {
  id: string;
  organization_id: string | null;
  name: string;
  code: string;
  description: string | null;
  is_system_role: boolean;
  is_platform_role: boolean;
  is_active: boolean;
  permissionIds: string[];
}

export interface OrgMemberRow {
  memberId: string;         // organization_members.id
  userId: string;           // auth uid
  fullName: string;
  email: string;
  positionName: string;
  roleIds: string[];        // active roles for that member in this org
}

const DEFAULT_ROLE_ORDER: Record<string, number> = { hr: 0, user: 1, manager: 2 };

const sortRoles = (items: DbRole[]) =>
  [...items].sort((a, b) => {
    const ao = DEFAULT_ROLE_ORDER[a.code] ?? 99;
    const bo = DEFAULT_ROLE_ORDER[b.code] ?? 99;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name, "az");
  });

// ── Permissions catalog ───────────────────────────────────────────────────────
export const fetchPermissions = async (): Promise<DbPermission[]> => {
  const { data, error } = await supabase
    .from("permissions")
    .select("id, code, module, description")
    .order("module")
    .order("code");
  if (error) throw error;
  return (data ?? []) as DbPermission[];
};

// ── Roles (org-scoped only) ───────────────────────────────────────────────────
export const fetchRolesForOrg = async (orgId: string): Promise<DbRole[]> => {
  const { data, error } = await supabase
    .from("roles")
    .select(`
      id, organization_id, name, code, description,
      is_system_role, is_platform_role, is_active,
      role_permissions ( permission_id )
    `)
    .eq("organization_id", orgId)
    .neq("code", "platform_super_admin")
    .order("name");
  if (error) throw error;
  return sortRoles((data ?? []).map((r: any) => ({
    id: r.id,
    organization_id: r.organization_id,
    name: r.name,
    code: r.code,
    description: r.description,
    is_system_role: !!r.is_system_role,
    is_platform_role: !!r.is_platform_role,
    is_active: r.is_active !== false,
    permissionIds: (r.role_permissions ?? []).map((rp: any) => rp.permission_id),
  })));
};

// ── Org members with their active roles ──────────────────────────────────────
export const fetchOrgMembersWithRoles = async (orgId: string): Promise<OrgMemberRow[]> => {
  const { data: members, error } = await supabase
    .from("organization_members")
    .select(`
      id, user_id,
      user_roles ( role_id, is_active, expires_at )
    `)
    .eq("organization_id", orgId)
    .eq("status", "active");
  if (error) throw error;

  const userIds = (members ?? []).map((m: any) => m.user_id).filter(Boolean);
  const profiles = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", userIds)
    : { data: [] as any[], error: null };

  const emp = userIds.length
    ? await supabase
        .from("org_employees")
        .select("auth_user_id, first_name, last_name, email, position_name")
        .in("auth_user_id", userIds)
        .eq("organization_id", orgId)
    : { data: [] as any[], error: null };

  const profileByAuth = new Map<string, any>();
  for (const p of profiles.data ?? []) {
    if (p.id) profileByAuth.set(p.id, p);
  }

  const employeeByAuth = new Map<string, any>();
  const positionByAuth = new Map<string, string>();
  for (const e of emp.data ?? []) {
    if (e.auth_user_id) employeeByAuth.set(e.auth_user_id, e);
    if (e.auth_user_id) positionByAuth.set(e.auth_user_id, e.position_name || "");
  }

  const nowMs = Date.now();
  return (members ?? []).map((m: any) => {
    const p = profileByAuth.get(m.user_id) ?? employeeByAuth.get(m.user_id) ?? {};
    const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || (p.email ?? "—");
    const activeRoleIds: string[] = (m.user_roles ?? [])
      .filter((ur: any) => ur.is_active !== false && (!ur.expires_at || new Date(ur.expires_at).getTime() > nowMs))
      .map((ur: any) => ur.role_id);
    return {
      memberId: m.id,
      userId: m.user_id,
      fullName,
      email: p.email ?? "",
      positionName: positionByAuth.get(m.user_id) ?? "",
      roleIds: activeRoleIds,
    };
  });
};

// ── Create a new org-scoped role, optionally cloning permissions from another role ─
export const createOrgRole = async (
  orgId: string,
  input: { name: string; description?: string; cloneFromRoleId?: string | null },
): Promise<DbRole> => {
  const codeBase = input.name
    .toLowerCase()
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "custom_role";
  const code = `${codeBase}_${Date.now().toString(36).slice(-4)}`;

  const { data: created, error } = await supabase
    .from("roles")
    .insert({
      organization_id: orgId,
      name: input.name.trim().toUpperCase(),
      code,
      description: input.description?.trim() || null,
      is_system_role: false,
      is_platform_role: false,
      is_active: true,
    })
    .select("id, organization_id, name, code, description, is_system_role, is_platform_role, is_active")
    .single();
  if (error) throw error;

  let permissionIds: string[] = [];
  if (input.cloneFromRoleId) {
    const { data: rps } = await supabase
      .from("role_permissions")
      .select("permission_id")
      .eq("role_id", input.cloneFromRoleId);
    permissionIds = (rps ?? []).map((r: any) => r.permission_id);
    if (permissionIds.length) {
      await supabase.from("role_permissions").insert(
        permissionIds.map(pid => ({ role_id: (created as any).id, permission_id: pid })),
      );
    }
  }

  return { ...(created as any), permissionIds };
};

// ── Update role metadata (name/description) ─────────────────────────────────
export const updateOrgRole = async (
  roleId: string,
  patch: { name?: string; description?: string | null; is_active?: boolean },
): Promise<void> => {
  const next = { ...patch };
  if (typeof next.name === "string") next.name = next.name.trim().toUpperCase();
  const { error } = await supabase.from("roles").update(next).eq("id", roleId);
  if (error) throw error;
};

// ── Delete an org-scoped role (templates cannot be deleted by RLS) ──────────
export const deleteOrgRole = async (roleId: string): Promise<void> => {
  await supabase.from("role_permissions").delete().eq("role_id", roleId);
  await supabase.from("user_roles").delete().eq("role_id", roleId);
  const { error } = await supabase.from("roles").delete().eq("id", roleId);
  if (error) throw error;
};

// ── Replace the full permission set on a role ───────────────────────────────
export const setRolePermissions = async (
  roleId: string,
  permissionIds: string[],
): Promise<void> => {
  const { data: existing } = await supabase
    .from("role_permissions")
    .select("permission_id")
    .eq("role_id", roleId);
  const have = new Set((existing ?? []).map((r: any) => r.permission_id as string));
  const want = new Set(permissionIds);

  const toAdd = permissionIds.filter(id => !have.has(id));
  const toRemove = Array.from(have).filter(id => !want.has(id));

  if (toAdd.length) {
    const { error } = await supabase
      .from("role_permissions")
      .insert(toAdd.map(pid => ({ role_id: roleId, permission_id: pid })));
    if (error) throw error;
  }
  if (toRemove.length) {
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .in("permission_id", toRemove);
    if (error) throw error;
  }
};

// ── Replace the set of members assigned to a role ───────────────────────────
export const setRoleMembers = async (
  roleId: string,
  memberIds: string[],
  assignedBy: string | null,
): Promise<void> => {
  const { data: existing } = await supabase
    .from("user_roles")
    .select("organization_member_id")
    .eq("role_id", roleId);
  const have = new Set((existing ?? []).map((r: any) => r.organization_member_id as string));
  const want = new Set(memberIds);

  const toAdd = memberIds.filter(id => !have.has(id));
  const toRemove = Array.from(have).filter(id => !want.has(id));

  if (toAdd.length) {
    const { error } = await supabase.from("user_roles").insert(
      toAdd.map(mid => ({
        role_id: roleId,
        organization_member_id: mid,
        assigned_by: assignedBy,
        is_active: true,
      })),
    );
    if (error) throw error;
  }
  if (toRemove.length) {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("role_id", roleId)
      .in("organization_member_id", toRemove);
    if (error) throw error;
  }
};
