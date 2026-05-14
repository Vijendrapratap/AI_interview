"use client"

import { useMemo, useState } from "react"
import { mockCandidates, mockJobs } from "@/lib/mockData"
import Link from "next/link"
import { ArrowUpDown, Search, Share2, ShieldAlert } from "lucide-react"

export default function CandidatesPage() {
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("All")
    const [riskFilter, setRiskFilter] = useState("All")

    const jobById = useMemo(() => new Map(mockJobs.map(job => [job.id, job])), [])

    const filteredCandidates = useMemo(() => {
        return mockCandidates.filter(candidate => {
            const job = jobById.get(candidate.job_id)
            const searchable = [
                candidate.name,
                candidate.email,
                candidate.role_applied,
                candidate.source,
                candidate.owner,
                job?.requisition_id ?? ""
            ].join(" ").toLowerCase()

            const matchesSearch = searchable.includes(searchQuery.toLowerCase())
            const matchesStatus = statusFilter === "All" || candidate.status === statusFilter
            const matchesRisk = riskFilter === "All" || candidate.risk_level === riskFilter

            return matchesSearch && matchesStatus && matchesRisk
        })
    }, [jobById, riskFilter, searchQuery, statusFilter])

    const statuses = ["All", "Received", "Screening", "Interview", "Offer", "Rejected"]
    const risks = ["All", "Low", "Medium", "High"]
    const needsAction = mockCandidates.filter(candidate => candidate.status !== "Rejected" && candidate.next_action !== "No action needed").length
    const highFit = mockCandidates.filter(candidate => candidate.score >= 85 && candidate.status !== "Rejected").length
    const complianceReview = mockCandidates.filter(candidate => candidate.compliance_status === "Needs Review").length

    return (
        <div className="p-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Candidate Pipeline</h1>
                    <p className="text-gray-500">Screen, prioritize, and move candidates without leaving the recruiter workspace.</p>
                </div>
                <div className="flex gap-3">
                    <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50">
                        Bulk Actions
                    </button>
                    <button className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700">
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                <Metric label="Needs action" value={needsAction.toString()} detail="Recruiter owned" />
                <Metric label="High-fit candidates" value={highFit.toString()} detail="85+ AI score" />
                <Metric label="Compliance review" value={complianceReview.toString()} detail="Needs recruiter check" />
                <Metric label="Avg stage age" value="2.0d" detail="Across open stages" />
            </div>

            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="relative w-full xl:w-[34rem]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search candidate, role, req ID, source, owner..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {statuses.map(status => (
                            <FilterButton key={status} active={statusFilter === status} onClick={() => setStatusFilter(status)}>
                                {status}
                            </FilterButton>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
                        {risks.map(risk => (
                            <FilterButton key={risk} active={riskFilter === risk} onClick={() => setRiskFilter(risk)}>
                                {risk === "All" ? "All risk" : `${risk} risk`}
                            </FilterButton>
                        ))}
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                            <tr>
                                <th className="px-6 py-4">Candidate</th>
                                <th className="px-6 py-4">Job / Req</th>
                                <th className="px-6 py-4">Stage</th>
                                <th className="px-6 py-4"><span className="inline-flex items-center gap-1">AI Fit <ArrowUpDown size={12} /></span></th>
                                <th className="px-6 py-4">Source</th>
                                <th className="px-6 py-4">Risk / Compliance</th>
                                <th className="px-6 py-4">Owner</th>
                                <th className="px-6 py-4">Next Action</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredCandidates.length > 0 ? (
                                filteredCandidates.map(candidate => {
                                    const job = jobById.get(candidate.job_id)

                                    return (
                                        <tr key={candidate.id} className="group hover:bg-gray-50/80">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-medium text-white">
                                                        {candidate.avatar}
                                                    </div>
                                                    <div>
                                                        <Link href={`/dashboard/candidates/${candidate.id}`} className="font-medium text-gray-900 hover:text-blue-700 hover:underline">
                                                            {candidate.name}
                                                        </Link>
                                                        <p className="text-xs text-gray-500">{candidate.email}</p>
                                                        <p className="mt-1 text-xs text-gray-400">{candidate.last_activity}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-gray-700">{candidate.role_applied}</p>
                                                <p className="text-xs text-gray-500">{job?.requisition_id ?? candidate.job_id}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={candidate.status} />
                                                <p className="mt-1 text-xs text-gray-400">{candidate.stage_age_days}d in stage</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <ScoreBadge score={candidate.score} />
                                                <p className="mt-1 max-w-48 text-xs text-gray-500">{candidate.screening_summary}</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{candidate.source}</td>
                                            <td className="px-6 py-4">
                                                <RiskBadge risk={candidate.risk_level} />
                                                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                                                    <ShieldAlert size={12} /> {candidate.compliance_status}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{candidate.owner}</td>
                                            <td className="px-6 py-4">
                                                <p className="max-w-48 text-sm text-gray-700">{candidate.next_action}</p>
                                                <p className="mt-1 text-xs text-gray-400">Interview: {candidate.interview_status}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(`${window.location.origin}/interview/${candidate.id}`);
                                                            alert("Interview link copied to clipboard!");
                                                        }}
                                                        className="text-gray-400 transition-colors hover:text-blue-600"
                                                        title="Copy Interview Link"
                                                    >
                                                        <Share2 size={18} />
                                                    </button>
                                                    <Link
                                                        href={`/dashboard/candidates/${candidate.id}`}
                                                        className="text-sm font-medium text-blue-600 hover:underline"
                                                    >
                                                        Review
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            ) : (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                        No candidates found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 p-4 text-sm text-gray-500">
                    <span>Showing {filteredCandidates.length} results</span>
                    <span>AI scores are explainable recommendations; recruiter owns final decisions.</span>
                </div>
            </div>
        </div>
    )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">{label}</div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-400">{detail}</div>
        </div>
    )
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${active
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
        >
            {children}
        </button>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        Received: "bg-gray-100 text-gray-600",
        Screening: "bg-blue-100 text-blue-700",
        Interview: "bg-purple-100 text-purple-700",
        Offer: "bg-green-100 text-green-700",
        Hired: "bg-emerald-100 text-emerald-700",
        Rejected: "bg-red-100 text-red-700",
    }

    return <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-600"}`}>{status}</span>
}

function ScoreBadge({ score }: { score: number }) {
    const style = score >= 80 ? "border-green-200 bg-green-50 text-green-700" : score >= 60 ? "border-yellow-200 bg-yellow-50 text-yellow-700" : "border-red-200 bg-red-50 text-red-700"
    return <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}>{score}/100</div>
}

function RiskBadge({ risk }: { risk: string }) {
    const styles: Record<string, string> = {
        Low: "bg-green-50 text-green-700 border-green-200",
        Medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
        High: "bg-red-50 text-red-700 border-red-200"
    }

    return <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${styles[risk] || "bg-gray-50 text-gray-600 border-gray-200"}`}>{risk}</span>
}
