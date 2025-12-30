import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Loader2,
  ArrowRight,
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { analyzeResume, getResume } from '../services/api'

export default function AnalysisPage() {
  const { resumeId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [resume, setResume] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const jobDescription = location.state?.jobDescription || ''

  useEffect(() => {
    loadAnalysis()
  }, [resumeId])

  const loadAnalysis = async () => {
    setLoading(true)
    try {
      const resumeData = await getResume(resumeId)
      setResume(resumeData)

      const analysisResult = await analyzeResume(resumeId, jobDescription || null)
      setAnalysis(analysisResult)
    } catch (error) {
      console.error('Error loading analysis:', error)
      toast.error(error.message || 'Failed to analyze resume')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-100 border-green-300'
    if (score >= 60) return 'bg-yellow-100 border-yellow-300'
    return 'bg-red-100 border-red-300'
  }

  const getScoreIcon = (score) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-green-600" />
    if (score >= 60) return <AlertTriangle className="w-5 h-5 text-yellow-600" />
    return <XCircle className="w-5 h-5 text-red-600" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">Analyzing your resume...</p>
          <p className="text-gray-500 text-sm">This may take a moment</p>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Failed to load analysis</p>
        <button onClick={loadAnalysis} className="px-4 py-2 bg-primary-600 text-white rounded-lg">
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resume Analysis</h1>
          <p className="text-gray-500 text-sm flex items-center mt-1">
            <FileText className="w-4 h-4 mr-1" />
            {resume?.filename}
          </p>
        </div>
        <button
          onClick={loadAnalysis}
          className="flex items-center text-gray-600 hover:text-gray-900 text-sm"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </button>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Overall Score */}
        <div className={`p-4 rounded-lg border-2 ${getScoreBg(analysis.overall_score)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Overall</span>
            {getScoreIcon(analysis.overall_score)}
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(analysis.overall_score)}`}>
            {Math.round(analysis.overall_score)}
          </div>
        </div>

        {/* ATS Score */}
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <span className="text-xs font-medium text-gray-600">ATS Score</span>
          <div className={`text-2xl font-bold mt-1 ${getScoreColor(analysis.ats_score)}`}>
            {Math.round(analysis.ats_score)}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div
              className="bg-primary-500 h-1.5 rounded-full"
              style={{ width: `${analysis.ats_score}%` }}
            />
          </div>
        </div>

        {/* Content Score */}
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <span className="text-xs font-medium text-gray-600">Content</span>
          <div className={`text-2xl font-bold mt-1 ${getScoreColor(analysis.content_score)}`}>
            {Math.round(analysis.content_score)}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div
              className="bg-blue-500 h-1.5 rounded-full"
              style={{ width: `${analysis.content_score}%` }}
            />
          </div>
        </div>

        {/* JD Match */}
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <span className="text-xs font-medium text-gray-600">JD Match</span>
          <div className={`text-2xl font-bold mt-1 ${analysis.jd_match_score ? getScoreColor(analysis.jd_match_score) : 'text-gray-400'}`}>
            {analysis.jd_match_score ? `${Math.round(analysis.jd_match_score)}%` : 'N/A'}
          </div>
          {analysis.jd_match_score && (
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
              <div
                className="bg-green-500 h-1.5 rounded-full"
                style={{ width: `${analysis.jd_match_score}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Keywords */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Keywords</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">Found</h4>
            <div className="flex flex-wrap gap-1.5">
              {(analysis.keywords?.found || []).slice(0, 10).map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">Missing</h4>
            <div className="flex flex-wrap gap-1.5">
              {(analysis.keywords?.missing || []).slice(0, 10).map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Improvements */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Top Improvements</h3>
        <div className="space-y-3">
          {(analysis.improvements || []).slice(0, 5).map((improvement, idx) => (
            <div key={idx} className="flex items-start p-3 bg-gray-50 rounded-lg">
              <span className="flex-shrink-0 w-5 h-5 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                {idx + 1}
              </span>
              <p className="text-sm text-gray-700">
                {typeof improvement === 'string' ? improvement : improvement.suggestion || improvement.issue}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Rewrite Examples */}
      {analysis.rewrite_examples?.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Before & After</h3>
          <div className="space-y-4">
            {analysis.rewrite_examples.slice(0, 2).map((example, idx) => (
              <div key={idx} className="grid md:grid-cols-2 gap-3">
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <span className="text-xs font-medium text-red-600">Before</span>
                  <p className="text-sm text-gray-700 mt-1">{example.original}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-xs font-medium text-green-600">After</span>
                  <p className="text-sm text-gray-700 mt-1">{example.improved}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Feedback */}
      {analysis.detailed_feedback && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{analysis.detailed_feedback}</p>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={() => navigate(`/interview/${resumeId}`, { state: { jobDescription } })}
          className="flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          Start Mock Interview
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  )
}
