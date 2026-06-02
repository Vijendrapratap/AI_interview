"use server";

import { createClient } from "@/lib/supabase/server";
import { getCachedUser, getCachedOrgId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type OrgRole = "owner" | "admin" | "recruiter" | "hiring_manager" | "interviewer";

/** The current user's organization id, or null. Deduped per request (see lib/auth). */
export async function getCurrentOrgId(): Promise<string | null> {
  return getCachedOrgId();
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

/**
 * Idempotently guarantees the signed-in user has an organization, returning its id.
 * Safe to call on every authenticated entry: returns the existing org if there is
 * one, otherwise provisions a new one. This is the app-layer recovery that fixes
 * B1/B2 even before the 007 auth.users trigger is applied — it runs only once a
 * real session exists, so it never hits the "no session at signup" timing bug.
 */
export async function ensureOrganization(orgName?: string): Promise<string | null> {
  const existing = await getCurrentOrgId();
  if (existing) return existing;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null; // not signed in — caller should redirect to /login

  const fallbackName =
    orgName?.trim() ||
    (user.user_metadata?.org_name as string | undefined)?.trim() ||
    ((user.user_metadata?.full_name as string | undefined)?.trim()
      ? `${(user.user_metadata!.full_name as string).trim()}'s workspace`
      : undefined) ||
    (user.email ? `${user.email.split("@")[0]}'s workspace` : "My workspace");

  return provisionOrganization(fallbackName);
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

// ── Roles & membership (Phase 2: 3-layer org model) ──────────────────────────

export type OrgMember = { user_id: string; role: OrgRole; email: string | null; full_name: string | null; created_at: string };
export type Invitation = { id: string; email: string; role: OrgRole; expires_at: string; accepted_at: string | null };

/** True if the current user is a Pratap-AI platform owner (Layer 3 super-admin). */
export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_platform_admin");
  return data === true;
}

/** The current user's role in their organization (Layer 1/2), or null. */
export async function getMyRole(): Promise<OrgRole | null> {
  const user = await getCachedUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  return (data?.role as OrgRole | undefined) ?? null;
}

/** Members of the current org, with email/name (via security-definer RPC). */
export async function listOrgMembers(): Promise<OrgMember[]> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return [];
  const { data } = await supabase.rpc("org_members", { p_org: orgId });
  return (data as OrgMember[] | null) ?? [];
}

/** Pending (unaccepted) invitations for the current org. */
export async function listInvitations(): Promise<Invitation[]> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return [];
  const { data } = await supabase
    .from("invitations")
    .select("id, email, role, expires_at, accepted_at")
    .eq("organization_id", orgId)
    .is("accepted_at", null)
    .order("expires_at", { ascending: false });
  return (data as Invitation[] | null) ?? [];
}

export async function setMemberRole(userId: string, role: OrgRole): Promise<void> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No organization");
  const { error } = await supabase.rpc("set_member_role", { p_org: orgId, p_user: userId, p_role: role });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/team");
}

export async function removeMember(userId: string): Promise<void> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No organization");
  const { error } = await supabase.rpc("remove_member", { p_org: orgId, p_user: userId });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/team");
}

export type RecruiterStat = { user_id: string; jobs: number; applications: number; hires: number; interviews: number };

/** Per-recruiter performance for the company-admin rollup (owner/admin only). */
export async function listRecruiterStats(): Promise<RecruiterStat[]> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return [];
  const { data } = await supabase.rpc("org_recruiter_stats", { p_org: orgId });
  const rows = (data as Array<Record<string, number | string>> | null) ?? [];
  return rows.map((r) => ({
    user_id: String(r.user_id),
    jobs: Number(r.jobs),
    applications: Number(r.applications),
    hires: Number(r.hires),
    interviews: Number(r.interviews),
  }));
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No organization");
  await supabase.from("invitations").delete().eq("id", invitationId).eq("organization_id", orgId);
  revalidatePath("/dashboard/team");
}
