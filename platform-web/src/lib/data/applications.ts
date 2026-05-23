"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Stage } from "./application-types";

const APPLICATION_SELECT =
  "id, stage, ai_score, analysis_status, recommendation, owner_id, created_at, updated_at, candidate_id, job_id, candidates(id, full_name, email, current_role), jobs(id, title)";

export async function listApplications(opts?: { jobId?: string }) {
  const supabase = await createClient();
  let q = supabase.from("applications").select(APPLICATION_SELECT).order("created_at", { ascending: false });
  if (opts?.jobId) q = q.eq("job_id", opts.jobId);
  const { data } = await q;
  return data ?? [];
}

/** Returns applications grouped by stage in canonical order. */
export async function getPipeline(opts?: { jobId?: string }) {
  const apps = await listApplications(opts);
  const grouped: Record<Stage, typeof apps> = {
    new: [], screening: [], interview: [], offer: [], hired: [], rejected: [],
  };
  for (const app of apps) {
    const stage = (app.stage as Stage) || "new";
    grouped[stage].push(app);
  }
  return grouped;
}

export async function moveStage(applicationId: string, stage: Stage) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", applicationId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard/candidates");
  revalidatePath("/dashboard");
}

export async function assignOwner(applicationId: string, userId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ owner_id: userId })
    .eq("id", applicationId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard/candidates");
}
