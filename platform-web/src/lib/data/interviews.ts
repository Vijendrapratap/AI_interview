"use server";

import { createClient } from "@/lib/supabase/server";
import { generateInterviewQuestions } from "@/lib/interview/engine";
import { revalidatePath } from "next/cache";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://recruitai-test.vercel.app").replace(/\/$/, "");
}

export type CreatedInterview = { token: string; link: string; invitedEmail: string | null };

export type InterviewSummary = {
  token: string;
  link: string;
  status: string;
  overallScore: number | null;
  recommendation: string | null;
  invitedEmail: string | null;
};

/** Returns the most recent interview for an application, or null. */
export async function getInterviewForApplication(applicationId: string): Promise<InterviewSummary | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interview_sessions")
    .select("public_token, status, overall_score, recommendation, invited_email, created_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.public_token) return null;
  return {
    token: data.public_token as string,
    link: `${siteUrl()}/interview/${data.public_token}`,
    status: (data.status as string) ?? "created",
    overallScore: (data.overall_score as number | null) ?? null,
    recommendation: (data.recommendation as string | null) ?? null,
    invitedEmail: (data.invited_email as string | null) ?? null,
  };
}

/**
 * Creates a candidate-link AI interview for an application:
 *  - pulls the job + the candidate's latest screening signals,
 *  - generates interview questions (reusing screening gap questions),
 *  - stores an interview_sessions row with a public token,
 *  - drafts an interview-invite email in the outbox (best effort).
 * Returns the shareable candidate link. The candidate takes it WITHOUT logging in.
 */
export async function createInterviewForApplication(applicationId: string): Promise<CreatedInterview> {
  const supabase = await createClient();

  const { data: app, error: appErr } = await supabase
    .from("applications")
    .select("id, organization_id, candidate_id, job_id")
    .eq("id", applicationId)
    .single();
  if (appErr || !app) throw new Error(appErr?.message ?? "Application not found");

  const [{ data: candidate }, { data: job }] = await Promise.all([
    supabase.from("candidates").select("full_name, email").eq("id", app.candidate_id).maybeSingle(),
    app.job_id
      ? supabase.from("jobs").select("title, description, requirements").eq("id", app.job_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Latest screening analysis for this candidate's resume (gap questions + skills).
  const { data: resume } = await supabase
    .from("resumes")
    .select("id")
    .eq("candidate_id", app.candidate_id)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  type AnalysisSignals = {
    skills_found?: string[];
    skills_missing?: string[];
    breakdown?: { screening_questions?: { question: string; target_competency?: string }[] };
  };
  let analysis: AnalysisSignals | null = null;
  if (resume) {
    const { data } = await supabase
      .from("resume_analyses")
      .select("skills_found, skills_missing, breakdown")
      .eq("resume_id", resume.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    analysis = (data as AnalysisSignals | null) ?? null;
  }

  const questions = await generateInterviewQuestions({
    jobTitle: job?.title ?? "this role",
    jobDescription: job?.description ?? "",
    requirements: (job?.requirements as string[]) ?? [],
    skillsFound: analysis?.skills_found ?? [],
    skillsMissing: analysis?.skills_missing ?? [],
    screeningQuestions: analysis?.breakdown?.screening_questions ?? [],
  });

  const token = crypto.randomUUID().replace(/-/g, "");

  const { error: insErr } = await supabase.from("interview_sessions").insert({
    organization_id: app.organization_id,
    candidate_id: app.candidate_id,
    job_id: app.job_id,
    application_id: app.id,
    status: "created",
    mode: "voice",
    questions,
    public_token: token,
    invited_email: candidate?.email ?? null,
    invited_name: candidate?.full_name ?? null,
  });
  if (insErr) throw new Error(insErr.message);

  const link = `${siteUrl()}/interview/${token}`;

  // Draft an invite email in the outbox (recruiter approves/sends later). Best effort.
  if (candidate?.email) {
    try {
      await supabase.from("email_outbox").insert({
        organization_id: app.organization_id,
        application_id: app.id,
        candidate_id: app.candidate_id,
        job_id: app.job_id,
        to_email: candidate.email,
        action_type: "interview_invite",
        trigger_stage: "interview",
        subject: `Your interview for ${job?.title ?? "the role"}`,
        body_text: `Hi ${candidate.full_name ?? "there"},\n\nYou're invited to a short AI interview. Open this private link when you're ready:\n${link}\n\nIt takes about 10 minutes and works in your browser.\n\nGood luck!`,
        body_html: `<p>Hi ${candidate.full_name ?? "there"},</p><p>You're invited to a short AI interview. Open this private link when you're ready:</p><p><a href="${link}">${link}</a></p><p>It takes about 10 minutes and works in your browser.</p>`,
        status: "draft",
        dedupe_key: `interview_invite:${app.id}:${token}`,
      });
    } catch {
      // outbox table may not exist yet (pre-008) — link still works to share manually
    }
  }

  revalidatePath(`/dashboard/candidates/${app.candidate_id}`);
  return { token, link, invitedEmail: candidate?.email ?? null };
}
