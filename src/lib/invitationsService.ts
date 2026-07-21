import { supabase } from "@/integrations/supabase/client";

export interface OrgInvitation {
  id: string;
  organization_id: string;
  email: string;
  invited_by: string | null;
  token: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  role_ids: string[];
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export async function createInvitation(params: {
  organizationId: string;
  email: string;
  roleIds?: string[];
}): Promise<OrgInvitation> {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("organization_invitations")
    .insert({
      organization_id: params.organizationId,
      email: params.email.trim().toLowerCase(),
      role_ids: params.roleIds ?? [],
      invited_by: user.user?.id ?? null,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as OrgInvitation;
}

export async function listInvitations(organizationId: string): Promise<OrgInvitation[]> {
  const { data, error } = await supabase
    .from("organization_invitations")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OrgInvitation[];
}

export async function revokeInvitation(id: string): Promise<void> {
  const { error } = await supabase
    .from("organization_invitations")
    .update({ status: "revoked" })
    .eq("id", id);
  if (error) throw error;
}

export function buildInvitationLink(token: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/accept-invite?token=${encodeURIComponent(token)}`;
}

export async function acceptInvitation(params: {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<{ email: string; organization_id: string }> {
  const { data, error } = await supabase.functions.invoke("accept-invitation", {
    body: {
      token: params.token,
      password: params.password,
      first_name: params.firstName ?? "",
      last_name: params.lastName ?? "",
    },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { email: string; organization_id: string };
}
