import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const slugify = (s: string) =>
  s.toLowerCase()
    .replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "org";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    // Verify caller is platform super admin
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });
    const callerId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: prof } = await admin.from("profiles").select("is_platform_super_admin").eq("id", callerId).maybeSingle();
    if (!prof?.is_platform_super_admin) return json(403, { error: "Yalnız Platform Super Admin bu əməliyyatı yerinə yetirə bilər" });

    const body = await req.json();
    const action = body?.action as string;

    // ---------------- CREATE ----------------
    if (action === "create") {
      const name = String(body.name || "").trim();
      const logo = String(body.logo || "");
      const adminName = String(body.admin_name || "").trim();
      let email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "").trim();

      if (!name) return json(400, { error: "Şirkət adı tələb olunur" });
      if (!adminName) return json(400, { error: "Admin adı tələb olunur" });
      if (!email) return json(400, { error: "E-poçt tələb olunur" });
      if (password.length < 8) return json(400, { error: "Şifrə ən az 8 simvol olmalıdır" });

      // Unique slug
      let base = slugify(name);
      let slug = base;
      let i = 2;
      while (true) {
        const { data: exists } = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
        if (!exists) break;
        slug = `${base}-${i++}`;
      }

      // Create organization
      const settings: Record<string, unknown> = {};
      if (logo) settings.logo = logo;
      const { data: org, error: orgErr } = await admin
        .from("organizations")
        .insert({ name, slug, status: "active", settings })
        .select("id")
        .single();
      if (orgErr || !org) return json(500, { error: orgErr?.message || "Şirkət yaradıla bilmədi" });

      // Create or reuse auth user
      const { data: existingList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = existingList?.users?.find((u: any) => (u.email || "").toLowerCase() === email);
      let userId: string;
      const [first_name, ...rest] = adminName.split(" ");
      const last_name = rest.join(" ");
      if (existing) {
        userId = existing.id;
        await admin.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
          user_metadata: { first_name: first_name || "", last_name: last_name || "" },
        });
      } else {
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { first_name: first_name || "", last_name: last_name || "" },
        });
        if (cErr || !created?.user) {
          // rollback org
          await admin.from("organizations").delete().eq("id", org.id);
          return json(500, { error: cErr?.message || "İstifadəçi yaradıla bilmədi" });
        }
        userId = created.user.id;
      }

      // Upsert profile — mark that first login must change temporary password
      await admin.from("profiles").upsert({
        id: userId,
        email,
        first_name: first_name || "",
        last_name: last_name || "",
        must_change_password: true,
      }, { onConflict: "id" });

      // Create HR/Admin org role by copying template permissions
      const { data: tpl } = await admin.from("roles").select("id").eq("code", "hr_admin_template").maybeSingle();
      const { data: role, error: rErr } = await admin
        .from("roles")
        .insert({
          organization_id: org.id,
          name: "HR / Admin",
          code: "hr_admin",
          is_system_role: true,
          is_active: true,
        })
        .select("id")
        .single();
      if (rErr || !role) return json(500, { error: rErr?.message || "Rol yaradıla bilmədi" });

      if (tpl?.id) {
        const { data: perms } = await admin.from("role_permissions").select("permission_id").eq("role_id", tpl.id);
        if (perms?.length) {
          await admin.from("role_permissions").insert(
            perms.map((p: any) => ({ role_id: role.id, permission_id: p.permission_id }))
          );
        }
      }

      // Add member + user_role
      const { data: member, error: mErr } = await admin
        .from("organization_members")
        .insert({ user_id: userId, organization_id: org.id, status: "active" })
        .select("id")
        .single();
      if (mErr || !member) return json(500, { error: mErr?.message || "Üzvlük yaradıla bilmədi" });

      await admin.from("user_roles").insert({
        organization_member_id: member.id,
        role_id: role.id,
        is_active: true,
      });

      return json(200, { ok: true, organization_id: org.id, user_id: userId, email });
    }

    // ---------------- RESET PASSWORD ----------------
    if (action === "reset_password") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "").trim();
      if (!email) return json(400, { error: "E-poçt tələb olunur" });
      if (password.length < 8) return json(400, { error: "Şifrə ən az 8 simvol olmalıdır" });

      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const u = list?.users?.find((x: any) => (x.email || "").toLowerCase() === email);
      if (!u) return json(404, { error: "İstifadəçi tapılmadı" });
      const { error: uErr } = await admin.auth.admin.updateUserById(u.id, { password, email_confirm: true });
      if (uErr) return json(500, { error: uErr.message });
      await admin.from("profiles").update({ must_change_password: true }).eq("id", u.id);
      return json(200, { ok: true });
    }

    // ---------------- DELETE ----------------
    if (action === "delete") {
      const organization_id = String(body.organization_id || "");
      if (!organization_id) return json(400, { error: "organization_id tələb olunur" });

      // Collect admin user ids (members)
      const { data: members } = await admin
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organization_id);

      await admin.from("organizations").delete().eq("id", organization_id);

      // Delete auth users that are not members of any other org and are not super admins
      for (const m of members || []) {
        const uid = (m as any).user_id;
        const { data: p } = await admin.from("profiles").select("is_platform_super_admin").eq("id", uid).maybeSingle();
        if (p?.is_platform_super_admin) continue;
        const { data: other } = await admin.from("organization_members").select("id").eq("user_id", uid).limit(1);
        if (!other || other.length === 0) {
          await admin.auth.admin.deleteUser(uid).catch(() => {});
        }
      }

      return json(200, { ok: true });
    }

    // ---------------- LIST ----------------
    if (action === "list") {
      const { data: orgs, error: oErr } = await admin
        .from("organizations")
        .select("id, name, slug, settings, created_at")
        .order("created_at", { ascending: false });
      if (oErr) return json(500, { error: oErr.message });

      const results: any[] = [];
      for (const o of orgs || []) {
        // Find first HR admin member
        const { data: role } = await admin
          .from("roles")
          .select("id")
          .eq("organization_id", o.id)
          .eq("code", "hr_admin")
          .maybeSingle();
        let adminEmail = "";
        let adminName = "";
        if (role?.id) {
          const { data: ur } = await admin
            .from("user_roles")
            .select("organization_member_id")
            .eq("role_id", role.id)
            .limit(1)
            .maybeSingle();
          if (ur?.organization_member_id) {
            const { data: mem } = await admin
              .from("organization_members")
              .select("user_id")
              .eq("id", ur.organization_member_id)
              .maybeSingle();
            if (mem?.user_id) {
              const { data: pr } = await admin
                .from("profiles")
                .select("email, first_name, last_name")
                .eq("id", mem.user_id)
                .maybeSingle();
              adminEmail = pr?.email || "";
              adminName = `${pr?.first_name || ""} ${pr?.last_name || ""}`.trim();
            }
          }
        }
        results.push({
          id: o.id,
          name: o.name,
          slug: o.slug,
          logo: (o.settings as any)?.logo || "",
          admin: { name: adminName, email: adminEmail },
          created_at: o.created_at,
        });
      }
      return json(200, { ok: true, companies: results });
    }

    return json(400, { error: "Naməlum əməliyyat" });
  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
});
