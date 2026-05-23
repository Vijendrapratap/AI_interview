import Link from "next/link"
import { ArrowLeft, MapPin, DollarSign, Users, Briefcase } from "lucide-react"
import { PageHeader, SectionCard, Badge, EmptyState } from "@/components"
import { getJob } from "@/lib/data/jobs"

function formatSalary(min: number | null, max: number | null, currency: string | null): string | null {
    if (!min && !max) return null
    const sym = currency === "USD" ? "$" : (currency ?? "")
    if (min && max) return `${sym}${(min / 1000).toFixed(0)}k – ${sym}${(max / 1000).toFixed(0)}k`
    if (min) return `From ${sym}${(min / 1000).toFixed(0)}k`
    if (max) return `Up to ${sym}${(max / 1000).toFixed(0)}k`
    return null
}

function statusTone(status: string): "success" | "warning" | "neutral" {
    if (status === "open") return "success"
    if (status === "paused") return "warning"
    return "neutral"
}

export default async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const job = await getJob(id)

    if (!job) {
        return (
            <div className="p-8 space-y-6">
                <Link href="/dashboard/jobs" className="inline-flex items-center gap-1.5 text-meta hover:text-ink transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Jobs
                </Link>
                <EmptyState
                    icon={<Briefcase size={24} />}
                    title="Job not found"
                    description="This job posting doesn't exist or may have been removed."
                    action={
                        <Link
                            href="/dashboard/jobs"
                            className="inline-flex items-center gap-2 rounded-pill bg-accent px-5 h-10 text-[13px] font-bold text-accent-ink hover:bg-accent-hover"
                        >
                            Back to Jobs
                        </Link>
                    }
                />
            </div>
        )
    }

    const salary = formatSalary(job.salary_min, job.salary_max, job.currency)

    return (
        <div className="p-8 space-y-6">
            <Link href="/dashboard/jobs" className="inline-flex items-center gap-1.5 text-meta hover:text-ink transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Jobs
            </Link>

            <PageHeader
                eyebrow="Jobs"
                title={job.title}
                subtitle={job.description ?? undefined}
                actions={
                    <div className="flex flex-col items-end gap-1">
                        <div className="text-[11px] text-ink-3 uppercase font-bold tracking-wider">Status</div>
                        <Badge tone={statusTone(job.status)}>
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </Badge>
                    </div>
                }
            />

            {/* Job meta */}
            <div className="flex flex-wrap items-center gap-3">
                {job.location && (
                    <span className="inline-flex items-center gap-1 text-meta"><MapPin size={14} /> {job.location}</span>
                )}
                {salary && (
                    <span className="inline-flex items-center gap-1 text-meta"><DollarSign size={14} /> {salary}</span>
                )}
                <Badge tone="accent">{job.employment_type}</Badge>
                {job.department && (
                    <Badge tone="neutral">{job.department}</Badge>
                )}
            </div>

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
                <SectionCard title="Requirements">
                    <ul className="flex flex-wrap gap-2">
                        {job.requirements.map((req: string, i: number) => (
                            <li key={i}>
                                <Badge tone="neutral">{req}</Badge>
                            </li>
                        ))}
                    </ul>
                </SectionCard>
            )}

            {/* Candidates placeholder */}
            <SectionCard
                title="Candidates"
                action={
                    <div className="flex gap-2">
                        <button className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-field text-[13px] text-ink-2 hover:bg-surface-muted">
                            <Users size={14} /> Pipeline Stage
                        </button>
                    </div>
                }
            >
                <EmptyState
                    icon={<Users size={24} />}
                    title="No candidates yet"
                    description="Applications submitted to this job will appear here."
                />
            </SectionCard>
        </div>
    )
}
