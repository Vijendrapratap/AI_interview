"use client"

import { mockJobs, mockCandidates } from "@/lib/mockData"
import Link from "next/link"
import { use } from "react"
import { ArrowLeft, MapPin, DollarSign, Users, Filter } from "lucide-react"
import { PageHeader, SectionCard, Badge } from "@/components"

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const job = mockJobs.find(j => j.id === id)
    const candidates = mockCandidates.filter(c => c.job_id === id)

    if (!job) return <div className="p-8 text-ink-2">Job not found</div>

    return (
        <div className="p-8 space-y-6">
            <Link href="/dashboard/jobs" className="inline-flex items-center gap-1.5 text-meta hover:text-ink transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Jobs
            </Link>

            <PageHeader
                eyebrow="Jobs"
                title={job.title}
                subtitle={job.description}
                actions={
                    <div className="flex flex-col items-end gap-1">
                        <div className="text-[11px] text-ink-3 uppercase font-bold tracking-wider">Total Applicants</div>
                        <div className="text-metric">{candidates.length}</div>
                    </div>
                }
            />

            {/* Job meta */}
            <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1 text-meta"><MapPin size={14} /> {job.location}</span>
                <span className="inline-flex items-center gap-1 text-meta"><DollarSign size={14} /> {job.salary_range}</span>
                <Badge tone="accent">{job.type}</Badge>
                <Badge tone={job.status === 'Active' ? 'success' : 'neutral'}>{job.status}</Badge>
            </div>

            <SectionCard
                title="Candidates"
                action={
                    <div className="flex gap-2">
                        <button className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-field text-[13px] text-ink-2 hover:bg-surface-muted">
                            <Filter size={14} /> Pipeline Stage
                        </button>
                    </div>
                }
            >
                <div className="-mx-5 -mb-5">
                    <table className="w-full text-left">
                        <thead className="bg-surface-muted text-ink-3 text-[11px] uppercase font-bold">
                            <tr>
                                <th className="px-6 py-4">
                                    <span className="inline-flex items-center gap-2"><Users size={14} /> Name</span>
                                </th>
                                <th className="px-6 py-4">Match Score</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Verification</th>
                                <th className="px-6 py-4">Missing Skills</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-card">
                            {candidates.map(candidate => (
                                <tr key={candidate.id} className="hover:bg-surface-muted/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-ink">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-pill bg-accent-soft text-accent-soft-ink flex items-center justify-center text-xs font-bold">
                                                {candidate.avatar}
                                            </div>
                                            {candidate.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`font-bold text-[13px] ${candidate.resume_analysis.match_percentage >= 80 ? 'text-success-soft-ink' : 'text-warning-soft-ink'}`}>
                                            {candidate.resume_analysis.match_percentage}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge tone="neutral">{candidate.status}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        {candidate.verification.status === 'Verified' ? (
                                            <Badge tone="success">✓ Verified</Badge>
                                        ) : (
                                            <span className="text-meta">Pending</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-[12px] text-danger-soft-ink">
                                        {candidate.resume_analysis.skills_missing.length > 0
                                            ? candidate.resume_analysis.skills_missing.join(", ")
                                            : <span className="text-ink-3">—</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link href={`/dashboard/candidates/${candidate.id}`} className="text-[13px] font-bold text-accent-soft-ink hover:underline">
                                            View Report
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {candidates.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-meta">
                                        No candidates found for this job yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    )
}
