"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type OrgRole = "owner" | "admin" | "recruiter" | "hiring_manager" | "interviewer";

/** The current user's organization id, or null if they have none. */
export async function getCurrentOrgId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  return data?.organization_id ?? null;
}

export async function getCurrentOrg() {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return null;
  const { data } = await supabase.from("organizations").select("*").eq("id", orgId).single();
  return data;
}

export async function listMembers() {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return [];
  const { data } = await supabase
    .from("organization_members")
    .select("user_id, role, created_at")
    .eq("organization_id", orgId);
  return data ?? [];
}

/** Creates an org for the signed-in user (called right after signup). */
export async function provisionOrganization(orgName: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("provision_organization", { org_name: orgName });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function inviteMember(email: string, role: OrgRole) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No organization");
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("invitations")
    .insert({ organization_id: orgId, email, role, token, expires_at: expires });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
  return token;
}

export async function acceptInvitation(token: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", { invite_token: token });
  if (error) throw new Error(error.message);
  return data as string;
}
