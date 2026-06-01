import Link from "next/link"
import { Plus, Globe } from "lucide-react"
import { PageHeader } from "@/components"
import { listJobs } from "@/lib/data/jobs"
import { getCurrentOrg } from "@/lib/data/organizations"
import { JobsView } from "./JobsView"

export default async function JobsPage() {
    const [jobs, org] = await Promise.all([listJobs(), getCurrentOrg()])
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://recruitai-test.vercel.app").replace(/\/$/, "")
    const careersUrl = org?.slug ? `${siteUrl}/careers/${org.slug}` : null

    return (
        <div className="p-8 space-y-6">
            <PageHeader
                eyebrow="Hiring"
                title="Active Jobs"
                subtitle="Manage your job postings and hiring pipelines."
                actions={
                    <Link
                        href="/dashboard/jobs/new"
                        className="inline-flex items-center gap-2 rounded-pill bg-accent px-5 h-10 text-[13px] font-bold text-accent-ink hover:bg-accent-hover"
                    >
                        <Plus size={16} /> New Job
                    </Link>
                }
            />

            {careersUrl && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-card bg-card p-4">
                    <span className="inline-flex items-center gap-2 text-sm text-ink-2">
                        <Globe size={16} className="text-accent" /> Your public careers page (open roles auto-listed + Google-indexed):
                    </span>
                    <a href={`/careers/${org!.slug}`} target="_blank" rel="noreferrer" className="break-all text-sm font-medium text-accent hover:underline">
                        {careersUrl}
                    </a>
                </div>
            )}

            <JobsView jobs={jobs} />
        </div>
    )
}
