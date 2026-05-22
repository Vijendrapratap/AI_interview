"use client"

import Link from "next/link";
import {
    AlertTriangle,
    Briefcase,
    CalendarClock,
    CheckCircle2,
    Clock3,
    FileText,
    Plus,
    ShieldCheck,
    Users,
} from "lucide-react";
import { mockAnalytics, mockCandidates, mockJobs, recruiterFlowSteps } from "@/lib/mockData";
import {
    PageHeader,
    StatCard,
    SectionCard,
    Card,
    Badge,
    Avatar,
    TableWrap,
    THead,
    TBody,
    TR,
    Th,
    Td,
} from "@/components";

export default function Dashboard() {
    const priorityQueue = mockCandidates
        .filter(candidate => candidate.status !== "Rejected")
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);

    const atRiskJobs = mockJobs
        .filter(job => job.sla_status !== "Healthy")
        .slice(0, 4);

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
                    value={mockAnalytics.needs_review.toString()}
                    label="Needs Review"
                    chip="AI-screened"
                    tone="accent"
                />
                <StatCard
                    icon={<AlertTriangle size={18} />}
                    value={mockAnalytics.sla_risks.toString()}
                    label="SLA Risks"
                    chip="Act today"
                    tone="danger"
                />
                <StatCard
                    icon={<CalendarClock size={18} />}
                    value={mockAnalytics.interviews_pending.toString()}
                    label="Interviews Pending"
                    chip="Awaiting"
                    tone="neutral"
                />
                <StatCard
                    icon={<CheckCircle2 size={18} />}
                    value={mockAnalytics.offers_pending.toString()}
                    label="Offers Pending"
                    chip="Ready"
                    tone="success"
                />
            </div>

            <SectionCard
                title="Simple hiring flow"
                subtitle="The product now centers the recruiter around one clear workflow."
                action={
                    <Link href="/dashboard/hiring-flow" className="text-[13px] font-bold text-ink hover:underline shrink-0">
                        Open flow view
                    </Link>
                }
            >
                <div className="grid gap-3 md:grid-cols-5 items-stretch">
                    {recruiterFlowSteps.map(step => (
                        <Card key={step.id} variant="compact" className="h-full">
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-success-soft-ink">Step {step.step}</p>
                            <p className="mt-1 text-[13px] font-semibold text-ink">{step.title}</p>
                            <p className="mt-2 text-[11px] text-ink-3">{step.action}</p>
                        </Card>
                    ))}
                </div>
            </SectionCard>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.15fr_0.85fr]">
                <SectionCard
                    title="Today's Priority Queue"
                    subtitle="Ranked by fit, urgency, and pending recruiter action."
                    action={
                        <Link href="/dashboard/candidates" className="text-[13px] font-bold text-ink hover:underline shrink-0">
                            View pipeline
                        </Link>
                    }
                >
                    <div className="-mx-5 -mb-5 divide-y divide-border-card">
                        {priorityQueue.map(candidate => (
                            <Link
                                href={`/dashboard/candidates/${candidate.id}`}
                                key={candidate.id}
                                className="grid gap-4 px-5 py-4 transition-colors hover:bg-surface md:grid-cols-[1fr_auto]"
                            >
                                <div className="flex gap-3">
                                    <Avatar initials={candidate.avatar} size="md" />
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-[14px] font-bold text-ink">{candidate.name}</p>
                                            <Badge tone="neutral">{candidate.status}</Badge>
                                            <RiskBadge risk={candidate.risk_level} />
                                        </div>
                                        <p className="mt-1 text-[12px] text-ink-3">{candidate.role_applied} · {candidate.source}</p>
                                        <p className="mt-1.5 text-[12px] text-ink-2">{candidate.next_action}</p>
                                    </div>
                                </div>
                                <div className="text-left md:text-right">
                                    <div className="text-[18px] font-extrabold text-accent-soft-ink">{candidate.score}</div>
                                    <div className="text-[11px] text-ink-3">AI fit score</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </SectionCard>

                <SectionCard
                    title="Hiring Bottlenecks"
                    subtitle="Simple operating signals for the recruiting team."
                >
                    <div className="space-y-3">
                        <SignalRow icon={<Clock3 size={16} />} label="Top bottleneck" value={mockAnalytics.top_bottleneck} />
                        <SignalRow icon={<Users size={16} />} label="Feedback overdue" value={`${mockAnalytics.feedback_overdue} scorecards`} />
                        <SignalRow icon={<Briefcase size={16} />} label="Average time to hire" value={mockAnalytics.avg_time_to_hire} />
                        <SignalRow icon={<ShieldCheck size={16} />} label="Compliance review" value="2 candidates pending" />
                    </div>
                </SectionCard>
            </div>

            <SectionCard
                title="Active Requisition Health"
                subtitle="High-level view of pipeline volume, ownership, and next action."
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
                                <Th>Owner</Th>
                                <Th>Pipeline</Th>
                                <Th>Health</Th>
                                <Th>Next Action</Th>
                            </TR>
                        </THead>
                        <TBody>
                            {atRiskJobs.map(job => (
                                <TR key={job.id}>
                                    <Td>
                                        <p className="font-semibold text-ink">{job.title}</p>
                                        <p className="text-[11px] text-ink-3">{job.requisition_id} · {job.days_open} days open</p>
                                    </Td>
                                    <Td>{job.owner}</Td>
                                    <Td>{job.applicants_count} candidates</Td>
                                    <Td><SLABadge status={job.sla_status} /></Td>
                                    <Td>{job.next_action}</Td>
                                </TR>
                            ))}
                        </TBody>
                    </TableWrap>
                </div>
            </SectionCard>
        </div>
    );
}

function SignalRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center justify-between rounded-tile border border-border-card bg-surface px-4 py-3">
            <div className="flex items-center gap-3 text-ink-3">
                {icon}
                <span className="text-[13px]">{label}</span>
            </div>
            <span className="text-[13px] font-semibold text-ink">{value}</span>
        </div>
    );
}

function RiskBadge({ risk }: { risk: string }) {
    const toneMap: Record<string, "success" | "warning" | "danger" | "neutral"> = {
        Low: "success",
        Medium: "warning",
        High: "danger",
    };
    const tone = toneMap[risk] ?? "neutral";
    return <Badge tone={tone}>{risk} risk</Badge>;
}

function SLABadge({ status }: { status: string }) {
    const toneMap: Record<string, "success" | "warning" | "danger" | "neutral"> = {
        Healthy: "success",
        Watch: "warning",
        "At Risk": "danger",
    };
    const tone = toneMap[status] ?? "neutral";
    return <Badge tone={tone}>{status}</Badge>;
}
