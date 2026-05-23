import Link from "next/link"
import { Plus } from "lucide-react"
import { PageHeader } from "@/components"
import { listJobs } from "@/lib/data/jobs"
import { JobsView } from "./JobsView"

export default async function JobsPage() {
    const jobs = await listJobs()

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

            <JobsView jobs={jobs} />
        </div>
    )
}
