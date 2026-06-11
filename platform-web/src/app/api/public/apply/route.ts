import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runScreening } from "@/lib/ai";
import { extractResumeText } from "@/lib/resume/parse";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const maxDuration = 60;

// Resume uploads: PDF, Word, or plain text only.
const ALLOWED_EXT = /\.(pdf|docx?|txt)$/i;
const ALLOWED_MIME = /(pdf|msword|wordprocessingml|text\/plain|octet-stream)/i;

/**
 * Public job application — a candidate (not logged in) submits their resume.
 * Works with the ANON key via SECURITY DEFINER RPCs + scoped storage policies
 * (no service-role key needed). Screens the resume in the background from the
 * in-memory bytes (no storage round-trip).
 */
export async function POST(req: Request) {
  if (!rateLimit(`apply:${clientIp(req)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many applications from this network. Please try again in a minute." }, { status: 429 });
  }
  const supabase = await createClient();

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
  if (!ALLOWED_EXT.test(file.name) || (file.type && !ALLOWED_MIME.test(file.type))) {
    return NextResponse.json({ error: "Please upload your resume as a PDF, Word document, or plain text file." }, { status: 400 });
  }

  // Job must be open + public (anon can read it via the published RLS policy).
  const { data: job } = await supabase.from("jobs").select("organization_id, status").eq("id", jobId).maybeSingle();
  if (!job || job.status !== "open") {
    return NextResponse.json({ error: "This job is no longer accepting applications." }, { status: 404 });
  }
  const orgId = job.organization_id as string;

  // Upload resume (anon upload policy). Path is org-scoped so recruiters can read it.
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
  const storagePath = `${orgId}/careers/${crypto.randomUUID()}-${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from("resumes")
    .upload(storagePath, bytes, { contentType: file.type || "application/octet-stream" });
  if (upErr) return NextResponse.json({ error: "Could not upload your resume." }, { status: 500 });

  // Create candidate + resume + application via the definer RPC.
  const { data: ids, error: applyErr } = await supabase.rpc("public_apply", {
    p_job: jobId,
    p_name: fullName,
    p_email: email,
    p_phone: String(form.get("phone") || ""),
    p_role: String(form.get("current_role") || ""),
    p_company: String(form.get("current_company") || ""),
    p_storage_path: storagePath,
    p_file: file.name,
    p_mime: file.type || "application/octet-stream",
    p_size: file.size,
  });
  if (applyErr || !ids) {
    return NextResponse.json({ error: "Could not record your application." }, { status: 500 });
  }
  if ((ids as { duplicate?: boolean }).duplicate) {
    return NextResponse.json(
      { error: "You've already applied to this job recently. The team has your application — no need to resubmit." },
      { status: 409 }
    );
  }
  const { application_id, resume_id } = ids as { application_id: string; resume_id: string };

  // Extract text now (we have the bytes) and screen in the background.
  const text = await extractResumeText(bytes, file.type || "", file.name);
  after(async () => {
    await runScreening({ resumeId: resume_id, applicationId: application_id, jobId, client: supabase, text, orgId });
  });

  return NextResponse.json({ ok: true });
}
