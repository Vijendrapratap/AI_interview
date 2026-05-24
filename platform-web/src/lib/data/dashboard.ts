"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "./organizations";
import { getDemoDashboardData } from "./demo";

export type DashboardData = {
  needsReview: number;
  slaRisks: number;
  interviewsPending: number;
  offersPending: number;
  priorityQueue: Array<{
    id: string;
    candidate_id: string;
    candidate_name: string;
    job_title: string | null;
    ai_score: number | null;
    stage: string;
    analysis_status: string;
  }>;
  activeJobs: Array<{ id: string; title: string; status: string; applicants: number; created_at: string }>;
  totals: { jobs: number; candidates: number };
};

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) {
    return getDemoDashboardData();
  }

  const [needsReview, slaRisks, interviewsPending, offersPending, jobsTotal, candidatesTotal] = await Promise.all([
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("stage", "new"),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("analysis_status", "failed"),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("stage", "interview"),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("stage", "offer"),
    supabase.from("jobs").select("*", { count: "exact", head: true }),
    supabase.from("candidates").select("*", { count: "exact", head: true }),
  ]);

  const priorityQueueRes = await supabase
    .from("applications")
    .select("id, ai_score, stage, analysis_status, candidate_id, candidates(full_name), jobs(title)")
    .neq("stage", "rejected")
    .neq("stage", "hired")
    .order("ai_score", { ascending: false, nullsFirst: false })
    .limit(5);

  const activeJobsRes = await supabase
    .from("jobs")
    .select("id, title, status, created_at, applications(count)")
    .order("created_at", { ascending: false })
    .limit(5);

  const dashboard = {
    needsReview: needsReview.count ?? 0,
    slaRisks: slaRisks.count ?? 0,
    interviewsPending: interviewsPending.count ?? 0,
    offersPending: offersPending.count ?? 0,
    priorityQueue: (priorityQueueRes.data ?? []).map((row) => {
      const candidates = row.candidates as { full_name: string } | { full_name: string }[] | null;
      const jobs = row.jobs as { title: string } | { title: string }[] | null;
      const candidate = Array.isArray(candidates) ? candidates[0] : candidates;
      const job = Array.isArray(jobs) ? jobs[0] : jobs;
      return {
        id: row.id,
        candidate_id: row.candidate_id,
        candidate_name: candidate?.full_name ?? "—",
        job_title: job?.title ?? null,
        ai_score: row.ai_score,
        stage: row.stage,
        analysis_status: row.analysis_status,
      };
    }),
    activeJobs: (activeJobsRes.data ?? []).map((row) => {
      const applications = row.applications as Array<{ count: number }> | null;
      return {
        id: row.id,
        title: row.title,
        status: row.status,
        applicants: applications?.[0]?.count ?? 0,
        created_at: row.created_at,
      };
    }),
    totals: { jobs: jobsTotal.count ?? 0, candidates: candidatesTotal.count ?? 0 },
  };

  if (dashboard.totals.jobs === 0 && dashboard.totals.candidates === 0) {
    return getDemoDashboardData();
  }

  return dashboard;
}
