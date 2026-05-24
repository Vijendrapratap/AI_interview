"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Stage } from "./application-types";
import { demoApplications, getDemoPipeline } from "./demo";

const APPLICATION_SELECT =
  "id, stage, ai_score, analysis_status, recommendation, owner_id, created_at, updated_at, candidate_id, job_id, candidates(id, full_name, email, current_role), jobs(id, title)";

type PipelineApplication = {
  id: string;
  stage: string | null;
  ai_score: number | null;
  analysis_status: string | null;
  candidate_id: string;
  job_id?: string | null;
  candidates: { id?: string; full_name?: string; email?: string; current_role?: string | null } | Array<{ id?: string; full_name?: string; email?: string; current_role?: string | null }> | null;
  jobs: { id?: string; title?: string } | Array<{ id?: string; title?: string }> | null;
  [key: string]: unknown;
};

export async function listApplications(opts?: { jobId?: string }) {
  const supabase = await createClient();
  let q = supabase.from("applications").select(APPLICATION_SELECT).order("created_at", { ascending: false });
  if (opts?.jobId) q = q.eq("job_id", opts.jobId);
  const { data } = await q;
  const fallback = opts?.jobId
    ? demoApplications.filter((app) => app.job_id === opts.jobId)
    : demoApplications;
  return data?.length ? data : fallback;
}

/** Returns applications grouped by stage in canonical order. */
export async function getPipeline(opts?: { jobId?: string }) {
  if (opts?.jobId?.startsWith("demo-")) {
    const pipeline = getDemoPipeline();
    for (const stage of Object.keys(pipeline) as Stage[]) {
      pipeline[stage] = pipeline[stage].filter((app) => app.job_id === opts.jobId);
    }
    return pipeline;
  }
  const apps = await listApplications(opts);
  const grouped: Record<Stage, PipelineApplication[]> = {
    new: [], screening: [], interview: [], offer: [], hired: [], rejected: [],
  };
  for (const app of apps) {
    const stage = (app.stage as Stage) || "new";
    grouped[stage].push(app as PipelineApplication);
  }
  return grouped;
}

export async function moveStage(applicationId: string, stage: Stage) {
  if (applicationId.startsWith("demo-")) {
    revalidatePath("/dashboard/pipeline");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard");
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", applicationId);

  if (error) {
    console.error("Failed to move application stage", { applicationId, stage, message: error.message });
    return {
      ok: false,
      message: "Could not update this candidate stage. The demo board is still safe to test with demo candidates.",
    };
  }

  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard/candidates");
  revalidatePath("/dashboard");
  return { ok: true };
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
