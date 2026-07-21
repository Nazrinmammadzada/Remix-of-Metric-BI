import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const DEFAULT_PASSWORD = "123456";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Ctx {
  admin: ReturnType<typeof createClient>;
  authed: ReturnType<typeof createClient>;
  callerId: string;
}

// Verify caller can manage users in the target org (HR permission or platform super-admin).
const assertCanManage = async (ctx: Ctx, orgId: string) => {
  const { data: prof } = await ctx.admin
    .from("profiles")
    .select("is_platform_super_admin")
    .eq("id", ctx.callerId)
    .maybeSingle();
  if (prof?.is_platform_super_admin) return true;
  const { data: perm } = await ctx.admin.rpc("has_permission", {
    _user_id: ctx.callerId,
    _org_id: orgId,
    _permission_code: "users.manage",
  });
  return !!perm;
};

// Find existing auth user by email using paginated listing.
const findAuthUserByEmail = async (
  admin: ReturnType<typeof createClient>,
  email: string,
) => {
  const target = email.toLowerCase();
  let page = 1;
  while (page < 20) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const users = (data as any)?.users ?? [];
    const hit = users.find((u: any) => (u.email || "").toLowerCase() === target);
    if (hit) return hit;
    if (users.length < 200) return null;
    page++;
  }
  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });
    const callerId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const ctx: Ctx = { admin, authed, callerId };
    const body = await req.json();
    const action = String(body?.action || "");
    const organization_id = String(body?.organization_id || "");
    if (!organization_id) return json(400, { error: "organization_id tələb olunur" });
    if (!(await assertCanManage(ctx, organization_id))) {
      return json(403, { error: "İcazə yoxdur" });
    }

    // ---------------- PROVISION LOGIN ----------------
    // Creates auth user (or reuses existing) + profile row, links to
    // org_employees.auth_user_id, adds organization_members + default USER role.
    if (action === "provision_login") {
      const employee_id = String(body.employee_id || "");
      const emailRaw = String(body.email || "").trim().toLowerCase();
      const first_name = String(body.first_name || "").trim();
      const last_name = String(body.last_name || "").trim();
      if (!employee_id) return json(400, { error: "employee_id tələb olunur" });
      if (!emailRaw) return json(400, { error: "E-poçt tələb olunur" });

      // Skip if already provisioned
      const { data: emp } = await admin
        .from("org_employees")
        .select("id, auth_user_id, email, first_name, last_name")
        .eq("id", employee_id)
        .eq("organization_id", organization_id)
        .maybeSingle();
      if (!emp) return json(404, { error: "Əməkdaş tapılmadı" });
      let userId: string | undefined = emp.auth_user_id || undefined;

      // Create or reuse — idempotent: if createUser reports duplicate email
      // or a spurious "database error", fall back to lookup by email.
      if (!userId) {
        const existing = await findAuthUserByEmail(admin, emailRaw);
        if (existing) {
          userId = existing.id;
        } else {
          const { data: created, error: cErr } = await admin.auth.admin.createUser({
            email: emailRaw,
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: { first_name, last_name },
          });
          if (created?.user) {
            userId = created.user.id;
          } else {
            // Duplicate email or transient trigger error — try to find the user.
            const found = await findAuthUserByEmail(admin, emailRaw);
            if (found) userId = found.id;
            else return json(500, { error: cErr?.message || "İstifadəçi yaradıla bilmədi" });
          }
        }
      }
      // Ensure password + confirmation are set for the (possibly pre-existing) user.
      await admin.auth.admin.updateUserById(userId, {
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name, last_name },
      });

      await admin.from("profiles").upsert({
        id: userId,
        email: emailRaw,
        first_name,
        last_name,
        must_change_password: true,
      }, { onConflict: "id" });

      // org membership
      const { data: memExisting } = await admin
        .from("organization_members")
        .select("id")
        .eq("user_id", userId)
        .eq("organization_id", organization_id)
        .maybeSingle();
      let memberId = memExisting?.id as string | undefined;
      if (!memberId) {
        const { data: mem, error: mErr } = await admin
          .from("organization_members")
          .insert({ user_id: userId, organization_id, status: "active" })
          .select("id")
          .single();
        if (mErr || !mem) return json(500, { error: mErr?.message || "Üzvlük yaradıla bilmədi" });
        memberId = mem.id;
      } else {
        await admin.from("organization_members")
          .update({ status: "active" })
          .eq("id", memberId);
      }

      // Default USER role for the org (create if missing by cloning template)
      const { data: userRole } = await admin
        .from("roles")
        .select("id")
        .eq("organization_id", organization_id)
        .eq("code", "user")
        .maybeSingle();
      let roleId = userRole?.id as string | undefined;
      if (!roleId) {
        const { data: newRole } = await admin
          .from("roles")
          .insert({
            organization_id,
            name: "USER",
            code: "user",
            is_system_role: true,
            is_active: true,
          })
          .select("id")
          .single();
        roleId = newRole?.id;
        // Copy permissions from user template if it exists
        const { data: tpl } = await admin
          .from("roles")
          .select("id")
          .eq("code", "user_template")
          .is("organization_id", null)
          .maybeSingle();
        if (tpl?.id && roleId) {
          const { data: tplPerms } = await admin
            .from("role_permissions")
            .select("permission_id")
            .eq("role_id", tpl.id);
          if (tplPerms?.length) {
            await admin.from("role_permissions").insert(
              tplPerms.map((p: any) => ({ role_id: roleId, permission_id: p.permission_id })),
            );
          }
        }
      }
      if (roleId && memberId) {
        const { data: urExisting } = await admin
          .from("user_roles")
          .select("id")
          .eq("organization_member_id", memberId)
          .eq("role_id", roleId)
          .maybeSingle();
        if (!urExisting) {
          await admin.from("user_roles").insert({
            organization_member_id: memberId,
            role_id: roleId,
            is_active: true,
          });
        }
      }

      // Link employee row
      await admin.from("org_employees")
        .update({ auth_user_id: userId, email: emailRaw })
        .eq("id", employee_id);

      return json(200, {
        ok: true,
        user_id: userId,
        email: emailRaw,
        temp_password: DEFAULT_PASSWORD,
      });
    }

    // ---------------- RESET PASSWORD ----------------
    if (action === "reset_password") {
      const employee_id = String(body.employee_id || "");
      const { data: emp } = await admin
        .from("org_employees")
        .select("auth_user_id, email")
        .eq("id", employee_id)
        .eq("organization_id", organization_id)
        .maybeSingle();
      if (!emp?.auth_user_id) return json(404, { error: "İstifadəçi loginləşdirilməyib" });
      const { error: uErr } = await admin.auth.admin.updateUserById(emp.auth_user_id, {
        password: DEFAULT_PASSWORD,
        email_confirm: true,
      });
      if (uErr) return json(500, { error: uErr.message });
      await admin.from("profiles").update({ must_change_password: true }).eq("id", emp.auth_user_id);
      return json(200, { ok: true, temp_password: DEFAULT_PASSWORD });
    }

    // ---------------- DEACTIVATE ----------------
    if (action === "deactivate") {
      const employee_id = String(body.employee_id || "");
      const { data: emp } = await admin
        .from("org_employees")
        .select("auth_user_id")
        .eq("id", employee_id)
        .eq("organization_id", organization_id)
        .maybeSingle();
      await admin.from("org_employees").update({ active: false }).eq("id", employee_id);
      if (emp?.auth_user_id) {
        await admin.from("organization_members")
          .update({ status: "inactive" })
          .eq("user_id", emp.auth_user_id)
          .eq("organization_id", organization_id);
      }
      return json(200, { ok: true });
    }

    // ---------------- REACTIVATE ----------------
    if (action === "reactivate") {
      const employee_id = String(body.employee_id || "");
      const { data: emp } = await admin
        .from("org_employees")
        .select("auth_user_id")
        .eq("id", employee_id)
        .eq("organization_id", organization_id)
        .maybeSingle();
      await admin.from("org_employees").update({ active: true }).eq("id", employee_id);
      if (emp?.auth_user_id) {
        await admin.from("organization_members")
          .update({ status: "active" })
          .eq("user_id", emp.auth_user_id)
          .eq("organization_id", organization_id);
      }
      return json(200, { ok: true });
    }

    return json(400, { error: "Naməlum əməliyyat" });
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});
