"use client"

import Link from "next/link";
import { mockCandidates, type PipelineStage } from "@/lib/mockData";
import {
  PageHeader,
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  Avatar,
  Badge,
  Banner,
} from "@/components";

const stages: PipelineStage[] = ["Received", "Screening", "Interview", "Offer", "Hired", "Rejected"];

export default function PipelinePage() {
  return (
    <div className="p-8 space-y-6">
      <PageHeader
        eyebrow="Recruiting"
        title="Hiring Pipeline"
        subtitle="Kanban view — move candidates from application to hire with AI context visible."
      />

      <Banner tone="neutral">
        This area is read-only for now — full functionality lands in Slice 2.
      </Banner>

      <KanbanBoard>
        {stages.map(stage => {
          const candidates = mockCandidates.filter(candidate => candidate.status === stage);
          return (
            <KanbanColumn key={stage} title={stage} count={candidates.length}>
              {candidates.map(candidate => (
                <Link
                  key={candidate.id}
                  href={`/dashboard/candidates/${candidate.id}`}
                  className="block"
                >
                  <KanbanCard>
                    <div className="flex items-start gap-2.5 mb-2">
                      <Avatar
                        initials={candidate.name
                          .split(" ")
                          .slice(0, 2)
                          .map((n: string) => n[0])
                          .join("")}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-ink leading-tight truncate">
                          {candidate.name}
                        </p>
                        <p className="text-meta truncate">{candidate.role_applied}</p>
                      </div>
                      <Badge tone="accent">{candidate.score}</Badge>
                    </div>
                    <p className="text-meta line-clamp-2">{candidate.next_action}</p>
                    <div className="mt-2 flex items-center justify-between text-meta">
                      <span>{candidate.owner}</span>
                      <span>{candidate.stage_age_days}d</span>
                    </div>
                  </KanbanCard>
                </Link>
              ))}
              {candidates.length === 0 && (
                <div className="rounded-tile border border-dashed border-border-card bg-surface p-4 text-center text-meta">
                  No candidates
                </div>
              )}
            </KanbanColumn>
          );
        })}
      </KanbanBoard>
    </div>
  );
}
