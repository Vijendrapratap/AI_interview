"use client"

import Link from "next/link";
import { CalendarClock, Copy, Sparkles } from "lucide-react";
import { mockCandidates } from "@/lib/mockData";
import { Badge, Button, Card, PageHeader, SectionCard, PreviewBanner } from "@/components";

export default function InterviewsPage() {
    const interviewCandidates = mockCandidates.filter(candidate => candidate.status !== "Rejected");

    return (
        <div className="p-8 space-y-8">
            <PreviewBanner />
            <PageHeader
                eyebrow="Interviews"
                title="AI Interview Center"
                subtitle="Invite candidates, monitor completion, and review structured AI interview results."
                actions={
                    <Badge tone="accent">Structured interview kits enabled</Badge>
                }
            />

            <div className="grid gap-4 md:grid-cols-3">
                <Metric label="Invites to send" value={interviewCandidates.filter(c => c.interview_status === "Not Invited").length.toString()} />
                <Metric label="Awaiting review" value={interviewCandidates.filter(c => c.interview_status === "Needs Review").length.toString()} />
                <Metric label="Completed" value={interviewCandidates.filter(c => c.interview_status === "Completed").length.toString()} />
            </div>

            <SectionCard
                title="Interview Queue"
                subtitle="Every interview maps questions to role competencies and recruiter scorecards."
            >
                <div className="divide-y divide-border-card -mx-5 -mb-5">
                    {interviewCandidates.map(candidate => (
                        <div key={candidate.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                            <div className="flex items-start gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-card bg-accent-soft text-accent-soft-ink shrink-0">
                                    <CalendarClock size={20} />
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-card-title">{candidate.name}</p>
                                        <InterviewStatusBadge status={candidate.interview_status} />
                                    </div>
                                    <p className="text-meta mt-0.5">{candidate.role_applied}</p>
                                    <p className="mt-2 text-[13px] text-ink-2">
                                        {candidate.interview ? candidate.interview.transcript_snippet : "Generate adaptive role-specific questions and send the candidate link."}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/interview/${candidate.id}`)}
                                >
                                    <Copy size={14} /> Copy link
                                </Button>
                                <Link href={`/dashboard/candidates/${candidate.id}/scorecard`}>
                                    <Button variant="primary" size="sm">
                                        <Sparkles size={14} /> Review
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>
        </div>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <Card variant="default">
            <p className="text-meta">{label}</p>
            <p className="mt-1 text-metric">{value}</p>
        </Card>
    );
}

function InterviewStatusBadge({ status }: { status: string }) {
    const tone =
        status === "Completed" ? "success" :
        status === "Needs Review" ? "warning" :
        status === "Invited" ? "accent" :
        "neutral";
    return <Badge tone={tone}>{status}</Badge>;
}
