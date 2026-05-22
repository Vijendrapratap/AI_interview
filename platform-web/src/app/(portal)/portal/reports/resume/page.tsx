"use client"

import { useState, useEffect } from "react"
import {
    CheckCircle,
    AlertTriangle,
    Lightbulb,
    ArrowRight,
    Download,
    Loader2
} from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Badge, SectionCard, Button } from "@/components"

interface SectionAnalysis {
    section_name: string
    current_score: number
    issues: string[]
    recommendations: string[]
    before_after_examples: Array<{ before: string; after: string }>
}

interface ResumeReport {
    analysis_id: string
    resume_id: string
    overall_score: number
    score_breakdown: {
        ats_score?: number
        content_score?: number
        format_score?: number
        jd_match_score?: number
    }
    section_analysis: SectionAnalysis[]
    keyword_analysis: {
        found_keywords?: Record<string, string[]>
        missing_keywords?: string[]
        keyword_density?: number
        industry_terms?: string[]
    }
    ats_optimization: {
        score?: number
        passed_checks?: string[]
        failed_checks?: string[]
        recommendations?: string[]
    }
    priority_actions: Array<{ action: string; impact: string; urgency: string }>
    rewrite_examples: Array<{ original: string; improved: string; explanation?: string }>
}

export default function ResumeAnalysisPage() {
    const analysisResult = useAppStore((state) => state.analysisResult)
    const [report, setReport] = useState<ResumeReport | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedSections, setExpandedSections] = useState<string[]>([])

    useEffect(() => {
        const fetchReport = async () => {
            if (!analysisResult) {
                setError("No analysis found. Please analyze a resume first.")
                setIsLoading(false)
                return
            }

            // Build report from stored analysis data (works even if backend report fails)
            const buildReportFromAnalysis = () => {
                const sections = analysisResult.sections || {}
                const keywords = analysisResult.keywords || {}

                // Build section analysis from available data
                const sectionAnalysis: SectionAnalysis[] = []
                if (sections.experience_summary || sections.experience) {
                    sectionAnalysis.push({
                        section_name: "Experience",
                        current_score: analysisResult.score || 70,
                        issues: [],
                        recommendations: analysisResult.suggestions || [],
                        before_after_examples: []
                    })
                }
                if (sections.education || analysisResult.improvements?.length) {
                    sectionAnalysis.push({
                        section_name: "Skills & Education",
                        current_score: analysisResult.atsScore || 70,
                        issues: [],
                        recommendations: [],
                        before_after_examples: []
                    })
                }

                return {
                    analysis_id: analysisResult.analysisId || "",
                    resume_id: analysisResult.resumeId || "",
                    overall_score: analysisResult.score || 0,
                    score_breakdown: {
                        ats_score: analysisResult.atsScore || 0,
                        content_score: analysisResult.contentScore || 0,
                        format_score: analysisResult.formatScore || 0,
                        jd_match_score: analysisResult.fitScore || undefined
                    },
                    section_analysis: sectionAnalysis,
                    keyword_analysis: {
                        found_keywords: keywords.technical_skills
                            ? { technical: keywords.technical_skills as string[] }
                            : undefined,
                        missing_keywords: analysisResult.missingSkills || [],
                        keyword_density: 0
                    },
                    ats_optimization: {
                        score: analysisResult.atsScore || 0,
                        passed_checks: [],
                        failed_checks: [],
                        recommendations: []
                    },
                    priority_actions: (analysisResult.suggestions || []).map((s: string, i: number) => ({
                        action: s,
                        impact: i === 0 ? "high" : "medium",
                        urgency: i === 0 ? "high" : "medium"
                    })),
                    rewrite_examples: []
                }
            }

            // Try to fetch from backend first
            if (analysisResult.analysisId) {
                try {
                    const response = await fetch(
                        `http://localhost:8000/api/v1/report/resume/${analysisResult.analysisId}`
                    )

                    if (response.ok) {
                        const data = await response.json()
                        // Check if backend returned meaningful data
                        if (data.overall_score > 0 || data.section_analysis?.length > 0) {
                            setReport(data)
                            if (data.section_analysis?.length > 0) {
                                setExpandedSections([data.section_analysis[0].section_name])
                            }
                            setIsLoading(false)
                            return
                        }
                    }
                } catch (err) {
                    console.warn("Backend report fetch failed, using local data:", err)
                }
            }

            // Fallback: use local analysis data
            const localReport = buildReportFromAnalysis()
            setReport(localReport)
            if (localReport.section_analysis?.length > 0) {
                setExpandedSections([localReport.section_analysis[0].section_name])
            }
            setIsLoading(false)
        }

        fetchReport()
    }, [analysisResult])

    const toggleSection = (sectionName: string) => {
        setExpandedSections(prev =>
            prev.includes(sectionName)
                ? prev.filter(s => s !== sectionName)
                : [...prev, sectionName]
        )
    }

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-success"
        if (score >= 60) return "text-warning"
        return "text-danger"
    }

    const getScoreBg = (score: number) => {
        if (score >= 80) return "bg-success-soft"
        if (score >= 60) return "bg-warning-soft"
        return "bg-danger-soft"
    }

    const getImpactBadgeTone = (impact: string): "success" | "warning" | "danger" | "neutral" => {
        const tones: Record<string, "success" | "warning" | "danger" | "neutral"> = {
            high: "danger",
            medium: "warning",
            low: "neutral"
        }
        return tones[impact?.toLowerCase()] || "neutral"
    }

    const handleDownloadPdf = async () => {
        if (!analysisResult?.analysisId) return

        try {
            const response = await fetch(
                `http://localhost:8000/api/v1/report/resume/${analysisResult.analysisId}/pdf`
            )

            if (!response.ok) throw new Error("Failed to download PDF")

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `resume_report_${analysisResult.analysisId}.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (err) {
            console.error("Error downloading PDF:", err)
            alert("Failed to download PDF. Please try again.")
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-ink-2">Loading report...</span>
            </div>
        )
    }

    if (error || !report) {
        return (
            <div className="text-center py-20">
                <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
                <p className="text-ink-2">{error || "No report data available"}</p>
                <p className="text-sm text-ink-3 mt-2">
                    Go back to the portal and analyze a resume first.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Overall Score Section */}
            <div className="grid md:grid-cols-5 gap-4">
                {/* Main Score */}
                <div className="md:col-span-2 bg-accent rounded-card p-6 text-accent-ink">
                    <div className="text-sm font-medium opacity-80 mb-1">Overall Resume Score</div>
                    <div className="text-5xl font-bold mb-2">{report.overall_score}<span className="text-2xl">/100</span></div>
                    <div className="text-sm opacity-80">
                        {report.overall_score >= 80 ? "Excellent — Your resume is well-optimized" :
                         report.overall_score >= 60 ? "Good — Some improvements recommended" :
                         "Needs Work — Follow our suggestions below"}
                    </div>
                </div>

                {/* Score Breakdown */}
                <div className="md:col-span-3 grid grid-cols-2 gap-3">
                    {Object.entries(report.score_breakdown || {}).map(([key, value]) => (
                        <div key={key} className="bg-surface-muted rounded-card p-4">
                            <div className="text-eyebrow mb-1">
                                {key.replace(/_/g, " ").replace("score", "")}
                            </div>
                            <div className={`text-2xl font-bold ${getScoreColor(value || 0)}`}>
                                {value || "N/A"}
                            </div>
                            {value && (
                                <div className="mt-2 h-2 bg-border rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${value >= 80 ? "bg-success" : value >= 60 ? "bg-warning" : "bg-danger"}`}
                                        style={{ width: `${value}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Detected Skills */}
            {analysisResult && (analysisResult.topSkills?.length > 0 || analysisResult.missingSkills?.length > 0) && (
                <SectionCard title="Skills Overview">
                    <div className="grid md:grid-cols-2 gap-4">
                        {analysisResult.topSkills?.length > 0 && (
                            <div className="bg-success-soft border border-success-soft-ink/20 rounded-card p-4">
                                <div className="text-sm font-bold text-success-soft-ink mb-3">Detected Skills</div>
                                <div className="flex flex-wrap gap-2">
                                    {analysisResult.topSkills.map((skill: string) => (
                                        <Badge key={skill} tone="success">{skill}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        {analysisResult.missingSkills?.length > 0 && (
                            <div className="bg-warning-soft border border-warning-soft-ink/20 rounded-card p-4">
                                <div className="text-sm font-bold text-warning-soft-ink mb-3">Skills to Add</div>
                                <div className="flex flex-wrap gap-2">
                                    {analysisResult.missingSkills.map((skill: string) => (
                                        <Badge key={skill} tone="warning">+ {skill}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </SectionCard>
            )}

            {/* Suggestions from Analysis */}
            {analysisResult?.suggestions && analysisResult.suggestions.length > 0 && (
                <SectionCard title="AI Recommendations">
                    <div className="bg-accent-soft border border-border-card rounded-card p-4">
                        <ul className="space-y-2">
                            {analysisResult.suggestions.map((suggestion: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-accent-soft-ink">
                                    <CheckCircle size={16} className="text-accent mt-0.5 shrink-0" />
                                    {suggestion}
                                </li>
                            ))}
                        </ul>
                    </div>
                </SectionCard>
            )}

            {/* Section-by-Section Analysis */}
            {report.section_analysis && report.section_analysis.length > 0 && (
                <SectionCard title="Section-by-Section Analysis">
                    <div className="space-y-3">
                        {report.section_analysis.map((section) => (
                            <div key={section.section_name} className="border border-border-card rounded-card overflow-hidden">
                                <button
                                    onClick={() => toggleSection(section.section_name)}
                                    className="w-full flex items-center justify-between p-4 bg-surface-muted hover:bg-surface transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-tile flex items-center justify-center ${getScoreBg(section.current_score)}`}>
                                            <span className={`font-bold ${getScoreColor(section.current_score)}`}>
                                                {section.current_score}
                                            </span>
                                        </div>
                                        <span className="font-medium text-ink">{section.section_name}</span>
                                    </div>
                                    <ArrowRight
                                        size={18}
                                        className={`text-ink-3 transition-transform ${expandedSections.includes(section.section_name) ? "rotate-90" : ""}`}
                                    />
                                </button>

                                {expandedSections.includes(section.section_name) && (
                                    <div className="p-4 border-t border-border space-y-4">
                                        {/* Issues */}
                                        {section.issues && section.issues.length > 0 && (
                                            <div>
                                                <div className="text-eyebrow text-danger mb-2 flex items-center gap-1">
                                                    <AlertTriangle size={14} />
                                                    Issues Found
                                                </div>
                                                <ul className="space-y-1">
                                                    {section.issues.map((issue, i) => (
                                                        <li key={i} className="text-sm text-ink-2 flex items-start gap-2">
                                                            <span className="text-danger mt-1">•</span>
                                                            {issue}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Recommendations */}
                                        {section.recommendations && section.recommendations.length > 0 && (
                                            <div>
                                                <div className="text-eyebrow text-accent mb-2 flex items-center gap-1">
                                                    <Lightbulb size={14} />
                                                    Recommendations
                                                </div>
                                                <ul className="space-y-1">
                                                    {section.recommendations.map((rec, i) => (
                                                        <li key={i} className="text-sm text-ink-2 flex items-start gap-2">
                                                            <CheckCircle size={14} className="text-accent mt-0.5 shrink-0" />
                                                            {rec}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Before/After Examples */}
                                        {section.before_after_examples && section.before_after_examples.length > 0 && (
                                            <div>
                                                <div className="text-eyebrow text-success mb-2">
                                                    Rewrite Examples
                                                </div>
                                                {section.before_after_examples.map((example, i) => (
                                                    <div key={i} className="grid md:grid-cols-2 gap-3">
                                                        <div className="bg-danger-soft border border-danger-soft-ink/20 rounded-tile p-3">
                                                            <div className="text-xs font-medium text-danger-soft-ink mb-1">Before</div>
                                                            <p className="text-sm text-ink">{example.before}</p>
                                                        </div>
                                                        <div className="bg-success-soft border border-success-soft-ink/20 rounded-tile p-3">
                                                            <div className="text-xs font-medium text-success-soft-ink mb-1">After</div>
                                                            <p className="text-sm text-ink whitespace-pre-line">{example.after}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* Keyword Analysis */}
            {report.keyword_analysis && (
                <SectionCard title="Keyword Analysis">
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Found Keywords */}
                        {report.keyword_analysis.found_keywords && (
                            <div className="bg-success-soft border border-success-soft-ink/20 rounded-card p-4">
                                <div className="text-sm font-bold text-success-soft-ink mb-3">Found Keywords</div>
                                <div className="space-y-3">
                                    {Object.entries(report.keyword_analysis.found_keywords).map(([category, keywords]) => (
                                        <div key={category}>
                                            <div className="text-eyebrow mb-1">{category}</div>
                                            <div className="flex flex-wrap gap-1">
                                                {(keywords as string[]).map((kw: string) => (
                                                    <Badge key={kw} tone="success">{kw}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Missing Keywords */}
                        {report.keyword_analysis.missing_keywords && report.keyword_analysis.missing_keywords.length > 0 && (
                            <div className="bg-danger-soft border border-danger-soft-ink/20 rounded-card p-4">
                                <div className="text-sm font-bold text-danger-soft-ink mb-3">Missing Keywords (Consider Adding)</div>
                                <div className="flex flex-wrap gap-2">
                                    {report.keyword_analysis.missing_keywords.map((kw) => (
                                        <Badge key={kw} tone="danger">+ {kw}</Badge>
                                    ))}
                                </div>
                                {report.keyword_analysis.keyword_density && (
                                    <div className="mt-4 text-sm text-ink-2">
                                        <span className="font-medium">Keyword Density:</span> {report.keyword_analysis.keyword_density}%
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </SectionCard>
            )}

            {/* ATS Optimization */}
            {report.ats_optimization && (
                <SectionCard title="ATS Optimization">
                    <div>
                        {report.ats_optimization.score && (
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`text-3xl font-bold ${getScoreColor(report.ats_optimization.score)}`}>
                                    {report.ats_optimization.score}%
                                </div>
                                <div className="text-sm text-ink-2">ATS Compatibility Score</div>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-4">
                            {report.ats_optimization.passed_checks && report.ats_optimization.passed_checks.length > 0 && (
                                <div>
                                    <div className="text-eyebrow text-success mb-2">Passed Checks</div>
                                    <ul className="space-y-1">
                                        {report.ats_optimization.passed_checks.map((check, i) => (
                                            <li key={i} className="text-sm text-ink-2 flex items-start gap-2">
                                                <CheckCircle size={14} className="text-success mt-0.5 shrink-0" />
                                                {check}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {report.ats_optimization.failed_checks && report.ats_optimization.failed_checks.length > 0 && (
                                <div>
                                    <div className="text-eyebrow text-danger mb-2">Failed Checks</div>
                                    <ul className="space-y-1">
                                        {report.ats_optimization.failed_checks.map((check, i) => (
                                            <li key={i} className="text-sm text-ink-2 flex items-start gap-2">
                                                <AlertTriangle size={14} className="text-danger mt-0.5 shrink-0" />
                                                {check}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </SectionCard>
            )}

            {/* Priority Actions */}
            {report.priority_actions && report.priority_actions.length > 0 && (
                <SectionCard title="Priority Actions">
                    <div className="space-y-2">
                        {report.priority_actions.map((action, i) => (
                            <div key={i} className="flex items-center justify-between bg-surface-muted rounded-card p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-accent-soft rounded-tile flex items-center justify-center text-accent-soft-ink font-bold text-sm">
                                        {i + 1}
                                    </div>
                                    <span className="text-ink">{action.action}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Badge tone={getImpactBadgeTone(action.impact)}>
                                        Impact: {action.impact}
                                    </Badge>
                                    <Badge tone={getImpactBadgeTone(action.urgency)}>
                                        Urgency: {action.urgency}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* Rewrite Examples */}
            {report.rewrite_examples && report.rewrite_examples.length > 0 && (
                <SectionCard title="Improvement Examples">
                    <div className="space-y-4">
                        {report.rewrite_examples.map((example, i) => (
                            <div key={i} className="border border-border-card rounded-card overflow-hidden">
                                <div className="grid md:grid-cols-2">
                                    <div className="bg-danger-soft p-4 border-b md:border-b-0 md:border-r border-border">
                                        <div className="text-eyebrow text-danger-soft-ink mb-2">Original</div>
                                        <p className="text-sm text-ink">{example.original}</p>
                                    </div>
                                    <div className="bg-success-soft p-4">
                                        <div className="text-eyebrow text-success-soft-ink mb-2">Improved</div>
                                        <p className="text-sm text-ink">{example.improved}</p>
                                    </div>
                                </div>
                                {example.explanation && (
                                    <div className="bg-accent-soft p-3 border-t border-border">
                                        <div className="text-xs font-medium text-accent-soft-ink">
                                            <Lightbulb size={12} className="inline mr-1" />
                                            {example.explanation}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* Download Button */}
            <div className="flex justify-center pt-4">
                <Button variant="primary" onClick={handleDownloadPdf}>
                    <Download size={18} />
                    Download Full Report (PDF)
                </Button>
            </div>
        </div>
    )
}
