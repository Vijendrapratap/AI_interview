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

// Thin FormData wrapper so the Re-run form can call the string-based server action
async function rerunAnalysisAction(formData: FormData) {
  "use server";
  const applicationId = String(formData.get("applicationId") ?? "");
  if (applicationId) await rerunAnalysis(applicationId);
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
            <Link href={`/interview/mock-session-${id}`} target="_blank">
              <Button variant="primary" size="md">
                <Send size={16} /> Start Interview Now
              </Button>
            </Link>
          </>
        }
      />

      {/* Score breakdown — only when analysis is available */}
      {analysis?.breakdown ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Object.entries(
            analysis.breakdown as Record<string, number>
          ).map(([label, score]) => (
            <ScoreCard key={label} label={label} score={score} />
          ))}
        </div>
      ) : overallScore != null ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <ScoreCard label="Overall AI fit" score={overallScore} />
        </div>
      ) : null}

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
