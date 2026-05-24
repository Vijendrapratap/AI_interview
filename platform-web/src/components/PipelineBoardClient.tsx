"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar, KanbanBoard, KanbanCard, KanbanColumn, AnalysisStatus } from "@/components";
import { StageChanger } from "@/components/StageChanger";
import { STAGES, type Stage } from "@/lib/data/application-types";

type RelatedCandidate = {
  id?: string;
  full_name?: string;
  email?: string;
  current_role?: string | null;
};

type RelatedJob = {
  id?: string;
  title?: string;
};

export type PipelineBoardApplication = {
  id: string;
  stage: Stage | string | null;
  ai_score: number | null;
  analysis_status: "pending" | "processing" | "complete" | "failed" | string | null;
  candidate_id: string;
  candidates: RelatedCandidate | RelatedCandidate[] | null;
  jobs: RelatedJob | RelatedJob[] | null;
};

export type PipelineBoardData = Record<Stage, PipelineBoardApplication[]>;

function initials(fullName: string): string {
  return fullName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

function stageLabel(stage: Stage): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

function normalizePipeline(pipeline: PipelineBoardData): PipelineBoardData {
  return STAGES.reduce((acc, stage) => {
    acc[stage] = pipeline[stage] ?? [];
    return acc;
  }, {} as PipelineBoardData);
}

export function PipelineBoardClient({ initialPipeline }: { initialPipeline: PipelineBoardData }) {
  const [pipeline, setPipeline] = useState<PipelineBoardData>(() => normalizePipeline(initialPipeline));
  const [notice, setNotice] = useState<string | null>(null);

  const totalCandidates = useMemo(
    () => STAGES.reduce((total, stage) => total + pipeline[stage].length, 0),
    [pipeline],
  );

  function handleMoved(applicationId: string, fromStage: Stage, toStage: Stage) {
    setPipeline((current) => {
      const next = normalizePipeline(current);
      const moving = next[fromStage].find((app) => app.id === applicationId);
      if (!moving) return current;

      next[fromStage] = next[fromStage].filter((app) => app.id !== applicationId);
      next[toStage] = [{ ...moving, stage: toStage }, ...next[toStage]];
      return { ...next };
    });
    setNotice(`Moved candidate from ${stageLabel(fromStage)} to ${stageLabel(toStage)}.`);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-tile border border-border-card bg-surface px-4 py-3 text-sm shadow-card">
        <span className="font-medium text-ink">{totalCandidates} demo candidates ready to test</span>
        <span className="text-meta">Use the stage dropdown on each card to move candidates safely.</span>
      </div>

      {notice ? (
        <div className="rounded-tile border border-lime/30 bg-lime/10 px-4 py-2 text-sm font-medium text-ink" role="status">
          {notice}
        </div>
      ) : null}

      <KanbanBoard>
        {STAGES.map((stage) => {
          const apps = pipeline[stage];
          return (
            <KanbanColumn key={stage} title={stageLabel(stage)} count={apps.length}>
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
                        className="mb-2 flex items-start gap-2.5 transition-opacity hover:opacity-80"
                      >
                        <Avatar initials={initials(name)} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold leading-tight text-ink">{name}</p>
                          <p className="truncate text-meta">{role}</p>
                        </div>
                      </Link>
                      <AnalysisStatus
                        applicationId={app.id}
                        initialStatus={(app.analysis_status ?? "complete") as "pending" | "processing" | "complete" | "failed"}
                        initialScore={app.ai_score}
                      />
                      <StageChanger applicationId={app.id} currentStage={stage} onMoved={handleMoved} />
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
