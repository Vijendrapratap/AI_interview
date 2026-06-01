import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { PageHeader, SectionCard, Badge, EmptyState } from "@/components";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

type PerQ = { question: string; score: number; feedback: string };
type Scores = {
  overall_score?: number;
  recommendation?: string;
  summary?: string;
  strengths?: string[];
  concerns?: string[];
  per_question?: PerQ[];
};
type Turn = { role: "ai" | "candidate"; text: string };

export default async function InterviewReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: candidate }, { data: session }] = await Promise.all([
    supabase.from("candidates").select("full_name").eq("id", id).maybeSingle(),
    supabase
      .from("interview_sessions")
      .select("id, organization_id, status, overall_score, recommendation, scores, transcript, recording_url, tab_switch_count, created_at")
      .eq("candidate_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!session) {
    return (
      <div className="p-8">
        <Link href={`/dashboard/candidates/${id}`} className="mb-6 inline-flex items-center gap-2 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft size={16} /> Back to candidate
        </Link>
        <EmptyState title="No interview yet" description="Send this candidate an AI interview from their profile." />
      </div>
    );
  }

  const scores = (session.scores ?? {}) as Scores;
  const transcript = (Array.isArray(session.transcript) ? session.transcript : []) as Turn[];

  // Signed URL for the private recording (needs service role).
  let audioUrl: string | null = null;
  if (session.recording_url && hasServiceRole()) {
    const admin = createAdminClient();
    const { data } = await admin.storage.from("interview-recordings").createSignedUrl(session.recording_url as string, 3600);
    audioUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <Link href={`/dashboard/candidates/${id}`} className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft size={16} /> Back to candidate
      </Link>
      <PageHeader
        eyebrow="Interview report"
        title={candidate?.full_name ?? "Candidate"}
        subtitle={`Status: ${session.status}`}
        actions={
          <div className="flex items-center gap-3">
            {session.overall_score != null && <Badge tone="accent">Score {Math.round(session.overall_score as number)}/100</Badge>}
            {session.recommendation && <Badge tone="neutral">{session.recommendation as string}</Badge>}
          </div>
        }
      />

      {Number(session.tab_switch_count) > 0 && (
        <div className="flex items-center gap-2 rounded-field bg-warning-soft px-4 py-2 text-sm text-warning-soft-ink">
          <ShieldAlert size={15} /> Candidate switched tabs {session.tab_switch_count as number} time(s) during the interview.
        </div>
      )}

      {scores.summary && (
        <SectionCard title="Summary">
          <p className="text-sm leading-relaxed text-ink-2">{scores.summary}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {!!scores.strengths?.length && (
              <div>
                <h4 className="mb-1 text-sm font-bold text-success-soft-ink">Strengths</h4>
                <ul className="list-disc pl-5 text-sm text-ink-2">{scores.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {!!scores.concerns?.length && (
              <div>
                <h4 className="mb-1 text-sm font-bold text-danger-soft-ink">Concerns</h4>
                <ul className="list-disc pl-5 text-sm text-ink-2">{scores.concerns.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {audioUrl && (
        <SectionCard title="Recording">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={audioUrl} className="w-full" />
        </SectionCard>
      )}

      {!!scores.per_question?.length && (
        <SectionCard title="Per-question scores">
          <div className="space-y-4">
            {scores.per_question.map((q, i) => (
              <div key={i} className="rounded-tile border border-border-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{q.question}</p>
                  <Badge tone={q.score >= 70 ? "success" : q.score >= 50 ? "warning" : "danger"}>{Math.round(q.score)}</Badge>
                </div>
                {q.feedback && <p className="mt-2 text-sm text-ink-2">{q.feedback}</p>}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Transcript">
        {transcript.length === 0 ? (
          <p className="text-sm text-ink-3">No transcript captured.</p>
        ) : (
          <div className="space-y-3">
            {transcript.map((t, i) => (
              <div key={i} className={t.role === "ai" ? "text-ink-2" : "rounded-tile bg-surface-muted p-3 text-ink"}>
                <span className="mr-2 text-[10px] uppercase tracking-wide text-ink-3">{t.role === "ai" ? "Interviewer" : "Candidate"}</span>
                {t.text}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
