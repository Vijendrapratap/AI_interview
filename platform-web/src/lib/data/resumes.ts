"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "./organizations";
import { triggerAnalysis } from "@/lib/ai";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

/**
 * Adds a candidate, uploads their resume, creates an application, and schedules
 * the AI analysis WITHOUT blocking the response. The recruiter sees the candidate
 * immediately as "AI screening…"; the score appears live via Supabase Realtime.
 *
 * formData fields:
 *   - full_name, email, phone, current_role, current_company  (candidate fields)
 *   - job_id    (UUID of the job to apply to — required)
 *   - resume    (File — required)
 */
export async function addCandidateWithResume(formData: FormData): Promise<string> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No organization");

  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const jobId = String(formData.get("job_id") || "").trim();
  const file = formData.get("resume") as File | null;
  if (!fullName || !email || !jobId || !file) throw new Error("Missing required fields");

  // 1. Insert candidate
  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .insert({
      organization_id: orgId,
      full_name: fullName,
      email,
      phone: (formData.get("phone") as string | null) || null,
      current_role: (formData.get("current_role") as string | null) || null,
      current_company: (formData.get("current_company") as string | null) || null,
      source: "manual",
    })
    .select("id")
    .single();
  if (candidateError) throw new Error(candidateError.message);
  const candidateId = candidate.id as string;

  // 2. Upload file to Storage
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
  const storagePath = `${orgId}/${candidateId}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(storagePath, file, { contentType: file.type || "application/octet-stream" });
  if (uploadError) throw new Error(uploadError.message);

  // 3. Insert resumes row
  const { data: resume, error: resumeError } = await supabase
    .from("resumes")
    .insert({
      organization_id: orgId,
      candidate_id: candidateId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      byte_size: file.size,
    })
    .select("id")
    .single();
  if (resumeError) throw new Error(resumeError.message);
  const resumeId = resume.id as string;

  // 4. Insert applications row (pending)
  const { data: application, error: appError } = await supabase
    .from("applications")
    .insert({
      organization_id: orgId,
      candidate_id: candidateId,
      job_id: jobId,
      stage: "new",
      analysis_status: "pending",
    })
    .select("id")
    .single();
  if (appError) throw new Error(appError.message);
  const applicationId = application.id as string;

  // 5. Get the user's access token to pass to FastAPI
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? "";

  // 6. Schedule the AI analysis without blocking the response
  after(async () => {
    await triggerAnalysis({ resumeId, applicationId, jobId, accessToken });
  });

  revalidatePath("/dashboard/candidates");
  revalidatePath("/dashboard/pipeline");
  return candidateId;
}

/** Re-fires analysis for an existing pending/failed application. */
export async function rerunAnalysis(applicationId: string): Promise<void> {
  const supabase = await createClient();
  const { data: app, error: appError } = await supabase
    .from("applications")
    .select("id, job_id, candidate_id, organization_id")
    .eq("id", applicationId)
    .single();
  if (appError || !app) throw new Error(appError?.message ?? "Application not found");

  // Find the latest resume for this candidate.
  const { data: resume } = await supabase
    .from("resumes")
    .select("id")
    .eq("candidate_id", app.candidate_id)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!resume) throw new Error("No resume found for this candidate");

  await supabase
    .from("applications")
    .update({ analysis_status: "pending", analysis_error: null })
    .eq("id", applicationId);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? "";

  after(async () => {
    await triggerAnalysis({
      resumeId: resume.id as string,
      applicationId,
      jobId: app.job_id as string,
      accessToken,
    });
  });

  revalidatePath(`/dashboard/candidates/${app.candidate_id}`);
}
