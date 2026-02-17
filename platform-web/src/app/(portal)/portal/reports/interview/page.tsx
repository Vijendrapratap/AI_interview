"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import {
    MessageSquare,
    CheckCircle,
    AlertTriangle,
    TrendingUp,
    Target,
    Lightbulb,
    ChevronDown,
    ChevronUp,
    Clock,
    Award,
    Download,
    Star,
    Mic,
    Brain
} from "lucide-react"

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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    const toggleQuestion = (qNum: number) => {
        setExpandedQuestions(prev =>
            prev.includes(qNum) ? prev.filter(q => q !== qNum) : [...prev, qNum]
        )
    }

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-600"
        if (score >= 60) return "text-yellow-600"
        return "text-red-600"
    }

    const getScoreBg = (score: number) => {
        if (score >= 80) return "bg-green-100"
        if (score >= 60) return "bg-yellow-100"
        return "bg-red-100"
    }

    const getRecommendationStyle = (rec: string) => {
        const styles: Record<string, string> = {
            "Strong Hire": "bg-green-100 text-green-700 border-green-200",
            "Hire": "bg-blue-100 text-blue-700 border-blue-200",
            "Maybe": "bg-yellow-100 text-yellow-700 border-yellow-200",
            "No Hire": "bg-red-100 text-red-700 border-red-200"
        }
        return styles[rec] || styles["Maybe"]
    }

    const getLevelColor = (level: string) => {
        const colors: Record<string, string> = {
            "Expert": "bg-purple-100 text-purple-700",
            "Advanced": "bg-green-100 text-green-700",
            "Intermediate": "bg-blue-100 text-blue-700",
            "Beginner": "bg-gray-100 text-gray-700"
        }
        return colors[level] || colors["Beginner"]
    }

    if (!report) {
        return (
            <div className="text-center py-20">
                <div className="bg-gray-50 rounded-2xl p-12 max-w-2xl mx-auto border border-gray-200">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MessageSquare size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">No Interview Data Yet</h2>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                        Complete an AI mock interview to generate a detailed performance report with scores and feedback.
                    </p>
                    <a
                        href="/portal"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
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
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-6 text-white">
                    <div className="text-sm font-medium opacity-80 mb-1">Overall Performance</div>
                    <div className="text-5xl font-bold mb-2">{report.overall_score}<span className="text-2xl">/100</span></div>
                    <div className="flex items-center gap-2 mt-2">
                        <Star size={16} fill="currentColor" />
                        <span className="text-sm">Based on {report.question_feedback.length} questions</span>
                    </div>
                </div>

                {/* Recommendation */}
                <div className={`rounded-xl p-6 border-2 ${getRecommendationStyle(report.recommendation)}`}>
                    <div className="text-sm font-medium opacity-80 mb-1">Hiring Recommendation</div>
                    <div className="text-3xl font-bold mb-2 flex items-center gap-2">
                        <Award size={28} />
                        {report.recommendation}
                    </div>
                    <div className="text-sm opacity-80">Based on overall assessment</div>
                </div>

                {/* Quick Metrics */}
                <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm font-medium text-gray-600 mb-3">Quick Metrics</div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Technical</span>
                            <span className={`font-bold ${getScoreColor(report.performance_metrics.technical_knowledge)}`}>
                                {report.performance_metrics.technical_knowledge}%
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Communication</span>
                            <span className={`font-bold ${getScoreColor(report.performance_metrics.communication_skills)}`}>
                                {report.performance_metrics.communication_skills}%
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Problem Solving</span>
                            <span className={`font-bold ${getScoreColor(report.performance_metrics.problem_solving)}`}>
                                {report.performance_metrics.problem_solving}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Executive Summary */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <Brain size={20} />
                    Executive Summary
                </h3>
                <p className="text-blue-800 leading-relaxed">{report.executive_summary}</p>
            </div>

            {/* Performance Metrics */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-blue-600" />
                    Performance Breakdown
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(report.performance_metrics).filter(([key]) => key !== "overall_score").map(([metric, value]) => (
                        <div key={metric} className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                                {metric.replace(/_/g, " ")}
                            </div>
                            <div className={`text-3xl font-bold ${getScoreColor(value as number)}`}>{value as number}</div>
                            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${(value as number) >= 80 ? "bg-green-500" : (value as number) >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                                    style={{ width: `${value}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Strengths & Areas for Improvement */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                        <CheckCircle size={20} />
                        Key Strengths
                    </h3>
                    <ul className="space-y-2">
                        {report.strengths.map((strength: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-green-800">
                                <CheckCircle size={14} className="mt-0.5 shrink-0" />
                                {strength}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Areas for Improvement */}
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                        <Target size={20} />
                        Areas for Improvement
                    </h3>
                    <ul className="space-y-2">
                        {report.areas_for_improvement.map((area: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-orange-800">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                {area}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Skill Assessment */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Target size={20} className="text-blue-600" />
                    Skill Assessment
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                    {Object.values(report.skill_assessment).map((skill: any) => (
                        <div key={skill.skill_name} className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-gray-900">{skill.skill_name}</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getLevelColor(skill.demonstrated_level)}`}>
                                    {skill.demonstrated_level}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{skill.evidence}</p>
                            {skill.gap_to_requirement && (
                                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-2 text-xs text-yellow-700">
                                    <AlertTriangle size={12} className="inline mr-1" />
                                    {skill.gap_to_requirement}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Behavioral Competencies */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Brain size={20} className="text-blue-600" />
                    Behavioral Competencies
                </h2>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="space-y-3">
                        {Object.entries(report.behavioral_competencies).map(([competency, score]) => (
                            <div key={competency} className="flex items-center gap-4">
                                <div className="w-32 text-sm text-gray-600 capitalize">
                                    {competency.replace(/_/g, " ")}
                                </div>
                                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${(score as number) >= 80 ? "bg-green-500" : (score as number) >= 60 ? "bg-blue-500" : "bg-yellow-500"}`}
                                        style={{ width: `${score}%` }}
                                    />
                                </div>
                                <div className={`w-12 text-right font-bold ${getScoreColor(score as number)}`}>{score as number}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Communication Analysis */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Mic size={20} className="text-blue-600" />
                    Communication Analysis
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(report.communication_analysis).map(([aspect, feedback]) => (
                        <div key={aspect} className="bg-gray-50 rounded-xl p-4">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 capitalize">
                                {aspect.replace(/_/g, " ")}
                            </div>
                            <p className="text-sm text-gray-700">{feedback as string}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Question-by-Question Feedback */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageSquare size={20} className="text-blue-600" />
                    Question-by-Question Feedback
                </h2>
                <div className="space-y-3">
                    {report.question_feedback.map((qf: any) => (
                        <div key={qf.question_number} className="border border-gray-200 rounded-xl overflow-hidden">
                            <button
                                onClick={() => toggleQuestion(qf.question_number)}
                                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getScoreBg(qf.score)}`}>
                                        <span className={`font-bold ${getScoreColor(qf.score)}`}>{qf.score}</span>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs text-gray-500">Question {qf.question_number}</div>
                                        <div className="font-medium text-gray-900 text-sm">{qf.question}</div>
                                    </div>
                                </div>
                                {expandedQuestions.includes(qf.question_number) ? (
                                    <ChevronUp size={18} className="text-gray-400" />
                                ) : (
                                    <ChevronDown size={18} className="text-gray-400" />
                                )}
                            </button>

                            {expandedQuestions.includes(qf.question_number) && (
                                <div className="p-4 border-t border-gray-200 space-y-4">
                                    {/* Response Summary */}
                                    <div>
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Your Response</div>
                                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{qf.response_summary}</p>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        {/* Strengths */}
                                        <div>
                                            <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">What You Did Well</div>
                                            <ul className="space-y-1">
                                                {qf.strengths.map((s: string, i: number) => (
                                                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                                        <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                                                        {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Improvements */}
                                        <div>
                                            <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">How to Improve</div>
                                            <ul className="space-y-1">
                                                {qf.improvements.map((imp: string, i: number) => (
                                                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                                        <Lightbulb size={14} className="text-orange-500 mt-0.5 shrink-0" />
                                                        {imp}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Ideal Response */}
                                    {qf.ideal_response && (
                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Ideal Response Framework</div>
                                            <p className="text-sm text-blue-800">{qf.ideal_response}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Improvement Roadmap */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock size={20} className="text-blue-600" />
                    Improvement Roadmap
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                    {/* 30 Days */}
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                        <div className="text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
                            <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-xs">30</div>
                            Days - Immediate
                        </div>
                        <ul className="space-y-2">
                            {report.improvement_roadmap.immediate_actions.map((action: string, i: number) => (
                                <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                                    <span className="text-green-400">•</span>
                                    {action}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* 60 Days */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <div className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs">60</div>
                            Days - Short Term
                        </div>
                        <ul className="space-y-2">
                            {report.improvement_roadmap.short_term.map((action: string, i: number) => (
                                <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                                    <span className="text-blue-400">•</span>
                                    {action}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* 90 Days */}
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                        <div className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                            <div className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center text-xs">90</div>
                            Days - Medium Term
                        </div>
                        <ul className="space-y-2">
                            {report.improvement_roadmap.medium_term.map((action: string, i: number) => (
                                <li key={i} className="text-sm text-purple-800 flex items-start gap-2">
                                    <span className="text-purple-400">•</span>
                                    {action}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Interview Tips */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Lightbulb size={20} className="text-blue-600" />
                    Pro Tips for Next Time
                </h2>
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-100 rounded-xl p-5">
                    <ul className="space-y-3">
                        {report.interview_tips.map((tip: string, i: number) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                                <span className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center text-xs font-bold text-yellow-700 shrink-0">
                                    {i + 1}
                                </span>
                                {tip}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Download Button */}
            <div className="flex justify-center pt-4">
                <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                    <Download size={18} />
                    Download Full Report (PDF)
                </button>
            </div>
        </div>
    )
}
