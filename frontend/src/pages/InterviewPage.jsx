import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Loader2,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle,
  ArrowRight,
  User,
  Bot,
  PlayCircle,
  StopCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  startInterview,
  submitResponse,
  endInterview,
  synthesizeSpeech
} from '../services/api'

export default function InterviewPage() {
  const { resumeId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [session, setSession] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [response, setResponse] = useState('')
  const [messages, setMessages] = useState([])
  const [mode, setMode] = useState('text') // text or voice
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const jobDescription = location.state?.jobDescription || ''

  useEffect(() => {
    initializeInterview()
  }, [resumeId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const initializeInterview = async () => {
    setLoading(true)
    try {
      const result = await startInterview({
        resumeId,
        jobDescription: jobDescription || null,
        interviewType: 'comprehensive',
        numQuestions: 7,
        mode,
        difficulty: 'mid'
      })

      setSession(result)
      setCurrentQuestion(result.first_question)

      // Add intro message
      setMessages([
        {
          type: 'system',
          content: result.intro_message
        },
        {
          type: 'question',
          content: result.first_question.question,
          questionNumber: result.first_question.question_number,
          totalQuestions: result.first_question.total_questions,
          topic: result.first_question.topic
        }
      ])

      // Speak the question if in voice mode
      if (mode === 'voice') {
        speakText(result.first_question.question)
      }
    } catch (error) {
      console.error('Error starting interview:', error)
      toast.error(error.message || 'Failed to start interview')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitResponse = async () => {
    if (!response.trim() || submitting) return

    setSubmitting(true)

    // Add user message
    setMessages(prev => [...prev, {
      type: 'answer',
      content: response
    }])

    const currentResponse = response
    setResponse('')

    try {
      const result = await submitResponse(session.session_id, currentResponse)

      // Add feedback message
      setMessages(prev => [...prev, {
        type: 'feedback',
        content: result.evaluation_summary,
        scores: result.scores
      }])

      if (result.is_complete) {
        setIsComplete(true)
        setMessages(prev => [...prev, {
          type: 'system',
          content: "Thank you for completing the interview! Your responses have been recorded and analyzed. Click 'View Report' to see your detailed performance report."
        }])
      } else if (result.next_question) {
        setCurrentQuestion(result.next_question)
        setMessages(prev => [...prev, {
          type: 'question',
          content: result.next_question.question,
          questionNumber: result.next_question.question_number,
          totalQuestions: result.next_question.total_questions,
          topic: result.next_question.topic
        }])

        if (mode === 'voice') {
          speakText(result.next_question.question)
        }
      }
    } catch (error) {
      console.error('Error submitting response:', error)
      toast.error(error.message || 'Failed to submit response')
    } finally {
      setSubmitting(false)
    }
  }

  const speakText = async (text) => {
    setIsSpeaking(true)
    try {
      const result = await synthesizeSpeech(text)
      const audio = new Audio(result.audio_url)
      audio.onended = () => setIsSpeaking(false)
      audio.play()
    } catch (error) {
      console.error('TTS error:', error)
      setIsSpeaking(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        // Here you would transcribe the audio
        // For now, we'll just show a placeholder
        toast.info('Voice recording captured. Processing...')
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Recording error:', error)
      toast.error('Failed to start recording. Please check microphone permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
    }
  }

  const handleEndInterview = async () => {
    try {
      await endInterview(session.session_id)
      navigate(`/report/${session.session_id}`)
    } catch (error) {
      console.error('Error ending interview:', error)
      navigate(`/report/${session.session_id}`)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitResponse()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">Setting up your interview...</p>
          <p className="text-gray-500">Preparing personalized questions</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mock Interview</h1>
          <p className="text-gray-500">
            Question {currentQuestion?.question_number || 1} of {currentQuestion?.total_questions || 7}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('text')}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'text' ? 'bg-white shadow text-primary-600' : 'text-gray-600'
              }`}
            >
              <MessageSquare className="w-4 h-4 mr-1.5" />
              Text
            </button>
            <button
              onClick={() => setMode('voice')}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'voice' ? 'bg-white shadow text-primary-600' : 'text-gray-600'
              }`}
            >
              <Mic className="w-4 h-4 mr-1.5" />
              Voice
            </button>
          </div>
          {!isComplete && (
            <button
              onClick={handleEndInterview}
              className="btn btn-secondary text-sm"
            >
              End Interview
            </button>
          )}
        </div>
      </motion.div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <motion.div
          className="bg-primary-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{
            width: `${((currentQuestion?.question_number || 1) / (currentQuestion?.total_questions || 7)) * 100}%`
          }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Chat Container */}
      <div className="card h-[500px] flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex ${message.type === 'answer' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'system' ? (
                  <div className="max-w-[80%] p-4 bg-primary-50 rounded-xl text-primary-800 text-sm">
                    {message.content}
                  </div>
                ) : message.type === 'question' ? (
                  <div className="flex items-start gap-3 max-w-[80%]">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                          Q{message.questionNumber}
                        </span>
                        <span className="text-xs text-gray-500">{message.topic}</span>
                      </div>
                      <p className="text-gray-800">{message.content}</p>
                      {mode === 'voice' && (
                        <button
                          onClick={() => speakText(message.content)}
                          className="mt-2 text-primary-600 hover:text-primary-700 text-sm flex items-center"
                          disabled={isSpeaking}
                        >
                          {isSpeaking ? (
                            <Volume2 className="w-4 h-4 mr-1 animate-pulse" />
                          ) : (
                            <PlayCircle className="w-4 h-4 mr-1" />
                          )}
                          {isSpeaking ? 'Speaking...' : 'Listen'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : message.type === 'answer' ? (
                  <div className="flex items-start gap-3 max-w-[80%]">
                    <div className="bg-primary-600 text-white rounded-xl p-4">
                      <p>{message.content}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                ) : message.type === 'feedback' ? (
                  <div className="max-w-[80%] p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-sm text-green-800 mb-2">{message.content}</p>
                    {message.scores && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(message.scores).map(([key, value]) => (
                          <span key={key} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            {key.replace('_', ' ')}: {value}/10
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-100 p-4">
          {isComplete ? (
            <button
              onClick={handleEndInterview}
              className="w-full btn btn-primary py-3"
            >
              View Report
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          ) : mode === 'text' ? (
            <div className="flex gap-3">
              <textarea
                ref={textareaRef}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your answer..."
                className="input flex-1 resize-none h-24"
                disabled={submitting}
              />
              <button
                onClick={handleSubmitResponse}
                disabled={!response.trim() || submitting}
                className="btn btn-primary self-end px-6"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-danger-500 hover:bg-danger-600 animate-pulse'
                    : 'bg-primary-500 hover:bg-primary-600'
                }`}
              >
                {isRecording ? (
                  <StopCircle className="w-10 h-10 text-white" />
                ) : (
                  <Mic className="w-10 h-10 text-white" />
                )}
              </button>
              <p className="text-sm text-gray-500">
                {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
              </p>
              {isRecording && (
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="waveform-bar" />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
