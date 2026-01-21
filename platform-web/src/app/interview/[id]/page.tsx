"use client"

import { useState, useEffect, useRef, use } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, PhoneOff, Settings, Loader2, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

// Mock Questions for the demo
const MOCK_QUESTIONS = [
    "Hello! I am your AI interviewer today. Let's start. Tell me about a challenging project you worked on recently?",
    "That sounds interesting. How did you handle disagreements with technical stakeholders during that project?",
    "Can you explain a complex technical concept to a non-technical person?",
    "Finally, what is your approach to testing and quality assurance?"
]

export default function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id } = use(params)

    // UI State
    const [step, setStep] = useState<'setup' | 'interview' | 'completed'>('setup')
    const [permissionsGranted, setPermissionsGranted] = useState(false)
    // const [isMicOn, setIsMicOn] = useState(true)
    // const [isVideoOn, setIsVideoOn] = useState(true)

    // Interview State
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [transcript, setTranscript] = useState<{ role: 'ai' | 'user', text: string }[]>([])
    const [status, setStatus] = useState<'ai_speaking' | 'listening' | 'processing' | 'idle'>('idle')
    const [interimTranscript, setInterimTranscript] = useState("")

    // Refs for Browser APIs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null)
    const synthRef = useRef<SpeechSynthesis | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)

    // Initialize Browser APIs
    // Use refs to handle closure staleness in event listeners
    const handleUserResponseRef = useRef<(text: string) => Promise<void>>(null)

    // Camera Handlers
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }
            setPermissionsGranted(true)
        } catch (err) {
            console.error("Error accessing media devices:", err)
            setPermissionsGranted(false)
        }
    }

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
            tracks.forEach(track => track.stop())
        }
    }

    const startListening = () => {
        if (!recognitionRef.current) {
            // Fallback if no speech support
            alert("Speech recognition not supported in this browser.")
            return
        }

        setStatus('listening')
        setInterimTranscript("")
        try {
            recognitionRef.current.start()
        } catch {
            // already started
        }
    }

    const speakAI = async (text: string) => {
        // Update UI
        setStatus('ai_speaking')
        // Use Resume ID from URL param
        const resumeId = id

        try {
            const res = await fetch("http://localhost:8000/api/v1/interview/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resume_id: resumeId,
                    interview_type: "technical",
                    num_questions: 5,
                    mode: "voice"
                })
            })

            if (!res.ok) {
                console.error("Failed to start interview:", await res.text())
                // Handle error, maybe show a message to the user
                setStatus('idle')
                // return // Continue for demo purposes even if backend fails logic
            }
        } catch (e) {
            console.error("Interview start error", e)
        }

        setTranscript(prev => [...prev, { role: 'ai', text }])

        try {
            const response = await fetch("http://localhost:8000/api/v1/tts/synthesize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text,
                    provider: "kokoro",
                    voice: "af_heart",
                    speed: 1.0
                })
            })

            if (!response.ok) {
                console.error("TTS Error:", await response.text())
                // Fallback to browser TTS if backend fails
                const utterance = new SpeechSynthesisUtterance(text)
                utterance.onend = () => startListening()
                window.speechSynthesis.speak(utterance)
                return
            }

            const audioBlob = await response.blob()
            const audioUrl = URL.createObjectURL(audioBlob)
            const audio = new Audio(audioUrl)

            audio.onended = () => {
                setStatus('listening')
                startListening()
            }

            audio.play().catch(e => {
                console.error("Audio play failed (interaction needed?):", e)
                setStatus('listening') // Recover
                startListening()
            })

        } catch (err) {
            console.error("TTS Network Error:", err)
            setStatus('idle')
        }
    }

    const handleUserResponse = async (userText: string) => {
        // Stop listening
        recognitionRef.current?.stop()
        setStatus('processing')
        setInterimTranscript("")
        setTranscript(prev => [...prev, { role: 'user', text: userText }])

        // Fake AI Processing delay
        await new Promise(r => setTimeout(r, 1500))

        // Move to next question using functional state update to verify latest index
        // But we need the value. For now relying on closure captured state or currentQuestionIndex
        // Actually since this function is recreated every render, it should capture the new currentQuestionIndex

        if (currentQuestionIndex < MOCK_QUESTIONS.length - 1) {
            const nextIdx = currentQuestionIndex + 1
            setCurrentQuestionIndex(nextIdx)
            speakAI(MOCK_QUESTIONS[nextIdx])
        } else {
            speakAI("Thank you for your responses. The interview is now complete.")
            // Wait for the "Thank you" to finish roughly before switching (imperfect sync but okay for demo)
            setTimeout(() => setStep('completed'), 4000)
        }
    }

    // Keep ref updated
    useEffect(() => {
        handleUserResponseRef.current = handleUserResponse
    })

    const endCall = () => {
        synthRef.current?.cancel()
        recognitionRef.current?.stop()
        setStep('completed')
    }

    // --- EFFECTS ---

    // 1. Setup Speech Recognition (Once)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis

            // Setup Speech Recognition
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition()
                recognition.continuous = false
                recognition.interimResults = true
                recognition.lang = 'en-US'

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                recognition.onresult = (event: any) => {
                    let interim = ''
                    let final = ''
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            final += event.results[i][0].transcript
                        } else {
                            interim += event.results[i][0].transcript
                        }
                    }
                    setInterimTranscript(interim)
                    if (final) {
                        // Call via ref to get latest closure
                        if (handleUserResponseRef.current) {
                            handleUserResponseRef.current(final)
                        }
                    }
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error)
                }

                recognitionRef.current = recognition
            }
        }
    }, [])

    // 2. Camera Stream Management
    useEffect(() => {
        if (step === 'setup' || step === 'interview') {
            startCamera()
        }
        return () => stopCamera()
    }, [step])

    // 3. Interview Logic Flow (Start)
    useEffect(() => {
        if (step === 'interview' && transcript.length === 0) {
            // Start the interview loop
            speakAI(MOCK_QUESTIONS[0])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step])

    // --- RENDER ---

    if (step === 'setup') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
                        <Settings size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">System Check</h1>
                    <p className="text-gray-500 mb-8">We need to check your camera and microphone.</p>

                    <div className="w-full h-48 bg-black rounded-xl mb-6 overflow-hidden relative border border-gray-200">
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                        {!permissionsGranted && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                                <p className="text-sm text-gray-500">Waiting for permissions...</p>
                            </div>
                        )}
                        <div className="absolute bottom-2 right-2 flex gap-2">
                            <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                                <Mic size={12} className={permissionsGranted ? "text-green-400" : "text-red-400"} />
                                {permissionsGranted ? "Mic On" : "Check Mic"}
                            </span>
                        </div>
                    </div>

                    <button
                        disabled={!permissionsGranted}
                        onClick={() => setStep('interview')}
                        className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                    >
                        {permissionsGranted ? "Start Interview" : "Allow Camera Access"}
                    </button>
                    {!permissionsGranted && (
                        <p className="text-xs text-gray-400 mt-4">Please click &apos;Allow&apos; in your browser pop-up.</p>
                    )}
                </div>
            </div>
        )
    }

    if (step === 'completed') {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                >
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                        <CheckCircle size={48} />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Interview Completed</h1>
                    <p className="text-xl text-gray-600 mb-8 max-w-lg mx-auto">
                        Your voice responses have been captured.
                    </p>
                    <button
                        onClick={() => router.push('/dashboard/candidates')}
                        className="bg-gray-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0f1115] text-white flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0f1115]">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="font-mono text-sm tracking-wider text-gray-400">REC 00:04:23</span>
                </div>
                <div className="font-semibold text-gray-300">Live AI Interview</div>
                <button
                    onClick={endCall}
                    className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-500/20 flex items-center gap-2"
                >
                    <PhoneOff size={16} /> End Call
                </button>
            </header>

            {/* Main Stage */}
            <main className="flex-1 flex flex-col md:flex-row p-6 gap-6 overflow-hidden">

                {/* Main Visualizer Area */}
                <div className="flex-1 bg-[#1a1d24] rounded-2xl relative flex flex-col items-center justify-center overflow-hidden border border-white/5">
                    {/* AI Avatar / Visualizer */}
                    <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center mb-12">
                        {/* Pulsing rings for AI voice */}
                        <AnimatePresence>
                            {status === 'ai_speaking' ? (
                                <>
                                    <motion.div
                                        className="absolute inset-0 rounded-full border border-blue-500/30"
                                        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    <motion.div
                                        className="absolute inset-0 rounded-full border border-blue-400/20"
                                        animate={{ scale: [1, 2], opacity: [0.3, 0] }}
                                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                    />
                                </>
                            ) : null}
                            {status === 'listening' ? (
                                <motion.div
                                    className="absolute inset-0 rounded-full border border-green-500/30"
                                    animate={{ scale: [1, 1.2], opacity: [0.3, 0.1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                            ) : null}
                        </AnimatePresence>

                        {/* Main Orb */}
                        <div className={`
                  w-32 h-32 rounded-full flex items-center justify-center shadow-[0_0_60px_-10px_rgba(59,130,246,0.5)] transition-colors duration-500
                  ${status === 'ai_speaking' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 animate-pulse' : ''}
                  ${status === 'listening' ? 'bg-gradient-to-br from-green-500 to-emerald-600' : ''}
                  ${status === 'processing' ? 'bg-gradient-to-br from-purple-500 to-fuchsia-600' : ''}
                  ${status === 'idle' ? 'bg-gray-700' : ''}
               `}>
                            <div className="w-24 h-24 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        {/* Status Label */}
                        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            {status === 'processing' && (
                                <div className="flex items-center gap-2 text-purple-400">
                                    <Loader2 className="animate-spin w-4 h-4" /> Processing...
                                </div>
                            )}
                            {status === 'listening' && (
                                <div className="flex items-center gap-2 text-green-400">
                                    <Mic className="animate-pulse w-4 h-4" /> Listening...
                                </div>
                            )}
                            {status === 'ai_speaking' && (
                                <div className="text-blue-400 text-sm">AI is speaking...</div>
                            )}
                        </div>
                    </div>

                    {/* Current Question */}
                    <div className="absolute bottom-8 left-0 right-0 px-8 text-center">
                        <motion.div
                            key={currentQuestionIndex}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-3xl mx-auto bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10"
                        >
                            <h3 className="text-gray-400 text-sm uppercase tracking-wider font-bold mb-2">Question {currentQuestionIndex + 1} of {MOCK_QUESTIONS.length}</h3>
                            <p className="text-xl md:text-2xl font-medium leading-relaxed">
                                {MOCK_QUESTIONS[currentQuestionIndex]}
                            </p>
                        </motion.div>
                    </div>
                </div>

                {/* Sidebar / Transcript */}
                <div className="w-full md:w-96 flex flex-col gap-6">
                    {/* Camera Preview */}
                    <div className="h-48 bg-[#1a1d24] rounded-2xl border border-white/5 relative overflow-hidden group">
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white">
                            You
                        </div>
                    </div>

                    {/* Transcript */}
                    <div className="flex-1 bg-[#1a1d24] rounded-2xl border border-white/5 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-white/5">
                            <h3 className="font-semibold text-sm text-gray-300">Live Transcript</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm leading-relaxed scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {transcript.map((entry, i) => (
                                <div key={i} className={`flex gap-3 ${entry.role === 'ai' ? 'text-blue-200' : 'text-gray-300'}`}>
                                    <span className="opacity-50 uppercase text-xs mt-1 shrink-0">{entry.role}</span>
                                    <p>{entry.text}</p>
                                </div>
                            ))}
                            {/* Live Interim Transcript */}
                            {status === 'listening' && interimTranscript && (
                                <div className="flex gap-3 text-gray-400">
                                    <span className="uppercase text-xs mt-1 shrink-0">YOU</span>
                                    <p className="italic">{interimTranscript}...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
