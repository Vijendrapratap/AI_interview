import Link from "next/link";
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  FileText,
  Plus,
  Users,
} from "lucide-react";
import { getDashboardData } from "@/lib/data/dashboard";
import {
  PageHeader,
  StatCard,
  SectionCard,
  Badge,
  Avatar,
  TableWrap,
  THead,
  TBody,
  TR,
  Th,
  Td,
  AnalysisStatus,
} from "@/components";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";

function stageTone(stage: string): "success" | "warning" | "neutral" | "accent" {
  if (stage === "offer" || stage === "hired") return "success";
  if (stage === "interview") return "accent";
  if (stage === "screening") return "warning";
  return "neutral";
}

export default async function Dashboard() {
  const data = await getDashboardData();

  const newJobAction = (
    <Link
      href="/dashboard/jobs/new"
      className="inline-flex items-center gap-2 rounded-pill bg-accent px-5 h-10 text-[13px] font-bold text-accent-ink hover:bg-accent-hover"
    >
      <Plus size={16} /> New Job
    </Link>
  );

  return (
    <div className="space-y-8 p-8">
      <PageHeader
        eyebrow="AI-first ATS workspace"
        title="Recruiter Command Center"
        subtitle="Focus on the candidates, requisitions, and decisions that need you today."
        actions={newJobAction}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          icon={<FileText size={18} />}
          value={data.needsReview.toString()}
          label="Needs Review"
          chip="AI-screened"
          tone="accent"
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          value={data.slaRisks.toString()}
          label="SLA Risks"
          chip="Act today"
          tone="danger"
        />
        <StatCard
          icon={<CalendarClock size={18} />}
          value={data.interviewsPending.toString()}
          label="Interviews Pending"
          chip="Awaiting"
          tone="neutral"
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          value={data.offersPending.toString()}
          label="Offers Pending"
          chip="Ready"
          tone="success"
        />
      </div>

      {data.totals.jobs === 0 ? (
        <OnboardingChecklist totals={data.totals} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.15fr_0.85fr]">
            <SectionCard
              title="Today's Priority Queue"
              subtitle="Ranked by fit score, top candidates needing action."
              action={
                <Link href="/dashboard/pipeline" className="text-[13px] font-bold text-ink hover:underline shrink-0">
                  View pipeline
                </Link>
              }
            >
              <div className="-mx-5 -mb-5 divide-y divide-border-card">
                {data.priorityQueue.length === 0 ? (
                  <p className="px-5 py-8 text-center text-meta">No candidates in queue.</p>
                ) : (
                  data.priorityQueue.map((item) => (
                    <Link
                      href={`/dashboard/candidates/${item.candidate_id}`}
                      key={item.id}
                      className="grid gap-4 px-5 py-4 transition-colors hover:bg-surface md:grid-cols-[1fr_auto]"
                    >
                      <div className="flex gap-3">
                        <Avatar
                          initials={item.candidate_name
                            .split(" ")
                            .slice(0, 2)
                            .map((n) => n[0]?.toUpperCase() ?? "")
                            .join("")}
                          size="md"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[14px] font-bold text-ink">{item.candidate_name}</p>
                            <Badge tone={stageTone(item.stage)}>
                              {item.stage.charAt(0).toUpperCase() + item.stage.slice(1)}
                            </Badge>
                          </div>
                          {item.job_title && (
                            <p className="mt-1 text-[12px] text-ink-3">{item.job_title}</p>
                          )}
                          <div className="mt-1.5">
                            <AnalysisStatus
                              applicationId={item.id}
                              initialStatus={item.analysis_status as "pending" | "processing" | "complete" | "failed"}
                              initialScore={item.ai_score}
                            />
                          </div>
                        </div>
                      </div>
                      {item.ai_score != null && (
                        <div className="text-left md:text-right">
                          <div className="text-[18px] font-extrabold text-accent-soft-ink">
                            {Math.round(item.ai_score)}
                          </div>
                          <div className="text-[11px] text-ink-3">AI fit score</div>
                        </div>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Requisition Summary"
              subtitle="Active jobs and applicant volume at a glance."
            >
              <div className="space-y-3">
                {data.activeJobs.slice(0, 3).map((job) => (
                  <Link
                    key={job.id}
                    href={`/dashboard/jobs/${job.id}`}
                    className="flex items-center justify-between rounded-tile border border-border-card bg-surface px-4 py-3 hover:bg-card transition-colors"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-ink">{job.title}</p>
                      <p className="text-[11px] text-ink-3">{job.applicants} applicants</p>
                    </div>
                    <Badge tone={job.status === "open" ? "success" : "neutral"}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </Badge>
                  </Link>
                ))}
                {data.activeJobs.length === 0 && (
                  <p className="text-center text-meta py-4">No active jobs.</p>
                )}
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="Active Requisition Health"
            subtitle="High-level view of pipeline volume and status."
            action={
              <Link href="/dashboard/jobs" className="text-[13px] font-bold text-ink hover:underline shrink-0">
                View all jobs
              </Link>
            }
          >
            <div className="-mx-5 -mb-5">
              <TableWrap>
                <THead>
                  <TR>
                    <Th>Requisition</Th>
                    <Th>Status</Th>
                    <Th>Applicants</Th>
                    <Th>Actions</Th>
                  </TR>
                </THead>
                <TBody>
                  {data.activeJobs.map((job) => (
                    <TR key={job.id}>
                      <Td>
                        <Link href={`/dashboard/jobs/${job.id}`} className="font-semibold text-ink hover:underline">
                          {job.title}
                        </Link>
                      </Td>
                      <Td>
                        <Badge tone={job.status === "open" ? "success" : "neutral"}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </Badge>
                      </Td>
                      <Td>
                        <span className="inline-flex items-center gap-1 text-ink-2">
                          <Users size={13} /> {job.applicants}
                        </span>
                      </Td>
                      <Td>
                        <Link href={`/dashboard/jobs/${job.id}`} className="text-[12px] font-bold text-accent hover:underline inline-flex items-center gap-1">
                          <Briefcase size={12} /> View
                        </Link>
                      </Td>
                    </TR>
                  ))}
                  {data.activeJobs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-meta py-6 px-4">
                        No jobs posted yet.{" "}
                        <Link href="/dashboard/jobs/new" className="font-bold text-accent hover:underline">
                          Post one now
                        </Link>
                      </td>
                    </tr>
                  )}
                </TBody>
              </TableWrap>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
