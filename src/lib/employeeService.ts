// Thin wrapper around the `manage-employees` edge function. All HR-driven
// employee provisioning (login creation, password reset, activate/deactivate)
// goes through here so the operation runs with the service role and creates
// real auth.users rows.

import { supabase } from "@/integrations/supabase/client";

interface ProvisionArgs {
  organizationId: string;
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface ProvisionResult {
  ok: boolean;
  already?: boolean;
  userId?: string;
  tempPassword?: string;
  error?: string;
}

const call = async (body: Record<string, unknown>): Promise<any> => {
  const { data, error } = await supabase.functions.invoke("manage-employees", { body });
  if (error) return { ok: false, error: error.message };
  return data;
};

export const provisionEmployeeLogin = async (a: ProvisionArgs): Promise<ProvisionResult> => {
  const res = await call({
    action: "provision_login",
    organization_id: a.organizationId,
    employee_id: a.employeeId,
    email: a.email,
    first_name: a.firstName,
    last_name: a.lastName,
  });
  return {
    ok: !!res?.ok,
    already: !!res?.already,
    userId: res?.user_id,
    tempPassword: res?.temp_password,
    error: res?.error,
  };
};

export const resetEmployeePassword = async (organizationId: string, employeeId: string): Promise<ProvisionResult> => {
  const res = await call({
    action: "reset_password",
    organization_id: organizationId,
    employee_id: employeeId,
  });
  return { ok: !!res?.ok, tempPassword: res?.temp_password, error: res?.error };
};

export const deactivateEmployee = async (organizationId: string, employeeId: string) => {
  return await call({ action: "deactivate", organization_id: organizationId, employee_id: employeeId });
};

export const reactivateEmployee = async (organizationId: string, employeeId: string) => {
  return await call({ action: "reactivate", organization_id: organizationId, employee_id: employeeId });
};

// Provision all employees in the current org that have an email but no
// auth_user_id yet. Called after each org flush so newly-added HR employees
// immediately become real login users with the default temporary password.
export const provisionPendingEmployees = async (organizationId: string): Promise<number> => {
  const { data } = await supabase
    .from("org_employees")
    .select("id, email, first_name, last_name, auth_user_id, active")
    .eq("organization_id", organizationId)
    .is("auth_user_id", null)
    .not("email", "is", null);
  const pending = (data ?? []).filter((r: any) => r.email && r.active !== false);
  let provisioned = 0;
  for (const r of pending) {
    const res = await provisionEmployeeLogin({
      organizationId,
      employeeId: r.id,
      email: r.email,
      firstName: r.first_name ?? "",
      lastName: r.last_name ?? "",
    });
    if (res.ok) provisioned++;
  }
  return provisioned;
};
