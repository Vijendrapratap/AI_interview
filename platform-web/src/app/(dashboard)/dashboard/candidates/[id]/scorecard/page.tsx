"use client"

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { CheckCircle2, MessageSquare, ShieldAlert } from "lucide-react";
import { mockCandidates } from "@/lib/mockData";
import {
    PageHeader,
    Badge,
    Button,
    SectionCard,
    StatCard,
} from "@/components"

const competencies = ["Role fit", "Technical depth", "Communication", "Problem solving", "Culture contribution"];

export default function CandidateScorecardPage() {
    const params = useParams<{ id: string }>();
    const candidate = mockCandidates.find(item => item.id === params.id);

    if (!candidate) notFound();

    const scoreTone = (n: number): "success" | "warning" | "danger" => {
        if (n >= 80) return "success"
        if (n >= 60) return "warning"
        return "danger"
    }

    return (
        <div className="space-y-8 p-8">
            <PageHeader
                eyebrow="Scorecard"
                title="Structured Scorecard"
                subtitle={`${candidate.name} · ${candidate.role_applied}`}
                actions={
                    <Link href={`/dashboard/candidates/${candidate.id}`}>
                        <Button variant="secondary" size="md">Back to profile</Button>
                    </Link>
                }
            />

            <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                    icon={<CheckCircle2 size={18} />}
                    value={`${candidate.score}/100`}
                    label="AI fit"
                    tone={scoreTone(candidate.score)}
                />
                <StatCard
                    icon={<MessageSquare size={18} />}
                    value={candidate.interview_status}
                    label="Interview"
                    tone="neutral"
                />
                <StatCard
                    icon={<CheckCircle2 size={18} />}
                    value={candidate.recommendation}
                    label="Recommendation"
                    tone="accent"
                />
            </div>

            <SectionCard title="Competency Review">
                <div className="space-y-4">
                    {competencies.map((name, index) => {
                        const score = Math.max(62, candidate.score - index * 4);
                        const tone = scoreTone(score)
                        const barColors: Record<string, string> = {
                            success: "bg-success-soft-ink",
                            warning: "bg-warning-soft-ink",
                            danger: "bg-danger-soft-ink",
                        }
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
                    <ul className="space-y-2 text-sm text-ink-2">
                        {candidate.resume_analysis.skills_found.map(skill => (
                            <li key={skill} className="flex items-center gap-2">
                                <Badge tone="success">Match</Badge> {skill}
                            </li>
                        ))}
                        {candidate.interview?.strengths.map(strength => (
                            <li key={strength} className="flex items-center gap-2">
                                <Badge tone="accent">Strength</Badge> {strength}
                            </li>
                        ))}
                    </ul>
                </SectionCard>
                <SectionCard
                    title="Risks / Follow-ups"
                    action={<ShieldAlert size={18} className="text-warning-soft-ink" />}
                >
                    <ul className="space-y-2 text-sm text-ink-2">
                        {candidate.resume_analysis.skills_missing.map(skill => (
                            <li key={skill} className="flex items-center gap-2">
                                <Badge tone="warning">Gap</Badge> Validate: {skill}
                            </li>
                        ))}
                        {candidate.interview?.weaknesses.map(weakness => (
                            <li key={weakness} className="flex items-center gap-2">
                                <Badge tone="danger">Concern</Badge> {weakness}
                            </li>
                        ))}
                        <li className="flex items-center gap-2">
                            <Badge tone="neutral">Note</Badge> Recruiter override required before rejection or offer.
                        </li>
                    </ul>
                </SectionCard>
            </div>

            <SectionCard
                title="Decision Summary"
                action={<MessageSquare size={18} className="text-accent-soft-ink" />}
            >
                <p className="text-sm text-ink-2">{candidate.screening_summary}</p>
                <div className="mt-5 flex gap-3">
                    <Button variant="primary" size="md">Move to next stage</Button>
                    <Button variant="secondary" size="md">Request feedback</Button>
                    <Button variant="secondary" size="md">Override recommendation</Button>
                </div>
            </SectionCard>
        </div>
    );
}
