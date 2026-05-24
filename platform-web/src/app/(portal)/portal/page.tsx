"use client"

import { useState } from "react"
import { FileText, CheckCircle, ArrowRight, Play, Loader2, TrendingUp, Target, MessageSquare, RotateCcw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { Card, SectionCard, Badge, Button } from "@/components"

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

            const uploadRes = await fetch("/api/v1/resume/upload", {
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
            const analysisRes = await fetch("/api/v1/analysis/analyze", {
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
                <SectionCard title="1. Upload Code/Resume">
                    <div className="border-2 border-dashed border-border rounded-card p-8 text-center hover:bg-surface-muted transition-colors relative">
                        <input
                            type="file"
                            accept=".pdf,.docx,.txt"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={!!analysisResult}
                        />
                        {hasFile ? (
                            <div className="flex flex-col items-center text-accent">
                                <CheckCircle size={32} className="mb-2" />
                                <span className="font-medium text-ink">{displayFileName}</span>
                                <span className="text-sm text-ink-3">{displayFileSize ? (displayFileSize / 1024).toFixed(0) : 0} KB</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-ink-3">
                                <FileText size={32} className="mb-2" />
                                <span className="font-medium text-ink-2">Click to upload or drag &amp; drop</span>
                                <span className="text-sm">PDF, DOCX, TXT up to 10MB</span>
                            </div>
                        )}
                    </div>
                </SectionCard>

                <SectionCard title="2. Job Description (Optional)">
                    <textarea
                        value={jdText}
                        onChange={(e) => setJdText(e.target.value)}
                        placeholder="Paste the Job Description here to get a 'Fit Score' and tailored interview questions..."
                        className="w-full h-40 p-4 border border-border rounded-field focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none resize-none text-sm text-ink bg-surface"
                    />
                </SectionCard>

                <Button
                    onClick={startAnalysis}
                    disabled={!resumeFile || isAnalyzing || !!analysisResult}
                    variant="primary"
                    className="w-full py-4 text-lg"
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
                            Analyze &amp; Prepare <ArrowRight size={20} />
                        </>
                    )}
                </Button>

                {analysisResult && (
                    <Button
                        onClick={handleStartOver}
                        variant="secondary"
                        className="w-full"
                    >
                        <RotateCcw size={18} /> Start Over with New Resume
                    </Button>
                )}
            </div>

            {/* Results Section */}
            <div className="space-y-6">
                {!analysisResult ? (
                    <div className="h-full bg-surface-muted border-2 border-dashed border-border rounded-card flex items-center justify-center text-ink-3 p-12 text-center">
                        <div>
                            <p className="mb-2 font-medium">No Analysis Yet</p>
                            <p className="text-sm">Upload a resume to see your scores and start practicing.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Score Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="p-6">
                                <div className="text-sm text-ink-3 mb-1">Resume Score</div>
                                <div className="text-metric text-accent">{analysisResult.score}/100</div>
                            </Card>
                            <Card className="p-6">
                                <div className="text-sm text-ink-3 mb-1">Job Fit Score</div>
                                <div className={`text-metric ${analysisResult.fitScore ? "text-accent" : "text-ink-3"}`}>
                                    {analysisResult.fitScore || "N/A"}
                                </div>
                            </Card>
                        </div>

                        {/* Analysis Details */}
                        <SectionCard title="AI Insights">
                            <div className="space-y-4">
                                <div>
                                    <div className="text-eyebrow mb-2">Strengths</div>
                                    <div className="flex flex-wrap gap-2">
                                        {analysisResult.topSkills.map((skill: string) => (
                                            <Badge key={skill} tone="accent">{skill}</Badge>
                                        ))}
                                    </div>
                                </div>

                                {analysisResult.suggestions.length > 0 && (
                                    <div>
                                        <div className="text-eyebrow mb-2">Suggestions</div>
                                        <ul className="space-y-2">
                                            {analysisResult.suggestions.map((s: string, i: number) => (
                                                <li key={i} className="flex gap-2 text-sm text-ink-2">
                                                    <AlertIcon className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </SectionCard>

                        {/* View Detailed Reports */}
                        <SectionCard title="View Detailed Reports">
                            <p className="text-sm text-ink-2 mb-4">
                                Get in-depth analysis of your resume, skills, career trajectory, and interview performance.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <Link
                                    href="/portal/reports/resume"
                                    className="flex items-center gap-2 p-3 bg-accent-soft hover:bg-accent-soft/80 rounded-card transition-colors border border-border-card"
                                >
                                    <FileText size={18} className="text-accent-soft-ink" />
                                    <div>
                                        <div className="text-sm font-medium text-ink">Resume Analysis</div>
                                        <div className="text-xs text-ink-3">Section breakdown, ATS</div>
                                    </div>
                                </Link>
                                <Link
                                    href="/portal/reports/interview"
                                    className="flex items-center gap-2 p-3 bg-accent-soft hover:bg-accent-soft/80 rounded-card transition-colors border border-border-card"
                                >
                                    <MessageSquare size={18} className="text-accent-soft-ink" />
                                    <div>
                                        <div className="text-sm font-medium text-ink">Interview</div>
                                        <div className="text-xs text-ink-3">Q&amp;A feedback, tips</div>
                                    </div>
                                </Link>
                                <Link
                                    href="/portal/reports/career"
                                    className="flex items-center gap-2 p-3 bg-accent-soft hover:bg-accent-soft/80 rounded-card transition-colors border border-border-card"
                                >
                                    <TrendingUp size={18} className="text-accent-soft-ink" />
                                    <div>
                                        <div className="text-sm font-medium text-ink">Career Analytics</div>
                                        <div className="text-xs text-ink-3">Gaps, stability, trajectory</div>
                                    </div>
                                </Link>
                                <Link
                                    href="/portal/reports/skills"
                                    className="flex items-center gap-2 p-3 bg-accent-soft hover:bg-accent-soft/80 rounded-card transition-colors border border-border-card"
                                >
                                    <Target size={18} className="text-accent-soft-ink" />
                                    <div>
                                        <div className="text-sm font-medium text-ink">Skills Assessment</div>
                                        <div className="text-xs text-ink-3">Levels, gaps, roadmap</div>
                                    </div>
                                </Link>
                            </div>
                        </SectionCard>

                        {/* Start Interview CTA */}
                        <Card className="p-6 bg-ink text-card">
                            <h3 className="text-xl font-bold mb-2 text-card">Ready to Practice?</h3>
                            <p className="text-card/70 mb-6">Start an AI mock interview based on this profile.</p>

                            {!jdText && (
                                <div className="mb-4">
                                    <label className="text-eyebrow text-card/60 mb-2 block">Focus Topic (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. System Design, React, Leadership"
                                        value={interviewTopic}
                                        onChange={(e) => setInterviewTopic(e.target.value)}
                                        className="w-full px-4 py-2 bg-card/10 border border-card/20 rounded-field text-card placeholder-card/40 focus:ring-2 focus:ring-accent focus:outline-none"
                                    />
                                </div>
                            )}

                            <button
                                onClick={startInterview}
                                className="w-full bg-accent text-accent-ink py-3 rounded-pill font-bold hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
                            >
                                <Play size={20} fill="currentColor" /> Start Interview Now
                            </button>
                        </Card>
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
