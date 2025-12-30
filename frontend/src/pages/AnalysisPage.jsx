import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Loader2,
  ArrowRight,
  RefreshCw,
  User,
  Briefcase,
  Award,
  Target,
  TrendingUp,
  MessageSquare,
  Lightbulb
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
    if (score >= 80) return 'bg-green-50 border-green-200'
    if (score >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
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

  const profile = analysis.candidate_profile || {}
  const skills = analysis.key_skills || {}

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

      {/* Candidate Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-primary-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                {profile.career_stage || 'Professional'}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                {profile.domain || 'Technology'}
              </span>
              {profile.years_experience && (
                <span className="text-xs text-gray-500">
                  {profile.years_experience} experience
                </span>
              )}
            </div>
            <p className="text-gray-700">
              {profile.summary || analysis.detailed_feedback || 'Professional with relevant experience in their field.'}
            </p>
          </div>
        </div>

        {/* Verdict */}
        {analysis.verdict && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Hiring Manager's Take:</strong> {analysis.verdict}
            </p>
          </div>
        )}
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border ${getScoreBg(analysis.overall_score)}`}>
          <span className="text-xs font-medium text-gray-600">Overall</span>
          <div className={`text-3xl font-bold ${getScoreColor(analysis.overall_score)}`}>
            {Math.round(analysis.overall_score || 0)}
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <span className="text-xs font-medium text-gray-600">ATS Score</span>
          <div className={`text-2xl font-bold mt-1 ${getScoreColor(analysis.ats_score)}`}>
            {Math.round(analysis.ats_score || 0)}%
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <span className="text-xs font-medium text-gray-600">Content</span>
          <div className={`text-2xl font-bold mt-1 ${getScoreColor(analysis.content_score)}`}>
            {Math.round(analysis.content_score || 0)}%
          </div>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <span className="text-xs font-medium text-gray-600">JD Match</span>
          <div className={`text-2xl font-bold mt-1 ${analysis.jd_match_score ? getScoreColor(analysis.jd_match_score) : 'text-gray-400'}`}>
            {analysis.jd_match_score ? `${Math.round(analysis.jd_match_score)}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Key Skills */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Award className="w-5 h-5 mr-2 text-primary-600" />
          Key Skills
        </h3>
        <div className="space-y-4">
          {skills.technical?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Technical</h4>
              <div className="flex flex-wrap gap-2">
                {skills.technical.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {skills.soft_skills?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Soft Skills</h4>
              <div className="flex flex-wrap gap-2">
                {skills.soft_skills.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {skills.domain_expertise?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Domain Expertise</h4>
              <div className="flex flex-wrap gap-2">
                {skills.domain_expertise.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Career Highlights */}
      {analysis.career_highlights?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
            Career Highlights
          </h3>
          <div className="space-y-3">
            {analysis.career_highlights.map((highlight, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{highlight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths & Growth Areas */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Strengths */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Target className="w-5 h-5 mr-2 text-green-600" />
            Strengths
          </h3>
          <ul className="space-y-2">
            {(analysis.strengths || []).map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-1">•</span>
                {strength}
              </li>
            ))}
          </ul>
        </div>

        {/* Growth Areas */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Lightbulb className="w-5 h-5 mr-2 text-yellow-600" />
            Areas to Develop
          </h3>
          <ul className="space-y-2">
            {(analysis.growth_areas || analysis.improvements || []).map((area, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-yellow-500 mt-1">•</span>
                {typeof area === 'string' ? area : area.suggestion || area.issue}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Interview Prep Topics */}
      {analysis.interview_topics?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-primary-600" />
            Be Ready to Discuss
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            Interviewers will likely ask about these topics from your resume:
          </p>
          <div className="space-y-2">
            {analysis.interview_topics.map((topic, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg border border-primary-100">
                <span className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  {idx + 1}
                </span>
                <p className="text-sm text-gray-700">{topic}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keywords */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">ATS Keywords</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              Found in Resume
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(analysis.keywords?.found || []).slice(0, 12).map((keyword, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
              <AlertTriangle className="w-4 h-4 text-orange-500 mr-1" />
              Consider Adding
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(analysis.keywords?.missing || []).slice(0, 8).map((keyword, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={() => navigate(`/interview/${resumeId}`, { state: { jobDescription } })}
          className="flex items-center px-8 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          <MessageSquare className="w-5 h-5 mr-2" />
          Start Mock Interview
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  )
}
