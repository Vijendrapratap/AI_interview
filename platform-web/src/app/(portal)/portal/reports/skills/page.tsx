"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import {
    Target,
    CheckCircle,
    AlertTriangle,
    TrendingUp,
    Lightbulb,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Download
} from "lucide-react"
import { Badge, SectionCard, Button } from "@/components"

// Mock data - Replace with actual API call
// Types
interface SkillsAssessment {
    summary: {
        total_skills: number
        verified_skills: number
        skill_gaps: number
        overall_proficiency: number
    }
    market_comparison: {
        above_market: string[]
        at_market: string[]
        below_market: string[]
    }
    skill_categories: Array<{
        category: string
        skills: Array<{
            name: string
            claimed_level: string | null
            demonstrated_level: string | null
            verified: boolean
            evidence: string
            gap_analysis: string | null
            development_tips: string[]
        }>
    }>
    development_roadmap: {
        high_priority: Array<{
            skill: string
            reason: string
            resources: Array<{ name: string; url: string }>
            estimated_time: string
        }>
        medium_priority: Array<{
            skill: string
            reason: string
            resources: Array<{ name: string; url: string }>
            estimated_time: string
        }>
        low_priority: Array<{
            skill: string
            reason: string
            resources: Array<{ name: string; url: string }>
            estimated_time: string
        }>
    }
}

export default function SkillsAssessmentPage() {
    const analysisResult = useAppStore((state) => state.analysisResult)
    const [report, setReport] = useState<SkillsAssessment | null>(null)
    const [loading, setLoading] = useState(true)
    const [expandedCategories, setExpandedCategories] = useState<string[]>(["Programming Languages", "Frontend Frameworks"])

    useEffect(() => {
        const fetchAnalysis = async () => {
            if (!analysisResult?.analysisId) {
                setLoading(false)
                return
            }

            try {
                const res = await fetch(`/api/v1/analysis/${analysisResult.analysisId}`)
                if (!res.ok) throw new Error("Failed to fetch analysis")

                const data = await res.json()
                if (data.skills_assessment) {
                    setReport(data.skills_assessment)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        fetchAnalysis()
    }, [analysisResult])

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
                        <Target size={32} />
                    </div>
                    <h2 className="text-card-title text-ink mb-4">No Skills Data Yet</h2>
                    <p className="text-ink-2 mb-8 max-w-md mx-auto">
                        Upload your resume to generate a comprehensive skills assessment and roadmap.
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

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        )
    }

    const getLevelTone = (level: string | null): "accent" | "success" | "warning" | "neutral" => {
        if (!level) return "neutral"
        const tones: Record<string, "accent" | "success" | "warning" | "neutral"> = {
            "Expert": "accent",
            "Advanced": "success",
            "Intermediate": "accent",
            "Beginner": "warning"
        }
        return tones[level] || "neutral"
    }

    const getLevelWidth = (level: string | null) => {
        if (!level) return "0%"
        const widths: Record<string, string> = {
            "Expert": "100%",
            "Advanced": "75%",
            "Intermediate": "50%",
            "Beginner": "25%"
        }
        return widths[level] || "0%"
    }

    const getVerificationBadge = (verified: boolean, demonstrated: string | null) => {
        if (!demonstrated) {
            return <Badge tone="neutral">Not Tested</Badge>
        }
        if (verified) {
            return (
                <Badge tone="success">
                    <CheckCircle size={12} /> Verified
                </Badge>
            )
        }
        return <Badge tone="warning">Unverified</Badge>
    }

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-accent rounded-card p-5 text-accent-ink">
                    <div className="text-sm font-medium opacity-80 mb-1">Total Skills</div>
                    <div className="text-4xl font-bold">{report.summary.total_skills}</div>
                </div>
                <div className="bg-success-soft border border-success-soft-ink/20 rounded-card p-5">
                    <div className="text-sm text-success-soft-ink mb-1">Verified Skills</div>
                    <div className="text-4xl font-bold text-success-soft-ink">{report.summary.verified_skills}</div>
                </div>
                <div className="bg-warning-soft border border-warning-soft-ink/20 rounded-card p-5">
                    <div className="text-sm text-warning-soft-ink mb-1">Skill Gaps</div>
                    <div className="text-4xl font-bold text-warning-soft-ink">{report.summary.skill_gaps}</div>
                </div>
                <div className="bg-accent-soft border border-border-card rounded-card p-5">
                    <div className="text-sm text-accent-soft-ink mb-1">Overall Proficiency</div>
                    <div className="text-4xl font-bold text-accent-soft-ink">{report.summary.overall_proficiency}%</div>
                </div>
            </div>

            {/* Market Comparison */}
            <SectionCard title="Market Comparison">
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-success-soft border border-success-soft-ink/20 rounded-card p-4">
                        <div className="text-sm font-medium text-success-soft-ink mb-3 flex items-center gap-1">
                            <TrendingUp size={16} />
                            Above Market Average
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {report.market_comparison.above_market.map(skill => (
                                <Badge key={skill} tone="success">{skill}</Badge>
                            ))}
                        </div>
                    </div>
                    <div className="bg-accent-soft border border-border-card rounded-card p-4">
                        <div className="text-sm font-medium text-accent-soft-ink mb-3 flex items-center gap-1">
                            <Target size={16} />
                            At Market Average
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {report.market_comparison.at_market.map(skill => (
                                <Badge key={skill} tone="accent">{skill}</Badge>
                            ))}
                        </div>
                    </div>
                    <div className="bg-warning-soft border border-warning-soft-ink/20 rounded-card p-4">
                        <div className="text-sm font-medium text-warning-soft-ink mb-3 flex items-center gap-1">
                            <AlertTriangle size={16} />
                            Below Market / Gaps
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {report.market_comparison.below_market.map(skill => (
                                <Badge key={skill} tone="warning">{skill}</Badge>
                            ))}
                        </div>
                    </div>
                </div>
            </SectionCard>

            {/* Skills by Category */}
            <SectionCard title="Skills Breakdown by Category">
                <div className="space-y-3">
                    {report.skill_categories.map((category) => (
                        <div key={category.category} className="border border-border-card rounded-card overflow-hidden">
                            <button
                                onClick={() => toggleCategory(category.category)}
                                className="w-full flex items-center justify-between p-4 bg-surface-muted hover:bg-surface transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-ink">{category.category}</span>
                                    <span className="text-sm text-ink-3">
                                        {category.skills.length} skills
                                    </span>
                                </div>
                                {expandedCategories.includes(category.category) ? (
                                    <ChevronUp size={18} className="text-ink-3" />
                                ) : (
                                    <ChevronDown size={18} className="text-ink-3" />
                                )}
                            </button>

                            {expandedCategories.includes(category.category) && (
                                <div className="p-4 border-t border-border">
                                    <div className="space-y-4">
                                        {category.skills.map((skill) => (
                                            <div key={skill.name} className="border border-border-card rounded-tile p-4">
                                                {/* Skill Header */}
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-ink">{skill.name}</span>
                                                        {getVerificationBadge(skill.verified, skill.demonstrated_level)}
                                                    </div>
                                                </div>

                                                {/* Level Comparison */}
                                                <div className="grid md:grid-cols-2 gap-4 mb-3">
                                                    <div>
                                                        <div className="text-xs text-ink-3 mb-1">Claimed Level (Resume)</div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge tone={getLevelTone(skill.claimed_level)}>
                                                                {skill.claimed_level || "Not Listed"}
                                                            </Badge>
                                                            <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-border-card rounded-full"
                                                                    style={{ width: getLevelWidth(skill.claimed_level) }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-ink-3 mb-1">Demonstrated Level (Interview)</div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge tone={getLevelTone(skill.demonstrated_level)}>
                                                                {skill.demonstrated_level || "Not Tested"}
                                                            </Badge>
                                                            <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${skill.demonstrated_level ? "bg-accent" : "bg-border-card"}`}
                                                                    style={{ width: getLevelWidth(skill.demonstrated_level) }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Evidence */}
                                                <div className="text-sm text-ink-2 mb-2">
                                                    <span className="font-medium">Evidence:</span> {skill.evidence}
                                                </div>

                                                {/* Gap Analysis */}
                                                {skill.gap_analysis && (
                                                    <div className="bg-warning-soft border border-warning-soft-ink/20 rounded-tile p-2 text-sm text-warning-soft-ink mb-2">
                                                        <AlertTriangle size={14} className="inline mr-1" />
                                                        <span className="font-medium">Gap:</span> {skill.gap_analysis}
                                                    </div>
                                                )}

                                                {/* Development Tips */}
                                                {skill.development_tips.length > 0 && (
                                                    <div className="bg-accent-soft border border-border-card rounded-tile p-2">
                                                        <div className="text-xs font-medium text-accent-soft-ink mb-1 flex items-center gap-1">
                                                            <Lightbulb size={12} />
                                                            Development Tips
                                                        </div>
                                                        <ul className="text-sm text-accent-soft-ink">
                                                            {skill.development_tips.map((tip, i) => (
                                                                <li key={i} className="flex items-start gap-1">
                                                                    <span className="opacity-60">•</span>
                                                                    {tip}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </SectionCard>

            {/* Development Roadmap */}
            <SectionCard title="Development Roadmap">
                {/* High Priority */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 bg-danger rounded-full" />
                        <span className="font-bold text-ink">High Priority</span>
                        <span className="text-sm text-ink-3">- Start now for maximum impact</span>
                    </div>
                    <div className="space-y-3">
                        {report.development_roadmap.high_priority.map((item, i) => (
                            <div key={i} className="bg-danger-soft border border-danger-soft-ink/20 rounded-card p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <span className="font-bold text-danger-soft-ink">{item.skill}</span>
                                        <p className="text-sm text-danger-soft-ink/80 mt-1">{item.reason}</p>
                                    </div>
                                    <Badge tone="danger">{item.estimated_time}</Badge>
                                </div>
                                <div className="mt-3">
                                    <div className="text-xs font-medium text-danger-soft-ink mb-2">Recommended Resources:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {item.resources.map((resource, j) => (
                                            <a
                                                key={j}
                                                href={resource.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-sm text-danger-soft-ink bg-card px-3 py-1 rounded-tile border border-danger-soft-ink/20 hover:bg-danger-soft/50 transition-colors"
                                            >
                                                {resource.name}
                                                <ExternalLink size={12} />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Medium Priority */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 bg-warning rounded-full" />
                        <span className="font-bold text-ink">Medium Priority</span>
                        <span className="text-sm text-ink-3">- Plan for next quarter</span>
                    </div>
                    <div className="space-y-3">
                        {report.development_roadmap.medium_priority.map((item, i) => (
                            <div key={i} className="bg-warning-soft border border-warning-soft-ink/20 rounded-card p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <span className="font-bold text-warning-soft-ink">{item.skill}</span>
                                        <p className="text-sm text-warning-soft-ink/80 mt-1">{item.reason}</p>
                                    </div>
                                    <Badge tone="warning">{item.estimated_time}</Badge>
                                </div>
                                <div className="mt-3">
                                    <div className="text-xs font-medium text-warning-soft-ink mb-2">Recommended Resources:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {item.resources.map((resource, j) => (
                                            <a
                                                key={j}
                                                href={resource.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-sm text-warning-soft-ink bg-card px-3 py-1 rounded-tile border border-warning-soft-ink/20 hover:bg-warning-soft/50 transition-colors"
                                            >
                                                {resource.name}
                                                <ExternalLink size={12} />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Low Priority */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 bg-success rounded-full" />
                        <span className="font-bold text-ink">Low Priority</span>
                        <span className="text-sm text-ink-3">- Nice to have</span>
                    </div>
                    <div className="space-y-3">
                        {report.development_roadmap.low_priority.map((item, i) => (
                            <div key={i} className="bg-success-soft border border-success-soft-ink/20 rounded-card p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <span className="font-bold text-success-soft-ink">{item.skill}</span>
                                        <p className="text-sm text-success-soft-ink/80 mt-1">{item.reason}</p>
                                    </div>
                                    <Badge tone="success">{item.estimated_time}</Badge>
                                </div>
                                <div className="mt-3">
                                    <div className="text-xs font-medium text-success-soft-ink mb-2">Recommended Resources:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {item.resources.map((resource, j) => (
                                            <a
                                                key={j}
                                                href={resource.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-sm text-success-soft-ink bg-card px-3 py-1 rounded-tile border border-success-soft-ink/20 hover:bg-success-soft/50 transition-colors"
                                            >
                                                {resource.name}
                                                <ExternalLink size={12} />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </SectionCard>

            {/* Download Button */}
            <div className="flex justify-center pt-4">
                <Button variant="primary">
                    <Download size={18} />
                    Download Skills Report (PDF)
                </Button>
            </div>
        </div>
    )
}
