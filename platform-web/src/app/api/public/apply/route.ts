import { NextResponse } from "next/server";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runScreening } from "@/lib/ai";

export const maxDuration = 60;

/**
 * Public job application — a candidate (not logged in) submits their resume.
 * Uses the service-role client to write past RLS, then screens the resume in the
 * background. This is the inbound "collect resumes" channel for the career page.
 */
export async function POST(req: Request) {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Applications aren't enabled yet. Please try again later." }, { status: 503 });
  }

  const form = await req.formData();
  const fullName = String(form.get("full_name") || "").trim();
  const email = String(form.get("email") || "").trim();
  const jobId = String(form.get("job_id") || "").trim();
  const file = form.get("resume") as File | null;
  if (!fullName || !email || !jobId || !file) {
    return NextResponse.json({ error: "Please provide your name, email, the job, and a resume." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Resume must be under 10 MB." }, { status: 400 });
  }

  // Job must exist and be open to the public.
  const { data: job } = await supabase
    .from("jobs")
    .select("id, organization_id, status")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.status !== "open") {
    return NextResponse.json({ error: "This job is no longer accepting applications." }, { status: 404 });
  }
  const orgId = job.organization_id as string;

  // Candidate
  const { data: candidate, error: cErr } = await supabase
    .from("candidates")
    .insert({
      organization_id: orgId,
      full_name: fullName,
      email,
      phone: String(form.get("phone") || "") || null,
      current_role: String(form.get("current_role") || "") || null,
      current_company: String(form.get("current_company") || "") || null,
      source: "careers",
    })
    .select("id")
    .single();
  if (cErr || !candidate) return NextResponse.json({ error: "Could not save your details." }, { status: 500 });
  const candidateId = candidate.id as string;

  // Resume file -> storage
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
  const storagePath = `${orgId}/${candidateId}/${Date.now()}-${safeName}`;
  const buf = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from("resumes")
    .upload(storagePath, buf, { contentType: file.type || "application/octet-stream" });
  if (upErr) return NextResponse.json({ error: "Could not upload your resume." }, { status: 500 });

  const { data: resume, error: rErr } = await supabase
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
  if (rErr || !resume) return NextResponse.json({ error: "Could not save your resume." }, { status: 500 });

  // Application (pending screening)
  const { data: application, error: aErr } = await supabase
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
  if (aErr || !application) return NextResponse.json({ error: "Could not record your application." }, { status: 500 });

  // Screen in the background so the candidate gets an instant confirmation.
  after(async () => {
    await runScreening({
      resumeId: resume.id as string,
      applicationId: application.id as string,
      jobId,
      client: supabase,
    });
  });

  return NextResponse.json({ ok: true });
}
