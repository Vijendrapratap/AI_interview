import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart3,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  FileText,
  Loader2,
  ArrowRight,
  Download,
  RefreshCw
} from 'lucide-react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts'
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
    if (score >= 80) return 'text-success-500'
    if (score >= 60) return 'text-warning-500'
    return 'text-danger-500'
  }

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-success-50 border-success-200'
    if (score >= 60) return 'bg-warning-50 border-warning-200'
    return 'bg-danger-50 border-danger-200'
  }

  const getScoreIcon = (score) => {
    if (score >= 80) return <CheckCircle className="w-6 h-6 text-success-500" />
    if (score >= 60) return <AlertTriangle className="w-6 h-6 text-warning-500" />
    return <XCircle className="w-6 h-6 text-danger-500" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">Analyzing your resume...</p>
          <p className="text-gray-500">This may take a moment</p>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load analysis</p>
        <button onClick={loadAnalysis} className="btn btn-primary mt-4">
          Try Again
        </button>
      </div>
    )
  }

  const radarData = [
    { subject: 'Content', score: analysis.content_score, fullMark: 100 },
    { subject: 'ATS', score: analysis.ats_score, fullMark: 100 },
    { subject: 'Format', score: analysis.format_score, fullMark: 100 },
    { subject: 'Keywords', score: analysis.keywords?.keyword_density * 100 || 60, fullMark: 100 },
    { subject: 'JD Match', score: analysis.jd_match_score || 50, fullMark: 100 }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resume Analysis</h1>
          <p className="text-gray-500 mt-1">
            <FileText className="inline w-4 h-4 mr-1" />
            {resume?.filename}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadAnalysis} className="btn btn-secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => navigate(`/interview/${resumeId}`, { state: { jobDescription } })}
            className="btn btn-primary"
          >
            Start Interview
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </motion.div>

      {/* Score Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid md:grid-cols-4 gap-6"
      >
        {/* Overall Score */}
        <div className={`card border-2 ${getScoreBg(analysis.overall_score)}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Overall Score</span>
            {getScoreIcon(analysis.overall_score)}
          </div>
          <div className={`text-4xl font-bold ${getScoreColor(analysis.overall_score)}`}>
            {Math.round(analysis.overall_score)}
          </div>
          <div className="text-sm text-gray-500 mt-1">out of 100</div>
        </div>

        {/* ATS Score */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">ATS Compatible</span>
            <TrendingUp className="w-5 h-5 text-primary-500" />
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(analysis.ats_score)}`}>
            {Math.round(analysis.ats_score)}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all"
              style={{ width: `${analysis.ats_score}%` }}
            />
          </div>
        </div>

        {/* Content Score */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Content Quality</span>
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(analysis.content_score)}`}>
            {Math.round(analysis.content_score)}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${analysis.content_score}%` }}
            />
          </div>
        </div>

        {/* JD Match */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">JD Match</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(analysis.jd_match_score || 0)}`}>
            {analysis.jd_match_score ? `${Math.round(analysis.jd_match_score)}%` : 'N/A'}
          </div>
          {analysis.jd_match_score && (
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${analysis.jd_match_score}%` }}
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid lg:grid-cols-2 gap-6"
      >
        {/* Radar Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" className="text-sm" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Keywords */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Keyword Analysis</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Found Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(analysis.keywords?.found_keywords || {}).slice(0, 5).map(([category, keywords]) => (
                  keywords.slice(0, 3).map((keyword, idx) => (
                    <span
                      key={`${category}-${idx}`}
                      className="px-2 py-1 bg-success-50 text-success-600 text-xs rounded-full"
                    >
                      {keyword}
                    </span>
                  ))
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Missing Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {(analysis.keywords?.missing_keywords || []).slice(0, 8).map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-danger-50 text-danger-600 text-xs rounded-full"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Improvements */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top Improvements
        </h3>
        <div className="space-y-3">
          {(analysis.improvements || []).slice(0, 5).map((improvement, idx) => (
            <div
              key={idx}
              className="flex items-start p-4 bg-gray-50 rounded-lg"
            >
              <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                {idx + 1}
              </span>
              <p className="text-gray-700">{improvement}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Rewrite Examples */}
      {analysis.rewrite_examples?.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Before & After Examples
          </h3>
          <div className="space-y-4">
            {analysis.rewrite_examples.slice(0, 3).map((example, idx) => (
              <div key={idx} className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-danger-50 rounded-lg border border-danger-200">
                  <span className="text-xs font-medium text-danger-600 uppercase">Before</span>
                  <p className="mt-1 text-gray-700">{example.original}</p>
                </div>
                <div className="p-4 bg-success-50 rounded-lg border border-success-200">
                  <span className="text-xs font-medium text-success-600 uppercase">After</span>
                  <p className="mt-1 text-gray-700">{example.improved}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center gap-4"
      >
        <button className="btn btn-secondary">
          <Download className="w-4 h-4 mr-2" />
          Download Report
        </button>
        <button
          onClick={() => navigate(`/interview/${resumeId}`, { state: { jobDescription } })}
          className="btn btn-primary"
        >
          Proceed to Interview
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </motion.div>
    </div>
  )
}
