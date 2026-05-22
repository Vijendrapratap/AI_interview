"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import {
    MessageSquare,
    CheckCircle,
    AlertTriangle,
    Target,
    Lightbulb,
    ChevronDown,
    ChevronUp,
    Clock,
    Award,
    Download,
    Star,
    Brain,
    Wind,
    ArrowUpCircle
} from "lucide-react"
import { Badge, SectionCard, Card, Button } from "@/components"

// Mock data removed to prevent user confusion

export default function InterviewPerformancePage() {
    const analysisResult = useAppStore((state) => state.analysisResult)
    const [report, setReport] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [expandedQuestions, setExpandedQuestions] = useState<number[]>([1, 2])

    useEffect(() => {
        const fetchReport = async () => {
            if (!analysisResult?.resumeId) {
                setLoading(false)
                return
            }

            try {
                // 1. Get all sessions to find the latest one for this resume
                const sessionsRes = await fetch("http://localhost:8000/api/v1/interview/sessions")
                if (!sessionsRes.ok) throw new Error("Failed to fetch sessions")

                const sessionsData = await sessionsRes.json()
                const mySessions = sessionsData.sessions
                    .filter((s: any) => s.resume_id === analysisResult.resumeId)
                    .sort((a: any, b: any) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())

                if (mySessions.length === 0) {
                    setLoading(false)
                    return
                }

                const latestSession = mySessions[0]

                // 2. Fetch detailed report
                const reportRes = await fetch(`http://localhost:8000/api/v1/interview/report/${latestSession.id}`)
                if (!reportRes.ok) throw new Error("Failed to fetch report")

                const reportData = await reportRes.json()
                setReport(reportData)

            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        fetchReport()
    }, [analysisResult])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
        )
    }

    const toggleQuestion = (qNum: number) => {
        setExpandedQuestions(prev =>
            prev.includes(qNum) ? prev.filter(q => q !== qNum) : [...prev, qNum]
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

    const getRecommendationStyle = (rec: string) => {
        const styles: Record<string, string> = {
            "Strong Hire": "bg-success-soft text-success-soft-ink border-success-soft-ink/30",
            "Hire": "bg-accent-soft text-accent-soft-ink border-accent-soft-ink/30",
            "Maybe": "bg-warning-soft text-warning-soft-ink border-warning-soft-ink/30",
            "No Hire": "bg-danger-soft text-danger-soft-ink border-danger-soft-ink/30"
        }
        return styles[rec] || styles["Maybe"]
    }

    const getLevelTone = (level: string): "accent" | "success" | "warning" | "neutral" => {
        const tones: Record<string, "accent" | "success" | "warning" | "neutral"> = {
            "Expert": "accent",
            "Advanced": "success",
            "Intermediate": "accent",
            "Beginner": "neutral"
        }
        return tones[level] || "neutral"
    }

    if (!report) {
        return (
            <div className="text-center py-20">
                <div className="bg-surface-muted rounded-card p-12 max-w-2xl mx-auto border border-border-card">
                    <div className="w-16 h-16 bg-accent-soft text-accent-soft-ink rounded-full flex items-center justify-center mx-auto mb-6">
                        <MessageSquare size={32} />
                    </div>
                    <h2 className="text-card-title text-ink mb-4">No Interview Data Yet</h2>
                    <p className="text-ink-2 mb-8 max-w-md mx-auto">
                        Complete an AI mock interview to generate a detailed performance report with scores and feedback.
                    </p>
                    <a
                        href="/portal"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-ink rounded-pill font-bold hover:bg-accent-hover transition-colors"
                    >
                        Start Practice Interview
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header with Score and Recommendation */}
            <div className="grid md:grid-cols-3 gap-4">
                {/* Overall Score */}
                <div className="bg-accent rounded-card p-6 text-accent-ink">
                    <div className="text-sm font-medium opacity-80 mb-1">Overall Performance</div>
                    <div className="text-5xl font-bold mb-2">{report.overall_score}<span className="text-2xl">/100</span></div>
                    <div className="flex items-center gap-2 mt-2">
                        <Star size={16} fill="currentColor" />
                        <span className="text-sm">Based on {report.question_feedback.length} questions</span>
                    </div>
                </div>

                {/* Recommendation */}
                <div className={`rounded-card p-6 border-2 ${getRecommendationStyle(report.recommendation)}`}>
                    <div className="text-sm font-medium opacity-80 mb-1">Hiring Recommendation</div>
                    <div className="text-3xl font-bold mb-2 flex items-center gap-2">
                        <Award size={28} />
                        {report.recommendation}
                    </div>
                    <div className="text-sm opacity-80">Based on overall assessment</div>
                </div>

                {/* Quick Metrics */}
                <Card className="p-4">
                    <div className="text-sm font-medium text-ink-2 mb-3">Quick Metrics</div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-ink-3">Technical</span>
                            <span className={`font-bold ${getScoreColor(report.performance_metrics.technical_knowledge)}`}>
                                {report.performance_metrics.technical_knowledge}%
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-ink-3">Communication</span>
                            <span className={`font-bold ${getScoreColor(report.performance_metrics.communication_skills)}`}>
                                {report.performance_metrics.communication_skills}%
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-ink-3">Problem Solving</span>
                            <span className={`font-bold ${getScoreColor(report.performance_metrics.problem_solving)}`}>
                                {report.performance_metrics.problem_solving}%
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Executive Summary */}
            <div className="bg-accent-soft border border-border-card rounded-card p-6">
                <h3 className="text-card-title text-accent-soft-ink mb-3 flex items-center gap-2">
                    <Brain size={20} />
                    Executive Summary
                </h3>
                <p className="text-accent-soft-ink leading-relaxed">{report.executive_summary}</p>
            </div>

            {/* Performance Metrics */}
            <SectionCard title="Performance Breakdown">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(report.performance_metrics).filter(([key]) => key !== "overall_score").map(([metric, value]) => (
                        <Card key={metric} className="p-4">
                            <div className="text-eyebrow mb-2">
                                {metric.replace(/_/g, " ")}
                            </div>
                            <div className={`text-3xl font-bold ${getScoreColor(value as number)}`}>{value as number}</div>
                            <div className="mt-2 h-2 bg-border rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${(value as number) >= 80 ? "bg-success" : (value as number) >= 60 ? "bg-warning" : "bg-danger"}`}
                                    style={{ width: `${value}%` }}
                                />
                            </div>
                        </Card>
                    ))}
                </div>
            </SectionCard>

            {/* Strengths & Areas for Improvement */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="bg-success-soft border border-success-soft-ink/20 rounded-card p-5">
                    <h3 className="text-card-title text-success-soft-ink mb-4 flex items-center gap-2">
                        <CheckCircle size={20} />
                        Key Strengths
                    </h3>
                    <ul className="space-y-2">
                        {report.strengths.map((strength: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-success-soft-ink">
                                <CheckCircle size={14} className="mt-0.5 shrink-0" />
                                {strength}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Areas for Improvement */}
                <div className="bg-warning-soft border border-warning-soft-ink/20 rounded-card p-5">
                    <h3 className="text-card-title text-warning-soft-ink mb-4 flex items-center gap-2">
                        <Target size={20} />
                        Areas for Improvement
                    </h3>
                    <ul className="space-y-2">
                        {report.areas_for_improvement.map((area: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-warning-soft-ink">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                {area}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Skill Assessment */}
            <SectionCard title="Skill Assessment">
                <div className="grid md:grid-cols-2 gap-4">
                    {Object.values(report.skill_assessment).map((skill: any) => (
                        <Card key={skill.skill_name} className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-ink">{skill.skill_name}</span>
                                <Badge tone={getLevelTone(skill.demonstrated_level)}>
                                    {skill.demonstrated_level}
                                </Badge>
                            </div>
                            <p className="text-sm text-ink-2 mb-2">{skill.evidence}</p>
                            {skill.gap_to_requirement && (
                                <div className="bg-warning-soft border border-warning-soft-ink/20 rounded-tile p-2 text-xs text-warning-soft-ink">
                                    <AlertTriangle size={12} className="inline mr-1" />
                                    {skill.gap_to_requirement}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </SectionCard>

            {/* Behavioral & Voice Analytics Dashboard */}
            {report.behavioral_analytics && report.behavioral_analytics.summary && (
                <SectionCard title="Behavioral & Voice Analytics">
                    <div className="grid md:grid-cols-3 gap-4">
                        {/* Pacing */}
                        <div className="bg-accent-soft border border-border-card rounded-card p-5">
                            <div className="flex justify-between items-start mb-2">
                                <div className="text-sm font-bold text-accent-soft-ink flex items-center gap-2">
                                    <Clock size={16} />
                                    Speaking Pace
                                </div>
                                <div className="text-2xl font-black text-accent-soft-ink">
                                    {report.behavioral_analytics.summary.average_speaking_rate_wpm || 0}
                                    <span className="text-sm font-normal ml-1">WPM</span>
                                </div>
                            </div>
                            <div className="text-xs text-accent-soft-ink/80 mt-2">
                                {report.behavioral_analytics.summary.average_speaking_rate_wpm > 160 ? "A bit fast. Try to slow down for clarity." :
                                    report.behavioral_analytics.summary.average_speaking_rate_wpm < 120 ? "A bit slow. Try to speak more conversationally." :
                                        "Great conversational pace."}
                            </div>
                        </div>

                        {/* Fillers */}
                        <div className="bg-warning-soft border border-warning-soft-ink/20 rounded-card p-5">
                            <div className="flex justify-between items-start mb-2">
                                <div className="text-sm font-bold text-warning-soft-ink flex items-center gap-2">
                                    <Wind size={16} />
                                    Filler Words
                                </div>
                                <div className="text-2xl font-black text-warning-soft-ink">
                                    {report.behavioral_analytics.summary.total_fillers || 0}
                                    <span className="text-sm font-normal ml-1">total</span>
                                </div>
                            </div>
                            <div className="text-xs text-warning-soft-ink/80 mt-2">
                                Common: {report.behavioral_analytics.summary.common_fillers?.join(", ") || "None"}
                            </div>
                        </div>

                        {/* Confidence */}
                        <div className="bg-success-soft border border-success-soft-ink/20 rounded-card p-5">
                            <div className="flex justify-between items-start mb-2">
                                <div className="text-sm font-bold text-success-soft-ink flex items-center gap-2">
                                    <ArrowUpCircle size={16} />
                                    Vocal Confidence
                                </div>
                                <div className="text-2xl font-black text-success-soft-ink">
                                    {(report.behavioral_analytics.summary.average_confidence_score || 0).toFixed(1)}
                                    <span className="text-sm font-normal ml-1">/10</span>
                                </div>
                            </div>
                            <div className="text-xs text-success-soft-ink/80 mt-2">
                                {report.behavioral_analytics.summary.confidence_trend === "increasing" ? "You gained confidence as the interview went on!" :
                                    report.behavioral_analytics.summary.confidence_trend === "decreasing" ? "Confidence dropped slightly over time." :
                                        "Stable confidence throughout."}
                            </div>
                        </div>
                    </div>
                </SectionCard>
            )}

            {/* Behavioral Competencies */}
            <SectionCard title="Behavioral Competencies">
                <div className="space-y-3">
                    {Object.entries(report.behavioral_competencies).map(([competency, score]) => (
                        <div key={competency} className="flex items-center gap-4">
                            <div className="w-32 text-sm text-ink-2 capitalize">
                                {competency.replace(/_/g, " ")}
                            </div>
                            <div className="flex-1 h-3 bg-border rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${(score as number) >= 80 ? "bg-success" : (score as number) >= 60 ? "bg-accent" : "bg-warning"}`}
                                    style={{ width: `${score}%` }}
                                />
                            </div>
                            <div className={`w-12 text-right font-bold ${getScoreColor(score as number)}`}>{score as number}</div>
                        </div>
                    ))}
                </div>
            </SectionCard>

            {/* Communication Analysis */}
            <SectionCard title="Communication Analysis">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(report.communication_analysis).map(([aspect, feedback]) => (
                        <div key={aspect} className="bg-surface-muted rounded-card p-4">
                            <div className="text-eyebrow mb-1 capitalize">
                                {aspect.replace(/_/g, " ")}
                            </div>
                            <p className="text-sm text-ink">{feedback as string}</p>
                        </div>
                    ))}
                </div>
            </SectionCard>

            {/* Question-by-Question Feedback */}
            <SectionCard title="Question-by-Question Feedback">
                <div className="space-y-3">
                    {report.question_feedback.map((qf: any) => (
                        <div key={qf.question_number} className="border border-border-card rounded-card overflow-hidden">
                            <button
                                onClick={() => toggleQuestion(qf.question_number)}
                                className="w-full flex items-center justify-between p-4 bg-surface-muted hover:bg-surface transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-tile flex items-center justify-center ${getScoreBg(qf.score)}`}>
                                        <span className={`font-bold ${getScoreColor(qf.score)}`}>{qf.score}</span>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs text-ink-3">Question {qf.question_number}</div>
                                        <div className="font-medium text-ink text-sm">{qf.question}</div>

                                        {/* Behavioral Badges */}
                                        {qf.behavioral_insights && (
                                            <div className="flex items-center gap-2 mt-2">
                                                {qf.behavioral_insights.filler_words_count > 3 && (
                                                    <Badge tone="warning">
                                                        <Wind size={10} /> {qf.behavioral_insights.filler_words_count} fillers
                                                    </Badge>
                                                )}
                                                {qf.behavioral_insights.speaking_rate_wpm > 165 && (
                                                    <Badge tone="warning">
                                                        <Clock size={10} /> Fast paced
                                                    </Badge>
                                                )}
                                                {qf.behavioral_insights.confidence_score >= 8.5 && (
                                                    <Badge tone="success">
                                                        <ArrowUpCircle size={10} /> High Confidence
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {expandedQuestions.includes(qf.question_number) ? (
                                    <ChevronUp size={18} className="text-ink-3" />
                                ) : (
                                    <ChevronDown size={18} className="text-ink-3" />
                                )}
                            </button>

                            {expandedQuestions.includes(qf.question_number) && (
                                <div className="p-4 border-t border-border space-y-4">
                                    {/* Response Summary */}
                                    <div>
                                        <div className="text-eyebrow mb-2">Your Response</div>
                                        <p className="text-sm text-ink bg-surface-muted p-3 rounded-tile">{qf.response_summary}</p>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        {/* Strengths */}
                                        <div>
                                            <div className="text-eyebrow text-success mb-2">What You Did Well</div>
                                            <ul className="space-y-1">
                                                {qf.strengths.map((s: string, i: number) => (
                                                    <li key={i} className="text-sm text-ink-2 flex items-start gap-2">
                                                        <CheckCircle size={14} className="text-success mt-0.5 shrink-0" />
                                                        {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Improvements */}
                                        <div>
                                            <div className="text-eyebrow text-warning mb-2">How to Improve</div>
                                            <ul className="space-y-1">
                                                {qf.improvements.map((imp: string, i: number) => (
                                                    <li key={i} className="text-sm text-ink-2 flex items-start gap-2">
                                                        <Lightbulb size={14} className="text-warning mt-0.5 shrink-0" />
                                                        {imp}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Ideal Response */}
                                    {qf.ideal_response && (
                                        <div className="bg-accent-soft border border-border-card rounded-tile p-3">
                                            <div className="text-eyebrow text-accent-soft-ink mb-2">Ideal Response Framework</div>
                                            <p className="text-sm text-accent-soft-ink">{qf.ideal_response}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </SectionCard>

            {/* Outcome & Action Plan */}
            <SectionCard title="Outcome & Action Plan">
                <div className="grid md:grid-cols-3 gap-6">
                    {/* 30 Days - Immediate */}
                    <div className="bg-card border-2 border-success-soft-ink/30 rounded-card overflow-hidden shadow-card hover:shadow-md transition-shadow">
                        <div className="bg-success-soft px-5 py-3 border-b border-success-soft-ink/20 flex items-center justify-between">
                            <span className="font-bold text-success-soft-ink text-sm tracking-wide">PHASE 1 (30 DAYS)</span>
                            <Badge tone="success">Immediate Drill</Badge>
                        </div>
                        <div className="p-5">
                            <ul className="space-y-4">
                                {report.improvement_roadmap.immediate_actions.map((action: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3 group">
                                        <div className="w-6 h-6 rounded-full bg-success-soft flex items-center justify-center text-success-soft-ink shrink-0 mt-0.5 group-hover:bg-success group-hover:text-card transition-colors">
                                            <span className="text-xs font-bold">{i + 1}</span>
                                        </div>
                                        <span className="text-sm text-ink leading-relaxed font-medium">{action}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* 60 Days - Short Term */}
                    <div className="bg-card border-2 border-accent-soft-ink/30 rounded-card overflow-hidden shadow-card hover:shadow-md transition-shadow">
                        <div className="bg-accent-soft px-5 py-3 border-b border-accent-soft-ink/20 flex items-center justify-between">
                            <span className="font-bold text-accent-soft-ink text-sm tracking-wide">PHASE 2 (60 DAYS)</span>
                            <Badge tone="accent">Skill Build</Badge>
                        </div>
                        <div className="p-5">
                            <ul className="space-y-4">
                                {report.improvement_roadmap.short_term.map((action: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3 group">
                                        <div className="w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center text-accent-soft-ink shrink-0 mt-0.5 group-hover:bg-accent group-hover:text-accent-ink transition-colors">
                                            <span className="text-xs font-bold">{i + 1}</span>
                                        </div>
                                        <span className="text-sm text-ink leading-relaxed font-medium">{action}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* 90 Days - Medium Term */}
                    <div className="bg-card border-2 border-border-card rounded-card overflow-hidden shadow-card hover:shadow-md transition-shadow">
                        <div className="bg-surface-muted px-5 py-3 border-b border-border flex items-center justify-between">
                            <span className="font-bold text-ink text-sm tracking-wide">PHASE 3 (90 DAYS)</span>
                            <Badge tone="neutral">Mastery</Badge>
                        </div>
                        <div className="p-5">
                            <ul className="space-y-4">
                                {report.improvement_roadmap.medium_term.map((action: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3 group">
                                        <div className="w-6 h-6 rounded-full bg-surface-muted flex items-center justify-center text-ink-2 shrink-0 mt-0.5 group-hover:bg-ink group-hover:text-card transition-colors">
                                            <span className="text-xs font-bold">{i + 1}</span>
                                        </div>
                                        <span className="text-sm text-ink leading-relaxed font-medium">{action}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </SectionCard>

            {/* Interview Tips */}
            <SectionCard title="Pro Tips for Next Time">
                <div className="bg-warning-soft border border-warning-soft-ink/20 rounded-card p-5">
                    <ul className="space-y-3">
                        {report.interview_tips.map((tip: string, i: number) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-ink">
                                <span className="w-6 h-6 bg-warning-soft-ink/20 rounded-full flex items-center justify-center text-xs font-bold text-warning-soft-ink shrink-0">
                                    {i + 1}
                                </span>
                                {tip}
                            </li>
                        ))}
                    </ul>
                </div>
            </SectionCard>

            {/* Download Button */}
            <div className="flex justify-center pt-4">
                <Button variant="primary">
                    <Download size={18} />
                    Download Full Report (PDF)
                </Button>
            </div>
        </div>
    )
}
