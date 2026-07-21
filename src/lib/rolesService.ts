// RBAC service — DB-backed CRUD for roles, permissions, and user↔role assignments.
// Scoped to the caller's current organization; templates (organization_id IS NULL)
// are exposed read-only so HR can clone them into org-specific roles.

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

// ── Roles (org + templates) ───────────────────────────────────────────────────
export const fetchRolesForOrg = async (orgId: string): Promise<DbRole[]> => {
  const { data, error } = await supabase
    .from("roles")
    .select(`
      id, organization_id, name, code, description,
      is_system_role, is_platform_role, is_active,
      role_permissions ( permission_id )
    `)
    .or(`organization_id.eq.${orgId},organization_id.is.null`)
    .neq("code", "platform_super_admin")
    .order("is_platform_role", { ascending: true })
    .order("name");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    organization_id: r.organization_id,
    name: r.name,
    code: r.code,
    description: r.description,
    is_system_role: !!r.is_system_role,
    is_platform_role: !!r.is_platform_role,
    is_active: r.is_active !== false,
    permissionIds: (r.role_permissions ?? []).map((rp: any) => rp.permission_id),
  }));
};

// ── Org members with their active roles ──────────────────────────────────────
export const fetchOrgMembersWithRoles = async (orgId: string): Promise<OrgMemberRow[]> => {
  const { data: members, error } = await supabase
    .from("organization_members")
    .select(`
      id, user_id,
      profiles:profiles!organization_members_user_id_fkey (
        first_name, last_name, email
      ),
      user_roles ( role_id, is_active, expires_at )
    `)
    .eq("organization_id", orgId)
    .eq("status", "active");
  if (error) throw error;

  const userIds = (members ?? []).map((m: any) => m.user_id).filter(Boolean);
  const emp = userIds.length
    ? await supabase
        .from("org_employees")
        .select("auth_user_id, position_name")
        .in("auth_user_id", userIds)
        .eq("organization_id", orgId)
    : { data: [] as any[], error: null };

  const positionByAuth = new Map<string, string>();
  for (const e of emp.data ?? []) {
    if (e.auth_user_id) positionByAuth.set(e.auth_user_id, e.position_name || "");
  }

  const nowMs = Date.now();
  return (members ?? []).map((m: any) => {
    const p = m.profiles ?? {};
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
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "custom_role";
  const code = `${codeBase}_${Date.now().toString(36).slice(-4)}`;

  const { data: created, error } = await supabase
    .from("roles")
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
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
  const { error } = await supabase.from("roles").update(patch).eq("id", roleId);
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
