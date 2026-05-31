import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreInterviewTranscript, type InterviewQuestion, type TranscriptTurn } from "@/lib/interview/engine";

export const maxDuration = 120;

/**
 * Candidate submits a completed interview. Public (token-gated) — uses the
 * service-role client because candidates aren't authenticated. Saves the
 * transcript, scores it via OpenRouter, writes interview_reports, and fuses the
 * interview score with the resume score into the application's decision.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let body: { transcript?: TranscriptTurn[]; tabSwitchCount?: number; durationSeconds?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const transcript = Array.isArray(body.transcript) ? body.transcript : [];

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Server not configured for candidate submissions." }, { status: 503 });
  }

  const { data: session, error } = await supabase
    .from("interview_sessions")
    .select("id, organization_id, application_id, candidate_id, job_id, questions, status, is_analysed")
    .eq("public_token", token)
    .maybeSingle();
  if (error || !session) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  if (session.status === "completed" && session.is_analysed) {
    return NextResponse.json({ ok: true, alreadyComplete: true });
  }

  // Persist the transcript + completion first, so nothing is lost even if scoring fails.
  await supabase
    .from("interview_sessions")
    .update({
      transcript,
      status: "completed",
      ended_at: new Date().toISOString(),
      tab_switch_count: Number(body.tabSwitchCount) || 0,
    })
    .eq("id", session.id);

  const questions = (session.questions as InterviewQuestion[]) ?? [];
  let jobTitle = "the role";
  if (session.job_id) {
    const { data: job } = await supabase.from("jobs").select("title").eq("id", session.job_id).maybeSingle();
    if (job?.title) jobTitle = job.title;
  }

  try {
    const score = await scoreInterviewTranscript({ jobTitle, questions, transcript });

    await supabase
      .from("interview_sessions")
      .update({
        scores: score,
        overall_score: score.overall_score,
        recommendation: score.recommendation,
        is_analysed: true,
      })
      .eq("id", session.id);

    await supabase.from("interview_reports").upsert(
      {
        session_id: session.id,
        summary: score.summary,
        scorecard: score,
        recommendation: score.recommendation,
      },
      { onConflict: "session_id" }
    );

    // Decision fusion: 0.30 resume + 0.70 interview (interview is higher-signal).
    if (session.application_id) {
      const { data: app } = await supabase
        .from("applications")
        .select("id, ai_score")
        .eq("id", session.application_id)
        .maybeSingle();
      const resumeScore = typeof app?.ai_score === "number" ? app.ai_score : null;
      const decisionScore =
        resumeScore != null
          ? Math.round(0.3 * resumeScore + 0.7 * score.overall_score)
          : score.overall_score;
      await supabase
        .from("applications")
        .update({
          decision: {
            resume_score: resumeScore,
            interview_score: score.overall_score,
            decision_score: decisionScore,
            recommendation: score.recommendation,
            computed_at: new Date().toISOString(),
          },
        })
        .eq("id", session.application_id);
    }

    return NextResponse.json({ ok: true, overall_score: score.overall_score, recommendation: score.recommendation });
  } catch (e) {
    // Transcript is saved; scoring can be retried by the recruiter later.
    return NextResponse.json({
      ok: true,
      scored: false,
      note: e instanceof Error ? e.message : "scoring failed",
    });
  }
}
