import {
  BarChart3,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  FileText,
  Hourglass,
  Sparkles,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/data/organizations";
import { PageHeader, StatCard, SectionCard, Badge, EmptyState } from "@/components";

// All queries run through the authenticated server client, so RLS scopes every
// table to the member's organization — no explicit organization_id filters needed.

const STAGES = [
  { key: "new", label: "New" },
  { key: "screening", label: "Screening" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Rejected" },
] as const;

type StageCount = { key: string; label: string; count: number };

type Analytics = {
  openJobs: number;
  totalCandidates: number;
  applicationsThisMonth: number;
  totalApplications: number;
  stageCounts: StageCount[];
  screening: { advance: number; review: number; reject: number; screened: number; avgScore: number | null };
  interviews: { invited: number; completed: number; avgScore: number | null };
  medianFirstMove: string | null;
};

function formatDuration(ms: number): string {
  const minutes = ms / 60_000;
  const hours = ms / 3_600_000;
  const days = ms / 86_400_000;
  if (days >= 2) return `${Math.round(days)} days`;
  if (hours >= 1) return `${Math.round(hours)} hr${Math.round(hours) === 1 ? "" : "s"}`;
  return `${Math.max(1, Math.round(minutes))} min`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

async function getAnalytics(): Promise<Analytics> {
  const supabase = await createClient();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    openJobsRes,
    candidatesRes,
    appsMonthRes,
    appsTotalRes,
    invitedRes,
    completedRes,
    screeningRes,
    interviewScoresRes,
    stageEventsRes,
    ...stageResults
  ] = await Promise.all([
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("candidates").select("*", { count: "exact", head: true }),
    supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString()),
    supabase.from("applications").select("*", { count: "exact", head: true }),
    supabase.from("interview_sessions").select("*", { count: "exact", head: true }),
    supabase.from("interview_sessions").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("applications").select("recommendation, ai_score").eq("analysis_status", "complete"),
    supabase
      .from("interview_sessions")
      .select("overall_score")
      .eq("status", "completed")
      .not("overall_score", "is", null),
    supabase
      .from("stage_events")
      .select("application_id, created_at, applications(created_at)")
      .order("created_at", { ascending: true })
      .limit(1000),
    ...STAGES.map((stage) =>
      supabase.from("applications").select("*", { count: "exact", head: true }).eq("stage", stage.key)
    ),
  ]);

  // Screening outcomes from completed AI analyses.
  const screeningRows = (screeningRes.data ?? []) as Array<{
    recommendation: string | null;
    ai_score: number | null;
  }>;
  const outcomes = { advance: 0, review: 0, reject: 0 };
  const scores: number[] = [];
  for (const row of screeningRows) {
    if (row.recommendation === "advance" || row.recommendation === "review" || row.recommendation === "reject") {
      outcomes[row.recommendation] += 1;
    }
    if (typeof row.ai_score === "number") scores.push(row.ai_score);
  }
  const avgAiScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  // Average score across completed interviews.
  const interviewScoreRows = (interviewScoresRes.data ?? []) as Array<{ overall_score: number | null }>;
  const interviewScores = interviewScoreRows
    .map((row) => row.overall_score)
    .filter((score): score is number => typeof score === "number");
  const avgInterviewScore =
    interviewScores.length > 0 ? interviewScores.reduce((a, b) => a + b, 0) / interviewScores.length : null;

  // Median time from application created to its FIRST stage change.
  // stage_events may not have rows yet (it fills as recruiters move candidates).
  const eventRows = (stageEventsRes.data ?? []) as Array<{
    application_id: string;
    created_at: string;
    applications: { created_at: string } | Array<{ created_at: string }> | null;
  }>;
  const seen = new Set<string>();
  const deltas: number[] = [];
  for (const event of eventRows) {
    if (seen.has(event.application_id)) continue;
    seen.add(event.application_id);
    const app = Array.isArray(event.applications) ? event.applications[0] : event.applications;
    if (!app?.created_at) continue;
    const delta = new Date(event.created_at).getTime() - new Date(app.created_at).getTime();
    if (delta >= 0) deltas.push(delta);
  }
  const medianDelta = median(deltas);

  return {
    openJobs: openJobsRes.count ?? 0,
    totalCandidates: candidatesRes.count ?? 0,
    applicationsThisMonth: appsMonthRes.count ?? 0,
    totalApplications: appsTotalRes.count ?? 0,
    stageCounts: STAGES.map((stage, i) => ({
      key: stage.key,
      label: stage.label,
      count: stageResults[i]?.count ?? 0,
    })),
    screening: {
      ...outcomes,
      screened: outcomes.advance + outcomes.review + outcomes.reject,
      avgScore: avgAiScore,
    },
    interviews: {
      invited: invitedRes.count ?? 0,
      completed: completedRes.count ?? 0,
      avgScore: avgInterviewScore,
    },
    medianFirstMove: medianDelta != null ? formatDuration(medianDelta) : null,
  };
}

function StatBar({ label, count, max, toneClass }: { label: string; count: number; max: number; toneClass?: string }) {
  const pct = max > 0 ? Math.max((count / max) * 100, count > 0 ? 2 : 0) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[13px]">
        <span className="font-semibold text-ink-2">{label}</span>
        <span className="font-bold text-ink">{count}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <div className={`h-full rounded-full ${toneClass ?? "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    return (
      <div className="space-y-8 p-8">
        <PageHeader
          eyebrow="Workspace insights"
          title="Recruiting Analytics"
          subtitle="Pipeline volume, screening quality, and interview outcomes for your organization."
        />
        <EmptyState
          icon={<BarChart3 size={22} />}
          title="No workspace found"
          description="Analytics is scoped to your organization. Finish workspace setup to see live numbers here."
        />
      </div>
    );
  }

  const data = await getAnalytics();
  const stageMax = Math.max(...data.stageCounts.map((s) => s.count), 1);
  const completionRate =
    data.interviews.invited > 0 ? Math.round((data.interviews.completed / data.interviews.invited) * 100) : null;

  return (
    <div className="space-y-8 p-8">
      <PageHeader
        eyebrow="Workspace insights"
        title="Recruiting Analytics"
        subtitle="How your pipeline is moving — volume, AI screening quality, and interview outcomes, live from your workspace."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          icon={<Briefcase size={18} />}
          value={String(data.openJobs)}
          label="Open Jobs"
          tone="accent"
        />
        <StatCard
          icon={<Users size={18} />}
          value={String(data.totalCandidates)}
          label="Total Candidates"
          tone="neutral"
        />
        <StatCard
          icon={<FileText size={18} />}
          value={String(data.applicationsThisMonth)}
          label="Applications This Month"
          chip="This month"
          tone="warning"
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          value={String(data.interviews.completed)}
          label="Interviews Completed"
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <SectionCard
          title="Applications by Stage"
          subtitle="Where every candidate sits in the pipeline right now."
        >
          {data.totalApplications === 0 ? (
            <EmptyState
              icon={<BarChart3 size={22} />}
              title="No applications yet"
              description="Stage distribution appears as soon as candidates apply to your open jobs."
            />
          ) : (
            <div className="space-y-4">
              {data.stageCounts.map((stage) => (
                <StatBar key={stage.key} label={stage.label} count={stage.count} max={stageMax} />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Screening Outcomes"
          subtitle="AI resume screening recommendations across completed analyses."
        >
          {data.screening.screened === 0 ? (
            <EmptyState
              icon={<Sparkles size={22} />}
              title="No completed screenings yet"
              description="Outcomes appear once the AI finishes analyzing uploaded resumes."
            />
          ) : (
            <div className="space-y-5">
              <div className="flex items-baseline gap-2">
                <span className="text-metric">
                  {data.screening.avgScore != null ? Math.round(data.screening.avgScore) : "—"}
                </span>
                <span className="text-meta">average AI fit score</span>
              </div>
              <div className="space-y-3">
                {(
                  [
                    { key: "advance", label: "Advance", tone: "success", toneClass: "bg-success-soft-ink" },
                    { key: "review", label: "Review", tone: "warning", toneClass: "bg-warning-soft-ink" },
                    { key: "reject", label: "Reject", tone: "danger", toneClass: "bg-danger-soft-ink" },
                  ] as const
                ).map((row) => (
                  <div key={row.key} className="flex items-center gap-3">
                    <Badge tone={row.tone} className="w-20 justify-center">
                      {row.label}
                    </Badge>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className={`h-full rounded-full ${row.toneClass}`}
                        style={{
                          width: `${Math.max(
                            (data.screening[row.key] / data.screening.screened) * 100,
                            data.screening[row.key] > 0 ? 2 : 0
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-[13px] font-bold text-ink">
                      {data.screening[row.key]}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-meta">{data.screening.screened} resumes screened in total.</p>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <SectionCard
          title="Interview Funnel"
          subtitle="From invitation sent to completed AI interview."
        >
          {data.interviews.invited === 0 ? (
            <EmptyState
              icon={<CalendarClock size={22} />}
              title="No interviews sent yet"
              description="Invite a candidate to an AI interview from their profile to start this funnel."
            />
          ) : (
            <div className="space-y-5">
              <div className="space-y-4">
                <StatBar label="Invited" count={data.interviews.invited} max={data.interviews.invited} />
                <StatBar
                  label="Completed"
                  count={data.interviews.completed}
                  max={data.interviews.invited}
                  toneClass="bg-success-soft-ink"
                />
              </div>
              <div className="flex flex-wrap gap-6">
                <div>
                  <div className="text-metric">{completionRate != null ? `${completionRate}%` : "—"}</div>
                  <div className="text-meta mt-0.5">completion rate</div>
                </div>
                <div>
                  <div className="text-metric">
                    {data.interviews.avgScore != null ? Math.round(data.interviews.avgScore) : "—"}
                  </div>
                  <div className="text-meta mt-0.5">average interview score</div>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Pipeline Velocity"
          subtitle="How quickly applications get their first recruiter decision."
        >
          {data.medianFirstMove == null ? (
            <EmptyState
              icon={<Hourglass size={22} />}
              title="No stage moves recorded yet"
              description="Data appears as you move candidates through stages on the pipeline board."
            />
          ) : (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-metric">{data.medianFirstMove}</span>
                <span className="text-meta">median time to first stage move</span>
              </div>
              <p className="text-meta">
                Measured from when an application is created to its first stage change.
              </p>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
