import "server-only";

import { createClient } from "@/lib/supabase/server";
import { extractResumeText } from "@/lib/resume/parse";
import { chatJSON, type ChatMessage } from "@/lib/llm/openrouter";

/**
 * Self-contained AI resume screening — runs entirely on Vercel (Next.js) +
 * Supabase + OpenRouter, with NO separately-hosted backend (the old FastAPI
 * call via NEXT_PUBLIC_API_URL was unreachable in prod, so screening silently
 * stayed "pending" — that was B4).
 *
 * Writes a resume_analyses row and updates the application's ai_score,
 * recommendation, and analysis_status. Any failure is captured on the
 * application (analysis_status='failed' + analysis_error) — it never throws to
 * the caller, so the dashboard never 500s on screening.
 */

type ScreeningResult = {
  overall_score: number;
  ats_score: number;
  recommendation: "advance" | "review" | "reject";
  summary: string;
  scores: Record<string, number>;
  skills_found: string[];
  skills_missing: string[];
  red_flags: string[];
  screening_questions: { question: string; target_competency: string; why_it_matters: string }[];
};

function clamp(n: unknown, def = 0): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return def;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) =>
      typeof x === "string"
        ? x
        : String((x as { skill?: string; name?: string })?.skill ?? (x as { name?: string })?.name ?? x ?? "")
    )
    .filter(Boolean)
    .slice(0, 40);
}

function buildPrompt(
  resumeText: string,
  job: { title?: string; description?: string; requirements?: string[] } | null
): ChatMessage[] {
  const jd = job
    ? `JOB TITLE: ${job.title ?? ""}\nREQUIREMENTS: ${(job.requirements ?? []).join(", ")}\nDESCRIPTION:\n${(job.description ?? "").slice(0, 4000)}`
    : "No specific job description provided — assess general quality and ATS-friendliness.";

  return [
    {
      role: "system",
      content:
        "You are a meticulous, fair technical recruiter. Score a candidate's resume against a job. " +
        "Be evidence-based and avoid bias: judge only job-relevant criteria, never names, schools-as-prestige, age, or origin. " +
        "Return ONLY valid JSON matching the requested schema. Every score is an integer 0-100.",
    },
    {
      role: "user",
      content:
        `${jd}\n\n=== RESUME ===\n${resumeText}\n\n` +
        "Return JSON with EXACTLY these keys:\n" +
        "{\n" +
        '  "overall_score": int 0-100 (overall fit for THIS job),\n' +
        '  "ats_score": int 0-100 (resume parse-ability / ATS-friendliness),\n' +
        '  "recommendation": "advance" | "review" | "reject",\n' +
        '  "summary": "2-4 sentence rationale a recruiter can read",\n' +
        '  "scores": { "skills": int, "experience": int, "education": int, "relevance": int },\n' +
        '  "skills_found": ["JD skills clearly evidenced in the resume"],\n' +
        '  "skills_missing": ["required JD skills NOT evidenced"],\n' +
        '  "red_flags": ["short concrete concerns; [] if none"],\n' +
        '  "screening_questions": [{"question":"...","target_competency":"...","why_it_matters":"..."}]\n' +
        "}",
    },
  ];
}

export async function runScreening(params: {
  resumeId: string;
  applicationId: string;
  jobId: string | null;
}): Promise<void> {
  const { resumeId, applicationId, jobId } = params;
  const supabase = await createClient();

  await supabase
    .from("applications")
    .update({ analysis_status: "processing", analysis_error: null })
    .eq("id", applicationId);

  try {
    const { data: resume, error: rErr } = await supabase
      .from("resumes")
      .select("id, organization_id, storage_path, file_name, mime_type")
      .eq("id", resumeId)
      .single();
    if (rErr || !resume) throw new Error(rErr?.message ?? "Resume not found");

    const { data: file, error: dErr } = await supabase.storage.from("resumes").download(resume.storage_path);
    if (dErr || !file) throw new Error(`Could not download resume: ${dErr?.message ?? "unknown"}`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = await extractResumeText(bytes, resume.mime_type ?? "", resume.file_name ?? "");
    if (!text || text.trim().length < 30) throw new Error("Could not extract readable text from resume");

    let job: { title?: string; description?: string; requirements?: string[] } | null = null;
    if (jobId) {
      const { data: j } = await supabase
        .from("jobs")
        .select("title, description, requirements")
        .eq("id", jobId)
        .maybeSingle();
      job = j ?? null;
    }

    const raw = await chatJSON<Partial<ScreeningResult>>(buildPrompt(text, job), { maxTokens: 2200 });
    const rawScores = (raw.scores ?? {}) as Record<string, number>;

    const result: ScreeningResult = {
      overall_score: clamp(raw.overall_score),
      ats_score: clamp(raw.ats_score, 60),
      recommendation: (["advance", "review", "reject"].includes(String(raw.recommendation))
        ? raw.recommendation
        : "review") as ScreeningResult["recommendation"],
      summary: typeof raw.summary === "string" ? raw.summary : "",
      scores: {
        skills: clamp(rawScores.skills),
        experience: clamp(rawScores.experience),
        education: clamp(rawScores.education),
        relevance: clamp(rawScores.relevance),
      },
      skills_found: asStringArray(raw.skills_found),
      skills_missing: asStringArray(raw.skills_missing),
      red_flags: asStringArray(raw.red_flags),
      screening_questions: Array.isArray(raw.screening_questions)
        ? raw.screening_questions
            .map((q) => ({
              question: String((q as { question?: string })?.question ?? ""),
              target_competency: String((q as { target_competency?: string })?.target_competency ?? ""),
              why_it_matters: String((q as { why_it_matters?: string })?.why_it_matters ?? ""),
            }))
            .filter((q) => q.question)
            .slice(0, 6)
        : [],
    };

    const { error: insErr } = await supabase.from("resume_analyses").insert({
      organization_id: resume.organization_id,
      resume_id: resumeId,
      job_id: jobId,
      overall_score: result.overall_score,
      ats_score: result.ats_score,
      breakdown: {
        scores: result.scores,
        summary: result.summary,
        recommendation: result.recommendation,
        screening_questions: result.screening_questions,
      },
      red_flags: result.red_flags,
      skills_found: result.skills_found,
      skills_missing: result.skills_missing,
    });
    if (insErr) throw new Error(insErr.message);

    await supabase
      .from("applications")
      .update({
        ai_score: result.overall_score,
        recommendation: result.recommendation,
        analysis_status: "complete",
        analysis_error: null,
      })
      .eq("id", applicationId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("applications")
      .update({ analysis_status: "failed", analysis_error: msg.slice(0, 500) })
      .eq("id", applicationId);
  }
}

/** Back-compat alias used by the upload/re-run flows. */
export async function triggerAnalysis(params: {
  resumeId: string;
  applicationId: string;
  jobId: string | null;
  accessToken?: string;
}): Promise<void> {
  await runScreening({ resumeId: params.resumeId, applicationId: params.applicationId, jobId: params.jobId });
}
