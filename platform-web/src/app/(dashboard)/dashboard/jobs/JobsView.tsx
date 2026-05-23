"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, Plus, MapPin, DollarSign, Filter, MoreHorizontal, Briefcase } from "lucide-react"
import { Card, Badge, EmptyState } from "@/components"

type Job = {
    id: string
    title: string
    department: string | null
    location: string | null
    employment_type: string
    salary_min: number | null
    salary_max: number | null
    currency: string | null
    status: string
    created_at: string
}

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

export function JobsView({ jobs }: { jobs: Job[] }) {
    const [searchQuery, setSearchQuery] = useState("")

    const filteredJobs = useMemo(() => {
        const q = searchQuery.toLowerCase()
        return jobs.filter(job =>
            job.title.toLowerCase().includes(q) ||
            (job.location ?? "").toLowerCase().includes(q) ||
            (job.department ?? "").toLowerCase().includes(q)
        )
    }, [searchQuery, jobs])

    return (
        <>
            {/* Toolbar */}
            <Card variant="compact" className="flex justify-between items-center">
                <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" size={18} />
                    <input
                        type="text"
                        placeholder="Search jobs, locations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-field text-[13px] text-ink bg-card placeholder:text-ink-3 outline-none focus:border-accent"
                    />
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-3 py-2 border border-border rounded-field text-[13px] text-ink-2 hover:bg-surface-muted">
                        <Filter size={16} /> Filter
                    </button>
                </div>
            </Card>

            <div className="grid gap-4">
                {filteredJobs.length > 0 ? (
                    filteredJobs.map(job => {
                        const salary = formatSalary(job.salary_min, job.salary_max, job.currency)
                        return (
                            <Card key={job.id} className="hover:shadow-card transition-shadow group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-accent-soft rounded-tile flex items-center justify-center text-accent-soft-ink group-hover:bg-accent group-hover:text-accent-ink transition-colors">
                                            <Briefcase size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-card-title">{job.title}</h3>
                                            <div className="flex items-center gap-4 text-meta mt-1">
                                                {job.location && (
                                                    <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
                                                )}
                                                {salary && (
                                                    <span className="flex items-center gap-1"><DollarSign size={14} /> {salary}</span>
                                                )}
                                                <Badge tone="neutral">{job.employment_type}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge tone={statusTone(job.status)}>
                                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                        </Badge>
                                        <button className="p-2 text-ink-3 hover:text-ink-2 rounded-pill hover:bg-surface-muted">
                                            <MoreHorizontal size={20} />
                                        </button>
                                    </div>
                                </div>

                                <div className="border-t border-border-card pt-4 mt-2">
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-6 text-[13px]">
                                            <div className="flex flex-col">
                                                <span className="text-meta uppercase font-semibold">Department</span>
                                                <span className="font-bold text-ink">{job.department ?? "—"}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-meta uppercase font-semibold">Posted</span>
                                                <span className="font-bold text-ink">
                                                    {new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                </span>
                                            </div>
                                        </div>
                                        <Link href={`/dashboard/jobs/${job.id}`} className="text-[13px] font-bold text-accent-soft-ink hover:underline">
                                            View Details
                                        </Link>
                                    </div>
                                </div>
                            </Card>
                        )
                    })
                ) : (
                    <EmptyState
                        icon={<Briefcase size={24} />}
                        title={searchQuery ? `No jobs matching "${searchQuery}"` : "No jobs yet"}
                        description={searchQuery ? "Try a different search term." : "Create your first job posting to start collecting applications."}
                        action={
                            !searchQuery && (
                                <Link
                                    href="/dashboard/jobs/new"
                                    className="inline-flex items-center gap-2 rounded-pill bg-accent px-5 h-10 text-[13px] font-bold text-accent-ink hover:bg-accent-hover"
                                >
                                    <Plus size={16} /> New Job
                                </Link>
                            )
                        }
                    />
                )}
            </div>
        </>
    )
}
