"use client"

import { useState } from "react"
import {
    Target,
    CheckCircle,
    AlertTriangle,
    TrendingUp,
    Award,
    BookOpen,
    Lightbulb,
    Star,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Download,
    BarChart3
} from "lucide-react"

// Mock data - Replace with actual API call
const mockSkillsAssessment = {
    summary: {
        total_skills: 24,
        verified_skills: 18,
        skill_gaps: 6,
        overall_proficiency: 72
    },
    skill_categories: [
        {
            category: "Programming Languages",
            skills: [
                {
                    name: "Python",
                    claimed_level: "Expert",
                    demonstrated_level: "Advanced",
                    verified: true,
                    evidence: "Strong performance in coding challenges, good understanding of advanced concepts",
                    gap_analysis: "Claimed expert but demonstrated advanced level",
                    development_tips: ["Practice more with concurrency patterns", "Contribute to open source Python projects"]
                },
                {
                    name: "JavaScript",
                    claimed_level: "Advanced",
                    demonstrated_level: "Advanced",
                    verified: true,
                    evidence: "Solid understanding of ES6+, async/await, closures",
                    gap_analysis: null,
                    development_tips: []
                },
                {
                    name: "TypeScript",
                    claimed_level: "Intermediate",
                    demonstrated_level: "Intermediate",
                    verified: true,
                    evidence: "Good grasp of type system and generics",
                    gap_analysis: null,
                    development_tips: ["Explore advanced types and mapped types"]
                },
                {
                    name: "Go",
                    claimed_level: "Beginner",
                    demonstrated_level: null,
                    verified: false,
                    evidence: "Listed on resume but not evaluated in interview",
                    gap_analysis: "Skill not verified",
                    development_tips: ["Build a project in Go to demonstrate proficiency"]
                }
            ]
        },
        {
            category: "Frontend Frameworks",
            skills: [
                {
                    name: "React",
                    claimed_level: "Expert",
                    demonstrated_level: "Expert",
                    verified: true,
                    evidence: "Deep knowledge of hooks, context, performance optimization, and patterns",
                    gap_analysis: null,
                    development_tips: []
                },
                {
                    name: "Next.js",
                    claimed_level: "Advanced",
                    demonstrated_level: "Intermediate",
                    verified: true,
                    evidence: "Good understanding of basics but gaps in advanced features",
                    gap_analysis: "SSR/SSG concepts need strengthening",
                    development_tips: ["Build a full-stack Next.js app", "Study ISR and middleware"]
                }
            ]
        },
        {
            category: "Backend & APIs",
            skills: [
                {
                    name: "Node.js",
                    claimed_level: "Advanced",
                    demonstrated_level: "Advanced",
                    verified: true,
                    evidence: "Strong understanding of event loop, streams, and async patterns",
                    gap_analysis: null,
                    development_tips: []
                },
                {
                    name: "REST API Design",
                    claimed_level: "Advanced",
                    demonstrated_level: "Advanced",
                    verified: true,
                    evidence: "Well-versed in REST principles and best practices",
                    gap_analysis: null,
                    development_tips: []
                },
                {
                    name: "GraphQL",
                    claimed_level: null,
                    demonstrated_level: null,
                    verified: false,
                    evidence: "Not listed on resume, identified as a gap",
                    gap_analysis: "Missing from skillset - important for modern APIs",
                    development_tips: ["Take Apollo GraphQL tutorial", "Add GraphQL to an existing project"]
                }
            ]
        },
        {
            category: "Cloud & DevOps",
            skills: [
                {
                    name: "AWS",
                    claimed_level: "Intermediate",
                    demonstrated_level: "Intermediate",
                    verified: true,
                    evidence: "Familiar with core services, but limited on advanced services",
                    gap_analysis: "Knowledge limited to basic services",
                    development_tips: ["Get AWS Solutions Architect certification", "Practice with EKS and Step Functions"]
                },
                {
                    name: "Docker",
                    claimed_level: "Advanced",
                    demonstrated_level: "Advanced",
                    verified: true,
                    evidence: "Strong containerization knowledge, multi-stage builds",
                    gap_analysis: null,
                    development_tips: []
                },
                {
                    name: "Kubernetes",
                    claimed_level: "Beginner",
                    demonstrated_level: null,
                    verified: false,
                    evidence: "Listed but not demonstrated",
                    gap_analysis: "Important skill for cloud-native development",
                    development_tips: ["Complete Kubernetes basics certification", "Deploy a sample app to K8s"]
                }
            ]
        },
        {
            category: "System Design",
            skills: [
                {
                    name: "Microservices Architecture",
                    claimed_level: "Advanced",
                    demonstrated_level: "Intermediate",
                    verified: true,
                    evidence: "Good understanding of principles but limited distributed systems experience",
                    gap_analysis: "Gap in distributed patterns like saga, event sourcing",
                    development_tips: ["Read 'Building Microservices' by Sam Newman", "Practice distributed system design problems"]
                },
                {
                    name: "Database Design",
                    claimed_level: "Advanced",
                    demonstrated_level: "Advanced",
                    verified: true,
                    evidence: "Strong SQL knowledge, good understanding of normalization and indexing",
                    gap_analysis: null,
                    development_tips: []
                }
            ]
        },
        {
            category: "Soft Skills",
            skills: [
                {
                    name: "Communication",
                    claimed_level: "Advanced",
                    demonstrated_level: "Intermediate",
                    verified: true,
                    evidence: "Clear communication but tends to over-explain",
                    gap_analysis: "Needs to be more concise",
                    development_tips: ["Practice elevator pitches", "Use the 'bottom line up front' approach"]
                },
                {
                    name: "Leadership",
                    claimed_level: "Intermediate",
                    demonstrated_level: "Intermediate",
                    verified: true,
                    evidence: "Has led small teams, mentored juniors",
                    gap_analysis: null,
                    development_tips: ["Seek more leadership opportunities", "Take a leadership course"]
                },
                {
                    name: "Problem Solving",
                    claimed_level: "Advanced",
                    demonstrated_level: "Advanced",
                    verified: true,
                    evidence: "Structured approach to problems, good analytical thinking",
                    gap_analysis: null,
                    development_tips: []
                }
            ]
        }
    ],
    development_roadmap: {
        high_priority: [
            {
                skill: "GraphQL",
                reason: "Missing from skillset, highly requested in job market",
                resources: [
                    { name: "Apollo GraphQL Tutorial", url: "https://www.apollographql.com/tutorials" },
                    { name: "GraphQL Official Docs", url: "https://graphql.org/learn" }
                ],
                estimated_time: "2-3 weeks"
            },
            {
                skill: "Kubernetes",
                reason: "Essential for cloud-native development roles",
                resources: [
                    { name: "Kubernetes Basics", url: "https://kubernetes.io/docs/tutorials" },
                    { name: "CKAD Certification", url: "https://www.cncf.io/certification/ckad" }
                ],
                estimated_time: "4-6 weeks"
            }
        ],
        medium_priority: [
            {
                skill: "AWS Advanced Services",
                reason: "Expand cloud expertise for senior roles",
                resources: [
                    { name: "AWS Solutions Architect Course", url: "https://aws.amazon.com/certification" },
                    { name: "A Cloud Guru", url: "https://acloudguru.com" }
                ],
                estimated_time: "6-8 weeks"
            },
            {
                skill: "Distributed Systems",
                reason: "Important for system design interviews",
                resources: [
                    { name: "Designing Data-Intensive Applications", url: "#" },
                    { name: "System Design Primer", url: "https://github.com/donnemartin/system-design-primer" }
                ],
                estimated_time: "Ongoing"
            }
        ],
        low_priority: [
            {
                skill: "Go",
                reason: "Listed but not evaluated - verify proficiency",
                resources: [
                    { name: "Go by Example", url: "https://gobyexample.com" },
                    { name: "Tour of Go", url: "https://go.dev/tour" }
                ],
                estimated_time: "3-4 weeks"
            }
        ]
    },
    market_comparison: {
        above_market: ["React", "Python", "Node.js", "Docker"],
        at_market: ["JavaScript", "TypeScript", "REST API", "Database Design"],
        below_market: ["GraphQL", "Kubernetes", "AWS Advanced"]
    }
}

export default function SkillsAssessmentPage() {
    const [report] = useState(mockSkillsAssessment)
    const [expandedCategories, setExpandedCategories] = useState<string[]>(["Programming Languages", "Frontend Frameworks"])

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        )
    }

    const getLevelColor = (level: string | null) => {
        if (!level) return "bg-gray-100 text-gray-500"
        const colors: Record<string, string> = {
            "Expert": "bg-purple-100 text-purple-700",
            "Advanced": "bg-green-100 text-green-700",
            "Intermediate": "bg-blue-100 text-blue-700",
            "Beginner": "bg-yellow-100 text-yellow-700"
        }
        return colors[level] || "bg-gray-100 text-gray-500"
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
            return <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded">Not Tested</span>
        }
        if (verified) {
            return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded flex items-center gap-1">
                <CheckCircle size={12} /> Verified
            </span>
        }
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Unverified</span>
    }

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
                    <div className="text-sm font-medium opacity-80 mb-1">Total Skills</div>
                    <div className="text-4xl font-bold">{report.summary.total_skills}</div>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                    <div className="text-sm text-green-700 mb-1">Verified Skills</div>
                    <div className="text-4xl font-bold text-green-600">{report.summary.verified_skills}</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-5">
                    <div className="text-sm text-yellow-700 mb-1">Skill Gaps</div>
                    <div className="text-4xl font-bold text-yellow-600">{report.summary.skill_gaps}</div>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
                    <div className="text-sm text-purple-700 mb-1">Overall Proficiency</div>
                    <div className="text-4xl font-bold text-purple-600">{report.summary.overall_proficiency}%</div>
                </div>
            </div>

            {/* Market Comparison */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 size={20} className="text-blue-600" />
                    Market Comparison
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                        <div className="text-sm font-medium text-green-700 mb-3 flex items-center gap-1">
                            <TrendingUp size={16} />
                            Above Market Average
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {report.market_comparison.above_market.map(skill => (
                                <span key={skill} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <div className="text-sm font-medium text-blue-700 mb-3 flex items-center gap-1">
                            <Target size={16} />
                            At Market Average
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {report.market_comparison.at_market.map(skill => (
                                <span key={skill} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                        <div className="text-sm font-medium text-orange-700 mb-3 flex items-center gap-1">
                            <AlertTriangle size={16} />
                            Below Market / Gaps
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {report.market_comparison.below_market.map(skill => (
                                <span key={skill} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Skills by Category */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Target size={20} className="text-blue-600" />
                    Skills Breakdown by Category
                </h2>
                <div className="space-y-3">
                    {report.skill_categories.map((category) => (
                        <div key={category.category} className="border border-gray-200 rounded-xl overflow-hidden">
                            <button
                                onClick={() => toggleCategory(category.category)}
                                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-900">{category.category}</span>
                                    <span className="text-sm text-gray-500">
                                        {category.skills.length} skills
                                    </span>
                                </div>
                                {expandedCategories.includes(category.category) ? (
                                    <ChevronUp size={18} className="text-gray-400" />
                                ) : (
                                    <ChevronDown size={18} className="text-gray-400" />
                                )}
                            </button>

                            {expandedCategories.includes(category.category) && (
                                <div className="p-4 border-t border-gray-200">
                                    <div className="space-y-4">
                                        {category.skills.map((skill) => (
                                            <div key={skill.name} className="border border-gray-100 rounded-lg p-4">
                                                {/* Skill Header */}
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-900">{skill.name}</span>
                                                        {getVerificationBadge(skill.verified, skill.demonstrated_level)}
                                                    </div>
                                                </div>

                                                {/* Level Comparison */}
                                                <div className="grid md:grid-cols-2 gap-4 mb-3">
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Claimed Level (Resume)</div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getLevelColor(skill.claimed_level)}`}>
                                                                {skill.claimed_level || "Not Listed"}
                                                            </span>
                                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gray-300 rounded-full"
                                                                    style={{ width: getLevelWidth(skill.claimed_level) }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Demonstrated Level (Interview)</div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getLevelColor(skill.demonstrated_level)}`}>
                                                                {skill.demonstrated_level || "Not Tested"}
                                                            </span>
                                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${skill.demonstrated_level ? "bg-blue-500" : "bg-gray-200"}`}
                                                                    style={{ width: getLevelWidth(skill.demonstrated_level) }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Evidence */}
                                                <div className="text-sm text-gray-600 mb-2">
                                                    <span className="font-medium">Evidence:</span> {skill.evidence}
                                                </div>

                                                {/* Gap Analysis */}
                                                {skill.gap_analysis && (
                                                    <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-2 text-sm text-yellow-700 mb-2">
                                                        <AlertTriangle size={14} className="inline mr-1" />
                                                        <span className="font-medium">Gap:</span> {skill.gap_analysis}
                                                    </div>
                                                )}

                                                {/* Development Tips */}
                                                {skill.development_tips.length > 0 && (
                                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-2">
                                                        <div className="text-xs font-medium text-blue-700 mb-1 flex items-center gap-1">
                                                            <Lightbulb size={12} />
                                                            Development Tips
                                                        </div>
                                                        <ul className="text-sm text-blue-800">
                                                            {skill.development_tips.map((tip, i) => (
                                                                <li key={i} className="flex items-start gap-1">
                                                                    <span className="text-blue-400">•</span>
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
            </div>

            {/* Development Roadmap */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BookOpen size={20} className="text-blue-600" />
                    Development Roadmap
                </h2>

                {/* High Priority */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                        <span className="font-bold text-gray-900">High Priority</span>
                        <span className="text-sm text-gray-500">- Start now for maximum impact</span>
                    </div>
                    <div className="space-y-3">
                        {report.development_roadmap.high_priority.map((item, i) => (
                            <div key={i} className="bg-red-50 border border-red-100 rounded-xl p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <span className="font-bold text-red-800">{item.skill}</span>
                                        <p className="text-sm text-red-700 mt-1">{item.reason}</p>
                                    </div>
                                    <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                                        {item.estimated_time}
                                    </span>
                                </div>
                                <div className="mt-3">
                                    <div className="text-xs font-medium text-red-700 mb-2">Recommended Resources:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {item.resources.map((resource, j) => (
                                            <a
                                                key={j}
                                                href={resource.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-sm text-red-700 bg-white px-3 py-1 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
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
                        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                        <span className="font-bold text-gray-900">Medium Priority</span>
                        <span className="text-sm text-gray-500">- Plan for next quarter</span>
                    </div>
                    <div className="space-y-3">
                        {report.development_roadmap.medium_priority.map((item, i) => (
                            <div key={i} className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <span className="font-bold text-yellow-800">{item.skill}</span>
                                        <p className="text-sm text-yellow-700 mt-1">{item.reason}</p>
                                    </div>
                                    <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                                        {item.estimated_time}
                                    </span>
                                </div>
                                <div className="mt-3">
                                    <div className="text-xs font-medium text-yellow-700 mb-2">Recommended Resources:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {item.resources.map((resource, j) => (
                                            <a
                                                key={j}
                                                href={resource.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-sm text-yellow-700 bg-white px-3 py-1 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors"
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
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        <span className="font-bold text-gray-900">Low Priority</span>
                        <span className="text-sm text-gray-500">- Nice to have</span>
                    </div>
                    <div className="space-y-3">
                        {report.development_roadmap.low_priority.map((item, i) => (
                            <div key={i} className="bg-green-50 border border-green-100 rounded-xl p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <span className="font-bold text-green-800">{item.skill}</span>
                                        <p className="text-sm text-green-700 mt-1">{item.reason}</p>
                                    </div>
                                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                        {item.estimated_time}
                                    </span>
                                </div>
                                <div className="mt-3">
                                    <div className="text-xs font-medium text-green-700 mb-2">Recommended Resources:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {item.resources.map((resource, j) => (
                                            <a
                                                key={j}
                                                href={resource.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-sm text-green-700 bg-white px-3 py-1 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
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
            </div>

            {/* Download Button */}
            <div className="flex justify-center pt-4">
                <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                    <Download size={18} />
                    Download Skills Report (PDF)
                </button>
            </div>
        </div>
    )
}
