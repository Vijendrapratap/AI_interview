import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Upload,
  FileText,
  CheckCircle,
  BarChart3,
  MessageSquare,
  ArrowRight,
  Loader2
} from 'lucide-react'
import ResumeUpload from '../components/resume/ResumeUpload'

export default function HomePage() {
  const navigate = useNavigate()
  const [uploadedResume, setUploadedResume] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleResumeUploaded = (resume) => {
    setUploadedResume(resume)
  }

  const handleStartAnalysis = () => {
    if (uploadedResume) {
      setIsAnalyzing(true)
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Simple Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Resume Analyzer & Interview Prep
        </h1>
        <p className="text-gray-600">
          Upload your resume to get AI-powered analysis and practice interviews
        </p>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8"
      >
        {/* Upload Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Upload className="w-5 h-5 mr-2 text-primary-600" />
            Upload Resume
          </h2>
          <ResumeUpload onUploadComplete={handleResumeUploaded} />

          {uploadedResume && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center"
            >
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-green-700">Resume Uploaded</p>
                <p className="text-sm text-green-600 truncate">{uploadedResume.filename}</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Job Description */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary-600" />
            Job Description
            <span className="text-sm font-normal text-gray-500 ml-2">(Optional)</span>
          </h2>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here for targeted analysis and interview questions..."
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none text-gray-700 placeholder-gray-400"
          />
        </div>

        {/* Action Buttons */}
        {uploadedResume && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-2 gap-4"
          >
            <button
              onClick={handleStartAnalysis}
              disabled={isAnalyzing}
              className="flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="w-5 h-5 mr-2" />
              )}
              Analyze Resume
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <button
              onClick={handleStartInterview}
              className="flex items-center justify-center px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Start Interview
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </motion.div>
        )}

        {!uploadedResume && (
          <p className="text-center text-gray-500 text-sm">
            Upload your resume to get started
          </p>
        )}
      </motion.div>

      {/* Quick Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid md:grid-cols-3 gap-4 text-center"
      >
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-primary-600">AI-Powered</div>
          <div className="text-sm text-gray-500">Resume Analysis</div>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-primary-600">ATS Check</div>
          <div className="text-sm text-gray-500">Compatibility Score</div>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-primary-600">Mock Interview</div>
          <div className="text-sm text-gray-500">Practice & Improve</div>
        </div>
      </motion.div>
    </div>
  )
}
