import axios from 'axios'

const API_BASE_URL = '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An error occurred'
    return Promise.reject(new Error(message))
  }
)

// Resume APIs
export const uploadResume = async (file) => {
  const formData = new FormData()
  formData.append('file', file)

  return api.post('/resume/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export const getResume = async (resumeId) => {
  return api.get(`/resume/${resumeId}`)
}

export const deleteResume = async (resumeId) => {
  return api.delete(`/resume/${resumeId}`)
}

// Analysis APIs
export const analyzeResume = async (resumeId, jobDescription = null, analysisType = 'comprehensive') => {
  return api.post('/analysis/analyze', {
    resume_id: resumeId,
    job_description: jobDescription,
    analysis_type: analysisType
  })
}

export const quickAnalyze = async (resumeId) => {
  return api.post('/analysis/quick-analyze', {
    resume_id: resumeId
  })
}

export const compareWithJD = async (resumeId, jobDescription) => {
  return api.post('/analysis/compare-jd', {
    resume_id: resumeId,
    job_description: jobDescription
  })
}

export const getAnalysis = async (analysisId) => {
  return api.get(`/analysis/${analysisId}`)
}

// Interview APIs
export const startInterview = async (params) => {
  return api.post('/interview/start', {
    resume_id: params.resumeId,
    job_description: params.jobDescription,
    interview_type: params.interviewType || 'comprehensive',
    num_questions: params.numQuestions || 7,
    mode: params.mode || 'text',
    difficulty: params.difficulty || 'mid'
  })
}

export const submitResponse = async (sessionId, response) => {
  return api.post('/interview/respond', {
    session_id: sessionId,
    response: response
  })
}

export const submitAudioResponse = async (sessionId, audioBlob) => {
  const formData = new FormData()
  formData.append('session_id', sessionId)
  formData.append('audio', audioBlob, 'audio.webm')

  return api.post('/interview/respond/audio', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export const getCurrentQuestion = async (sessionId) => {
  return api.get(`/interview/question/${sessionId}`)
}

export const endInterview = async (sessionId) => {
  return api.post(`/interview/end/${sessionId}`)
}

export const getInterviewSession = async (sessionId) => {
  return api.get(`/interview/session/${sessionId}`)
}

// Report APIs
export const getInterviewReport = async (sessionId) => {
  return api.get(`/report/interview/${sessionId}`)
}

export const getResumeReport = async (analysisId) => {
  return api.get(`/report/resume/${analysisId}`)
}

export const downloadReportPDF = async (sessionId, type = 'interview') => {
  const endpoint = type === 'interview'
    ? `/report/interview/${sessionId}/pdf`
    : `/report/resume/${sessionId}/pdf`

  const response = await api.get(endpoint, {
    responseType: 'blob'
  })

  // Create download link
  const blob = new Blob([response], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${type}_report_${sessionId}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// TTS APIs
export const synthesizeSpeech = async (text, voice = null, provider = null) => {
  return api.post('/tts/synthesize/url', {
    text,
    voice,
    provider
  })
}

export const transcribeAudio = async (audioBlob) => {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'audio.webm')

  return api.post('/tts/transcribe', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export const getVoices = async (provider = null) => {
  const params = provider ? { provider } : {}
  return api.get('/tts/voices', { params })
}

// Health check
export const checkHealth = async () => {
  return api.get('/health')
}

export default api
