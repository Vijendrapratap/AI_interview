"use client"

import { mockCandidates, mockJobs } from "@/lib/mockData"
import Link from "next/link"

import { use } from "react"
import {
    ArrowLeft, CheckCircle, AlertTriangle, FileText,
    Shield, Send, Zap
} from "lucide-react"
import {
    PageHeader,
    Avatar,
    Badge,
    Button,
    SectionCard,
    Card,
} from "@/components"

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const candidate = mockCandidates.find(c => c.id === id)
    if (!candidate) return <div className="p-8 text-ink">Candidate not found</div>

    const job = mockJobs.find(j => j.id === candidate.job_id)
    const initials = candidate.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()

    const verificationTone = candidate.verification.status === "Verified" ? "success" : "neutral"

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-8">
            <Link
                href="/dashboard/candidates"
                className="inline-flex items-center gap-2 text-sm text-ink-2 transition-colors hover:text-ink"
            >
                <ArrowLeft className="h-4 w-4" /> Back to Candidates
            </Link>

            <PageHeader
                eyebrow="Candidate"
                title={candidate.name}
                subtitle={`${candidate.role_applied} · ${candidate.email}`}
                actions={
                    <>
                        <Avatar initials={initials} size="lg" />
                        <Link href={`/interview/mock-session-${candidate.id}`} target="_blank">
                            <Button variant="primary" size="md">
                                <Send size={16} /> Start Interview Now
                            </Button>
                        </Link>
                    </>
                }
            />

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <ScoreCard label="Experience" score={candidate.resume_analysis.experience_score} />
                <ScoreCard label="Education" score={candidate.resume_analysis.education_score} />
                <ScoreCard label="Tech Skills" score={candidate.resume_analysis.technical_score} />
                <ScoreCard label="Soft Skills" score={candidate.resume_analysis.soft_skills_score} />
            </div>

            {/* Red Flags Alert */}
            {candidate.analytics && (candidate.analytics.job_stability?.job_hopping_risk || candidate.analytics.gap_analysis?.has_gaps) && (
                <div className="rounded-card border border-border-card bg-danger-soft p-6">
                    <div className="flex items-start gap-4">
                        <div className="rounded-tile bg-card p-2 text-danger-soft-ink">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="text-card-title mb-2 text-danger-soft-ink">Attention Required</h3>
                            <div className="space-y-1">
                                {candidate.analytics.job_stability?.job_hopping_risk && (
                                    <div className="flex items-center gap-2 text-sm text-danger-soft-ink">
                                        <span className="h-1.5 w-1.5 rounded-full bg-danger-soft-ink" />
                                        Job Hopping Detected: {candidate.analytics.job_stability.flags[0]}
                                    </div>
                                )}
                                {candidate.analytics.gap_analysis?.has_gaps && candidate.analytics.gap_analysis.gaps.map((gap: { duration_months: number; between: string }, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-sm text-danger-soft-ink">
                                        <span className="h-1.5 w-1.5 rounded-full bg-danger-soft-ink" />
                                        Employment Gap: {gap.duration_months} months between {gap.between}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Left Column: Analysis */}
                <div className="space-y-8 lg:col-span-2">

                    {/* Identity Verification */}
                    <SectionCard
                        title="Identity Verification"
                        action={
                            <Badge tone={verificationTone as "success" | "neutral"}>
                                <CheckCircle size={12} className="mr-1" />
                                {candidate.verification.status}
                            </Badge>
                        }
                    >
                        {candidate.verification.id_data ? (
                            <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                                <div>
                                    <div className="text-eyebrow mb-1">Government ID</div>
                                    <div className="font-semibold text-ink">{candidate.verification.id_data.id_type}</div>
                                    <div className="mt-1 flex items-center gap-1 text-xs text-success-soft-ink">
                                        <CheckCircle size={10} /> Validated
                                    </div>
                                </div>
                                <div>
                                    <div className="text-eyebrow mb-1">Age Verified</div>
                                    <div className="font-semibold text-ink">{candidate.verification.id_data.age_verified} yrs</div>
                                    <div className="text-xs text-ink-3">DOB: {candidate.verification.id_data.dob}</div>
                                </div>
                                <div>
                                    <div className="text-eyebrow mb-1">Face Match</div>
                                    <div className="font-semibold text-ink">{candidate.verification.id_data.face_match}%</div>
                                    <div className="text-xs text-success-soft-ink">High Confidence</div>
                                </div>
                                <div>
                                    <div className="text-eyebrow mb-1">Nationality</div>
                                    <div className="font-semibold text-ink">{candidate.verification.id_data.nationality}</div>
                                </div>
                                <div className="col-span-2 rounded-tile border border-border-card bg-surface-muted p-3">
                                    <div className="text-eyebrow mb-1">Data Consistency Check</div>
                                    <div className="flex items-center gap-2 text-sm text-ink">
                                        <CheckCircle size={14} className="text-success-soft-ink" /> Name match
                                        <CheckCircle size={14} className="text-success-soft-ink" /> DOB match
                                        <CheckCircle size={14} className="text-success-soft-ink" /> Ethnicity Inference ({candidate.verification.id_data.ethnicity_check})
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-6 text-center text-ink-3">
                                <Shield size={40} className="mx-auto mb-2 text-ink-3" />
                                <p>No government ID data uploaded yet.</p>
                            </div>
                        )}
                    </SectionCard>

                    {/* JD Skills Compatibility */}
                    <SectionCard
                        title="JD Skills Compatibility"
                        action={
                            <span className="text-sm font-medium text-ink-2 flex items-center gap-1">
                                <Zap size={14} /> Target: {job?.title}
                            </span>
                        }
                    >
                        <div className="flex flex-wrap gap-2 mb-6">
                            {job?.required_skills?.map(skill => {
                                const hasSkill = candidate.resume_analysis.skills_found.includes(skill)
                                return (
                                    <span
                                        key={skill}
                                        className={`inline-flex items-center gap-1 rounded-pill border px-3 py-1 text-sm font-medium ${hasSkill
                                            ? "border-border-card bg-success-soft text-success-soft-ink"
                                            : "border-border-card bg-danger-soft text-danger-soft-ink"
                                            }`}
                                    >
                                        {hasSkill ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                                        {skill}
                                    </span>
                                )
                            })}
                        </div>
                        <div className="rounded-tile border border-border-card bg-accent-soft p-4">
                            <h4 className="mb-2 text-sm font-bold text-accent-soft-ink">AI Recommendation Engine</h4>
                            <p className="text-sm leading-relaxed text-accent-soft-ink">
                                Candidate is a {candidate.recommendation.toLowerCase()} match. They possess strong
                                fundamentals in {candidate.resume_analysis.skills_found.slice(0, 3).join(", ")}.
                                {candidate.resume_analysis.skills_missing.length > 0
                                    ? ` However, they are missing critical requirements: ${candidate.resume_analysis.skills_missing.join(", ")}.`
                                    : " No critical skill gaps identified."}
                            </p>
                        </div>
                    </SectionCard>

                    {/* Deep Resume Analysis */}
                    <SectionCard
                        title="Deep Resume Analysis"
                        action={
                            <div className="flex gap-4 text-sm text-ink-2">
                                <span className="flex items-center gap-1"><FileText size={14} /> Quality: <b>{candidate.resume_analysis.quality_score}/100</b></span>
                                <span>ATS: <b>{candidate.resume_analysis.ats_score}/100</b></span>
                            </div>
                        }
                    >
                        <div className="mb-4">
                            <h4 className="mb-2 text-sm font-semibold text-ink">Technical Skills Detected</h4>
                            <div className="flex flex-wrap gap-2">
                                {candidate.resume_analysis.skills_found.map(skill => (
                                    <Badge key={skill} tone="neutral">{skill}</Badge>
                                ))}
                            </div>
                        </div>
                    </SectionCard>

                    {/* Career Analytics */}
                    <SectionCard title="Career Analytics">
                        <div className="space-y-6">
                            {/* Tenure & Stability */}
                            <div>
                                <h4 className="text-eyebrow mb-3">Job Stability</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-tile bg-surface-muted p-4">
                                        <div className="text-meta mb-1">Avg Tenure</div>
                                        <div className="text-metric">
                                            {candidate.analytics?.job_stability?.average_tenure_years ?? "N/A"}{" "}
                                            <span className="text-sm font-normal text-ink-3">years</span>
                                        </div>
                                    </div>
                                    <div className="rounded-tile bg-surface-muted p-4">
                                        <div className="text-meta mb-1">Risk Level</div>
                                        <div className="text-lg font-bold">
                                            {candidate.analytics?.job_stability?.job_hopping_risk ? (
                                                <span className="text-danger-soft-ink">High Risk</span>
                                            ) : (
                                                <span className="text-success-soft-ink">Low Risk</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Leadership */}
                            <div>
                                <h4 className="text-eyebrow mb-3">Leadership Signals</h4>
                                <div className="flex flex-wrap gap-2">
                                    {(candidate.analytics?.leadership_signals?.length || 0) > 0
                                        ? (candidate.analytics?.leadership_signals ?? []).map((signal: string) => (
                                            <Badge key={signal} tone="accent">{signal}</Badge>
                                        ))
                                        : (
                                            <span className="text-sm italic text-ink-3">No strong leadership signals detected in resume text.</span>
                                        )}
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                </div>

                {/* Right Column: Interview & Documents */}
                <div className="space-y-6">
                    <SectionCard title="Verification Documents">
                        <div className="space-y-3">
                            {candidate.verification.docs.map(doc => (
                                <div key={doc} className="flex items-center gap-3 rounded-tile border border-border-card p-3">
                                    <Shield size={18} className="text-success-soft-ink" />
                                    <span className="flex-1 text-sm font-medium text-ink">{doc}</span>
                                    <Badge tone="success">Valid</Badge>
                                </div>
                            ))}
                            {candidate.verification.docs.length === 0 && (
                                <p className="text-sm text-ink-3">No documents uploaded.</p>
                            )}
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    )
}

function ScoreCard({ label, score }: { label: string; score: number }) {
    const tone = score >= 80 ? "success" : score >= 60 ? "warning" : "danger"
    const barColors: Record<string, string> = {
        success: "bg-success-soft-ink",
        warning: "bg-warning-soft-ink",
        danger: "bg-danger-soft-ink",
    }
    return (
        <Card className="flex items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-pill font-bold text-lg bg-${tone}-soft text-${tone}-soft-ink`}>
                {score}
            </div>
            <div className="min-w-0 flex-1">
                <div className="text-eyebrow mb-1">{label}</div>
                <div className="h-2 w-full overflow-hidden rounded-pill bg-surface-muted">
                    <div className={`h-full rounded-pill ${barColors[tone]}`} style={{ width: `${score}%` }} />
                </div>
            </div>
        </Card>
    )
}
