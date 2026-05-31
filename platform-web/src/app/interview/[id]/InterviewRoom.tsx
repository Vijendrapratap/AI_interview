"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Mic, Send, Loader2, CheckCircle, Volume2, Keyboard } from "lucide-react"

type Question = { question: string; competency: string }
type Turn = { role: "ai" | "candidate"; text: string; questionIndex?: number }

export default function InterviewRoom({
  token,
  candidateName,
  jobTitle,
  questions,
}: {
  token: string
  candidateName: string
  jobTitle: string
  questions: Question[]
}) {
  const [phase, setPhase] = useState<"intro" | "running" | "submitting" | "done" | "error">("intro")
  const [mode, setMode] = useState<"voice" | "text">("voice")
  const [voiceSupported, setVoiceSupported] = useState(true)
  const [index, setIndex] = useState(0)
  const [transcript, setTranscript] = useState<Turn[]>([])
  const [partial, setPartial] = useState("")
  const [textInput, setTextInput] = useState("")
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const recognitionRef = useRef<any>(null)
  const finalRef = useRef("")
  const tabSwitchRef = useRef(0)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const SR = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    if (!SR) {
      setVoiceSupported(false)
      setMode("text")
    }
  }, [])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcript, partial])

  // Anti-cheat: count tab/visibility switches during the interview.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden" && phase === "running") tabSwitchRef.current += 1
    }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [phase])

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return resolve()
      try {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(text)
        u.rate = 1.0
        u.onend = () => { setSpeaking(false); resolve() }
        u.onerror = () => { setSpeaking(false); resolve() }
        setSpeaking(true)
        window.speechSynthesis.speak(u)
      } catch {
        setSpeaking(false)
        resolve()
      }
    })
  }, [])

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = "en-US"
    finalRef.current = ""
    rec.onresult = (e: any) => {
      let interim = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalRef.current += t + " "
        else interim += t
      }
      setPartial((finalRef.current + interim).trim())
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recognitionRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }, [])

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop() } catch { /* noop */ }
    setListening(false)
  }, [])

  const askQuestion = useCallback(async (i: number) => {
    const q = questions[i]
    if (!q) return
    setTranscript((prev) => [...prev, { role: "ai", text: q.question, questionIndex: i }])
    await speak(q.question)
    if (mode === "voice" && voiceSupported) startListening()
  }, [questions, speak, mode, voiceSupported, startListening])

  const begin = useCallback(async () => {
    setPhase("running")
    const intro = `Hi ${candidateName || "there"}. I'm your AI interviewer for the ${jobTitle} role. I'll ask ${questions.length} questions. Take your time, and answer naturally. Let's begin.`
    setTranscript([{ role: "ai", text: intro }])
    await speak(intro)
    await askQuestion(0)
  }, [candidateName, jobTitle, questions.length, speak, askQuestion])

  const submitAnswer = useCallback(async () => {
    const answer = (mode === "voice" ? (partial || finalRef.current) : textInput).trim()
    stopListening()
    window.speechSynthesis?.cancel()
    const turn: Turn = { role: "candidate", text: answer || "(no answer given)", questionIndex: index }
    const nextTranscript = [...transcript, turn]
    setTranscript(nextTranscript)
    setPartial("")
    setTextInput("")
    finalRef.current = ""

    const next = index + 1
    if (next < questions.length) {
      setIndex(next)
      await askQuestion(next)
    } else {
      await finish(nextTranscript)
    }
  }, [mode, partial, textInput, index, transcript, questions.length, stopListening, askQuestion])

  const finish = useCallback(async (finalTranscript: Turn[]) => {
    setPhase("submitting")
    const closing = "Thank you — that completes the interview. Your responses are being saved and reviewed."
    setTranscript((prev) => [...prev, { role: "ai", text: closing }])
    await speak(closing)
    try {
      const res = await fetch(`/api/interview/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: finalTranscript, tabSwitchCount: tabSwitchRef.current }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Submit failed")
      setPhase("done")
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Could not submit your interview.")
      setPhase("error")
    }
  }, [token, speak])

  // ── Screens ────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <Shell>
        <div className="max-w-md w-full bg-card rounded-card shadow-card border border-border-card p-8 text-center">
          <div className="w-16 h-16 bg-accent-soft rounded-full flex items-center justify-center mx-auto mb-6 text-accent-soft-ink">
            <Mic size={32} />
          </div>
          <h1 className="font-serif text-2xl text-ink mb-1">Your AI interview</h1>
          <p className="text-ink-2 mb-1">{jobTitle}</p>
          <p className="text-ink-3 text-sm mb-6">
            {questions.length} questions · about 10 minutes · answer by voice or text.
          </p>
          {!voiceSupported && (
            <p className="mb-4 rounded-field bg-warning-soft px-3 py-2 text-sm text-warning-soft-ink">
              Voice isn’t supported in this browser — you’ll answer by typing. (Chrome works best.)
            </p>
          )}
          {voiceSupported && (
            <div className="flex gap-3 mb-6">
              <ModeBtn active={mode === "voice"} onClick={() => setMode("voice")} icon={<Mic size={14} />} label="Voice" />
              <ModeBtn active={mode === "text"} onClick={() => setMode("text")} icon={<Keyboard size={14} />} label="Text" />
            </div>
          )}
          <button
            onClick={begin}
            className="w-full rounded-pill bg-accent py-3 text-sm font-bold text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Start interview
          </button>
          <p className="mt-4 text-xs text-ink-3">Please stay on this tab for the duration of the interview.</p>
        </div>
      </Shell>
    )
  }

  if (phase === "done") {
    return (
      <Shell>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="w-20 h-20 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-6 text-success-soft-ink">
            <CheckCircle size={40} />
          </div>
          <h1 className="font-serif text-3xl text-ink mb-3">Interview complete</h1>
          <p className="text-ink-2 max-w-md mx-auto">
            Thank you, {candidateName || "there"}. Your responses were saved and the recruiting team will be in touch.
          </p>
        </motion.div>
      </Shell>
    )
  }

  if (phase === "error") {
    return (
      <Shell>
        <div className="max-w-md w-full bg-card rounded-card border border-border-card p-8 text-center">
          <h1 className="font-serif text-2xl text-ink mb-2">Something went wrong</h1>
          <p className="text-ink-2 mb-6">{errorMsg}</p>
          <button onClick={() => location.reload()} className="rounded-pill bg-accent px-6 py-2.5 text-sm font-bold text-accent-ink">
            Try again
          </button>
        </div>
      </Shell>
    )
  }

  // running / submitting
  const q = questions[index]
  return (
    <div className="min-h-screen bg-ink text-card flex flex-col">
      <header className="h-16 border-b border-card/10 flex items-center justify-between px-6">
        <span className="font-mono text-sm text-card/60">AI INTERVIEW</span>
        <span className="text-card/70 text-sm font-semibold">
          Question {Math.min(index + 1, questions.length)} / {questions.length}
        </span>
        <span className="flex items-center gap-2 text-card/50 text-xs">
          {speaking ? <><Volume2 size={14} className="animate-pulse" /> Speaking</> : listening ? <><Mic size={14} className="text-success animate-pulse" /> Listening</> : "Ready"}
        </span>
      </header>

      <main className="flex-1 flex flex-col md:flex-row p-6 gap-6 overflow-hidden">
        <div className="flex-1 bg-card/5 rounded-card border border-card/10 flex flex-col items-center justify-center p-8 text-center">
          <div className={`w-28 h-28 rounded-full mb-8 flex items-center justify-center transition-colors ${speaking ? "bg-accent animate-pulse" : listening ? "bg-success" : "bg-card/20"}`}>
            <Mic size={36} className="text-ink" />
          </div>
          {q && (
            <motion.p key={index} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl text-xl md:text-2xl font-medium text-card">
              {q.question}
            </motion.p>
          )}
          {phase === "submitting" && (
            <div className="mt-8 flex items-center gap-2 text-warning text-sm"><Loader2 className="animate-spin w-4 h-4" /> Saving & scoring…</div>
          )}
        </div>

        <div className="w-full md:w-96 flex flex-col gap-4">
          <div className="flex-1 bg-card/5 rounded-card border border-card/10 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-card/10 text-card/70 text-sm font-semibold">Transcript</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
              {transcript.map((t, i) => (
                <div key={i} className={t.role === "ai" ? "text-accent-soft" : "text-card/80"}>
                  <span className="uppercase text-[10px] opacity-50 mr-2">{t.role === "ai" ? "AI" : "You"}</span>
                  {t.text}
                </div>
              ))}
              {partial && <div className="text-card/50 italic">{partial}</div>}
              <div ref={transcriptEndRef} />
            </div>

            {phase === "running" && !speaking && (
              <div className="p-3 border-t border-card/10">
                {mode === "text" || !voiceSupported ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); if (textInput.trim()) submitAnswer() }}
                    className="flex gap-2"
                  >
                    <input
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Type your answer…"
                      className="flex-1 bg-card/5 border border-card/10 rounded-field px-3 py-2.5 text-sm text-card placeholder-card/30 focus:outline-none focus:border-accent/50"
                    />
                    <button type="submit" disabled={!textInput.trim()} className="bg-accent text-accent-ink px-4 rounded-field disabled:opacity-40">
                      <Send size={16} />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-card/50">{listening ? "Listening — speak your answer" : "Tap to answer"}</span>
                    <div className="flex gap-2">
                      {!listening && <button onClick={startListening} className="rounded-field bg-card/10 px-3 py-2 text-sm text-card">Resume mic</button>}
                      <button onClick={submitAnswer} className="rounded-field bg-accent px-4 py-2 text-sm font-bold text-accent-ink">
                        {index + 1 < questions.length ? "Next question" : "Finish"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center p-4">{children}</div>
}

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-field text-sm font-medium border transition-all ${active ? "bg-accent-soft border-accent text-accent-soft-ink" : "bg-surface-muted border-border text-ink-3"}`}
    >
      <span className="inline-flex items-center gap-1">{icon} {label}</span>
    </button>
  )
}
