import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreInterviewTranscript, type InterviewQuestion, type TranscriptTurn } from "@/lib/interview/engine";

export const maxDuration = 120;

/**
 * Candidate submits a completed interview. Public (token-gated), works with the
 * ANON key via SECURITY DEFINER RPCs (no service-role key). Saves transcript +
 * audio, scores the transcript, and fuses resume + interview into the decision.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let transcript: TranscriptTurn[] = [];
  let tabSwitchCount = 0;
  let audio: File | null = null;
  try {
    const form = await req.formData();
    transcript = JSON.parse(String(form.get("transcript") || "[]"));
    tabSwitchCount = Number(form.get("tabSwitchCount")) || 0;
    audio = form.get("audio") as File | null;
  } catch {
    try {
      const b = await req.json();
      transcript = Array.isArray(b.transcript) ? b.transcript : [];
      tabSwitchCount = Number(b.tabSwitchCount) || 0;
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
  }
  if (!Array.isArray(transcript)) transcript = [];

  const supabase = await createClient();
  const { data: session } = await supabase.rpc("get_interview", { p_token: token });
  if (!session) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  if (session.status === "completed") return NextResponse.json({ ok: true, alreadyComplete: true });

  // Upload the recording (anon upload policy; org-scoped path so recruiters can read it).
  let recordingPath: string | null = null;
  if (audio && audio.size > 0) {
    try {
      const path = `${session.organization_id}/${session.id}.webm`;
      const bytes = new Uint8Array(await audio.arrayBuffer());
      const { error: upErr } = await supabase.storage
        .from("interview-recordings")
        .upload(path, bytes, { contentType: audio.type || "audio/webm", upsert: true });
      if (!upErr) recordingPath = path;
    } catch {
      /* recording is best effort */
    }
  }

  // Save transcript + completion + recording.
  await supabase.rpc("submit_interview", {
    p_token: token,
    p_transcript: transcript,
    p_tabs: tabSwitchCount,
    p_recording: recordingPath,
  });

  try {
    const questions = (session.questions as InterviewQuestion[]) ?? [];
    const score = await scoreInterviewTranscript({
      jobTitle: session.job_title ?? "the role",
      questions,
      transcript,
    });

    const resumeScore = typeof session.resume_score === "number" ? session.resume_score : null;
    const decisionScore =
      resumeScore != null ? Math.round(0.3 * resumeScore + 0.7 * score.overall_score) : score.overall_score;
    const decision = {
      resume_score: resumeScore,
      interview_score: score.overall_score,
      decision_score: decisionScore,
      recommendation: score.recommendation,
      computed_at: new Date().toISOString(),
    };

    await supabase.rpc("save_interview_result", {
      p_token: token,
      p_scores: score,
      p_overall: score.overall_score,
      p_recommendation: score.recommendation,
      p_decision: decision,
    });

    return NextResponse.json({ ok: true, overall_score: score.overall_score, recommendation: score.recommendation });
  } catch (e) {
    // Transcript is saved; scoring can be retried later.
    return NextResponse.json({ ok: true, scored: false, note: e instanceof Error ? e.message : "scoring failed" });
  }
}
