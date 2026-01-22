"use client"

import { useState } from "react"
import {
    TrendingUp,
    AlertTriangle,
    Calendar,
    Briefcase,
    Award,
    ArrowUpRight,
    ArrowRight,
    ArrowDownRight,
    Clock,
    Building2,
    Flag,
    Shield,
    ChevronDown,
    ChevronUp,
    Download
} from "lucide-react"

// Mock data - Replace with actual API call
const mockCareerAnalytics = {
    // Timeline Analysis
    total_experience_years: 6.5,
    employment_gaps: [
        {
            start: "2021-03",
            end: "2021-06",
            duration_months: 3,
            between_companies: "TechCorp Inc. and StartupXYZ",
            severity: "minor"
        },
        {
            start: "2019-08",
            end: "2019-11",
            duration_months: 3,
            between_companies: "WebDev Agency and TechCorp Inc.",
            severity: "minor"
        }
    ],
    has_significant_gaps: false,

    // Stability Analysis
    average_tenure_months: 24,
    shortest_tenure: {
        company: "StartupXYZ",
        title: "Senior Developer",
        duration_months: 10,
        start_date: "2021-06",
        end_date: "2022-04"
    },
    longest_tenure: {
        company: "TechCorp Inc.",
        title: "Software Engineer",
        duration_months: 36,
        start_date: "2018-03",
        end_date: "2021-03"
    },
    job_hopping_risk: "low",
    roles_under_1_year: 1,
    roles_under_2_years: 2,

    // Industry Analysis
    industries_worked: ["Technology", "FinTech", "E-commerce"],
    industry_transitions: [
        {
            from_industry: "Technology",
            to_industry: "FinTech",
            year: 2021,
            from_company: "TechCorp Inc.",
            to_company: "StartupXYZ"
        }
    ],
    is_industry_hopper: false,
    primary_industry: "Technology",
    primary_industry_percentage: 75,

    // Career Trajectory
    trajectory: "ascending",
    seniority_progression: [
        "Junior Developer (2017-2018)",
        "Software Engineer (2018-2021)",
        "Senior Developer (2021-2022)",
        "Tech Lead (2022-Present)"
    ],
    title_changes: [
        {
            from_title: "Junior Developer",
            to_title: "Software Engineer",
            from_company: "WebDev Agency",
            to_company: "TechCorp Inc.",
            year: 2018,
            change_type: "promotion"
        },
        {
            from_title: "Software Engineer",
            to_title: "Senior Developer",
            from_company: "TechCorp Inc.",
            to_company: "StartupXYZ",
            year: 2021,
            change_type: "promotion"
        },
        {
            from_title: "Senior Developer",
            to_title: "Tech Lead",
            from_company: "StartupXYZ",
            to_company: "CurrentCompany",
            year: 2022,
            change_type: "promotion"
        }
    ],

    // Red Flags
    red_flags: [
        {
            flag_type: "short_tenure",
            description: "One role lasted less than 1 year",
            severity: "low",
            details: { company: "StartupXYZ", duration: "10 months" }
        }
    ],
    authenticity_concerns: [],
    date_overlaps: [],

    // Leadership Signals
    leadership_signals: [
        { signal: "Team Leadership", evidence: "Led team of 5 developers at CurrentCompany" },
        { signal: "Mentoring", evidence: "Mentored 3 junior developers" },
        { signal: "Project Ownership", evidence: "Led migration of legacy system" },
        { signal: "Technical Decision Making", evidence: "Chose tech stack for new product" }
    ],

    // Career Timeline for visualization
    career_timeline: [
        { company: "WebDev Agency", title: "Junior Developer", start: "2017-05", end: "2018-02", duration: "9 months" },
        { company: "TechCorp Inc.", title: "Software Engineer", start: "2018-03", end: "2021-02", duration: "3 years" },
        { company: "StartupXYZ", title: "Senior Developer", start: "2021-06", end: "2022-04", duration: "10 months" },
        { company: "CurrentCompany", title: "Tech Lead", start: "2022-05", end: "Present", duration: "2+ years" }
    ]
}

export default function CareerAnalyticsPage() {
    const [report] = useState(mockCareerAnalytics)
    const [showAllTimeline, setShowAllTimeline] = useState(false)

    const getRiskColor = (risk: string) => {
        const colors: Record<string, string> = {
            "none": "text-green-600 bg-green-100",
            "low": "text-blue-600 bg-blue-100",
            "medium": "text-yellow-600 bg-yellow-100",
            "high": "text-red-600 bg-red-100"
        }
        return colors[risk] || colors["low"]
    }

    const getSeverityColor = (severity: string) => {
        const colors: Record<string, string> = {
            "minor": "border-yellow-200 bg-yellow-50 text-yellow-700",
            "medium": "border-orange-200 bg-orange-50 text-orange-700",
            "significant": "border-red-200 bg-red-50 text-red-700"
        }
        return colors[severity] || colors["minor"]
    }

    const getTrajectoryIcon = (trajectory: string) => {
        switch (trajectory) {
            case "ascending": return <ArrowUpRight className="text-green-600" size={24} />
            case "lateral": return <ArrowRight className="text-blue-600" size={24} />
            case "descending": return <ArrowDownRight className="text-red-600" size={24} />
            default: return <ArrowRight className="text-gray-600" size={24} />
        }
    }

    const getTrajectoryLabel = (trajectory: string) => {
        const labels: Record<string, { text: string; color: string }> = {
            "ascending": { text: "Career Growing", color: "text-green-600" },
            "lateral": { text: "Lateral Movement", color: "text-blue-600" },
            "descending": { text: "Needs Attention", color: "text-red-600" },
            "mixed": { text: "Mixed Trajectory", color: "text-yellow-600" }
        }
        return labels[trajectory] || labels["mixed"]
    }

    const getChangeTypeBadge = (type: string) => {
        const badges: Record<string, string> = {
            "promotion": "bg-green-100 text-green-700",
            "lateral": "bg-blue-100 text-blue-700",
            "role_change": "bg-purple-100 text-purple-700",
            "demotion": "bg-red-100 text-red-700"
        }
        return badges[type] || badges["lateral"]
    }

    return (
        <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid md:grid-cols-4 gap-4">
                {/* Total Experience */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
                    <div className="text-sm font-medium opacity-80 mb-1">Total Experience</div>
                    <div className="text-4xl font-bold">{report.total_experience_years}</div>
                    <div className="text-sm opacity-80">years</div>
                </div>

                {/* Career Trajectory */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="text-sm text-gray-500 mb-1">Career Trajectory</div>
                    <div className="flex items-center gap-2">
                        {getTrajectoryIcon(report.trajectory)}
                        <span className={`text-xl font-bold ${getTrajectoryLabel(report.trajectory).color}`}>
                            {getTrajectoryLabel(report.trajectory).text}
                        </span>
                    </div>
                </div>

                {/* Average Tenure */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="text-sm text-gray-500 mb-1">Average Tenure</div>
                    <div className="text-3xl font-bold text-gray-900">
                        {(report.average_tenure_months / 12).toFixed(1)} <span className="text-lg text-gray-500">years</span>
                    </div>
                </div>

                {/* Job Hopping Risk */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="text-sm text-gray-500 mb-1">Job Hopping Risk</div>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getRiskColor(report.job_hopping_risk)}`}>
                        {report.job_hopping_risk.toUpperCase()}
                    </div>
                </div>
            </div>

            {/* Career Timeline */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar size={20} className="text-blue-600" />
                    Career Timeline
                </h2>
                <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

                    {/* Timeline Items */}
                    <div className="space-y-4">
                        {report.career_timeline.map((item, index) => (
                            <div key={index} className="relative flex gap-4 pl-4">
                                {/* Timeline Dot */}
                                <div className={`w-5 h-5 rounded-full border-2 bg-white z-10 shrink-0 ${
                                    item.end === "Present" ? "border-green-500" : "border-blue-500"
                                }`}>
                                    {item.end === "Present" && (
                                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full m-0.5" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className={`flex-1 bg-white border rounded-xl p-4 ${
                                    item.end === "Present" ? "border-green-200" : "border-gray-200"
                                }`}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="font-bold text-gray-900">{item.title}</div>
                                            <div className="text-sm text-gray-600 flex items-center gap-1">
                                                <Building2 size={14} />
                                                {item.company}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-gray-500">{item.start} - {item.end}</div>
                                            <div className="text-xs text-gray-400">{item.duration}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Employment Gaps */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock size={20} className="text-blue-600" />
                    Employment Gaps
                    {!report.has_significant_gaps && (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            No Significant Gaps
                        </span>
                    )}
                </h2>

                {report.employment_gaps.length === 0 ? (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-6 text-center">
                        <Shield size={32} className="mx-auto mb-2 text-green-600" />
                        <div className="text-green-800 font-medium">No employment gaps detected</div>
                        <div className="text-sm text-green-600">Your work history shows continuous employment</div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {report.employment_gaps.map((gap, index) => (
                            <div key={index} className={`border rounded-xl p-4 ${getSeverityColor(gap.severity)}`}>
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
                                        <div className="text-xs capitalize px-2 py-0.5 rounded-full bg-white/50 inline-block mt-1">
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
            </div>

            {/* Job Stability Analysis */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Briefcase size={20} className="text-blue-600" />
                    Job Stability Analysis
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Longest Tenure */}
                    <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                        <div className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                            <Award size={16} />
                            Longest Tenure
                        </div>
                        <div className="text-2xl font-bold text-green-800 mb-1">
                            {(report.longest_tenure.duration_months / 12).toFixed(1)} years
                        </div>
                        <div className="text-sm text-green-700">
                            {report.longest_tenure.title} at {report.longest_tenure.company}
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                            {report.longest_tenure.start_date} - {report.longest_tenure.end_date}
                        </div>
                    </div>

                    {/* Shortest Tenure */}
                    <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-5">
                        <div className="text-sm font-medium text-yellow-700 mb-2 flex items-center gap-1">
                            <AlertTriangle size={16} />
                            Shortest Tenure
                        </div>
                        <div className="text-2xl font-bold text-yellow-800 mb-1">
                            {report.shortest_tenure.duration_months} months
                        </div>
                        <div className="text-sm text-yellow-700">
                            {report.shortest_tenure.title} at {report.shortest_tenure.company}
                        </div>
                        <div className="text-xs text-yellow-600 mt-1">
                            {report.shortest_tenure.start_date} - {report.shortest_tenure.end_date}
                        </div>
                    </div>

                    {/* Roles Under 1 Year */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="text-sm text-gray-500 mb-1">Roles Under 1 Year</div>
                        <div className="text-3xl font-bold text-gray-900">{report.roles_under_1_year}</div>
                        <div className="text-xs text-gray-500 mt-1">
                            {report.roles_under_1_year === 0 ? "Great stability!" : "Consider being prepared to explain short tenures"}
                        </div>
                    </div>

                    {/* Roles Under 2 Years */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="text-sm text-gray-500 mb-1">Roles Under 2 Years</div>
                        <div className="text-3xl font-bold text-gray-900">{report.roles_under_2_years}</div>
                        <div className="text-xs text-gray-500 mt-1">
                            Industry average is 2-3 years
                        </div>
                    </div>
                </div>
            </div>

            {/* Industry Analysis */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 size={20} className="text-blue-600" />
                    Industry Analysis
                </h2>
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {report.industries_worked.map((industry, i) => (
                            <span
                                key={i}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                                    industry === report.primary_industry
                                        ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300"
                                        : "bg-gray-100 text-gray-700"
                                }`}
                            >
                                {industry}
                                {industry === report.primary_industry && ` (${report.primary_industry_percentage}%)`}
                            </span>
                        ))}
                    </div>

                    {report.industry_transitions.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="text-sm font-medium text-gray-700 mb-2">Industry Transitions</div>
                            {report.industry_transitions.map((transition, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className="font-medium">{transition.from_industry}</span>
                                    <ArrowRight size={14} className="text-gray-400" />
                                    <span className="font-medium">{transition.to_industry}</span>
                                    <span className="text-gray-400">({transition.year})</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm text-blue-800">
                            <strong>Assessment:</strong> {report.is_industry_hopper
                                ? "You've worked across multiple industries. Be prepared to explain your diverse background as a strength."
                                : "Your experience is focused in your primary industry, showing deep expertise."}
                        </div>
                    </div>
                </div>
            </div>

            {/* Career Progression */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-blue-600" />
                    Career Progression
                </h2>
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    {/* Seniority Progression */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-4">
                        {report.seniority_progression.map((level, i) => (
                            <div key={i} className="flex items-center">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm font-medium text-blue-700 whitespace-nowrap">
                                    {level}
                                </div>
                                {i < report.seniority_progression.length - 1 && (
                                    <ArrowRight size={20} className="mx-1 text-blue-400 shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Title Changes */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="text-sm font-medium text-gray-700 mb-3">Career Moves</div>
                        <div className="space-y-2">
                            {report.title_changes.map((change, i) => (
                                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${getChangeTypeBadge(change.change_type)}`}>
                                            {change.change_type}
                                        </span>
                                        <span className="text-sm text-gray-700">
                                            {change.from_title} <ArrowRight size={12} className="inline text-gray-400" /> {change.to_title}
                                        </span>
                                    </div>
                                    <span className="text-sm text-gray-500">{change.year}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Leadership Signals */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Award size={20} className="text-blue-600" />
                    Leadership Signals
                </h2>
                {report.leadership_signals.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-6 text-center">
                        <AlertTriangle size={32} className="mx-auto mb-2 text-yellow-600" />
                        <div className="text-yellow-800 font-medium">Limited leadership signals detected</div>
                        <div className="text-sm text-yellow-600">Consider adding more leadership experience to your resume</div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                        {report.leadership_signals.map((signal, i) => (
                            <div key={i} className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Award size={18} className="text-purple-600" />
                                    <span className="font-bold text-purple-800">{signal.signal}</span>
                                </div>
                                <p className="text-sm text-gray-600">{signal.evidence}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Red Flags */}
            {report.red_flags.length > 0 && (
                <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Flag size={20} className="text-red-600" />
                        Potential Concerns
                    </h2>
                    <div className="space-y-3">
                        {report.red_flags.map((flag, i) => (
                            <div key={i} className={`border rounded-xl p-4 ${
                                flag.severity === "high" ? "border-red-200 bg-red-50" :
                                flag.severity === "medium" ? "border-orange-200 bg-orange-50" :
                                "border-yellow-200 bg-yellow-50"
                            }`}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className={`font-medium ${
                                            flag.severity === "high" ? "text-red-800" :
                                            flag.severity === "medium" ? "text-orange-800" :
                                            "text-yellow-800"
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
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${
                                        flag.severity === "high" ? "bg-red-200 text-red-800" :
                                        flag.severity === "medium" ? "bg-orange-200 text-orange-800" :
                                        "bg-yellow-200 text-yellow-800"
                                    }`}>
                                        {flag.severity}
                                    </span>
                                </div>
                                <div className="mt-3 text-sm opacity-90">
                                    <strong>Preparation Tip:</strong> Be ready to address this positively in interviews. Focus on what you learned and how it shaped your career decisions.
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Download Button */}
            <div className="flex justify-center pt-4">
                <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                    <Download size={18} />
                    Download Career Report (PDF)
                </button>
            </div>
        </div>
    )
}
