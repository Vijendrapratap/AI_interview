"use client"

import { useState } from "react"
import { Upload, FileText, CheckCircle, ArrowRight, Play, Loader2, BarChart2, TrendingUp, Target, MessageSquare, RotateCcw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"

export default function CandidatePortalPage() {
    const router = useRouter()

    // Get persisted state from store
    const resumeFileInfo = useAppStore((state) => state.resumeFileInfo)
    const analysisResult = useAppStore((state) => state.analysisResult)
    const jdText = useAppStore((state) => state.jdText)
    const setResumeFileInfo = useAppStore((state) => state.setResumeFileInfo)
    const setAnalysisResult = useAppStore((state) => state.setAnalysisResult)
    const setJdText = useAppStore((state) => state.setJdText)
    const clearAnalysis = useAppStore((state) => state.clearAnalysis)

    // Local state for file object (can't be persisted) and UI
    const [resumeFile, setResumeFile] = useState<File | null>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [interviewTopic, setInterviewTopic] = useState("")

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setResumeFile(file)
            setResumeFileInfo({ name: file.name, size: file.size })
            // Clear previous analysis when new file is uploaded
            setAnalysisResult(null)
        }
    }

    const handleStartOver = () => {
        clearAnalysis()
        setResumeFile(null)
        setInterviewTopic("")
    }

    const startAnalysis = async () => {
        if (!resumeFile) return
        setIsAnalyzing(true)

        try {
            // 1. Upload Resume
            const formData = new FormData()
            formData.append("file", resumeFile)

            const uploadRes = await fetch("http://localhost:8000/api/v1/resume/upload", {
                method: "POST",
                body: formData
            })

            if (!uploadRes.ok) {
                const errorData = await uploadRes.json().catch(() => ({}))
                const errorMessage = errorData.detail?.message || errorData.detail || "Failed to upload resume"
                throw new Error(errorMessage)
            }

            const uploadData = await uploadRes.json()
            const resumeId = uploadData.id

            // 2. Call real analysis endpoint
            const analysisRes = await fetch("http://localhost:8000/api/v1/analysis/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    resume_id: resumeId,
                    job_description: jdText || null,
                    analysis_type: "comprehensive"
                })
            })

            if (!analysisRes.ok) {
                throw new Error("Failed to analyze resume")
            }

            const analysisData = await analysisRes.json()

            // Extract top skills from sections or keywords
            const topSkills = analysisData.keywords?.technical_skills ||
                analysisData.keywords?.found_keywords?.technical ||
                []
            const missingSkills = analysisData.keywords?.missing_keywords || []
            const suggestions = analysisData.improvements || []

            const result = {
                resumeId: resumeId,
                analysisId: analysisData.analysis_id,
                score: analysisData.overall_score || 0,
                fitScore: analysisData.jd_match_score || null,
                topSkills: Array.isArray(topSkills) ? topSkills.slice(0, 5) : [],
                missingSkills: Array.isArray(missingSkills) ? missingSkills.slice(0, 5) : [],
                suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 3) : [],
                atsScore: analysisData.ats_score,
                contentScore: analysisData.content_score,
                formatScore: analysisData.format_score,
                sections: analysisData.sections,
                keywords: analysisData.keywords,
                improvements: analysisData.improvements
            }

            setAnalysisResult(result)
            setIsAnalyzing(false)

        } catch (err) {
            console.error("Analysis failed", err)
            setIsAnalyzing(false)
            alert(err instanceof Error ? err.message : "Failed to process resume. Please try again.")
        }
    }

    const startInterview = () => {
        if (!analysisResult?.resumeId) return
        router.push(`/interview/${analysisResult.resumeId}`)
    }

    // Check if we have a persisted file (from store) or a new file
    const hasFile = resumeFile || resumeFileInfo
    const displayFileName = resumeFile?.name || resumeFileInfo?.name
    const displayFileSize = resumeFile?.size || resumeFileInfo?.size

    return (
        <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Upload size={20} className="text-blue-600" />
                        1. Upload Code/Resume
                    </h2>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors relative">
                        <input
                            type="file"
                            accept=".pdf,.docx,.txt"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={!!analysisResult}
                        />
                        {hasFile ? (
                            <div className="flex flex-col items-center text-blue-600">
                                <CheckCircle size={32} className="mb-2" />
                                <span className="font-medium">{displayFileName}</span>
                                <span className="text-sm text-gray-500">{displayFileSize ? (displayFileSize / 1024).toFixed(0) : 0} KB</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-gray-400">
                                <FileText size={32} className="mb-2" />
                                <span className="font-medium text-gray-600">Click to upload or drag & drop</span>
                                <span className="text-sm">PDF, DOCX, TXT up to 10MB</span>
                            </div>
                        )}
                    </div>
                </section>

                <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-blue-600" />
                        2. Job Description (Optional)
                    </h2>
                    <textarea
                        value={jdText}
                        onChange={(e) => setJdText(e.target.value)}
                        placeholder="Paste the Job Description here to get a 'Fit Score' and tailored interview questions..."
                        className="w-full h-40 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-sm text-gray-900 bg-white"
                    />
                </section>

                <button
                    onClick={startAnalysis}
                    disabled={!resumeFile || isAnalyzing || !!analysisResult}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isAnalyzing ? (
                        <>
                            <Loader2 className="animate-spin" /> Analyzing...
                        </>
                    ) : analysisResult ? (
                        <>
                            <CheckCircle size={20} /> Analysis Complete
                        </>
                    ) : (
                        <>
                            Analyze & Prepare <ArrowRight size={20} />
                        </>
                    )}
                </button>

                {analysisResult && (
                    <button
                        onClick={handleStartOver}
                        className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={18} /> Start Over with New Resume
                    </button>
                )}
            </div>

            {/* Results Section */}
            <div className="space-y-6">
                {!analysisResult ? (
                    <div className="h-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 p-12 text-center">
                        <div>
                            <p className="mb-2 font-medium">No Analysis Yet</p>
                            <p className="text-sm">Upload a resume to see your scores and start practicing.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Score Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
                                <div className="text-sm text-gray-500 mb-1">Resume Score</div>
                                <div className="text-4xl font-bold text-purple-600">{analysisResult.score}/100</div>
                            </div>
                            <div className={`bg-white p-6 rounded-2xl shadow-sm border ${analysisResult.fitScore ? 'border-green-100' : 'border-gray-100'}`}>
                                <div className="text-sm text-gray-500 mb-1">Job Fit Score</div>
                                <div className={`text-4xl font-bold ${analysisResult.fitScore ? 'text-green-600' : 'text-gray-300'}`}>
                                    {analysisResult.fitScore || "N/A"}
                                </div>
                            </div>
                        </div>

                        {/* Analysis Details */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-4">AI Insights</h3>

                            <div className="space-y-4">
                                <div>
                                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Strengths</div>
                                    <div className="flex flex-wrap gap-2">
                                        {analysisResult.topSkills.map((skill: string) => (
                                            <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {analysisResult.suggestions.length > 0 && (
                                    <div>
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Suggestions</div>
                                        <ul className="space-y-2">
                                            {analysisResult.suggestions.map((s: string, i: number) => (
                                                <li key={i} className="flex gap-2 text-sm text-gray-600">
                                                    <AlertIcon className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* View Detailed Reports */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <BarChart2 size={20} className="text-blue-600" />
                                View Detailed Reports
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Get in-depth analysis of your resume, skills, career trajectory, and interview performance.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <Link
                                    href="/portal/reports/resume"
                                    className="flex items-center gap-2 p-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors border border-purple-100"
                                >
                                    <FileText size={18} className="text-purple-600" />
                                    <div>
                                        <div className="text-sm font-medium text-purple-900">Resume Analysis</div>
                                        <div className="text-xs text-purple-600">Section breakdown, ATS</div>
                                    </div>
                                </Link>
                                <Link
                                    href="/portal/reports/interview"
                                    className="flex items-center gap-2 p-3 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-100"
                                >
                                    <MessageSquare size={18} className="text-indigo-600" />
                                    <div>
                                        <div className="text-sm font-medium text-indigo-900">Interview</div>
                                        <div className="text-xs text-indigo-600">Q&A feedback, tips</div>
                                    </div>
                                </Link>
                                <Link
                                    href="/portal/reports/career"
                                    className="flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-100"
                                >
                                    <TrendingUp size={18} className="text-blue-600" />
                                    <div>
                                        <div className="text-sm font-medium text-blue-900">Career Analytics</div>
                                        <div className="text-xs text-blue-600">Gaps, stability, trajectory</div>
                                    </div>
                                </Link>
                                <Link
                                    href="/portal/reports/skills"
                                    className="flex items-center gap-2 p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-colors border border-green-100"
                                >
                                    <Target size={18} className="text-green-600" />
                                    <div>
                                        <div className="text-sm font-medium text-green-900">Skills Assessment</div>
                                        <div className="text-xs text-green-600">Levels, gaps, roadmap</div>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        {/* Start Interview CTA */}
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl shadow-lg text-white">
                            <h3 className="text-xl font-bold mb-2">Ready to Practice?</h3>
                            <p className="text-gray-300 mb-6">Start an AI mock interview based on this profile.</p>

                            {!jdText && (
                                <div className="mb-4">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Focus Topic (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. System Design, React, Leadership"
                                        value={interviewTopic}
                                        onChange={(e) => setInterviewTopic(e.target.value)}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            )}

                            <button
                                onClick={startInterview}
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                            >
                                <Play size={20} fill="currentColor" /> Start Interview Now
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AlertIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
    )
}
