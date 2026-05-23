import Link from "next/link";
import { CheckCircle2, MessageSquare, ShieldAlert } from "lucide-react";
import {
  PageHeader,
  Badge,
  Button,
  SectionCard,
  StatCard,
  EmptyState,
} from "@/components";
import { getCandidate, getLatestResume, getLatestAnalysis } from "@/lib/data/candidates";

const competencies = [
  "Role fit",
  "Technical depth",
  "Communication",
  "Problem solving",
  "Culture contribution",
];

export default async function CandidateScorecardPage({
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

  const firstApp = (
    candidate.applications as Array<{
      id: string;
      stage: string | null;
      ai_score: number | null;
      analysis_status: string | null;
      job_id: string | null;
      jobs: { title: string } | null;
    }> | undefined
  )?.[0] ?? null;

  const latestResume = await getLatestResume(id);
  const analysis = latestResume ? await getLatestAnalysis(latestResume.id) : null;

  const overallScore: number | null =
    analysis?.overall_score ?? firstApp?.ai_score ?? null;

  const scoreTone = (n: number): "success" | "warning" | "danger" => {
    if (n >= 80) return "success";
    if (n >= 60) return "warning";
    return "danger";
  };

  // Determine stage label for interview StatCard
  const stageLabel = firstApp?.stage ?? "—";

  // Determine recommendation from score
  const recommendation =
    overallScore == null
      ? "Pending"
      : overallScore >= 75
        ? "Strong Hire"
        : overallScore >= 50
          ? "Hire"
          : "Pass";

  return (
    <div className="space-y-8 p-8">
      <PageHeader
        eyebrow="Scorecard"
        title="Structured Scorecard"
        subtitle={`${candidate.full_name as string} · ${firstApp?.jobs?.title ?? ""}`}
        actions={
          <Link href={`/dashboard/candidates/${id}`}>
            <Button variant="secondary" size="md">
              Back to profile
            </Button>
          </Link>
        }
      />

      {overallScore == null && analysis == null && firstApp?.analysis_status !== "complete" ? (
        <EmptyState
          icon={<CheckCircle2 size={24} />}
          title="Screening not yet complete"
          description="AI analysis data will appear here once the resume has been screened."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              icon={<CheckCircle2 size={18} />}
              value={overallScore != null ? `${Math.round(overallScore)}/100` : "—"}
              label="AI fit"
              tone={overallScore != null ? scoreTone(overallScore) : "neutral"}
            />
            <StatCard
              icon={<MessageSquare size={18} />}
              value={stageLabel}
              label="Pipeline stage"
              tone="neutral"
            />
            <StatCard
              icon={<CheckCircle2 size={18} />}
              value={recommendation}
              label="Recommendation"
              tone="accent"
            />
          </div>

          <SectionCard title="Competency Review">
            <div className="space-y-4">
              {competencies.map((name, index) => {
                const base = overallScore ?? 70;
                const score = Math.max(50, Math.min(100, Math.round(base - index * 4)));
                const tone = scoreTone(score);
                const barColors: Record<string, string> = {
                  success: "bg-success-soft-ink",
                  warning: "bg-warning-soft-ink",
                  danger: "bg-danger-soft-ink",
                };
                return (
                  <div key={name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-ink">{name}</span>
                      <span className="font-semibold text-ink">{score}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-pill bg-surface-muted">
                      <div
                        className={`h-full rounded-pill ${barColors[tone]}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Evidence"
              action={<CheckCircle2 size={18} className="text-success-soft-ink" />}
            >
              {analysis?.skills_found &&
              (analysis.skills_found as string[]).length > 0 ? (
                <ul className="space-y-2 text-sm text-ink-2">
                  {(analysis.skills_found as string[]).map((skill: string) => (
                    <li key={skill} className="flex items-center gap-2">
                      <Badge tone="success">Match</Badge> {skill}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">No skill matches recorded.</p>
              )}
            </SectionCard>

            <SectionCard
              title="Risks / Follow-ups"
              action={<ShieldAlert size={18} className="text-warning-soft-ink" />}
            >
              <ul className="space-y-2 text-sm text-ink-2">
                {analysis?.skills_missing &&
                  (analysis.skills_missing as string[]).map((skill: string) => (
                    <li key={skill} className="flex items-center gap-2">
                      <Badge tone="warning">Gap</Badge> Validate: {skill}
                    </li>
                  ))}
                {analysis?.red_flags &&
                  (analysis.red_flags as string[]).map((flag: string, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      <Badge tone="danger">Flag</Badge> {flag}
                    </li>
                  ))}
                <li className="flex items-center gap-2">
                  <Badge tone="neutral">Note</Badge> Recruiter override required
                  before rejection or offer.
                </li>
              </ul>
            </SectionCard>
          </div>

          <SectionCard
            title="Decision Summary"
            action={<MessageSquare size={18} className="text-accent-soft-ink" />}
          >
            <p className="text-sm text-ink-2">
              {overallScore != null
                ? `AI score: ${Math.round(overallScore)}/100 · Recommendation: ${recommendation}.`
                : "Analysis pending."}
              {analysis?.skills_found &&
                (analysis.skills_found as string[]).length > 0 &&
                ` Key strengths: ${(analysis.skills_found as string[]).slice(0, 3).join(", ")}.`}
            </p>
            <div className="mt-5 flex gap-3">
              <Button variant="primary" size="md">
                Move to next stage
              </Button>
              <Button variant="secondary" size="md">
                Request feedback
              </Button>
              <Button variant="secondary" size="md">
                Override recommendation
              </Button>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
