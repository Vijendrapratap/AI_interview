"use client"

import { useState } from "react"
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

// Mock data - Replace with actual API call
const mockInterviewReport = {
    session_id: "int_789",
    overall_score: 75,
    recommendation: "Hire",
    executive_summary: "The candidate demonstrated strong technical knowledge in Python and system design. Communication was clear and structured. Areas for improvement include providing more specific examples from past experience and being more concise in explanations. Overall, the candidate shows good potential and would be a solid addition to the team.",
    performance_metrics: {
        technical_knowledge: 82,
        communication_skills: 70,
        problem_solving: 78,
        cultural_fit: 72,
        leadership_potential: 68,
        overall_score: 75
    },
    strengths: [
        "Strong understanding of Python and its ecosystem",
        "Clear explanation of system design concepts",
        "Good problem-solving approach with structured thinking",
        "Positive attitude and enthusiasm for learning",
        "Relevant experience with similar tech stack"
    ],
    areas_for_improvement: [
        "Provide more specific metrics and outcomes from past projects",
        "Be more concise - some answers were longer than necessary",
        "Show more examples of leadership and mentoring",
        "Deeper knowledge of cloud architecture patterns",
        "Practice behavioral questions with STAR method"
    ],
    skill_assessment: {
        "Python": {
            skill_name: "Python",
            demonstrated_level: "Advanced",
            evidence: "Explained decorators, generators, and async patterns fluently",
            gap_to_requirement: null
        },
        "System Design": {
            skill_name: "System Design",
            demonstrated_level: "Intermediate",
            evidence: "Good understanding of microservices, but limited on distributed systems",
            gap_to_requirement: "Needs more practice with distributed caching and consensus algorithms"
        },
        "React": {
            skill_name: "React",
            demonstrated_level: "Advanced",
            evidence: "Deep knowledge of hooks, state management, and performance optimization",
            gap_to_requirement: null
        },
        "AWS": {
            skill_name: "AWS",
            demonstrated_level: "Intermediate",
            evidence: "Familiar with core services (EC2, S3, Lambda) but limited experience with advanced services",
            gap_to_requirement: "Should explore EKS, Step Functions, and advanced networking"
        }
    },
    behavioral_competencies: {
        collaboration: 75,
        adaptability: 80,
        initiative: 70,
        attention_to_detail: 72,
        time_management: 68
    },
    communication_analysis: {
        clarity: "Good - Ideas were expressed clearly with minimal confusion",
        structure: "Strong - Used frameworks like STAR for behavioral answers",
        confidence: "Moderate - Some hesitation on complex technical questions",
        conciseness: "Needs improvement - Tendency to over-explain",
        active_listening: "Strong - Asked clarifying questions appropriately"
    },
    question_feedback: [
        {
            question_number: 1,
            question: "Tell me about yourself and your experience",
            response_summary: "Provided a comprehensive overview of 5 years experience, focusing on recent projects with Python and React.",
            score: 80,
            strengths: ["Good chronological structure", "Highlighted relevant experience"],
            improvements: ["Could be more concise", "Add more quantifiable achievements"],
            ideal_response: null
        },
        {
            question_number: 2,
            question: "Describe a challenging technical problem you solved",
            response_summary: "Discussed optimizing a slow database query that was affecting production performance.",
            score: 85,
            strengths: ["Clear problem statement", "Good technical depth", "Mentioned measurable outcome (90% improvement)"],
            improvements: ["Could explain the debugging process more clearly"],
            ideal_response: null
        },
        {
            question_number: 3,
            question: "How would you design a URL shortening service?",
            response_summary: "Started with requirements gathering, discussed high-level architecture, mentioned caching and database choices.",
            score: 72,
            strengths: ["Good systematic approach", "Considered scalability"],
            improvements: ["Missed discussing collision handling", "Could elaborate more on database schema", "Didn't mention monitoring/observability"],
            ideal_response: "A strong answer would cover: Requirements (read-heavy, 100:1 ratio), URL encoding (Base62), collision handling, database choice (NoSQL for simplicity), caching strategy, load balancing, and rate limiting."
        },
        {
            question_number: 4,
            question: "Tell me about a time you disagreed with a team member",
            response_summary: "Described a situation about choosing between microservices and monolith architecture.",
            score: 70,
            strengths: ["Used STAR method", "Showed resolution approach"],
            improvements: ["Could emphasize collaboration more", "Show more empathy for other perspective", "Mention lessons learned"],
            ideal_response: null
        },
        {
            question_number: 5,
            question: "What are your career goals for the next 3-5 years?",
            response_summary: "Wants to grow into a tech lead role while deepening system design expertise.",
            score: 75,
            strengths: ["Clear vision", "Aligned with role progression"],
            improvements: ["Could be more specific about skill development plan", "Connect goals to company's mission"],
            ideal_response: null
        }
    ],
    improvement_roadmap: {
        immediate_actions: [
            "Practice system design questions focusing on distributed systems",
            "Prepare 5-7 STAR stories for common behavioral questions",
            "Work on being more concise - practice 2-minute answers"
        ],
        short_term: [
            "Take an AWS Solutions Architect certification course",
            "Build a side project involving distributed caching",
            "Read 'Designing Data-Intensive Applications'"
        ],
        medium_term: [
            "Seek mentoring/leadership opportunities at current job",
            "Contribute to open source projects in distributed systems",
            "Practice mock interviews monthly"
        ]
    },
    interview_tips: [
        "Before system design questions, always clarify requirements and constraints first",
        "Use the STAR method consistently for all behavioral questions",
        "Keep initial answers to 2-3 minutes, then offer to elaborate",
        "Ask thoughtful questions about the team and product at the end",
        "Practice explaining complex concepts simply - the 'explain like I'm 5' technique"
    ]
}

export default function InterviewPerformancePage() {
    const [report] = useState(mockInterviewReport)
    const [expandedQuestions, setExpandedQuestions] = useState<number[]>([1, 2])

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
                            <div className={`text-3xl font-bold ${getScoreColor(value)}`}>{value}</div>
                            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${value >= 80 ? "bg-green-500" : value >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
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
                        {report.strengths.map((strength, i) => (
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
                        {report.areas_for_improvement.map((area, i) => (
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
                    {Object.values(report.skill_assessment).map((skill) => (
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
                                        className={`h-full rounded-full ${score >= 80 ? "bg-green-500" : score >= 60 ? "bg-blue-500" : "bg-yellow-500"}`}
                                        style={{ width: `${score}%` }}
                                    />
                                </div>
                                <div className={`w-12 text-right font-bold ${getScoreColor(score)}`}>{score}</div>
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
                            <p className="text-sm text-gray-700">{feedback}</p>
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
                    {report.question_feedback.map((qf) => (
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
                                                {qf.strengths.map((s, i) => (
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
                                                {qf.improvements.map((imp, i) => (
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
                            {report.improvement_roadmap.immediate_actions.map((action, i) => (
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
                            {report.improvement_roadmap.short_term.map((action, i) => (
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
                            {report.improvement_roadmap.medium_term.map((action, i) => (
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
                        {report.interview_tips.map((tip, i) => (
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
