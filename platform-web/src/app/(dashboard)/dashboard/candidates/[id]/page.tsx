import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertTriangle, FileText, Shield, Send, Zap, RefreshCw } from "lucide-react";
import {
  PageHeader,
  Avatar,
  Badge,
  Button,
  SectionCard,
  Card,
  EmptyState,
} from "@/components";
import { AnalysisStatus } from "@/components/AnalysisStatus";
import { getCandidate, getLatestResume, getLatestAnalysis } from "@/lib/data/candidates";
import { rerunAnalysis } from "@/lib/data/resumes";
import { createInterviewForApplication, getInterviewForApplication } from "@/lib/data/interviews";
import { revalidatePath } from "next/cache";

// Thin FormData wrapper so the Re-run form can call the string-based server action.
// Wrapped so a failure (e.g. no resume) marks the row failed instead of 500ing (B4).
async function rerunAnalysisAction(formData: FormData) {
  "use server";
  const applicationId = String(formData.get("applicationId") ?? "");
  if (!applicationId) return;
  try {
    await rerunAnalysis(applicationId);
  } catch (e) {
    console.error("[rerunAnalysis] failed", e);
  }
}

// Creates a candidate-link interview and drafts the invite email (B5: the
// interview goes to the CANDIDATE, it does not open at the recruiter).
async function sendInterviewAction(formData: FormData) {
  "use server";
  const applicationId = String(formData.get("applicationId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");
  if (!applicationId) return;
  try {
    await createInterviewForApplication(applicationId);
    if (candidateId) revalidatePath(`/dashboard/candidates/${candidateId}`);
  } catch (e) {
    console.error("[createInterview] failed", e);
  }
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const candidate = await getCandidate(id);
  if (!candidate) {
    return (
      <div className="p-8">
        <EmptyState
          title="Candidate not found"
          description="This candidate may have been removed or the link is incorrect."
        />
      </div>
    );
  }

  const firstApp = (candidate.applications as Array<{
    id: string;
    stage: string | null;
    ai_score: number | null;
    analysis_status: string | null;
    job_id: string | null;
    jobs: { title: string } | null;
  }> | undefined)?.[0] ?? null;

  // Fetch latest resume + its analysis in parallel
  const latestResume = await getLatestResume(id);
  const analysis = latestResume ? await getLatestAnalysis(latestResume.id) : null;
  const interview = firstApp ? await getInterviewForApplication(firstApp.id).catch(() => null) : null;

  const initials = (candidate.full_name as string)
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const scoreTone = (n: number): "success" | "warning" | "danger" => {
    if (n >= 80) return "success";
    if (n >= 60) return "warning";
    return "danger";
  };

  const overallScore: number | null =
    analysis?.overall_score ?? firstApp?.ai_score ?? null;

  // breakdown is now { scores, summary, recommendation, screening_questions };
  // tolerate the legacy flat-numeric shape too.
  const bd = (analysis?.breakdown ?? null) as
    | {
        scores?: Record<string, number>;
        summary?: string;
        recommendation?: string;
        screening_questions?: Array<{ question: string; target_competency: string; why_it_matters: string }>;
      }
    | Record<string, number>
    | null;
  const breakdownScores: Record<string, number> =
    bd && typeof bd === "object" && "scores" in bd && bd.scores
      ? (bd.scores as Record<string, number>)
      : bd && typeof bd === "object"
        ? (Object.fromEntries(Object.entries(bd).filter(([, v]) => typeof v === "number")) as Record<string, number>)
        : {};
  const aiSummary: string =
    bd && typeof bd === "object" && "summary" in bd ? String((bd as { summary?: string }).summary ?? "") : "";
  const screeningQuestions =
    bd && typeof bd === "object" && "screening_questions" in bd && Array.isArray((bd as { screening_questions?: unknown }).screening_questions)
      ? ((bd as { screening_questions: Array<{ question: string; target_competency: string; why_it_matters: string }> }).screening_questions)
      : [];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-8">
      <Link
        href="/dashboard/candidates"
        className="inline-flex items-center gap-2 text-sm text-ink-2 transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Candidates
      </Link>

      <PageHeader
        eyebrow="Candidate"
        title={candidate.full_name as string}
        subtitle={`${candidate.current_role ?? ""}${candidate.current_role ? " · " : ""}${candidate.email as string}`}
        actions={
          <>
            <Avatar initials={initials} size="lg" />
            {firstApp && (
              <AnalysisStatus
                applicationId={firstApp.id}
                initialStatus={
                  (firstApp.analysis_status as
                    | "pending"
                    | "processing"
                    | "complete"
                    | "failed") ?? "pending"
                }
                initialScore={firstApp.ai_score}
              />
            )}
            {firstApp && !interview && (
              <form action={sendInterviewAction}>
                <input type="hidden" name="applicationId" value={firstApp.id} />
                <input type="hidden" name="candidateId" value={id} />
                <Button variant="primary" size="md" type="submit">
                  <Send size={16} /> Send AI interview
                </Button>
              </form>
            )}
          </>
        }
      />

      {/* Score breakdown — only when analysis is available */}
      {Object.keys(breakdownScores).length > 0 ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Object.entries(breakdownScores).map(([label, score]) => (
            <ScoreCard key={label} label={label} score={score} />
          ))}
        </div>
      ) : overallScore != null ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <ScoreCard label="Overall AI fit" score={overallScore} />
        </div>
      ) : null}

      {/* AI screening summary */}
      {aiSummary && (
        <div className="rounded-card border border-border-card bg-accent-soft p-6">
          <h3 className="text-card-title mb-2 text-accent-soft-ink">AI screening summary</h3>
          <p className="text-sm leading-relaxed text-accent-soft-ink">{aiSummary}</p>
        </div>
      )}

      {/* Red Flags Alert */}
      {analysis?.red_flags && (analysis.red_flags as string[]).length > 0 && (
        <div className="rounded-card border border-border-card bg-danger-soft p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-tile bg-card p-2 text-danger-soft-ink">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-card-title mb-2 text-danger-soft-ink">
                Attention Required
              </h3>
              <div className="space-y-1">
                {(analysis.red_flags as string[]).map((flag: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-danger-soft-ink"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-danger-soft-ink" />
                    {flag}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Analysis */}
        <div className="space-y-8 lg:col-span-2">

          {/* JD Skills Compatibility */}
          {firstApp && (
            <SectionCard
              title="JD Skills Compatibility"
              action={
                <span className="flex items-center gap-1 text-sm font-medium text-ink-2">
                  <Zap size={14} /> Target: {firstApp.jobs?.title ?? "—"}
                </span>
              }
            >
              {analysis ? (
                <>
                  <div className="mb-6 flex flex-wrap gap-2">
                    {(analysis.skills_found as string[] | null ?? []).map((skill: string) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 rounded-pill border border-border-card bg-success-soft px-3 py-1 text-sm font-medium text-success-soft-ink"
                      >
                        <CheckCircle size={12} /> {skill}
                      </span>
                    ))}
                    {(analysis.skills_missing as string[] | null ?? []).map((skill: string) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 rounded-pill border border-border-card bg-danger-soft px-3 py-1 text-sm font-medium text-danger-soft-ink"
                      >
                        <AlertTriangle size={12} /> {skill}
                      </span>
                    ))}
                  </div>
                  {(analysis.skills_found as string[] | null ?? []).length > 0 && (
                    <div className="rounded-tile border border-border-card bg-accent-soft p-4">
                      <h4 className="mb-2 text-sm font-bold text-accent-soft-ink">
                        AI Recommendation Engine
                      </h4>
                      <p className="text-sm leading-relaxed text-accent-soft-ink">
                        Strong signals in{" "}
                        {(analysis.skills_found as string[]).slice(0, 3).join(", ")}.
                        {(analysis.skills_missing as string[] | null ?? []).length > 0
                          ? ` Missing: ${(analysis.skills_missing as string[]).join(", ")}.`
                          : " No critical skill gaps identified."}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  title="Screening in progress"
                  description="AI analysis will appear here once screening completes."
                />
              )}
            </SectionCard>
          )}

          {/* Deep Resume Analysis */}
          {analysis && (
            <SectionCard
              title="Deep Resume Analysis"
              action={
                <div className="flex gap-4 text-sm text-ink-2">
                  {analysis.overall_score != null && (
                    <span className="flex items-center gap-1">
                      <FileText size={14} /> Quality:{" "}
                      <b>{Math.round(analysis.overall_score as number)}/100</b>
                    </span>
                  )}
                  {analysis.ats_score != null && (
                    <span>
                      ATS: <b>{Math.round(analysis.ats_score as number)}/100</b>
                    </span>
                  )}
                </div>
              }
            >
              {(analysis.skills_found as string[] | null ?? []).length > 0 && (
                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-semibold text-ink">
                    Technical Skills Detected
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(analysis.skills_found as string[]).map((skill: string) => (
                      <Badge key={skill} tone="neutral">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* AI-generated screening questions (probe the gaps) */}
          {screeningQuestions.length > 0 && (
            <SectionCard
              title="Suggested screening questions"
              action={<span className="text-sm text-ink-2">AI-generated from resume ↔ JD gaps</span>}
            >
              <ol className="space-y-4">
                {screeningQuestions.map((q, i) => (
                  <li key={i} className="rounded-tile border border-border-card p-4">
                    <p className="text-sm font-semibold text-ink">
                      {i + 1}. {q.question}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                      {q.target_competency && <Badge tone="neutral">{q.target_competency}</Badge>}
                      {q.why_it_matters && <span>{q.why_it_matters}</span>}
                    </div>
                  </li>
                ))}
              </ol>
            </SectionCard>
          )}

          {/* Identity Verification placeholder — no doc data in DB schema shown */}
          <SectionCard
            title="Identity Verification"
            action={
              <Badge tone="neutral">
                <Shield size={12} className="mr-1" />
                Pending
              </Badge>
            }
          >
            <div className="py-6 text-center text-ink-3">
              <Shield size={40} className="mx-auto mb-2 text-ink-3" />
              <p>No government ID data uploaded yet.</p>
            </div>
          </SectionCard>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Applications */}
          <SectionCard title="Applications">
            {(candidate.applications as typeof firstApp[] | undefined)?.length ? (
              <div className="space-y-3">
                {(candidate.applications as Array<{
                  id: string;
                  stage: string | null;
                  ai_score: number | null;
                  analysis_status: string | null;
                  job_id: string | null;
                  jobs: { title: string } | null;
                }>).map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between rounded-tile border border-border-card p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {app.jobs?.title ?? app.job_id ?? "—"}
                      </p>
                      <p className="text-xs text-ink-3">{app.stage ?? "—"}</p>
                    </div>
                    <AnalysisStatus
                      applicationId={app.id}
                      initialStatus={
                        (app.analysis_status as
                          | "pending"
                          | "processing"
                          | "complete"
                          | "failed") ?? "pending"
                      }
                      initialScore={app.ai_score}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-3">No applications yet.</p>
            )}
          </SectionCard>

          {/* Re-run screening */}
          {firstApp &&
            (firstApp.analysis_status === "failed" ||
              firstApp.analysis_status === "complete") && (
              <SectionCard title="Screening">
                <form action={rerunAnalysisAction}>
                  <input type="hidden" name="applicationId" value={firstApp.id} />
                  <Button type="submit" variant="secondary" size="md">
                    <RefreshCw size={16} /> Re-run AI screening
                  </Button>
                </form>
              </SectionCard>
            )}

          {/* AI Interview */}
          {firstApp && (
            <SectionCard title="AI Interview">
              {interview ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-2">Status</span>
                    <Badge tone={interview.status === "completed" ? "success" : "neutral"}>{interview.status}</Badge>
                  </div>
                  {interview.overallScore != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-ink-2">Interview score</span>
                      <b className="text-ink">{Math.round(interview.overallScore)}/100</b>
                    </div>
                  )}
                  {interview.recommendation && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-ink-2">Recommendation</span>
                      <Badge tone="accent">{interview.recommendation}</Badge>
                    </div>
                  )}
                  <div>
                    <p className="mb-1 text-xs font-bold text-ink-2">Candidate link</p>
                    <p className="break-all rounded-tile border border-border-card bg-surface-muted p-2 text-xs text-ink-3">
                      {interview.link}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-3">
                      Sent to {interview.invitedEmail ?? "the candidate"} (also draft in Comms). Share this private link if needed.
                    </p>
                  </div>
                  {interview.status === "completed" && (
                    <Link
                      href={`/dashboard/candidates/${id}/interview`}
                      className="text-sm text-accent hover:underline"
                    >
                      View interview report
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-ink-3">
                    Generate AI interview questions from this candidate&apos;s resume gaps and email them a private
                    link to take it — no recruiter time needed.
                  </p>
                  <form action={sendInterviewAction}>
                    <input type="hidden" name="applicationId" value={firstApp.id} />
                    <input type="hidden" name="candidateId" value={id} />
                    <Button type="submit" variant="primary" size="md">
                      <Send size={16} /> Create &amp; send AI interview
                    </Button>
                  </form>
                </div>
              )}
            </SectionCard>
          )}

          {/* Score summary */}
          {overallScore != null && (
            <SectionCard title="AI Score">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-pill text-2xl font-bold bg-${scoreTone(overallScore)}-soft text-${scoreTone(overallScore)}-soft-ink`}
              >
                {Math.round(overallScore)}
              </div>
              <p className="mt-2 text-xs text-ink-3">
                Scorecard:{" "}
                <Link
                  href={`/dashboard/candidates/${id}/scorecard`}
                  className="text-accent hover:underline"
                >
                  View full scorecard
                </Link>
              </p>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const tone =
    score >= 80 ? "success" : score >= 60 ? "warning" : "danger";
  const barColors: Record<string, string> = {
    success: "bg-success-soft-ink",
    warning: "bg-warning-soft-ink",
    danger: "bg-danger-soft-ink",
  };
  return (
    <Card className="flex items-center gap-4">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-pill font-bold text-lg bg-${tone}-soft text-${tone}-soft-ink`}
      >
        {Math.round(score)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-eyebrow mb-1 capitalize">{label.replace(/_/g, " ")}</div>
        <div className="h-2 w-full overflow-hidden rounded-pill bg-surface-muted">
          <div
            className={`h-full rounded-pill ${barColors[tone]}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
