import Link from "next/link";
import { getPipeline } from "@/lib/data/applications";
import { STAGES } from "@/lib/data/application-types";
import {
  PageHeader,
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  Avatar,
  AnalysisStatus,
} from "@/components";
import { StageChanger } from "@/components/StageChanger";

function initials(fullName: string): string {
  return fullName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function PipelinePage() {
  const pipeline = await getPipeline();

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        eyebrow="Recruiting"
        title="Hiring Pipeline"
        subtitle="Kanban view — move candidates from application to hire with AI context visible."
      />

      <KanbanBoard>
        {STAGES.map((stage) => {
          const apps = pipeline[stage];
          return (
            <KanbanColumn key={stage} title={stage.charAt(0).toUpperCase() + stage.slice(1)} count={apps.length}>
              {apps.length === 0 ? (
                <div className="rounded-tile border border-dashed border-border-card bg-surface p-4 text-center text-meta">
                  No candidates
                </div>
              ) : (
                apps.map((app) => {
                  const candidateRaw = app.candidates;
                  const candidate = Array.isArray(candidateRaw) ? candidateRaw[0] : candidateRaw;
                  const jobRaw = app.jobs;
                  const job = Array.isArray(jobRaw) ? jobRaw[0] : jobRaw;
                  const name = candidate?.full_name ?? "Unknown";
                  const role = job?.title ?? candidate?.current_role ?? "—";

                  return (
                    <KanbanCard key={app.id}>
                      <Link
                        href={`/dashboard/candidates/${app.candidate_id}`}
                        className="flex items-start gap-2.5 mb-2 hover:opacity-80 transition-opacity"
                      >
                        <Avatar initials={initials(name)} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold text-ink leading-tight truncate">
                            {name}
                          </p>
                          <p className="text-meta truncate">{role}</p>
                        </div>
                      </Link>
                      <AnalysisStatus
                        applicationId={app.id}
                        initialStatus={app.analysis_status as "pending" | "processing" | "complete" | "failed"}
                        initialScore={app.ai_score}
                      />
                      <StageChanger applicationId={app.id} currentStage={stage} />
                    </KanbanCard>
                  );
                })
              )}
            </KanbanColumn>
          );
        })}
      </KanbanBoard>
    </div>
  );
}
