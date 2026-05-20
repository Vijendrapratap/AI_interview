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
    Sparkles,
    Users,
    Route
} from "lucide-react";
import { mockAnalytics, mockCandidates, mockJobs, recruiterFlowSteps } from "@/lib/mockData";

export default function Dashboard() {
    const priorityQueue = mockCandidates
        .filter(candidate => candidate.status !== "Rejected")
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);

    const atRiskJobs = mockJobs
        .filter(job => job.sla_status !== "Healthy")
        .slice(0, 4);

    return (
        <div className="space-y-8 p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-ink-2 shadow-card">
                        <Sparkles size={14} /> AI-first ATS workspace
                    </div>
                    <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">Recruiter Command Center</h1>
                    <p className="mt-1 text-ink-2">Focus on candidates, requisitions, and decisions that need attention today.</p>
                </div>
                <Link
                    href="/dashboard/jobs/new"
                    className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-bold text-surface transition-transform hover:-translate-y-0.5"
                >
                    <Plus size={18} /> New Job
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <StatCard label="Needs Review" value={mockAnalytics.needs_review.toString()} trend="AI-screened" tone="blue" icon={<FileText />} />
                <StatCard label="SLA Risks" value={mockAnalytics.sla_risks.toString()} trend="Act today" tone="red" icon={<AlertTriangle />} />
                <StatCard label="Interviews Pending" value={mockAnalytics.interviews_pending.toString()} trend="Awaiting completion" tone="purple" icon={<CalendarClock />} />
                <StatCard label="Offers Pending" value={mockAnalytics.offers_pending.toString()} trend="Ready to close" tone="green" icon={<CheckCircle2 />} />
            </div>

            <section className="rounded-[1.5rem] border border-border bg-card p-6 shadow-card">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-accent p-2 text-ink"><Route size={20} /></div>
                        <div>
                            <h2 className="text-lg font-black text-ink">Simple hiring flow</h2>
                            <p className="text-sm text-ink-3">The product now centers the recruiter around one clear workflow.</p>
                        </div>
                    </div>
                    <Link href="/dashboard/hiring-flow" className="text-sm font-bold text-ink hover:underline">Open flow view</Link>
                </div>
                <div className="grid gap-3 md:grid-cols-5">
                    {recruiterFlowSteps.map(step => (
                        <div key={step.id} className="rounded-2xl border border-border bg-surface p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-success">Step {step.step}</p>
                            <p className="mt-1 font-semibold text-ink">{step.title}</p>
                            <p className="mt-2 text-xs text-ink-3">{step.action}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-[1.5rem] border border-border bg-card shadow-card">
                    <div className="flex items-center justify-between border-b border-border p-6">
                        <div>
                            <h2 className="text-lg font-black text-ink">Today&apos;s Priority Queue</h2>
                            <p className="text-sm text-ink-3">Ranked by fit, urgency, and pending recruiter action.</p>
                        </div>
                        <Link href="/dashboard/candidates" className="text-sm font-bold text-ink hover:underline">View pipeline</Link>
                    </div>
                    <div className="divide-y divide-border">
                        {priorityQueue.map(candidate => (
                            <Link
                                href={`/dashboard/candidates/${candidate.id}`}
                                key={candidate.id}
                                className="grid gap-4 p-5 transition-colors hover:bg-surface md:grid-cols-[1fr_auto]"
                            >
                                <div className="flex gap-4">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-surface">
                                        {candidate.avatar}
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-ink">{candidate.name}</p>
                                            <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-2">{candidate.status}</span>
                                            <RiskBadge risk={candidate.risk_level} />
                                        </div>
                                        <p className="mt-1 text-sm text-ink-3">{candidate.role_applied} · {candidate.source}</p>
                                        <p className="mt-2 text-sm text-ink-2">{candidate.next_action}</p>
                                    </div>
                                </div>
                                <div className="text-left md:text-right">
                                    <div className="text-2xl font-black text-success">{candidate.score}</div>
                                    <div className="text-xs text-ink-3">AI fit score</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="rounded-[1.5rem] border border-border bg-card shadow-card">
                    <div className="border-b border-border p-6">
                        <h2 className="text-lg font-black text-ink">Hiring Bottlenecks</h2>
                        <p className="text-sm text-ink-3">Simple operating signals for the recruiting team.</p>
                    </div>
                    <div className="space-y-4 p-6">
                        <SignalRow icon={<Clock3 size={18} />} label="Top bottleneck" value={mockAnalytics.top_bottleneck} />
                        <SignalRow icon={<Users size={18} />} label="Feedback overdue" value={`${mockAnalytics.feedback_overdue} scorecards`} />
                        <SignalRow icon={<Briefcase size={18} />} label="Average time to hire" value={mockAnalytics.avg_time_to_hire} />
                        <SignalRow icon={<ShieldCheck size={18} />} label="Compliance review" value="2 candidates pending" />
                    </div>
                </section>
            </div>

            <section className="rounded-[1.5rem] border border-border bg-card shadow-card">
                <div className="flex items-center justify-between border-b border-border p-6">
                    <div>
                        <h2 className="text-lg font-black text-ink">Active Requisition Health</h2>
                        <p className="text-sm text-ink-3">High-level view of pipeline volume, ownership, and next action.</p>
                    </div>
                    <Link href="/dashboard/jobs" className="text-sm font-bold text-ink hover:underline">View all jobs</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-surface text-xs font-bold uppercase tracking-[0.12em] text-ink-3">
                            <tr>
                                <th className="px-6 py-4">Requisition</th>
                                <th className="px-6 py-4">Owner</th>
                                <th className="px-6 py-4">Pipeline</th>
                                <th className="px-6 py-4">Health</th>
                                <th className="px-6 py-4">Next Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {atRiskJobs.map(job => (
                                <tr key={job.id} className="hover:bg-surface/70">
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-ink">{job.title}</p>
                                        <p className="text-xs text-ink-3">{job.requisition_id} · {job.days_open} days open</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-ink-2">{job.owner}</td>
                                    <td className="px-6 py-4 text-sm text-ink-2">{job.applicants_count} candidates</td>
                                    <td className="px-6 py-4"><SLABadge status={job.sla_status} /></td>
                                    <td className="px-6 py-4 text-sm text-ink-2">{job.next_action}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function StatCard({ label, value, trend, icon, tone }: { label: string; value: string; trend: string; icon: React.ReactNode; tone: "blue" | "red" | "purple" | "green" }) {
    const tones = {
        blue: "bg-accent-soft text-ink",
        red: "bg-red-50 text-danger",
        purple: "bg-surface text-info",
        green: "bg-green-50 text-success"
    };

    return (
        <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-card transition-transform hover:-translate-y-0.5">
            <div className="mb-4 flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
                    {icon}
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${tones[tone]}`}>{trend}</span>
            </div>
            <p className="mb-1 text-3xl font-black text-ink">{value}</p>
            <p className="text-sm text-ink-3">{label}</p>
        </div>
    );
}

function SignalRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
            <div className="flex items-center gap-3 text-ink-3">{icon}<span className="text-sm">{label}</span></div>
            <span className="text-sm font-semibold text-ink">{value}</span>
        </div>
    );
}

function RiskBadge({ risk }: { risk: string }) {
    const styles: Record<string, string> = {
        Low: "bg-green-50 text-success",
        Medium: "bg-yellow-50 text-warning",
        High: "bg-red-50 text-danger"
    };

    return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[risk] || "bg-gray-100 text-gray-600"}`}>{risk} risk</span>;
}

function SLABadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        Healthy: "bg-green-50 text-success border-green-200",
        Watch: "bg-yellow-50 text-warning border-yellow-200",
        "At Risk": "bg-red-50 text-danger border-red-200"
    };

    return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>{status}</span>;
}
