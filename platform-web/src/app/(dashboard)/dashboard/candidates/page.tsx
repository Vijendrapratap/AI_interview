"use client"

import { useMemo, useState } from "react"
import { mockCandidates, mockJobs } from "@/lib/mockData"
import Link from "next/link"
import { ArrowUpDown, Search, Share2, ShieldAlert, Users } from "lucide-react"
import {
    PageHeader,
    Badge,
    Avatar,
    Button,
    FilterChips,
    EmptyState,
    StatCard,
    TableWrap,
    THead,
    TBody,
    TR,
    Th,
    Td,
} from "@/components"

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

    // Compute per-chip counts for status chips
    const statusChips = statuses.map(status => ({
        label: status,
        count: status === "All"
            ? mockCandidates.length
            : mockCandidates.filter(c => c.status === status).length,
    }))

    // Compute per-chip counts for risk chips — label maps to "All risk" / "Low risk" etc
    const riskChipLabels = risks.map(r => (r === "All" ? "All risk" : `${r} risk`))
    const riskChips = risks.map((risk, i) => ({
        label: riskChipLabels[i],
        count: risk === "All"
            ? mockCandidates.length
            : mockCandidates.filter(c => c.risk_level === risk).length,
    }))

    // Active chip label for risk FilterChips must match the chip label string
    const activeRiskChipLabel = riskFilter === "All" ? "All risk" : `${riskFilter} risk`

    function handleRiskChange(label: string) {
        if (label === "All risk") setRiskFilter("All")
        else setRiskFilter(label.replace(" risk", ""))
    }

    return (
        <div className="space-y-8 p-8">
            <PageHeader
                eyebrow="Hiring"
                title="Candidate Pipeline"
                subtitle="Screen, prioritize, and move candidates without leaving the recruiter workspace."
                actions={
                    <>
                        <Button variant="secondary" size="md">Bulk Actions</Button>
                        <Button variant="primary" size="md">Export CSV</Button>
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard
                    icon={<Users size={18} />}
                    value={needsAction.toString()}
                    label="Needs action"
                    chip="Recruiter owned"
                    tone="warning"
                />
                <StatCard
                    icon={<Users size={18} />}
                    value={highFit.toString()}
                    label="High-fit candidates"
                    chip="85+ AI score"
                    tone="success"
                />
                <StatCard
                    icon={<ShieldAlert size={18} />}
                    value={complianceReview.toString()}
                    label="Compliance review"
                    chip="Needs check"
                    tone="danger"
                />
                <StatCard
                    icon={<Users size={18} />}
                    value="2.0d"
                    label="Avg stage age"
                    chip="Open stages"
                    tone="neutral"
                />
            </div>

            {/* Search + filters */}
            <div className="rounded-card border border-border-card bg-card p-4 shadow-card">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="relative w-full xl:w-[34rem]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" size={18} />
                        <input
                            type="text"
                            placeholder="Search candidate, role, req ID, source, owner..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-card border border-border bg-surface py-2 pl-10 pr-4 text-sm text-ink transition-shadow placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <FilterChips
                        chips={statusChips}
                        active={statusFilter}
                        onChange={setStatusFilter}
                    />
                    <div className="border-t border-border pt-3 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
                        <FilterChips
                            chips={riskChips}
                            active={activeRiskChipLabel}
                            onChange={handleRiskChange}
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <TableWrap>
                <THead>
                    <TR>
                        <Th className="sticky left-0 bg-surface">Candidate</Th>
                        <Th>Job / Req</Th>
                        <Th>Stage</Th>
                        <Th>
                            <span className="inline-flex items-center gap-1">
                                AI Fit <ArrowUpDown size={12} />
                            </span>
                        </Th>
                        <Th>Source</Th>
                        <Th>Risk / Compliance</Th>
                        <Th>Owner</Th>
                        <Th>Next Action</Th>
                        <Th>Action</Th>
                    </TR>
                </THead>
                <TBody>
                    {filteredCandidates.length > 0 ? (
                        filteredCandidates.map(candidate => {
                            const job = jobById.get(candidate.job_id)
                            const initials = candidate.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()

                            const statusTone = (s: string) => {
                                if (s === "Offer" || s === "Hired") return "success"
                                if (s === "Rejected") return "danger"
                                if (s === "Interview") return "accent"
                                if (s === "Screening") return "warning"
                                return "neutral"
                            }

                            const riskTone = (r: string) => {
                                if (r === "High") return "danger"
                                if (r === "Medium") return "warning"
                                return "success"
                            }

                            const scoreTone = (n: number) => {
                                if (n >= 80) return "success"
                                if (n >= 60) return "warning"
                                return "danger"
                            }

                            return (
                                <TR key={candidate.id}>
                                    <Td className="sticky left-0 bg-card">
                                        <div className="flex items-center gap-3">
                                            <Avatar initials={initials} size="md" />
                                            <div>
                                                <Link
                                                    href={`/dashboard/candidates/${candidate.id}`}
                                                    className="font-medium text-ink hover:text-accent hover:underline"
                                                >
                                                    {candidate.name}
                                                </Link>
                                                <p className="text-xs text-ink-3">{candidate.email}</p>
                                                <p className="mt-0.5 text-xs text-ink-3">{candidate.last_activity}</p>
                                            </div>
                                        </div>
                                    </Td>
                                    <Td>
                                        <p className="font-medium text-ink">{candidate.role_applied}</p>
                                        <p className="text-xs text-ink-3">{job?.requisition_id ?? candidate.job_id}</p>
                                    </Td>
                                    <Td>
                                        <Badge tone={statusTone(candidate.status) as "success" | "warning" | "danger" | "neutral" | "accent"}>
                                            {candidate.status}
                                        </Badge>
                                        <p className="mt-1 text-xs text-ink-3">{candidate.stage_age_days}d in stage</p>
                                    </Td>
                                    <Td>
                                        <Badge
                                            tone={scoreTone(candidate.score) as "success" | "warning" | "danger"}
                                            title={candidate.screening_summary}
                                        >
                                            {candidate.score}/100
                                        </Badge>
                                        <p className="mt-1 max-w-[10rem] truncate text-xs text-ink-3" title={candidate.screening_summary}>
                                            {candidate.screening_summary.slice(0, 60)}{candidate.screening_summary.length > 60 ? "…" : ""}
                                        </p>
                                    </Td>
                                    <Td className="text-ink-2">{candidate.source}</Td>
                                    <Td>
                                        <Badge tone={riskTone(candidate.risk_level) as "success" | "warning" | "danger"}>
                                            {candidate.risk_level} risk
                                        </Badge>
                                        <div className="mt-1.5 flex items-center gap-1 text-xs text-ink-3">
                                            <ShieldAlert size={12} /> {candidate.compliance_status}
                                        </div>
                                    </Td>
                                    <Td className="text-ink-2">{candidate.owner}</Td>
                                    <Td>
                                        <p className="max-w-[10rem] text-sm text-ink">{candidate.next_action}</p>
                                        <p className="mt-0.5 text-xs text-ink-3">Interview: {candidate.interview_status}</p>
                                    </Td>
                                    <Td>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(`${window.location.origin}/interview/${candidate.id}`);
                                                    alert("Interview link copied to clipboard!");
                                                }}
                                                className="text-ink-3 transition-colors hover:text-accent"
                                                title="Copy Interview Link"
                                            >
                                                <Share2 size={18} />
                                            </button>
                                            <Link
                                                href={`/dashboard/candidates/${candidate.id}`}
                                                className="text-sm font-medium text-accent hover:underline"
                                            >
                                                Review
                                            </Link>
                                        </div>
                                    </Td>
                                </TR>
                            )
                        })
                    ) : (
                        <TR>
                            <td colSpan={9} className="py-2">
                                <EmptyState
                                    icon={<Users size={24} />}
                                    title="No candidates found"
                                    description="No candidates match your current filters. Try adjusting the search or filter chips above."
                                />
                            </td>
                        </TR>
                    )}
                </TBody>
            </TableWrap>

            <div className="flex items-center justify-between text-sm text-ink-3">
                <span>Showing {filteredCandidates.length} results</span>
                <span>AI scores are explainable recommendations; recruiter owns final decisions.</span>
            </div>
        </div>
    )
}
