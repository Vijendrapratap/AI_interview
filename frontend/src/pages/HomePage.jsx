import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Upload,
  FileText,
  CheckCircle,
  MessageSquare,
  BarChart3,
  Mic,
  Video,
  ArrowRight,
  Sparkles,
  Target,
  Brain,
  TrendingUp
} from 'lucide-react'
import ResumeUpload from '../components/resume/ResumeUpload'

export default function HomePage() {
  const navigate = useNavigate()
  const [uploadedResume, setUploadedResume] = useState(null)
  const [jobDescription, setJobDescription] = useState('')

  const handleResumeUploaded = (resume) => {
    setUploadedResume(resume)
  }

  const handleStartAnalysis = () => {
    if (uploadedResume) {
      navigate(`/analysis/${uploadedResume.id}`, {
        state: { jobDescription }
      })
    }
  }

  const handleStartInterview = () => {
    if (uploadedResume) {
      navigate(`/interview/${uploadedResume.id}`, {
        state: { jobDescription }
      })
    }
  }

  const features = [
    {
      icon: BarChart3,
      title: 'Resume Scoring',
      description: 'Get a comprehensive analysis with our AI scoring system that evaluates content, format, and ATS compatibility.',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Target,
      title: 'ATS Compatibility',
      description: 'Ensure your resume passes Applicant Tracking Systems with our detailed compatibility check.',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: Brain,
      title: 'Keyword Analysis',
      description: 'Identify missing keywords and optimize your resume for specific job descriptions.',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: MessageSquare,
      title: 'AI Interviewer',
      description: 'Practice with our AI interviewer through text or voice-based mock interviews.',
      color: 'from-orange-500 to-orange-600'
    }
  ]

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12"
      >
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4 mr-2" />
          AI-Powered Career Platform
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          Master Your Next
          <span className="text-gradient"> Interview</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Upload your resume, get instant AI analysis, and practice with our intelligent
          mock interviewer to land your dream job.
        </p>
      </motion.section>

      {/* Features Grid */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            className="card hover:shadow-md transition-shadow"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
              <feature.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
            <p className="text-sm text-gray-600">{feature.description}</p>
          </motion.div>
        ))}
      </motion.section>

      {/* Upload Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Upload */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Step 1: Upload Your Resume
            </h2>
            <p className="text-gray-600 mb-6">
              Upload your resume in PDF, DOCX, or TXT format. Our AI will analyze it instantly.
            </p>
            <ResumeUpload onUploadComplete={handleResumeUploaded} />

            {uploadedResume && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 p-4 bg-success-50 border border-success-500 rounded-lg flex items-center"
              >
                <CheckCircle className="w-5 h-5 text-success-500 mr-3" />
                <div>
                  <p className="font-medium text-success-600">Resume Uploaded!</p>
                  <p className="text-sm text-success-500">{uploadedResume.filename}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right: Job Description */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Step 2: Add Job Description
              <span className="text-sm font-normal text-gray-500 ml-2">(Optional)</span>
            </h2>
            <p className="text-gray-600 mb-6">
              Paste the job description to get targeted analysis and interview questions.
            </p>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here for targeted analysis..."
              className="input h-48 resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        {uploadedResume && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 flex flex-col sm:flex-row gap-4"
          >
            <button
              onClick={handleStartAnalysis}
              className="btn btn-primary flex-1 py-3"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Analyze Resume
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <button
              onClick={handleStartInterview}
              className="btn btn-secondary flex-1 py-3"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Start Mock Interview
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </motion.div>
        )}
      </motion.section>

      {/* Interview Modes */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid md:grid-cols-3 gap-6"
      >
        <div className="card border-2 border-primary-100 hover:border-primary-200 transition-colors cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6 text-primary-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Text Interview</h3>
          <p className="text-sm text-gray-600">
            Practice with text-based responses. Great for preparing your answers.
          </p>
          <span className="inline-block mt-3 text-xs font-medium text-success-600 bg-success-50 px-2 py-1 rounded">
            Available Now
          </span>
        </div>

        <div className="card border-2 border-primary-100 hover:border-primary-200 transition-colors cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
            <Mic className="w-6 h-6 text-primary-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Voice Interview</h3>
          <p className="text-sm text-gray-600">
            Speak your answers naturally. AI interviewer responds with voice.
          </p>
          <span className="inline-block mt-3 text-xs font-medium text-success-600 bg-success-50 px-2 py-1 rounded">
            Available Now
          </span>
        </div>

        <div className="card border-2 border-gray-100 cursor-not-allowed opacity-75">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Video className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Video Interview</h3>
          <p className="text-sm text-gray-600">
            Face-to-face with AI avatar. Analyze body language and expressions.
          </p>
          <span className="inline-block mt-3 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Coming Soon
          </span>
        </div>
      </motion.section>

      {/* Stats */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-white"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Why Choose Our Platform?</h2>
          <p className="text-primary-100">Proven results for job seekers</p>
        </div>
        <div className="grid md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold mb-2">95%</div>
            <div className="text-primary-100 text-sm">ATS Pass Rate</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">10k+</div>
            <div className="text-primary-100 text-sm">Resumes Analyzed</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">85%</div>
            <div className="text-primary-100 text-sm">Interview Success</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">4.9</div>
            <div className="text-primary-100 text-sm">User Rating</div>
          </div>
        </div>
      </motion.section>
    </div>
  )
}
