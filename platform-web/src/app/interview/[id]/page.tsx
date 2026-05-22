"use client"

/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useRef, useCallback, use } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, PhoneOff, Settings, Loader2, CheckCircle, Send } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button, Badge } from "@/components"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface QuestionData {
    question: string
    question_number: number
    total_questions: number
    question_type: string
    topic: string
}

interface TranscriptEntry {
    role: 'ai' | 'user'
    text: string
    type?: 'intro' | 'question' | 'response' | 'closing' | 'feedback'
}

export default function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id } = use(params)

    // UI State
    const [step, setStep] = useState<'setup' | 'interview' | 'completed'>('setup')
    const [permissionsGranted, setPermissionsGranted] = useState(false)
    const [status, setStatus] = useState<'ai_speaking' | 'listening' | 'processing' | 'idle'>('idle')
    const [interviewMode, setInterviewMode] = useState<'voice' | 'text'>('voice')

    // Interview State
    const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null)
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [, setIntroMessage] = useState("")
    const [textInput, setTextInput] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [elapsedTime, setElapsedTime] = useState(0)

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null)
    const transcriptEndRef = useRef<HTMLDivElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    // Audio/Recorder Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    // Auto-scroll transcript
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [transcript])

    // Timer
    useEffect(() => {
        if (step === 'interview') {
            timerRef.current = setInterval(() => setElapsedTime(t => t + 1), 1000)
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [step])

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0')
        const s = (seconds % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    // Camera Handlers
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }
            streamRef.current = stream
            setPermissionsGranted(true)

            // Initialize Audio Analysis for Silence Detection
            const AudioContextClass = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
            const audioCtx = new AudioContextClass()
            const analyser = audioCtx.createAnalyser()
            analyser.fftSize = 256
            const source = audioCtx.createMediaStreamSource(stream)
            source.connect(analyser)

            audioContextRef.current = audioCtx
            analyserRef.current = analyser

        } catch (err) {
            console.error("Error accessing media devices:", err)
            setPermissionsGranted(false)
        }
    }

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        audioContextRef.current?.close()
    }

    // Start Session (Backend)
    const initSession = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/interview/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resume_id: id,
                    interview_type: "comprehensive",
                    num_questions: 7,
                    mode: interviewMode
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || "Failed to start interview")
            }

            const data = await res.json()
            setSessionId(data.session_id)

            // Set intro message and first question from backend
            const intro = data.intro_message || "Hello! Let's begin the interview."
            setIntroMessage(intro)

            const firstQ: QuestionData = {
                question: data.first_question.question,
                question_number: data.first_question.question_number,
                total_questions: data.first_question.total_questions,
                question_type: data.first_question.question_type,
                topic: data.first_question.topic
            }
            setCurrentQuestion(firstQ)

            // Add intro + first question to transcript and speak
            setTranscript([{ role: 'ai', text: intro, type: 'intro' }])

            // Speak intro then question
            const fullText = `${intro} ... ${firstQ.question}`
            await speakAI(fullText, firstQ)

        } catch (e) {
            console.error("Session Init Failed", e)
            setTranscript([{ role: 'ai', text: "Sorry, there was an error starting the interview. Please try again.", type: 'intro' }])
        }
    }, [id, interviewMode])

    // Submit response to backend
    const submitResponse = async (responseText: string) => {
        if (!sessionId || isSubmitting) return

        setIsSubmitting(true)
        setStatus('processing')

        // Add user response to transcript
        setTranscript(prev => [...prev, { role: 'user', text: responseText, type: 'response' }])

        try {
            const res = await fetch(`${API_BASE}/api/v1/interview/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    session_id: sessionId,
                    response: responseText
                })
            })

            if (!res.ok) {
                throw new Error("Failed to submit response")
            }

            const data = await res.json()

            // Show brief feedback in transcript
            if (data.evaluation_summary) {
                setTranscript(prev => [...prev, { role: 'ai', text: data.evaluation_summary, type: 'feedback' }])
            }

            if (data.is_complete) {
                // Interview complete
                const closingMsg = data.closing_message || "Thank you for completing the interview!"
                setTranscript(prev => [...prev, { role: 'ai', text: closingMsg, type: 'closing' }])
                await speakAI(closingMsg, null)
                setTimeout(() => setStep('completed'), 3000)
                return
            }

            if (data.next_question) {
                const nextQ: QuestionData = {
                    question: data.next_question.question,
                    question_number: data.next_question.question_number,
                    total_questions: data.next_question.total_questions,
                    question_type: data.next_question.question_type,
                    topic: data.next_question.topic
                }
                setCurrentQuestion(nextQ)
                // Speak next question
                await speakAI(nextQ.question, nextQ)
            }

        } catch (e) {
            console.error("Submit Error", e)
            setTranscript(prev => [...prev, { role: 'ai', text: "Sorry, there was an error processing your response. Let me try the next question." }])
        } finally {
            setIsSubmitting(false)
        }
    }

    // Submit audio response
    const submitAudioResponse = async (audioBlob: Blob) => {
        if (!sessionId || isSubmitting) return

        setIsSubmitting(true)
        setStatus('processing')

        const formData = new FormData()
        formData.append('audio', audioBlob, 'response.webm')

        try {
            const res = await fetch(`${API_BASE}/api/v1/interview/respond/audio?session_id=${sessionId}`, {
                method: "POST",
                body: formData
            })

            if (!res.ok) throw new Error("Audio upload failed")

            const data = await res.json()

            // Show transcription in transcript
            const transcriptText = data.transcript || "(Voice response processed)"
            setTranscript(prev => [...prev, { role: 'user', text: transcriptText, type: 'response' }])

            // Show feedback
            if (data.evaluation_summary) {
                setTranscript(prev => [...prev, { role: 'ai', text: data.evaluation_summary, type: 'feedback' }])
            }

            if (data.is_complete) {
                const closingMsg = data.closing_message || "Thank you for completing the interview!"
                setTranscript(prev => [...prev, { role: 'ai', text: closingMsg, type: 'closing' }])
                await speakAI(closingMsg, null)
                setTimeout(() => setStep('completed'), 3000)
                return
            }

            if (data.next_question) {
                const nextQ: QuestionData = {
                    question: data.next_question.question,
                    question_number: data.next_question.question_number,
                    total_questions: data.next_question.total_questions,
                    question_type: data.next_question.question_type,
                    topic: data.next_question.topic
                }
                setCurrentQuestion(nextQ)
                await speakAI(nextQ.question, nextQ)
            }

        } catch (e) {
            console.error("Audio Upload Error", e)
            setTranscript(prev => [...prev, { role: 'ai', text: "Sorry, I couldn't process your audio. Please try again or switch to text mode." }])
            setStatus('idle')
        } finally {
            setIsSubmitting(false)
        }
    }

    const startListening = useCallback(() => {
        if (!streamRef.current) return

        const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'audio/webm' })

        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data)
            }
        }

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
            await submitAudioResponse(audioBlob)
        }

        mediaRecorder.start()
        setStatus('listening')

        // Start Silence Detection Loop
        detectSilence()
    }, [sessionId])

    const detectSilence = () => {
        if (!analyserRef.current) return

        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        const checkVolume = () => {
            if (mediaRecorderRef.current?.state !== 'recording') return

            analyserRef.current!.getByteFrequencyData(dataArray)

            let sum = 0
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i]
            }
            const average = sum / bufferLength

            if (average < 10) {
                if (!silenceTimerRef.current) {
                    silenceTimerRef.current = setTimeout(() => {
                        stopListening()
                    }, 2500) // 2.5s of silence stops recording
                }
            } else {
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current)
                    silenceTimerRef.current = null
                }
            }
            requestAnimationFrame(checkVolume)
        }
        checkVolume()
    }

    const stopListening = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current)
                silenceTimerRef.current = null
            }
        }
    }

    const speakAI = async (text: string, question: QuestionData | null) => {
        setStatus('ai_speaking')

        // Add question to transcript if it's a new question (not intro/closing)
        if (question) {
            setTranscript(prev => [...prev, { role: 'ai', text: question.question, type: 'question' }])
        }

        try {
            // Use backend TTS with default provider (no hardcoded provider)
            const response = await fetch(`${API_BASE}/api/v1/tts/synthesize`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text,
                    speed: 1.0
                })
            })

            if (!response.ok) throw new Error("TTS Failed")

            const audioBlob = await response.blob()
            const audioUrl = URL.createObjectURL(audioBlob)
            const audio = new Audio(audioUrl)

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl)
                if (interviewMode === 'voice') {
                    setStatus('listening')
                    startListening()
                } else {
                    setStatus('idle')
                }
            }
            audio.play()

        } catch (err) {
            console.error("TTS Error, using browser fallback", err)
            // Browser fallback
            const u = new SpeechSynthesisUtterance(text)
            u.rate = 0.95
            u.onend = () => {
                if (interviewMode === 'voice') {
                    startListening()
                } else {
                    setStatus('idle')
                }
            }
            window.speechSynthesis.speak(u)
        }
    }

    // Text mode submission
    const handleTextSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!textInput.trim() || isSubmitting) return

        const response = textInput.trim()
        setTextInput("")
        await submitResponse(response)
    }

    const endCall = async () => {
        stopCamera()
        stopListening()
        window.speechSynthesis?.cancel()

        // End session on backend
        if (sessionId) {
            try {
                await fetch(`${API_BASE}/api/v1/interview/end/${sessionId}`, { method: "POST" })
            } catch (e) {
                console.error("Error ending session", e)
            }
        }

        setStep('completed')
    }

    // --- EFFECTS ---

    // Camera Stream Management
    useEffect(() => {
        if (step === 'setup' || step === 'interview') {
            startCamera()
        }
        return () => stopCamera()
    }, [step])

    // Init Session and Start Flow when interview begins
    useEffect(() => {
        if (step === 'interview' && !sessionId) {
            initSession()
        }
    }, [step, sessionId, initSession])

    // Render setup...
    if (step === 'setup') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-card rounded-card shadow-card border border-border-card p-8 text-center">
                    <div className="w-16 h-16 bg-accent-soft rounded-full flex items-center justify-center mx-auto mb-6 text-accent-soft-ink">
                        <Settings size={32} />
                    </div>
                    <h1 className="text-page-title text-2xl font-bold mb-2">System Check</h1>
                    <p className="text-ink-3 mb-6">We need to check your camera and microphone.</p>

                    <div className="w-full h-48 bg-ink rounded-tile mb-6 overflow-hidden relative border border-border">
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                        {!permissionsGranted && (
                            <div className="absolute inset-0 flex items-center justify-center bg-surface-muted z-10">
                                <p className="text-sm text-ink-3">Waiting for permissions...</p>
                            </div>
                        )}
                        <div className="absolute bottom-2 right-2 flex gap-2">
                            <span className="bg-ink/70 text-card text-xs px-2 py-1 rounded-field flex items-center gap-1">
                                <Mic size={12} className={permissionsGranted ? "text-success-soft-ink" : "text-danger-soft-ink"} />
                                {permissionsGranted ? "Mic On" : "Check Mic"}
                            </span>
                        </div>
                    </div>

                    {/* Mode Selection */}
                    <div className="flex gap-3 mb-6">
                        <button
                            onClick={() => setInterviewMode('voice')}
                            className={`flex-1 py-2.5 rounded-field text-sm font-medium transition-all border ${
                                interviewMode === 'voice'
                                    ? 'bg-accent-soft border-accent text-accent-soft-ink'
                                    : 'bg-surface-muted border-border text-ink-3 hover:bg-surface'
                            }`}
                        >
                            <Mic size={14} className="inline mr-1" /> Voice Mode
                        </button>
                        <button
                            onClick={() => setInterviewMode('text')}
                            className={`flex-1 py-2.5 rounded-field text-sm font-medium transition-all border ${
                                interviewMode === 'text'
                                    ? 'bg-accent-soft border-accent text-accent-soft-ink'
                                    : 'bg-surface-muted border-border text-ink-3 hover:bg-surface'
                            }`}
                        >
                            <Send size={14} className="inline mr-1" /> Text Mode
                        </button>
                    </div>

                    <Button
                        variant="primary"
                        disabled={!permissionsGranted}
                        onClick={() => setStep('interview')}
                        className="w-full py-3.5 text-lg"
                    >
                        {permissionsGranted ? "Start Interview" : "Allow Camera Access"}
                    </Button>
                    {!permissionsGranted && (
                        <p className="text-meta text-ink-3 mt-4">Please click &apos;Allow&apos; in your browser pop-up.</p>
                    )}
                </div>
            </div>
        )
    }

    if (step === 'completed') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                >
                    <div className="w-24 h-24 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-6 text-success-soft-ink">
                        <CheckCircle size={48} />
                    </div>
                    <h1 className="text-page-title text-4xl font-bold mb-4">Interview Completed</h1>
                    <p className="text-xl text-ink-2 mb-8 max-w-lg mx-auto">
                        Your responses have been captured and analyzed. View your detailed report below.
                    </p>
                    <div className="flex gap-4 justify-center">
                        {sessionId && (
                            <Button
                                variant="primary"
                                onClick={() => router.push(`/portal/reports/interview?session=${sessionId}`)}
                                className="px-8 py-3"
                            >
                                View Report
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            onClick={() => router.push('/dashboard/candidates')}
                            className="px-8 py-3"
                        >
                            Return to Dashboard
                        </Button>
                    </div>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-ink text-card flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-card/10 flex items-center justify-between px-6 bg-ink">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-danger animate-pulse"></div>
                    <span className="font-mono text-sm tracking-wider text-card/60">REC {formatTime(elapsedTime)}</span>
                </div>
                <div className="font-semibold text-card/80">
                    Live AI Interview
                    {currentQuestion && (
                        <Badge tone="neutral" className="ml-2">
                            Q{currentQuestion.question_number}/{currentQuestion.total_questions}
                        </Badge>
                    )}
                </div>
                <button
                    onClick={endCall}
                    className="bg-danger-soft/20 text-danger px-4 py-2 rounded-field text-sm font-medium hover:bg-danger-soft/30 flex items-center gap-2 transition-colors"
                >
                    <PhoneOff size={16} /> End Call
                </button>
            </header>

            {/* Main Stage */}
            <main className="flex-1 flex flex-col md:flex-row p-6 gap-6 overflow-hidden">

                {/* Main Visualizer Area */}
                <div className="flex-1 bg-card/5 rounded-card relative flex flex-col items-center justify-center overflow-hidden border border-card/10">
                    {/* AI Avatar / Visualizer */}
                    <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center mb-12">
                        {/* Pulsing rings */}
                        <AnimatePresence>
                            {status === 'ai_speaking' ? (
                                <>
                                    <motion.div
                                        className="absolute inset-0 rounded-full border border-accent/40"
                                        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    <motion.div
                                        className="absolute inset-0 rounded-full border border-accent/20"
                                        animate={{ scale: [1, 2], opacity: [0.3, 0] }}
                                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                    />
                                </>
                            ) : null}
                            {status === 'listening' ? (
                                <motion.div
                                    className="absolute inset-0 rounded-full border border-success/30"
                                    animate={{ scale: [1, 1.2], opacity: [0.3, 0.1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                            ) : null}
                        </AnimatePresence>

                        {/* Main Orb */}
                        <div className={[
                            "w-32 h-32 rounded-full flex items-center justify-center transition-colors duration-500",
                            status === 'ai_speaking' ? 'bg-accent animate-pulse shadow-[0_0_60px_-10px_rgba(79,107,69,0.6)]' : '',
                            status === 'listening' ? 'bg-success shadow-[0_0_60px_-10px_rgba(79,138,91,0.5)]' : '',
                            status === 'processing' ? 'bg-warning shadow-[0_0_60px_-10px_rgba(154,116,48,0.5)]' : '',
                            status === 'idle' ? 'bg-card/20' : '',
                        ].join(' ')}>
                            <div className="w-24 h-24 rounded-full bg-ink/20 backdrop-blur-sm flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-card/10 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-card rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        {/* Status Label */}
                        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            {status === 'processing' && (
                                <div className="flex items-center gap-2 text-warning text-sm">
                                    <Loader2 className="animate-spin w-4 h-4" /> Analyzing Response...
                                </div>
                            )}
                            {status === 'listening' && (
                                <div className="flex items-center gap-2 text-success text-sm">
                                    <Mic className="animate-pulse w-4 h-4" /> Listening (Auto-stop on silence)...
                                </div>
                            )}
                            {status === 'ai_speaking' && (
                                <div className="text-accent-soft text-sm">AI is speaking...</div>
                            )}
                            {status === 'idle' && interviewMode === 'text' && (
                                <div className="text-card/50 text-sm">Type your response below</div>
                            )}
                        </div>
                    </div>

                    {/* Current Question Display */}
                    {currentQuestion && (
                        <div className="absolute bottom-8 left-0 right-0 px-8 text-center">
                            <motion.div
                                key={currentQuestion.question_number + currentQuestion.question}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="max-w-3xl mx-auto bg-ink/60 backdrop-blur-md rounded-card p-6 border border-card/10"
                            >
                                <div className="flex items-center justify-center gap-3 mb-2">
                                    <h3 className="text-card/50 text-sm uppercase tracking-wider font-bold">
                                        Question {currentQuestion.question_number} of {currentQuestion.total_questions}
                                    </h3>
                                    <Badge tone="neutral" className="bg-card/10 text-card/60 text-xs">
                                        {currentQuestion.question_type}
                                    </Badge>
                                </div>
                                <p className="text-xl md:text-2xl font-medium leading-relaxed text-card">
                                    {currentQuestion.question}
                                </p>
                            </motion.div>
                        </div>
                    )}
                </div>

                {/* Sidebar / Transcript + Text Input */}
                <div className="w-full md:w-96 flex flex-col gap-6">
                    {/* Camera Preview */}
                    <div className="h-48 bg-card/5 rounded-card border border-card/10 relative overflow-hidden">
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-ink/60 rounded-field text-xs text-card">
                            You
                        </div>
                    </div>

                    {/* Transcript */}
                    <div className="flex-1 bg-card/5 rounded-card border border-card/10 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-card/10">
                            <h3 className="font-semibold text-sm text-card/70">Live Transcript</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm leading-relaxed scrollbar-thin scrollbar-thumb-card/10 scrollbar-track-transparent">
                            {transcript.map((entry, i) => (
                                <div key={i} className={[
                                    "flex gap-3",
                                    entry.role === 'ai' ? 'text-accent-soft' : 'text-card/80',
                                    entry.type === 'feedback' ? 'opacity-60 text-xs italic' : '',
                                ].join(' ')}>
                                    <span className="opacity-50 uppercase text-xs mt-1 shrink-0">
                                        {entry.role === 'ai' ? 'AI' : 'You'}
                                    </span>
                                    <p>{entry.text}</p>
                                </div>
                            ))}
                            <div ref={transcriptEndRef} />
                        </div>

                        {/* Text Input (text mode) */}
                        {interviewMode === 'text' && status !== 'ai_speaking' && status !== 'processing' && (
                            <form onSubmit={handleTextSubmit} className="p-3 border-t border-card/10">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                        placeholder="Type your response..."
                                        disabled={isSubmitting}
                                        className="flex-1 bg-card/5 border border-card/10 rounded-field px-4 py-2.5 text-sm text-card placeholder-card/30 focus:outline-none focus:border-accent/50 disabled:opacity-50"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!textInput.trim() || isSubmitting}
                                        className="bg-accent text-accent-ink px-4 py-2.5 rounded-field hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Voice mode manual controls */}
                        {interviewMode === 'voice' && status === 'listening' && (
                            <div className="p-3 border-t border-card/10 text-center">
                                <button
                                    onClick={stopListening}
                                    className="bg-danger-soft/20 text-danger px-4 py-2 rounded-field text-sm hover:bg-danger-soft/30 transition-colors"
                                >
                                    Stop Recording
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
