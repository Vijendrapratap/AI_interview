"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "./organizations";
import { revalidatePath } from "next/cache";

export async function listCandidates() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidates")
    .select("*, applications(id, stage, ai_score, analysis_status, job_id, jobs(title))")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getCandidate(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidates")
    .select("*, applications(id, stage, ai_score, analysis_status, job_id, jobs(title))")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

export async function getLatestResume(candidateId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resumes")
    .select("id, file_name, uploaded_at")
    .eq("candidate_id", candidateId)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function getLatestAnalysis(resumeId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resume_analyses")
    .select("*")
    .eq("resume_id", resumeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function createCandidate(input: {
  full_name: string;
  email: string;
  phone?: string | null;
  current_role?: string | null;
  current_company?: string | null;
  source?: string;
}) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No organization");
  const { data, error } = await supabase
    .from("candidates")
    .insert({ ...input, organization_id: orgId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/candidates");
  return data.id as string;
}
