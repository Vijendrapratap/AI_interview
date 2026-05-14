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
    Users
} from "lucide-react";
import { mockAnalytics, mockCandidates, mockJobs } from "@/lib/mockData";

export default function Dashboard() {
    const priorityQueue = mockCandidates
        .filter(candidate => candidate.status !== "Rejected")
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);

    const atRiskJobs = mockJobs
        .filter(job => job.sla_status !== "Healthy")
        .slice(0, 4);

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        <Sparkles size={14} /> AI-first ATS workspace
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Recruiter Command Center</h1>
                    <p className="text-gray-500">Focus on the candidates, requisitions, and decisions that need attention today.</p>
                </div>
                <Link
                    href="/dashboard/jobs/new"
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
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

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-100 p-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Today&apos;s Priority Queue</h2>
                            <p className="text-sm text-gray-500">Ranked by fit, urgency, and pending recruiter action.</p>
                        </div>
                        <Link href="/dashboard/candidates" className="text-sm font-medium text-blue-600 hover:underline">View pipeline</Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {priorityQueue.map(candidate => (
                            <Link
                                href={`/dashboard/candidates/${candidate.id}`}
                                key={candidate.id}
                                className="grid gap-4 p-5 transition-colors hover:bg-gray-50 md:grid-cols-[1fr_auto]"
                            >
                                <div className="flex gap-4">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-semibold text-white">
                                        {candidate.avatar}
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-gray-900">{candidate.name}</p>
                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{candidate.status}</span>
                                            <RiskBadge risk={candidate.risk_level} />
                                        </div>
                                        <p className="mt-1 text-sm text-gray-500">{candidate.role_applied} · {candidate.source}</p>
                                        <p className="mt-2 text-sm text-gray-700">{candidate.next_action}</p>
                                    </div>
                                </div>
                                <div className="text-left md:text-right">
                                    <div className="text-2xl font-bold text-green-600">{candidate.score}</div>
                                    <div className="text-xs text-gray-400">AI fit score</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-900">Hiring Bottlenecks</h2>
                        <p className="text-sm text-gray-500">Simple operating signals for the recruiting team.</p>
                    </div>
                    <div className="space-y-4 p-6">
                        <SignalRow icon={<Clock3 size={18} />} label="Top bottleneck" value={mockAnalytics.top_bottleneck} />
                        <SignalRow icon={<Users size={18} />} label="Feedback overdue" value={`${mockAnalytics.feedback_overdue} scorecards`} />
                        <SignalRow icon={<Briefcase size={18} />} label="Average time to hire" value={mockAnalytics.avg_time_to_hire} />
                        <SignalRow icon={<ShieldCheck size={18} />} label="Compliance review" value="2 candidates pending" />
                    </div>
                </section>
            </div>

            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 p-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Active Requisition Health</h2>
                        <p className="text-sm text-gray-500">High-level view of pipeline volume, ownership, and next action.</p>
                    </div>
                    <Link href="/dashboard/jobs" className="text-sm font-medium text-blue-600 hover:underline">View all jobs</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                            <tr>
                                <th className="px-6 py-4">Requisition</th>
                                <th className="px-6 py-4">Owner</th>
                                <th className="px-6 py-4">Pipeline</th>
                                <th className="px-6 py-4">Health</th>
                                <th className="px-6 py-4">Next Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {atRiskJobs.map(job => (
                                <tr key={job.id} className="hover:bg-gray-50/60">
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-gray-900">{job.title}</p>
                                        <p className="text-xs text-gray-500">{job.requisition_id} · {job.days_open} days open</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{job.owner}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{job.applicants_count} candidates</td>
                                    <td className="px-6 py-4"><SLABadge status={job.sla_status} /></td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{job.next_action}</td>
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
        blue: "bg-blue-50 text-blue-700",
        red: "bg-red-50 text-red-700",
        purple: "bg-purple-50 text-purple-700",
        green: "bg-green-50 text-green-700"
    };

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
                    {icon}
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${tones[tone]}`}>{trend}</span>
            </div>
            <p className="mb-1 text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
        </div>
    );
}

function SignalRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-3 text-gray-500">{icon}<span className="text-sm">{label}</span></div>
            <span className="text-sm font-semibold text-gray-900">{value}</span>
        </div>
    );
}

function RiskBadge({ risk }: { risk: string }) {
    const styles: Record<string, string> = {
        Low: "bg-green-50 text-green-700",
        Medium: "bg-yellow-50 text-yellow-700",
        High: "bg-red-50 text-red-700"
    };

    return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[risk] || "bg-gray-100 text-gray-600"}`}>{risk} risk</span>;
}

function SLABadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        Healthy: "bg-green-50 text-green-700 border-green-200",
        Watch: "bg-yellow-50 text-yellow-700 border-yellow-200",
        "At Risk": "bg-red-50 text-red-700 border-red-200"
    };

    return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>{status}</span>;
}
