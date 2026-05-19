"use client"

import Link from "next/link";
import { mockCandidates, type PipelineStage } from "@/lib/mockData";
import { ComingSoonBanner } from "@/components/Banner";

const stages: PipelineStage[] = ["Received", "Screening", "Interview", "Offer", "Hired", "Rejected"];

export default function PipelinePage() {
    return (
        <div className="p-8 space-y-8">
            <ComingSoonBanner className="mb-6" />
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Hiring Pipeline</h1>
                <p className="text-gray-500">Kanban view for moving candidates from application to hire with AI context visible.</p>
            </div>

            <div className="grid gap-4 xl:grid-cols-6">
                {stages.map(stage => {
                    const candidates = mockCandidates.filter(candidate => candidate.status === stage);
                    return (
                        <section key={stage} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                            <div className="mb-3 flex items-center justify-between px-1">
                                <h2 className="text-sm font-bold text-gray-800">{stage}</h2>
                                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-500">{candidates.length}</span>
                            </div>
                            <div className="space-y-3">
                                {candidates.map(candidate => (
                                    <Link key={candidate.id} href={`/dashboard/candidates/${candidate.id}`} className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-200 hover:shadow-md">
                                        <div className="mb-3 flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-gray-900">{candidate.name}</p>
                                                <p className="text-xs text-gray-500">{candidate.role_applied}</p>
                                            </div>
                                            <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-700">{candidate.score}</span>
                                        </div>
                                        <p className="text-xs text-gray-600">{candidate.next_action}</p>
                                        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                                            <span>{candidate.owner}</span>
                                            <span>{candidate.stage_age_days}d</span>
                                        </div>
                                    </Link>
                                ))}
                                {candidates.length === 0 && <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4 text-center text-xs text-gray-400">No candidates</div>}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
