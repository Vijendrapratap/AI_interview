"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import {
    TrendingUp,
    AlertTriangle,
    Award,
    ArrowUpRight,
    ArrowRight,
    ArrowDownRight,
    Building2,
    Shield,
    Download
} from "lucide-react"
import { Badge, SectionCard, Card, Button } from "@/components"

// Mock data - Replace with actual API call
// Types for the report
interface CareerAnalytics {
    total_experience_years: number
    employment_gaps: Array<{
        start: string
        end: string
        duration_months: number
        between_companies: string
        severity: string
    }>
    has_significant_gaps: boolean
    average_tenure_months: number
    shortest_tenure: {
        company: string
        title: string
        duration_months: number
        start_date: string
        end_date: string
    }
    longest_tenure: {
        company: string
        title: string
        duration_months: number
        start_date: string
        end_date: string
    }
    job_hopping_risk: string
    roles_under_1_year: number
    roles_under_2_years: number
    industries_worked: string[]
    industry_transitions: Array<{
        from_industry: string
        to_industry: string
        year: number
        from_company: string
        to_company: string
    }>
    is_industry_hopper: boolean
    primary_industry: string
    primary_industry_percentage: number
    trajectory: string
    seniority_progression: string[]
    title_changes: Array<{
        from_title: string
        to_title: string
        from_company: string
        to_company: string
        year: number
        change_type: string
    }>
    red_flags: Array<{
        flag_type: string
        description: string
        severity: string
        details?: Record<string, string | number>
    }>
    leadership_signals: Array<{
        signal: string
        evidence: string
    }>
    career_timeline: Array<{
        company: string
        title: string
        start: string
        end: string
        duration: string
    }>
}

export default function CareerAnalyticsPage() {
    const analysisResult = useAppStore((state) => state.analysisResult)
    const [report, setReport] = useState<CareerAnalytics | null>(null)
    const [loading, setLoading] = useState(true)
    const [, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchAnalysis = async () => {
            if (!analysisResult?.analysisId) {
                setLoading(false)
                return
            }

            try {
                const res = await fetch(`http://localhost:8000/api/v1/analysis/${analysisResult.analysisId}`)
                if (!res.ok) throw new Error("Failed to fetch analysis")

                const data = await res.json()
                if (data.career_analytics) {
                    setReport(data.career_analytics)
                }
            } catch (err) {
                console.error(err)
                setError("Failed to load career data")
            } finally {
                setLoading(false)
            }
        }

        fetchAnalysis()
    }, [analysisResult])

    // Show loading skeleton or empty structure if loading, or if no report but we want to show structure
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
        )
    }

    if (!report) {
        return (
            <div className="text-center py-20">
                <div className="bg-surface-muted rounded-card p-12 max-w-2xl mx-auto border border-border-card">
                    <div className="w-16 h-16 bg-accent-soft text-accent-soft-ink rounded-full flex items-center justify-center mx-auto mb-6">
                        <TrendingUp size={32} />
                    </div>
                    <h2 className="text-card-title text-ink mb-4">No Career Data Yet</h2>
                    <p className="text-ink-2 mb-8 max-w-md mx-auto">
                        Upload your resume to generate a detailed career trajectory analysis.
                    </p>
                    <a
                        href="/portal"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-ink rounded-pill font-bold hover:bg-accent-hover transition-colors"
                    >
                        Analyze Resume
                    </a>
                </div>
            </div>
        )
    }

    const getRiskTone = (risk: string): "success" | "accent" | "warning" | "danger" | "neutral" => {
        const tones: Record<string, "success" | "accent" | "warning" | "danger" | "neutral"> = {
            "none": "success",
            "low": "accent",
            "medium": "warning",
            "high": "danger"
        }
        return tones[risk] || "neutral"
    }

    const getSeverityClasses = (severity: string) => {
        const classes: Record<string, string> = {
            "minor": "border-warning-soft-ink/30 bg-warning-soft text-warning-soft-ink",
            "medium": "border-warning-soft-ink/50 bg-warning-soft text-warning-soft-ink",
            "significant": "border-danger-soft-ink/30 bg-danger-soft text-danger-soft-ink"
        }
        return classes[severity] || classes["minor"]
    }

    const getTrajectoryIcon = (trajectory: string) => {
        switch (trajectory) {
            case "ascending": return <ArrowUpRight className="text-success" size={24} />
            case "lateral": return <ArrowRight className="text-accent" size={24} />
            case "descending": return <ArrowDownRight className="text-danger" size={24} />
            default: return <ArrowRight className="text-ink-2" size={24} />
        }
    }

    const getTrajectoryLabel = (trajectory: string) => {
        const labels: Record<string, { text: string; color: string }> = {
            "ascending": { text: "Career Growing", color: "text-success" },
            "lateral": { text: "Lateral Movement", color: "text-accent" },
            "descending": { text: "Needs Attention", color: "text-danger" },
            "mixed": { text: "Mixed Trajectory", color: "text-warning" }
        }
        return labels[trajectory] || labels["mixed"]
    }

    const getChangeTypeTone = (type: string): "success" | "accent" | "neutral" | "danger" => {
        const tones: Record<string, "success" | "accent" | "neutral" | "danger"> = {
            "promotion": "success",
            "lateral": "accent",
            "role_change": "neutral",
            "demotion": "danger"
        }
        return tones[type] || "neutral"
    }

    return (
        <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid md:grid-cols-4 gap-4">
                {/* Total Experience */}
                <div className="bg-accent rounded-card p-5 text-accent-ink">
                    <div className="text-sm font-medium opacity-80 mb-1">Total Experience</div>
                    <div className="text-4xl font-bold">{report.total_experience_years}</div>
                    <div className="text-sm opacity-80">years</div>
                </div>

                {/* Career Trajectory */}
                <Card className="p-5">
                    <div className="text-sm text-ink-3 mb-1">Career Trajectory</div>
                    <div className="flex items-center gap-2">
                        {getTrajectoryIcon(report.trajectory)}
                        <span className={`text-xl font-bold ${getTrajectoryLabel(report.trajectory).color}`}>
                            {getTrajectoryLabel(report.trajectory).text}
                        </span>
                    </div>
                </Card>

                {/* Average Tenure */}
                <Card className="p-5">
                    <div className="text-sm text-ink-3 mb-1">Average Tenure</div>
                    <div className="text-3xl font-bold text-ink">
                        {(report.average_tenure_months / 12).toFixed(1)} <span className="text-lg text-ink-3">years</span>
                    </div>
                </Card>

                {/* Job Hopping Risk */}
                <Card className="p-5">
                    <div className="text-sm text-ink-3 mb-1">Job Hopping Risk</div>
                    <Badge tone={getRiskTone(report.job_hopping_risk)}>
                        {report.job_hopping_risk.toUpperCase()}
                    </Badge>
                </Card>
            </div>

            {/* Career Timeline */}
            <SectionCard title="Career Timeline">
                <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

                    {/* Timeline Items */}
                    <div className="space-y-4">
                        {report.career_timeline.map((item, index) => (
                            <div key={index} className="relative flex gap-4 pl-4">
                                {/* Timeline Dot */}
                                <div className={`w-5 h-5 rounded-full border-2 bg-card z-10 shrink-0 ${item.end === "Present" ? "border-success" : "border-accent"
                                    }`}>
                                    {item.end === "Present" && (
                                        <div className="w-2.5 h-2.5 bg-success rounded-full m-0.5" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className={`flex-1 bg-card border rounded-card p-4 ${item.end === "Present" ? "border-success/40" : "border-border-card"
                                    }`}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="font-bold text-ink">{item.title}</div>
                                            <div className="text-sm text-ink-2 flex items-center gap-1">
                                                <Building2 size={14} />
                                                {item.company}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-ink-3">{item.start} - {item.end}</div>
                                            <div className="text-xs text-ink-3">{item.duration}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </SectionCard>

            {/* Employment Gaps */}
            <SectionCard
                title="Employment Gaps"
                action={!report.has_significant_gaps ? (
                    <Badge tone="success">No Significant Gaps</Badge>
                ) : undefined}
            >
                {report.employment_gaps.length === 0 ? (
                    <div className="bg-success-soft border border-success-soft-ink/20 rounded-card p-6 text-center">
                        <Shield size={32} className="mx-auto mb-2 text-success-soft-ink" />
                        <div className="text-success-soft-ink font-medium">No employment gaps detected</div>
                        <div className="text-sm text-success-soft-ink/80">Your work history shows continuous employment</div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {report.employment_gaps.map((gap, index) => (
                            <div key={index} className={`border rounded-card p-4 ${getSeverityClasses(gap.severity)}`}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="font-medium">
                                            {gap.duration_months} month gap
                                        </div>
                                        <div className="text-sm opacity-80">
                                            Between {gap.between_companies}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm">{gap.start} - {gap.end}</div>
                                        <div className="text-xs capitalize px-2 py-0.5 rounded-pill bg-card/50 inline-block mt-1">
                                            {gap.severity}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 text-sm opacity-90">
                                    <strong>Tip:</strong> Be prepared to explain this gap positively - focus on any learning, freelance work, or personal development during this time.
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            {/* Job Stability Analysis */}
            <SectionCard title="Job Stability Analysis">
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Longest Tenure */}
                    <div className="bg-success-soft border border-success-soft-ink/20 rounded-card p-5">
                        <div className="text-sm font-medium text-success-soft-ink mb-2 flex items-center gap-1">
                            <Award size={16} />
                            Longest Tenure
                        </div>
                        <div className="text-2xl font-bold text-success-soft-ink mb-1">
                            {(report.longest_tenure.duration_months / 12).toFixed(1)} years
                        </div>
                        <div className="text-sm text-success-soft-ink/80">
                            {report.longest_tenure.title} at {report.longest_tenure.company}
                        </div>
                        <div className="text-xs text-success-soft-ink/60 mt-1">
                            {report.longest_tenure.start_date} - {report.longest_tenure.end_date}
                        </div>
                    </div>

                    {/* Shortest Tenure */}
                    <div className="bg-warning-soft border border-warning-soft-ink/20 rounded-card p-5">
                        <div className="text-sm font-medium text-warning-soft-ink mb-2 flex items-center gap-1">
                            <AlertTriangle size={16} />
                            Shortest Tenure
                        </div>
                        <div className="text-2xl font-bold text-warning-soft-ink mb-1">
                            {report.shortest_tenure.duration_months} months
                        </div>
                        <div className="text-sm text-warning-soft-ink/80">
                            {report.shortest_tenure.title} at {report.shortest_tenure.company}
                        </div>
                        <div className="text-xs text-warning-soft-ink/60 mt-1">
                            {report.shortest_tenure.start_date} - {report.shortest_tenure.end_date}
                        </div>
                    </div>

                    {/* Roles Under 1 Year */}
                    <Card className="p-5">
                        <div className="text-sm text-ink-3 mb-1">Roles Under 1 Year</div>
                        <div className="text-3xl font-bold text-ink">{report.roles_under_1_year}</div>
                        <div className="text-xs text-ink-3 mt-1">
                            {report.roles_under_1_year === 0 ? "Great stability!" : "Consider being prepared to explain short tenures"}
                        </div>
                    </Card>

                    {/* Roles Under 2 Years */}
                    <Card className="p-5">
                        <div className="text-sm text-ink-3 mb-1">Roles Under 2 Years</div>
                        <div className="text-3xl font-bold text-ink">{report.roles_under_2_years}</div>
                        <div className="text-xs text-ink-3 mt-1">
                            Industry average is 2-3 years
                        </div>
                    </Card>
                </div>
            </SectionCard>

            {/* Industry Analysis */}
            <SectionCard title="Industry Analysis">
                <div>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {report.industries_worked.map((industry, i) => (
                            <Badge
                                key={i}
                                tone={industry === report.primary_industry ? "accent" : "neutral"}
                            >
                                {industry}
                                {industry === report.primary_industry && ` (${report.primary_industry_percentage}%)`}
                            </Badge>
                        ))}
                    </div>

                    {report.industry_transitions.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border">
                            <div className="text-sm font-medium text-ink-2 mb-2">Industry Transitions</div>
                            {report.industry_transitions.map((transition, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-ink-2">
                                    <span className="font-medium">{transition.from_industry}</span>
                                    <ArrowRight size={14} className="text-ink-3" />
                                    <span className="font-medium">{transition.to_industry}</span>
                                    <span className="text-ink-3">({transition.year})</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 p-3 bg-accent-soft rounded-tile">
                        <div className="text-sm text-accent-soft-ink">
                            <strong>Assessment:</strong> {report.is_industry_hopper
                                ? "You've worked across multiple industries. Be prepared to explain your diverse background as a strength."
                                : "Your experience is focused in your primary industry, showing deep expertise."}
                        </div>
                    </div>
                </div>
            </SectionCard>

            {/* Career Progression */}
            <SectionCard title="Career Progression">
                <div>
                    {/* Seniority Progression */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-4">
                        {report.seniority_progression.map((level, i) => (
                            <div key={i} className="flex items-center">
                                <div className="bg-accent-soft border border-border-card rounded-tile px-3 py-2 text-sm font-medium text-accent-soft-ink whitespace-nowrap">
                                    {level}
                                </div>
                                {i < report.seniority_progression.length - 1 && (
                                    <ArrowRight size={20} className="mx-1 text-accent/60 shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Title Changes */}
                    <div className="mt-4 pt-4 border-t border-border">
                        <div className="text-sm font-medium text-ink-2 mb-3">Career Moves</div>
                        <div className="space-y-2">
                            {report.title_changes.map((change, i) => (
                                <div key={i} className="flex items-center justify-between bg-surface-muted rounded-tile p-3">
                                    <div className="flex items-center gap-2">
                                        <Badge tone={getChangeTypeTone(change.change_type)}>
                                            {change.change_type}
                                        </Badge>
                                        <span className="text-sm text-ink">
                                            {change.from_title} <ArrowRight size={12} className="inline text-ink-3" /> {change.to_title}
                                        </span>
                                    </div>
                                    <span className="text-sm text-ink-3">{change.year}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </SectionCard>

            {/* Leadership Signals */}
            <SectionCard title="Leadership Signals">
                {report.leadership_signals.length === 0 ? (
                    <div className="bg-warning-soft border border-warning-soft-ink/20 rounded-card p-6 text-center">
                        <AlertTriangle size={32} className="mx-auto mb-2 text-warning-soft-ink" />
                        <div className="text-warning-soft-ink font-medium">Limited leadership signals detected</div>
                        <div className="text-sm text-warning-soft-ink/80">Consider adding more leadership experience to your resume</div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                        {report.leadership_signals.map((signal, i) => (
                            <div key={i} className="bg-accent-soft border border-border-card rounded-card p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Award size={18} className="text-accent-soft-ink" />
                                    <span className="font-bold text-accent-soft-ink">{signal.signal}</span>
                                </div>
                                <p className="text-sm text-ink-2">{signal.evidence}</p>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            {/* Red Flags */}
            {report.red_flags.length > 0 && (
                <SectionCard title="Potential Concerns">
                    <div className="space-y-3">
                        {report.red_flags.map((flag, i) => (
                            <div key={i} className={`border rounded-card p-4 ${flag.severity === "high" ? "border-danger-soft-ink/30 bg-danger-soft" :
                                flag.severity === "medium" ? "border-warning-soft-ink/50 bg-warning-soft" :
                                    "border-warning-soft-ink/20 bg-warning-soft"
                                }`}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className={`font-medium ${flag.severity === "high" ? "text-danger-soft-ink" :
                                            "text-warning-soft-ink"
                                            }`}>
                                            {flag.description}
                                        </div>
                                        {flag.details && (
                                            <div className="text-sm opacity-80 mt-1">
                                                {Object.entries(flag.details).map(([key, value]) => (
                                                    <span key={key} className="mr-3">
                                                        <strong className="capitalize">{key}:</strong> {String(value)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <Badge tone={flag.severity === "high" ? "danger" : "warning"}>
                                        {flag.severity}
                                    </Badge>
                                </div>
                                <div className="mt-3 text-sm opacity-90">
                                    <strong>Preparation Tip:</strong> Be ready to address this positively in interviews. Focus on what you learned and how it shaped your career decisions.
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* Download Button */}
            <div className="flex justify-center pt-4">
                <Button variant="primary">
                    <Download size={18} />
                    Download Career Report (PDF)
                </Button>
            </div>
        </div>
    )
}
