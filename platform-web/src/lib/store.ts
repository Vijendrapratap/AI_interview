import { create } from 'zustand'

interface User {
    id: string
    name: string
    email: string
    role: 'recruiter' | 'admin' | 'candidate'
}

interface ResumeFileInfo {
    name: string
    size: number
}

interface AnalysisResult {
    resumeId: string
    analysisId: string
    score: number
    fitScore: number | null
    topSkills: string[]
    missingSkills: string[]
    suggestions: string[]
    // Full analysis data from backend
    atsScore?: number
    contentScore?: number
    formatScore?: number
    sections?: Record<string, unknown>
    keywords?: Record<string, unknown>
    improvements?: string[]
}

interface AppState {
    user: User | null
    isAuthenticated: boolean
    setUser: (user: User | null) => void
    logout: () => void
    // Resume analysis state
    resumeFileInfo: ResumeFileInfo | null
    analysisResult: AnalysisResult | null
    jdText: string
    setResumeFileInfo: (info: ResumeFileInfo | null) => void
    setAnalysisResult: (result: AnalysisResult | null) => void
    setJdText: (text: string) => void
    clearAnalysis: () => void
}

export const useAppStore = create<AppState>((set) => ({
    user: null,
    isAuthenticated: false,
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    logout: () => set({ user: null, isAuthenticated: false, resumeFileInfo: null, analysisResult: null, jdText: '' }),
    // Resume analysis state
    resumeFileInfo: null,
    analysisResult: null,
    jdText: '',
    setResumeFileInfo: (info) => set({ resumeFileInfo: info }),
    setAnalysisResult: (result) => set({ analysisResult: result }),
    setJdText: (text) => set({ jdText: text }),
    clearAnalysis: () => set({ resumeFileInfo: null, analysisResult: null, jdText: '' }),
}))
