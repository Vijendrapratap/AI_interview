import Link from "next/link"
import { ArrowLeft, MapPin, DollarSign, Users, Briefcase } from "lucide-react"
import { PageHeader, SectionCard, Badge, EmptyState, Avatar, AnalysisStatus } from "@/components"
import { getJob } from "@/lib/data/jobs"
import { listApplications } from "@/lib/data/applications"

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

function candidateInitials(name: string): string {
    return name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase() ?? "")
        .join("")
}

function stageTone(stage: string): "success" | "warning" | "neutral" | "accent" {
    if (stage === "offer" || stage === "hired") return "success"
    if (stage === "interview") return "accent"
    if (stage === "screening") return "warning"
    return "neutral"
}

export default async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const [job, applications] = await Promise.all([getJob(id), listApplications({ jobId: id })])

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

            {/* Candidates */}
            <SectionCard
                title={`Candidates (${applications.length})`}
                action={
                    <Link
                        href="/dashboard/pipeline"
                        className="text-[13px] font-bold text-ink hover:underline shrink-0"
                    >
                        View pipeline
                    </Link>
                }
            >
                {applications.length === 0 ? (
                    <EmptyState
                        icon={<Users size={24} />}
                        title="No candidates yet"
                        description="Applications submitted to this job will appear here."
                    />
                ) : (
                    <div className="-mx-5 -mb-5 divide-y divide-border-card">
                        {applications.map((app) => {
                            const candidateRaw = app.candidates
                            const candidate = Array.isArray(candidateRaw) ? candidateRaw[0] : candidateRaw
                            const name = candidate?.full_name ?? "Unknown"
                            return (
                                <Link
                                    key={app.id}
                                    href={`/dashboard/candidates/${app.candidate_id}`}
                                    className="flex items-center gap-4 px-5 py-4 hover:bg-surface transition-colors"
                                >
                                    <Avatar initials={candidateInitials(name)} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-bold text-ink truncate">{name}</p>
                                        {candidate?.current_role && (
                                            <p className="text-meta truncate">{candidate.current_role}</p>
                                        )}
                                    </div>
                                    <AnalysisStatus
                                        applicationId={app.id}
                                        initialStatus={app.analysis_status as "pending" | "processing" | "complete" | "failed"}
                                        initialScore={app.ai_score}
                                    />
                                    <Badge tone={stageTone(app.stage)}>
                                        {app.stage.charAt(0).toUpperCase() + app.stage.slice(1)}
                                    </Badge>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </SectionCard>
        </div>
    )
}
