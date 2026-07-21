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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const { token, password, first_name, last_name } = await req.json();
    if (!token || typeof token !== "string") return json(400, { error: "token is required" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Lookup invitation
    const { data: inv, error: invErr } = await admin
      .from("organization_invitations")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (invErr) return json(500, { error: invErr.message });
    if (!inv) return json(404, { error: "Dəvətnamə tapılmadı" });
    if (inv.status !== "pending") return json(400, { error: "Dəvətnamə artıq istifadə edilib və ya ləğv olunub" });
    if (new Date(inv.expires_at).getTime() < Date.now()) {
      await admin.from("organization_invitations").update({ status: "expired" }).eq("id", inv.id);
      return json(400, { error: "Dəvətnamənin müddəti bitib" });
    }

    // Find or create auth user
    let userId: string | null = null;
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const match = existing?.users?.find((u: any) => (u.email || "").toLowerCase() === inv.email.toLowerCase());

    if (match) {
      userId = match.id;
      if (password) {
        await admin.auth.admin.updateUserById(userId, { password });
      }
    } else {
      if (!password) return json(400, { error: "Şifrə tələb olunur" });
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: inv.email,
        password,
        email_confirm: true,
        user_metadata: { first_name: first_name || "", last_name: last_name || "" },
      });
      if (createErr || !created?.user) return json(500, { error: createErr?.message || "İstifadəçi yaradıla bilmədi" });
      userId = created.user.id;
    }

    // Ensure profile row exists / update names
    await admin.from("profiles").upsert({
      id: userId!,
      email: inv.email,
      first_name: first_name || "",
      last_name: last_name || "",
    }, { onConflict: "id" });

    // Create/activate membership
    const { data: existingMember } = await admin
      .from("organization_members")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", inv.organization_id)
      .maybeSingle();

    let memberId = existingMember?.id;
    if (!memberId) {
      const { data: newMember, error: memberErr } = await admin
        .from("organization_members")
        .insert({
          user_id: userId,
          organization_id: inv.organization_id,
          status: "active",
        })
        .select("id")
        .single();
      if (memberErr) return json(500, { error: memberErr.message });
      memberId = newMember.id;
    } else {
      await admin.from("organization_members").update({ status: "active" }).eq("id", memberId);
    }

    // Assign roles
    if (Array.isArray(inv.role_ids) && inv.role_ids.length > 0 && memberId) {
      const rows = inv.role_ids.map((role_id: string) => ({
        organization_member_id: memberId,
        role_id,
        is_active: true,
      }));
      await admin.from("user_roles").upsert(rows, { onConflict: "organization_member_id,role_id" });
    }

    // Mark invitation accepted
    await admin
      .from("organization_invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", inv.id);

    return json(200, { ok: true, email: inv.email, organization_id: inv.organization_id });
  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
});
